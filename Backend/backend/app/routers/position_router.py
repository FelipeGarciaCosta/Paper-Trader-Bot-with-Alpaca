from typing import List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException

from app.models.position import Position as PositionModel
from app.models.user import User
from app.schemas.position import PositionOut, PositionCreate
from app.services.alpaca_client import AlpacaClient
from datetime import datetime

from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=List[PositionOut])
def get_positions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Devuelve las posiciones desde la base de datos (fuente canónica para el frontend)."""
    positions = db.query(PositionModel).order_by(PositionModel.created_at.desc()).all()
    return positions


@router.get("/alpaca")
def get_positions_alpaca(current_user: User = Depends(get_current_user)):
    """Devuelve las posiciones RAW desde la API de Alpaca (útil para debugging o datos frescos)."""
    client = AlpacaClient()
    return client.list_positions()

@router.post("/sync", response_model=List[PositionOut])
def sync_positions_from_alpaca(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alpaca = AlpacaClient()
    try:
        remote_positions = alpaca.list_positions()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al obtener posiciones de Alpaca: {e}")

    upserted = []
    for p in remote_positions:
        payload = {
            "asset_id": p.get("asset_id"),
            "symbol": p.get("symbol"),
            "exchange": p.get("exchange"),
            "asset_class": p.get("asset_class"),
            "asset_marginable": bool(p.get("asset_marginable", False)),
            # keep qty as returned by Alpaca (string) to avoid parsing/precision issues here
            "qty": p.get("qty"),
            # full unmodified payload for future parsing / debugging
            "raw": p,
            "avg_entry_price": Decimal(p["avg_entry_price"]) if p.get("avg_entry_price") else None,
            "side": p.get("side"),
            "created_at": p.get("created_at"),
            "market_value": Decimal(p["market_value"]) if p.get("market_value") else None,
            "current_price": Decimal(p["current_price"]) if p.get("current_price") else None,
            "cost_basis": Decimal(p["cost_basis"]) if p.get("cost_basis") else None,
            "unrealized_pl": Decimal(p["unrealized_pl"]) if p.get("unrealized_pl") else None,
            "unrealized_plpc": Decimal(p["unrealized_plpc"]) if p.get("unrealized_plpc") else None,
            "unrealized_intraday_pl": Decimal(p["unrealized_intraday_pl"]) if p.get("unrealized_intraday_pl") else None,
            "unrealized_intraday_plpc": Decimal(p["unrealized_intraday_plpc"]) if p.get("unrealized_intraday_plpc") else None,
            "lastday_price": Decimal(p["lastday_price"]) if p.get("lastday_price") else None,
            "change_today": Decimal(p["change_today"]) if p.get("change_today") else None,
            "qty_available": str(p["qty_available"]) if p.get("qty_available") is not None else None,
        }

        db_obj = db.query(PositionModel).filter(PositionModel.asset_id == payload["asset_id"]).first()
        if not db_obj:
            db_obj = PositionModel(**{k: v for k, v in payload.items() if v is not None})
            db.add(db_obj)
        else:
            # update indexed fields and raw payload
            for k, v in payload.items():
                if v is not None:
                    setattr(db_obj, k, v)
        # update last_synced_at
        try:
            db_obj.last_synced_at = datetime.utcnow()
        except Exception:
            pass
        db.commit()
        db.refresh(db_obj)
        upserted.append(db_obj)

    return upserted

# CLOSE a position by symbol or asset ID
@router.delete("/{symbol_or_asset_id}", response_model=dict)
def delete_position(symbol_or_asset_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alpaca = AlpacaClient()
    try:
        resp = alpaca.delete_position(symbol_or_asset_id=symbol_or_asset_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al eliminar posición en Alpaca: {e}")

    # Delete from local DB as well if exists
    db_obj = db.query(PositionModel).filter(PositionModel.asset_id == symbol_or_asset_id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()

    return resp
