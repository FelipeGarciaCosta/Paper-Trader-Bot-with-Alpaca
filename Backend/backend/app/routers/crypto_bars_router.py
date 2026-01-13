from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Path, Query

from app.services.alpaca_client import AlpacaClient
from app.schemas.crypto_bar import CryptoBarValue

router = APIRouter()


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            return datetime.strptime(value, "%Y-%m-%d")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid datetime format: {value}")


@router.get("/crypto/{loc}/bars", response_model=list[CryptoBarValue])
def fetch_crypto_bars(
    loc: str = Path(..., description="Crypto data location (e.g. us)"),
    symbols: str = Query(..., description="Comma-separated crypto symbols, e.g. BTC/USD"),
    timeframe: str = Query("1Min", description="Timeframe like 1Min, 5Min, 1Hour, 1Day"),
    start: str | None = Query(None, description="RFC-3339 or YYYY-MM-DD start"),
    end: str | None = Query(None, description="RFC-3339 or YYYY-MM-DD end"),
    limit: int = Query(1000, ge=1, le=10000),
    sort: str = Query("asc", pattern="^(asc|desc)$"),
    store: bool = Query(False, description="Deprecated - crypto bars are not stored; kept for compatibility"),
):
    alpaca = AlpacaClient()

    try:
        data = alpaca.get_crypto_bars(
            loc=loc,
            symbols=symbols,
            timeframe=timeframe,
            start=start,
            end=end,
            limit=limit,
            sort=sort,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Error calling Alpaca: {e}")

    # get_crypto_bars returns a list directly, not a dict with "bars" key
    bars = data if isinstance(data, list) else []

    mapped = []
    for b in bars:
        try:
            ts_raw = b.get("t")
            try:
                dt = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
            except Exception:
                try:
                    dt = datetime.utcfromtimestamp(int(ts_raw))
                except Exception:
                    continue

            mapped.append(
                {
                    "symbol": symbols,  # Use the requested symbol
                    "timeframe": timeframe,
                    "timestamp": dt,
                    "open": b.get("o"),
                    "high": b.get("h"),
                    "low": b.get("l"),
                    "close": b.get("c"),
                    "volume": b.get("v"),
                    "trade_count": b.get("n"),
                    "vwap": b.get("vw"),
                }
            )
        except Exception:
            continue

    mapped.sort(key=lambda x: x["timestamp"])
    return mapped
