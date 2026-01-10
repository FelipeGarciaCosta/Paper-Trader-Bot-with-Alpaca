from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PortfolioPointRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timeframe: str
    timestamp: datetime
    equity: float
    profit_loss: Optional[float] = None
    profit_loss_pct: Optional[float] = None
    base_value: Optional[float] = None
    base_value_asof: Optional[str] = None
    created_at: datetime


# Lightweight response used by frontend (timestamp + value)
class PortfolioValue(BaseModel):
    timestamp: datetime
    value: float
