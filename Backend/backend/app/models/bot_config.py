from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime, JSON
from app.database import Base


class BotConfig(Base):
    """
    Stores trading bot configuration.
    One config per user (since we have only one Alpaca account).
    """
    __tablename__ = "bot_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)  # Extensible for multi-user
    
    # Strategy parameters
    symbol = Column(String(32), nullable=False, index=True)
    timeframe = Column(String(16), nullable=False)  # e.g. "5Min", "15Min", "1Hour"
    fast_ema_period = Column(Integer, default=9, nullable=False)
    slow_ema_period = Column(Integer, default=21, nullable=False)
    
    # Risk management
    stop_loss_percent = Column(Numeric(10, 4), nullable=True)  # e.g. 2.5 for 2.5%
    take_profit_percent = Column(Numeric(10, 4), nullable=True)  # e.g. 5.0 for 5%
    
    # Position sizing
    quantity = Column(Numeric(30, 10), nullable=False)  # Size per trade
    
    # Bot state
    is_active = Column(Boolean, default=False, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BotRun(Base):
    """
    Tracks each bot execution (started, stopped).
    Useful for auditing and debugging.
    """
    __tablename__ = "bot_runs"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, nullable=False, index=True)
    
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    stopped_at = Column(DateTime, nullable=True)
    
    status = Column(String(32), nullable=False)  # "running", "stopped", "error"
    error_message = Column(String(512), nullable=True)
    
    # Stats during this run
    signals_generated = Column(Integer, default=0, nullable=False)
    orders_placed = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BacktestResult(Base):
    """
    Stores backtest results for historical analysis.
    """
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, nullable=True, index=True)  # Optional link to config
    
    # Backtest parameters
    symbol = Column(String(32), nullable=False)
    timeframe = Column(String(16), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    fast_ema_period = Column(Integer, nullable=False)
    slow_ema_period = Column(Integer, nullable=False)
    initial_capital = Column(Numeric(30, 10), nullable=False)
    
    # Results
    final_capital = Column(Numeric(30, 10), nullable=False)
    total_pnl = Column(Numeric(30, 10), nullable=False)
    total_pnl_percent = Column(Numeric(10, 4), nullable=False)
    
    total_trades = Column(Integer, nullable=False)
    winning_trades = Column(Integer, nullable=False)
    losing_trades = Column(Integer, nullable=False)
    win_rate = Column(Numeric(10, 4), nullable=False)  # Percentage
    
    max_drawdown = Column(Numeric(30, 10), nullable=False)
    max_drawdown_percent = Column(Numeric(10, 4), nullable=False)
    
    # Detailed data stored as JSON
    equity_curve = Column(JSON, nullable=True)  # List of {timestamp, equity}
    trades = Column(JSON, nullable=True)  # List of trade details
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
