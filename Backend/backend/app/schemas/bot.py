from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


# ---------- Bot Configuration Schemas ----------

class BotConfigBase(BaseModel):
    """Base schema for bot configuration"""
    symbol: str = Field(..., description="Trading symbol (e.g., BTC/USD, AAPL)")
    timeframe: str = Field(..., description="Bar timeframe (e.g., 5Min, 15Min, 1Hour)")
    fast_ema_period: int = Field(9, ge=2, description="Fast EMA period")
    slow_ema_period: int = Field(21, ge=2, description="Slow EMA period")
    stop_loss_percent: Optional[Decimal] = Field(None, ge=0, description="Stop loss percentage")
    take_profit_percent: Optional[Decimal] = Field(None, ge=0, description="Take profit percentage")
    quantity: Decimal = Field(..., gt=0, description="Position size per trade")


class BotConfigCreate(BotConfigBase):
    """Schema for creating a new bot configuration"""
    pass


class BotConfigUpdate(BaseModel):
    """Schema for updating bot configuration"""
    symbol: Optional[str] = None
    timeframe: Optional[str] = None
    fast_ema_period: Optional[int] = Field(None, ge=2)
    slow_ema_period: Optional[int] = Field(None, ge=2)
    stop_loss_percent: Optional[Decimal] = Field(None, ge=0)
    take_profit_percent: Optional[Decimal] = Field(None, ge=0)
    quantity: Optional[Decimal] = Field(None, gt=0)
    is_active: Optional[bool] = None


class BotConfigResponse(BotConfigBase):
    """Schema for bot configuration response"""
    id: int
    user_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------- Backtest Schemas ----------

class BacktestRequest(BaseModel):
    """Request schema for backtesting"""
    symbol: str = Field(..., description="Trading symbol")
    timeframe: str = Field(..., description="Bar timeframe")
    start_date: datetime = Field(..., description="Backtest start date")
    end_date: datetime = Field(..., description="Backtest end date")
    fast_ema_period: int = Field(9, ge=2)
    slow_ema_period: int = Field(21, ge=2)
    initial_capital: Decimal = Field(100000, gt=0, description="Starting capital")
    quantity: Decimal = Field(..., gt=0, description="Position size per trade")
    stop_loss_percent: Optional[Decimal] = Field(None, ge=0)
    take_profit_percent: Optional[Decimal] = Field(None, ge=0)


class TradeDetail(BaseModel):
    """Details of a single trade in backtest"""
    entry_time: datetime
    exit_time: Optional[datetime]
    side: str  # "buy" or "sell"
    entry_price: Decimal
    exit_price: Optional[Decimal]
    quantity: Decimal
    pnl: Optional[Decimal]
    pnl_percent: Optional[Decimal]
    exit_reason: Optional[str]  # "signal", "stop_loss", "take_profit"


class EquityPoint(BaseModel):
    """Point on the equity curve"""
    timestamp: datetime
    equity: Decimal


class BacktestResponse(BaseModel):
    """Response schema for backtest results"""
    id: Optional[int] = None
    symbol: str
    timeframe: str
    start_date: datetime
    end_date: datetime
    fast_ema_period: int
    slow_ema_period: int
    initial_capital: Decimal
    final_capital: Decimal
    total_pnl: Decimal
    total_pnl_percent: Decimal
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: Decimal
    max_drawdown: Decimal
    max_drawdown_percent: Decimal
    equity_curve: List[EquityPoint]
    trades: List[TradeDetail]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- Bot Status Schemas ----------

class BotStatusResponse(BaseModel):
    """Response schema for bot status"""
    is_running: bool
    config: Optional[BotConfigResponse]
    current_run_id: Optional[int]
    started_at: Optional[datetime]
    signals_generated: int
    orders_placed: int
    last_error: Optional[str]
    
    # Activity monitoring fields
    last_signal: Optional[str] = None  # "BUY", "SELL", or None
    last_signal_time: Optional[datetime] = None
    current_price: Optional[float] = None
    fast_ema_value: Optional[float] = None
    slow_ema_value: Optional[float] = None
    last_check_time: Optional[datetime] = None
    next_check_time: Optional[datetime] = None


class BotStartRequest(BaseModel):
    """Request to start the bot with a configuration"""
    config_id: Optional[int] = Field(None, description="Use existing config ID")
    config: Optional[BotConfigCreate] = Field(None, description="Or provide new config")


class BotStartResponse(BaseModel):
    """Response after starting the bot"""
    success: bool
    message: str
    run_id: int
    config: BotConfigResponse
