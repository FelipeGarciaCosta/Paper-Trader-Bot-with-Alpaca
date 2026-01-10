from decimal import Decimal
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class PositionBase(BaseModel):
    asset_id: str
    symbol: str
    exchange: Optional[str] = None
    asset_class: Optional[str] = None
    asset_marginable: Optional[bool] = False

    # keep qty as string as Alpaca returns string values for quantities
    qty: Optional[str]
    avg_entry_price: Optional[Decimal] = None
    side: Optional[str] = None

    market_value: Optional[Decimal] = None
    cost_basis: Optional[Decimal] = None
    unrealized_pl: Optional[Decimal] = None
    unrealized_plpc: Optional[float] = None
    unrealized_intraday_pl: Optional[Decimal] = None
    unrealized_intraday_plpc: Optional[float] = None

    current_price: Optional[Decimal] = None
    lastday_price: Optional[Decimal] = None
    change_today: Optional[float] = None
    qty_available: Optional[str] = None
    # raw: store original Alpaca response (un-normalized)
    raw: Optional[dict] = None

class PositionCreate(PositionBase):
    pass

class PositionInDB(PositionBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_synced_at: Optional[datetime]

    class Config:
        from_attributes = True

class PositionOut(PositionInDB):
    pass