from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.services.alpaca_client import AlpacaClient
from app.models.stock_bar import StockBar
from app.schemas.stock_bar import StockBarRead

router = APIRouter()
#ENDPOINTS FOR STOCK BARS:
# /market-data/stocks/{symbol}/bars [GET]


# Helper para parsear fechas RFC-3339 o YYYY-MM-DD
def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        # Intento ISO completo
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            return datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {value}")

# Un ejemplo de endpoint para obtener barras de stock sería así: http://localhost:8000/market-data/stocks/AAPL/bars?timeframe=1Day&start=2024-01-01&end=2024-02-01&limit=1000&adjustment=raw&sort=asc&store=true
@router.get("/stocks/{symbol}/bars", response_model=list[StockBarRead])
def fetch_and_get_bars(
    symbol: str,
    timeframe: str = Query(..., examples=["1Day"], description="Timeframe Alpaca: 1Min, 5Min, 1Hour, 1Day, etc."),
    start: str | None = Query(None, description="Fecha/hora inicio RFC-3339 o YYYY-MM-DD"),
    end: str | None = Query(None, description="Fecha/hora fin RFC-3339 o YYYY-MM-DD"),
    limit: int = Query(1000, ge=1, le=10000),
    adjustment: str = Query("raw"),
    feed: str | None = Query(None),
    sort: str = Query("asc", pattern="^(asc|desc)$"),
    store: bool = Query(True, description="Si true, se guardan nuevas barras en la DB"),
    db: Session = Depends(get_db),
):
    alpaca = AlpacaClient()

    # Decide whether we actually persist fetched bars. To avoid storing every poll,
    # only persist when the request clearly asks for a longer historical window (e.g. ~1 month)
    start_dt = _parse_dt(start)
    end_dt = _parse_dt(end)

    should_store = False
    if store:
        tf_lower = (timeframe or "").lower()
        # If timeframe itself denotes months, allow storing
        if "month" in tf_lower or tf_lower in ("1m", "1month"):
            should_store = True
        # If caller provided an explicit start and end that span ~>= 25 days, treat as monthly
        elif start_dt and end_dt:
            try:
                delta_days = (end_dt - start_dt).days
                if delta_days >= 25:
                    should_store = True
            except Exception:
                should_store = False

    # 1. Fetch de Alpaca y (opcional) persistir solo si should_store
    if should_store:
        try:
            data = alpaca.get_stock_bars(
                symbols=symbol,
                timeframe=timeframe,
                start=start,
                end=end,
                limit=limit,
                adjustment=adjustment,
                feed=feed,
                sort=sort,
            )
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"Error llamando a Alpaca: {e}")

        bars = data.get("bars", {}).get(symbol, [])

        for b in bars:
            # Campos estándar de Alpaca bars: t, o, h, l, c, v, n, vw
            try:
                sb = StockBar(
                    symbol=symbol,
                    timeframe=timeframe,
                    timestamp=_parse_dt(b.get("t")),
                    open=b.get("o"),
                    high=b.get("h"),
                    low=b.get("l"),
                    close=b.get("c"),
                    volume=b.get("v"),
                    trade_count=b.get("n"),
                    vwap=b.get("vw"),
                )
                db.add(sb)
                db.commit()
            except IntegrityError:
                db.rollback()  # Ya existe esa barra -> ignorar
            except Exception as e:  # noqa: BLE001
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Error guardando barra: {e}")

    # 2. Query local DB según filtros
    start_dt = _parse_dt(start)
    end_dt = _parse_dt(end)

    q = db.query(StockBar).filter(StockBar.symbol == symbol, StockBar.timeframe == timeframe)
    if start_dt:
        q = q.filter(StockBar.timestamp >= start_dt)
    if end_dt:
        q = q.filter(StockBar.timestamp <= end_dt)

    if sort == "asc":
        q = q.order_by(StockBar.timestamp.asc())
    else:
        q = q.order_by(StockBar.timestamp.desc())

    result = q.all()
    return result


# Lightweight endpoint that proxies Alpaca market-data bars and returns
# them in a frontend-friendly format (timestamp, open, high, low, close, volume).
# This does NOT store anything in the DB and is intended for the UI to render
# charts directly from Alpaca.
@router.get("/prices")
def get_price_history(
    symbol: str,
    timeframe: str = Query("1Hour", description="Alpaca timeframe, e.g. 1Min, 5Min, 1Hour, 1Day"),
    start: str | None = Query(None, description="RFC-3339 or YYYY-MM-DD"),
    end: str | None = Query(None, description="RFC-3339 or YYYY-MM-DD"),
    limit: int = Query(1000, ge=1, le=10000),
    adjustment: str = Query("raw"),
    feed: str | None = Query(None),
    sort: str = Query("asc", pattern="^(asc|desc)$"),
):
    """
    Proxy call to Alpaca Market Data API that returns an array of bars formatted as:
    [{ timestamp: string, open: number, high: number, low: number, close: number, volume: number }, ...]
    """
    alpaca = AlpacaClient()
    try:
        data = alpaca.get_stock_bars(
            symbols=symbol,
            timeframe=timeframe,
            start=start,
            end=end,
            limit=limit,
            adjustment=adjustment,
            feed=feed,
            sort=sort,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Error calling Alpaca: {e}")

    bars = data.get("bars", {}).get(symbol, [])

    # Map Alpaca bar format to frontend PriceData format
    mapped = []
    for b in bars:
        try:
            mapped.append(
                {
                    "timestamp": b.get("t"),
                    "open": b.get("o"),
                    "high": b.get("h"),
                    "low": b.get("l"),
                    "close": b.get("c"),
                    "volume": b.get("v"),
                }
            )
        except Exception:
            # Skip malformed bars but continue
            continue

    return mapped


