from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


# Lightweight response used by frontend (timestamp + value)
class PortfolioValue(BaseModel):
    timestamp: datetime
    value: float
