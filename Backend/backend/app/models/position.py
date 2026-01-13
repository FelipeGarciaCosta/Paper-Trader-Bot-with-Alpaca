from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Boolean, Numeric, Float, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(64), unique=True, index=True, nullable=False)
    symbol = Column(String(32), index=True, nullable=False)
    exchange = Column(String(64), nullable=True)
    asset_class = Column(String(64), nullable=True)
    asset_marginable = Column(Boolean, default=False)

    # Store qty as string to preserve exactly what Alpaca returns (can be '5' or '5.0')
    # and avoid aggressive normalization; keep numeric fields optional for parsing later.
    qty = Column(String(64), nullable=True)
    avg_entry_price = Column(Numeric(30, 10), nullable=True)
    side = Column(String(8), nullable=True)  # "long" / "short"

    market_value = Column(Numeric(30, 10), nullable=True)
    cost_basis = Column(Numeric(30, 10), nullable=True)
    unrealized_pl = Column(Numeric(30, 10), nullable=True)
    unrealized_plpc = Column(Float, nullable=True)
    unrealized_intraday_pl = Column(Numeric(30, 10), nullable=True)
    unrealized_intraday_plpc = Column(Float, nullable=True)

    current_price = Column(Numeric(30, 10), nullable=True)
    lastday_price = Column(Numeric(30, 10), nullable=True)
    change_today = Column(Float, nullable=True)
    qty_available = Column(String(64), nullable=True)  # Store as string like qty

    # Store raw Alpaca payload for full fidelity and easier debugging.
    raw = Column(JSON, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)