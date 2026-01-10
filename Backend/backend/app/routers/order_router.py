from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order
from app.schemas.order import OrderCreate, OrderRead, AlpacaOrder, OrderReplace
from datetime import datetime
from app.services.alpaca_client import AlpacaClient
from fastapi import HTTPException

router = APIRouter()
#ENDPOINTS FOR ORDERS:
# /orders/ [GET, POST]
# GET /orders?status=open closed, all default=open

# lista de la DB (fuente canónica para el frontend)
@router.get("/", response_model=list[OrderRead])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    return orders


# lista RAW desde Alpaca (directo, útil para debug o datos frescos)
@router.get("/alpaca", response_model=list[AlpacaOrder])
def list_orders_from_alpaca(status: str = "all"):
    alpaca = AlpacaClient()
    try:
        return alpaca.list_orders_from_alpaca(status=status)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al obtener órdenes de Alpaca: {e}")

@router.post("/sync", response_model=list[OrderRead])
def sync_orders_from_alpaca(db: Session = Depends(get_db), status: str = "all"):
    """
    Sincroniza órdenes desde Alpaca al DB.
    Usa el mismo parámetro de status que la API de Alpaca.
    """
    alpaca = AlpacaClient()
    try:
        remote_orders = alpaca.list_orders_from_alpaca(status=status)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al obtener órdenes de Alpaca: {e}")

    upserted = []
    for o in remote_orders:
        # store string values exactly as Alpaca returns for qty/prices
        payload = {
            "symbol": o.get("symbol"),
            "qty": o.get("qty"),
            "side": o.get("side"),
            "order_type": o.get("type"),
            "time_in_force": o.get("time_in_force"),
            "status": o.get("status"),
            "alpaca_id": o.get("id"),
            "client_order_id": o.get("client_order_id"),
            "created_at": o.get("created_at"),
            "expires_at": o.get("expires_at"),
            "filled_at": o.get("filled_at"),
            "filled_avg_price": o.get("filled_avg_price"),
        }

        # helper to parse ISO datetime strings (Alpaca uses trailing Z for UTC)
        def _parse_dt(v):
            if v is None:
                return None
            if isinstance(v, datetime):
                return v
            if isinstance(v, str):
                try:
                    # replace Z with +00:00 to be accepted by fromisoformat
                    s = v.replace("Z", "+00:00")
                    return datetime.fromisoformat(s)
                except Exception:
                    return None
            return None

        # parse known datetime fields into python datetimes so SQLAlchemy/SQLite accepts them
        for dt_key in ("created_at", "updated_at", "submitted_at", "filled_at", "expired_at", "canceled_at", "failed_at", "replaced_at", "expires_at"):
            if dt_key in payload:
                payload[dt_key] = _parse_dt(payload.get(dt_key))

        db_obj = db.query(Order).filter(
            Order.alpaca_id == payload["alpaca_id"]
        ).first()

        if not db_obj:
            db_obj = Order(**{k: v for k, v in payload.items() if v is not None})
            db.add(db_obj)
        else:
            for k, v in payload.items():
                if v is not None:
                    setattr(db_obj, k, v)
        # set last_synced_at timestamp
        try:
            db_obj.last_synced_at = datetime.utcnow()
        except Exception:
            pass
        db.commit()
        db.refresh(db_obj)
        upserted.append(db_obj)

    return upserted

@router.post("/", response_model=OrderRead)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    alpaca = AlpacaClient()

    # 1. Enviar la orden a Alpaca
    try:
        alpaca_response = alpaca.submit_order(
            symbol=payload.symbol,
            qty=payload.qty,
            side=payload.side,
            order_type=payload.order_type,
            time_in_force=payload.time_in_force,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al enviar orden a Alpaca: {e}")

    # 2. Guardar en DB con status real de Alpaca
    order = Order(
        symbol=payload.symbol,
        qty=str(payload.qty),
        side=payload.side,
        order_type=payload.order_type,
        time_in_force=payload.time_in_force,
        status=alpaca_response.get("status", "submitted"),
        alpaca_id=alpaca_response.get("id"),
        client_order_id=alpaca_response.get("client_order_id"),
        created_at=alpaca_response.get("created_at"),
        expires_at=alpaca_response.get("expires_at"),
        filled_at=alpaca_response.get("filled_at"),
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    return order


# Replace an existing order on Alpaca using the DB id to look up alpaca_id
@router.patch("/{order_db_id}/replace", response_model=AlpacaOrder)
def replace_order(order_db_id: int, payload: OrderReplace, db: Session = Depends(get_db)):
    """Replace an order in Alpaca identified by internal DB id.

    The request body is forwarded as JSON to Alpaca (e.g. {"qty": 2, "limit_price": 123.45}).
    """
    db_obj = db.query(Order).filter(Order.id == order_db_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Order not found")
    if not db_obj.alpaca_id:
        raise HTTPException(status_code=400, detail="Order has no alpaca_id; cannot replace")

    alpaca = AlpacaClient()
    try:
        # forward only fields provided in the body
        resp = alpaca.replace_order(db_obj.alpaca_id, **{k: v for k, v in payload.model_dump().items() if v is not None})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al reemplazar orden en Alpaca: {e}")

    # update local db status/last_synced_at
    try:
        db_obj.status = resp.get("status", db_obj.status)
        db_obj.last_synced_at = datetime.utcnow()
        db.commit()
        db.refresh(db_obj)
    except Exception:
        # ignore DB update errors, return Alpaca response
        pass

    return resp
