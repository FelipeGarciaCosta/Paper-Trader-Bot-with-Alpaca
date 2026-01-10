from __future__ import annotations

from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PortfolioHistory(Base):
    __tablename__ = "portfolio_history"
    __table_args__ = (
        UniqueConstraint("timeframe", "timestamp", name="uq_portfolio_timeframe_timestamp"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timeframe: Mapped[str] = mapped_column(String(16), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)

    equity: Mapped[float] = mapped_column(Float)
    profit_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    profit_loss_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Meta fields returned by Alpaca (may be identical across a response)
    base_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    base_value_asof: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
