from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class CryptoBarRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    timeframe: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    # Crypto volumes can be fractional (small trades), accept floats
    volume: float
    trade_count: int | None = None
    vwap: float | None = None


class CryptoBarValue(BaseModel):
    """Lightweight response used when not persisting bars to DB."""
    symbol: str
    timeframe: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    # Crypto volumes can be fractional (small trades), accept floats
    volume: float
    trade_count: int | None = None
    vwap: float | None = None


class FetchCryptoBarsParams(BaseModel):
    symbols: str = Field(examples=["BTC/USD"], description="Comma separated list of crypto symbols")
    timeframe: str = Field(examples=["1Min"], description="Timeframe (e.g. 1Min, 5Min, 1Hour, 1Day)")
    start: str | None = Field(default=None, description="RFC-3339 start time")
    end: str | None = Field(default=None, description="RFC-3339 end time")
    limit: int = Field(default=1000, ge=1, le=10000)
    sort: Literal["asc", "desc"] = Field(default="asc")
    store: bool = Field(default=True, description="If true, persist bars into DB")
