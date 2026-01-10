from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

# Schemas
class StockBarRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    timeframe: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    trade_count: int | None = None
    vwap: float | None = None

class StockBarsResponse(BaseModel):
    symbol: str
    timeframe: str
    bars: list[StockBarRead]

class FetchBarsParams(BaseModel):
    symbols: str = Field(examples=["AAPL"], description="Lista separada por comas de símbolos")
    timeframe: str = Field(examples=["1Day"], description="Timeframe Alpaca (e.g. 1Min, 5Min, 1Hour, 1Day)")
    start: str | None = Field(default=None, description="Fecha/hora inicio RFC-3339 o YYYY-MM-DD")
    end: str | None = Field(default=None, description="Fecha/hora fin RFC-3339 o YYYY-MM-DD")
    limit: int = Field(default=1000, ge=1, le=10000)
    adjustment: str = Field(default="raw")
    feed: str | None = Field(default=None, description="sip | iex | otc | boats")
    sort: Literal["asc", "desc"] = Field(default="asc")
    store: bool = Field(default=True, description="Si true, guarda en la DB")
