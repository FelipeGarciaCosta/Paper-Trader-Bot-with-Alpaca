from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import DateTime, Integer, String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Order(Base):
    """Example table for simulated orders."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    # Keep qty as string to preserve Alpaca formatting (e.g. "4")
    qty: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Alpaca's order id (UUID) when the order exists in Alpaca. Stored to allow replace/cancel calls.
    alpaca_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    client_order_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    side: Mapped[str] = mapped_column(String(4))  # "buy" | "sell"
    order_type: Mapped[str] = mapped_column(String(16), default="market")
    time_in_force: Mapped[str] = mapped_column(String(8), default="day")
    status: Mapped[str] = mapped_column(String(16), default="pending")

    # Alpaca timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    filled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expired_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    replaced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # References to other orders
    replaced_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    replaces: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Asset and amounts (store as strings to preserve Alpaca formatting)
    asset_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    asset_class: Mapped[str | None] = mapped_column(String(32), nullable=True)
    filled_qty: Mapped[str | None] = mapped_column(String(64), nullable=True)
    filled_avg_price: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notional: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Price fields as strings
    limit_price: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stop_price: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Order metadata
    order_class: Mapped[str | None] = mapped_column(String(64), nullable=True)
    type: Mapped[str | None] = mapped_column(String(32), nullable=True)  # Alpaca 'type'
    position_intent: Mapped[str | None] = mapped_column(String(64), nullable=True)
    extended_hours: Mapped[bool | None] = mapped_column(Boolean, default=False)
    legs: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Composite/bracket params and trailing
    take_profit_limit_price: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stop_loss_stop_price: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stop_loss_limit_price: Mapped[str | None] = mapped_column(String(64), nullable=True)
    trail_percent: Mapped[str | None] = mapped_column(String(64), nullable=True)
    trail_price: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hwm: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # When we last synced this order from Alpaca
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)



class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    qty: int
    side: str
    order_type: str
    time_in_force: str
    status: str
    created_at: datetime
