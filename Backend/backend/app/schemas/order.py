from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


# ---------- Schema for creating an order ----------
class OrderCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=16, examples=["AAPL"])
    quantity: float = Field(gt=0, examples=[1], alias="qty")  # Accept both quantity and qty, float for crypto support
    side: Literal["buy", "sell"]
    type: Literal["market", "limit"] = Field(default="market", alias="order_type")  # Accept both type and order_type
    time_in_force: Literal["day", "gtc"] = Field(default="day")
    price: Optional[float] = None  # For limit orders
    
    class Config:
        populate_by_name = True  # Allow using both field name and alias


# ---------- Schema for reading an order from DB ----------
class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    symbol: str
    # store qty as string in DB (Alpaca returns strings); API may still accept ints when creating
    qty: Optional[str]
    side: str
    order_type: str
    time_in_force: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    filled_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    replaced_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    # Alpaca identifiers
    alpaca_id: Optional[str] = None
    client_order_id: Optional[str] = None

    # Asset and filled info
    asset_id: Optional[str] = None
    asset_class: Optional[str] = None
    filled_qty: Optional[str] = None
    filled_avg_price: Optional[str] = None
    notional: Optional[str] = None

    # Price and metadata
    limit_price: Optional[str] = None
    stop_price: Optional[str] = None
    order_class: Optional[str] = None
    type: Optional[str] = None
    position_intent: Optional[str] = None
    extended_hours: Optional[bool] = None
    legs: Optional[dict] = None

    take_profit_limit_price: Optional[str] = None
    stop_loss_stop_price: Optional[str] = None
    stop_loss_limit_price: Optional[str] = None
    trail_percent: Optional[str] = None
    trail_price: Optional[str] = None
    hwm: Optional[str] = None

    # When this order was last synced from Alpaca (if applicable)
    last_synced_at: Optional[datetime] = None


# ---------- Schema to accept replace params for PATCH /orders/{id}/replace ----------
class OrderReplace(BaseModel):
    # All fields optional; Alpaca will accept only provided fields
    qty: Optional[int] = None
    symbol: Optional[str] = None
    side: Optional[Literal["buy", "sell"]] = None
    type: Optional[str] = None
    time_in_force: Optional[str] = None
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    client_order_id: Optional[str] = None
    # extra parameters accepted by Alpaca will be forwarded
    class Config:
        extra = "allow"


# ---------- Schema for orders returned by Alpaca API (may contain UUID id and string numbers) ----------
class AlpacaOrder(BaseModel):
    id: str
    client_order_id: str | None = None
    created_at: str | None = None
    submitted_at: str | None = None
    filled_at: str | None = None
    expired_at: str | None = None
    canceled_at: str | None = None
    failed_at: str | None = None
    replaced_at: str | None = None
    asset_id: str | None = None
    symbol: str | None = None
    asset_class: str | None = None
    qty: str | None = None
    filled_qty: str | None = None
    filled_avg_price: str | None = None
    status: str | None = None
    side: str | None = None
    type: str | None = None
    time_in_force: str | None = None
    limit_price: str | None = None
    stop_price: str | None = None
    extended_hours: bool | None = None
    legs: list | None = None

    class Config:
        # allow population by field name and accept arbitrary types for forward compatibility
        extra = "allow"
