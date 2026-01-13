"""
Bot Router

Handles all trading bot related endpoints:
- POST /bot/backtest - Run backtest
- POST /bot/start - Start live bot
- POST /bot/stop - Stop live bot
- GET /bot/status - Get bot status
- POST /bot/config - Create/update bot configuration
- GET /bot/config - Get current bot configuration
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_alpaca_client
from app.models.bot_config import BotConfig, BotRun, BacktestResult as BacktestResultModel
from app.schemas.bot import (
    BacktestRequest,
    BacktestResponse,
    BotConfigCreate,
    BotConfigResponse,
    BotConfigUpdate,
    BotStartRequest,
    BotStartResponse,
    BotStatusResponse,
    EquityPoint,
    TradeDetail
)
from app.services.alpaca_client import AlpacaClient
from app.services.backtester import Backtester, BacktestTrade
from app.services.strategy import Bar, EMACrossoverStrategy
from app.services.trading_bot import TradingBotManager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bot", tags=["bot"])


# ---------- Bot Configuration Endpoints ----------

@router.post("/config", response_model=BotConfigResponse)
def create_or_update_bot_config(
    config: BotConfigCreate,
    db: Session = Depends(get_db)
) -> BotConfigResponse:
    """
    Create or update bot configuration.
    Checks by symbol AND timeframe to allow multiple configs per symbol.
    """
    # Check if config exists for this symbol + timeframe combination
    existing = db.query(BotConfig).filter(
        BotConfig.symbol == config.symbol,
        BotConfig.timeframe == config.timeframe
    ).first()
    
    if existing:
        # Update existing config
        for field, value in config.model_dump().items():
            setattr(existing, field, value)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return BotConfigResponse.model_validate(existing)
    else:
        # Create new config
        db_config = BotConfig(**config.model_dump())
        db.add(db_config)
        db.commit()
        db.refresh(db_config)
        return BotConfigResponse.model_validate(db_config)


@router.get("/config/{symbol}", response_model=BotConfigResponse)
def get_bot_config(symbol: str, db: Session = Depends(get_db)) -> BotConfigResponse:
    """Get bot configuration for a specific symbol"""
    config = db.query(BotConfig).filter(BotConfig.symbol == symbol).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Bot configuration not found")
    
    return BotConfigResponse.model_validate(config)


@router.get("/config", response_model=List[BotConfigResponse])
def list_bot_configs(db: Session = Depends(get_db)) -> List[BotConfigResponse]:
    """List all bot configurations"""
    configs = db.query(BotConfig).all()
    return [BotConfigResponse.model_validate(c) for c in configs]


@router.patch("/config/{config_id}", response_model=BotConfigResponse)
def update_bot_config(
    config_id: int,
    updates: BotConfigUpdate,
    db: Session = Depends(get_db)
) -> BotConfigResponse:
    """Update bot configuration by ID"""
    config = db.query(BotConfig).filter(BotConfig.id == config_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Bot configuration not found")
    
    # Update only provided fields
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)
    
    return BotConfigResponse.model_validate(config)


# ---------- Backtesting Endpoint ----------

@router.post("/backtest", response_model=BacktestResponse)
def run_backtest(
    request: BacktestRequest,
    db: Session = Depends(get_db),
    alpaca: AlpacaClient = Depends(get_alpaca_client)
) -> BacktestResponse:
    """
    Run backtest on historical data.
    
    This endpoint:
    1. Fetches historical bars from Alpaca
    2. Runs the strategy
    3. Simulates trades
    4. Returns performance metrics
    """
    logger.info(f"Starting backtest for {request.symbol} from {request.start_date} to {request.end_date}")
    
    try:
        # 1. Fetch historical bars
        is_crypto = '/' in request.symbol
        
        # Format dates for Alpaca API (they prefer YYYY-MM-DD format or RFC3339 with timezone)
        start_date_str = request.start_date.strftime('%Y-%m-%d')
        end_date_str = request.end_date.strftime('%Y-%m-%d')
        
        if is_crypto:
            bars_data = alpaca.get_crypto_bars(
                loc="us",
                symbols=request.symbol,
                timeframe=request.timeframe,
                start=start_date_str,
                end=end_date_str,
                limit=10000
            )
        else:
            bars_data = alpaca.get_stock_bars(
                symbols=request.symbol,
                timeframe=request.timeframe,
                start=start_date_str,
                end=end_date_str,
                limit=10000
            )
        
        if not bars_data:
            raise HTTPException(status_code=404, detail="No historical data found")
        
        # Convert to Bar objects
        bars = [Bar.from_alpaca_bar(b) for b in bars_data]
        logger.info(f"Fetched {len(bars)} bars for backtesting")
        
        # 2. Create strategy
        strategy = EMACrossoverStrategy(
            fast_period=request.fast_ema_period,
            slow_period=request.slow_ema_period,
            stop_loss_percent=request.stop_loss_percent,
            take_profit_percent=request.take_profit_percent
        )
        
        # 3. Run backtest
        backtester = Backtester(
            symbol=request.symbol,
            timeframe=request.timeframe,
            strategy=strategy,
            initial_capital=request.initial_capital,
            quantity_per_trade=request.quantity
        )
        
        result = backtester.run(bars)
        
        # 4. Save result to database
        db_result = BacktestResultModel(
            symbol=result.symbol,
            timeframe=result.timeframe,
            start_date=result.start_date,
            end_date=result.end_date,
            fast_ema_period=result.fast_ema_period,
            slow_ema_period=result.slow_ema_period,
            initial_capital=result.initial_capital,
            final_capital=result.final_capital,
            total_pnl=result.total_pnl,
            total_pnl_percent=result.total_pnl_percent,
            total_trades=result.total_trades,
            winning_trades=result.winning_trades,
            losing_trades=result.losing_trades,
            win_rate=result.win_rate,
            max_drawdown=result.max_drawdown,
            max_drawdown_percent=result.max_drawdown_percent,
            equity_curve=[
                {"timestamp": p.timestamp.isoformat(), "equity": float(p.equity)}
                for p in result.equity_curve
            ],
            trades=[
                _trade_to_dict(t) for t in result.trades
            ]
        )
        
        db.add(db_result)
        db.commit()
        db.refresh(db_result)
        
        # 5. Return response
        return BacktestResponse(
            id=db_result.id,
            symbol=result.symbol,
            timeframe=result.timeframe,
            start_date=result.start_date,
            end_date=result.end_date,
            fast_ema_period=result.fast_ema_period,
            slow_ema_period=result.slow_ema_period,
            initial_capital=result.initial_capital,
            final_capital=result.final_capital,
            total_pnl=result.total_pnl,
            total_pnl_percent=result.total_pnl_percent,
            total_trades=result.total_trades,
            winning_trades=result.winning_trades,
            losing_trades=result.losing_trades,
            win_rate=result.win_rate,
            max_drawdown=result.max_drawdown,
            max_drawdown_percent=result.max_drawdown_percent,
            equity_curve=[
                EquityPoint(timestamp=p.timestamp, equity=p.equity)
                for p in result.equity_curve
            ],
            trades=[
                TradeDetail(
                    entry_time=t.entry_time,
                    exit_time=t.exit_time,
                    side=t.side,
                    entry_price=t.entry_price,
                    exit_price=t.exit_price,
                    quantity=t.quantity,
                    pnl=t.pnl,
                    pnl_percent=t.pnl_percent,
                    exit_reason=t.exit_reason
                )
                for t in result.trades
            ],
            created_at=db_result.created_at
        )
    
    except Exception as e:
        logger.exception("Backtest failed")
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")


def _trade_to_dict(trade: BacktestTrade) -> dict:
    """Convert BacktestTrade to dictionary"""
    return {
        "entry_time": trade.entry_time.isoformat(),
        "exit_time": trade.exit_time.isoformat() if trade.exit_time else None,
        "side": trade.side,
        "entry_price": float(trade.entry_price),
        "exit_price": float(trade.exit_price) if trade.exit_price else None,
        "quantity": float(trade.quantity),
        "pnl": float(trade.pnl) if trade.pnl else None,
        "pnl_percent": float(trade.pnl_percent) if trade.pnl_percent else None,
        "exit_reason": trade.exit_reason
    }


# ---------- Live Trading Endpoints ----------

@router.post("/start", response_model=BotStartResponse)
async def start_bot(
    request: BotStartRequest,
    db: Session = Depends(get_db),
    alpaca: AlpacaClient = Depends(get_alpaca_client)
) -> BotStartResponse:
    """
    Start the live trading bot.
    
    Accepts either a config_id (use existing config) or a new config.
    """
    # Get or create config
    if request.config_id:
        config = db.query(BotConfig).filter(BotConfig.id == request.config_id).first()
        if not config:
            raise HTTPException(status_code=404, detail="Bot configuration not found")
    elif request.config:
        # Create new config
        config = BotConfig(**request.config.model_dump())
        db.add(config)
        db.commit()
        db.refresh(config)
    else:
        raise HTTPException(status_code=400, detail="Either config_id or config must be provided")
    
    # Check if bot is already running
    existing_bot = TradingBotManager.get_bot()
    if existing_bot and existing_bot.is_running:
        raise HTTPException(status_code=400, detail="Bot is already running")
    
    # Create a new run record
    run = BotRun(
        config_id=config.id,
        status="running",
        started_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    # Mark config as active
    config.is_active = True
    db.commit()
    
    # Start the bot
    try:
        await TradingBotManager.start_bot(config, run.id, db, alpaca)
        
        return BotStartResponse(
            success=True,
            message=f"Bot started for {config.symbol}",
            run_id=run.id,
            config=BotConfigResponse.model_validate(config)
        )
    
    except Exception as e:
        logger.exception("Failed to start bot")
        run.status = "error"
        run.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to start bot: {str(e)}")


@router.post("/stop")
async def stop_bot(db: Session = Depends(get_db)):
    """Stop the currently running bot"""
    bot = TradingBotManager.get_bot()
    
    if not bot or not bot.is_running:
        raise HTTPException(status_code=400, detail="No bot is currently running")
    
    # Stop the bot
    await TradingBotManager.stop_bot()
    
    # Update config using stored config_id
    if bot.config_id:
        config = db.query(BotConfig).filter(BotConfig.id == bot.config_id).first()
        if config:
            config.is_active = False
            db.commit()
    
    return {"success": True, "message": "Bot stopped successfully"}


@router.get("/status", response_model=BotStatusResponse)
def get_bot_status(db: Session = Depends(get_db)) -> BotStatusResponse:
    """Get current bot status"""
    bot = TradingBotManager.get_bot()
    
    if not bot or not bot.is_running:
        return BotStatusResponse(
            is_running=False,
            config=None,
            current_run_id=None,
            started_at=None,
            signals_generated=0,
            orders_placed=0,
            last_error=None
        )
    
    # Get current run
    run = db.query(BotRun).filter(BotRun.id == bot.run_id).first()
    
    # Get config from database using stored config_id
    config = db.query(BotConfig).filter(BotConfig.id == bot.config_id).first()
    
    return BotStatusResponse(
        is_running=True,
        config=BotConfigResponse.model_validate(config) if config else None,
        current_run_id=bot.run_id,
        started_at=run.started_at if run else None,
        signals_generated=bot.signals_generated,
        orders_placed=bot.orders_placed,
        last_error=bot.last_error,
        # Activity monitoring data
        last_signal=bot.last_signal,
        last_signal_time=bot.last_signal_time,
        current_price=float(bot.current_price) if bot.current_price else None,
        fast_ema_value=float(bot.fast_ema_value) if bot.fast_ema_value else None,
        slow_ema_value=float(bot.slow_ema_value) if bot.slow_ema_value else None,
        last_check_time=bot.last_check_time,
        next_check_time=bot.next_check_time
    )


@router.get("/backtest/history", response_model=List[BacktestResponse])
def get_backtest_history(
    symbol: str = None,
    limit: int = 10,
    db: Session = Depends(get_db)
) -> List[BacktestResponse]:
    """Get historical backtest results"""
    query = db.query(BacktestResultModel)
    
    if symbol:
        query = query.filter(BacktestResultModel.symbol == symbol)
    
    results = query.order_by(BacktestResultModel.created_at.desc()).limit(limit).all()
    
    return [
        BacktestResponse(
            id=r.id,
            symbol=r.symbol,
            timeframe=r.timeframe,
            start_date=r.start_date,
            end_date=r.end_date,
            fast_ema_period=r.fast_ema_period,
            slow_ema_period=r.slow_ema_period,
            initial_capital=r.initial_capital,
            final_capital=r.final_capital,
            total_pnl=r.total_pnl,
            total_pnl_percent=r.total_pnl_percent,
            total_trades=r.total_trades,
            winning_trades=r.winning_trades,
            losing_trades=r.losing_trades,
            win_rate=r.win_rate,
            max_drawdown=r.max_drawdown,
            max_drawdown_percent=r.max_drawdown_percent,
            equity_curve=[
                EquityPoint(
                    timestamp=datetime.fromisoformat(p["timestamp"]),
                    equity=Decimal(str(p["equity"]))
                )
                for p in (r.equity_curve or [])
            ],
            trades=[
                TradeDetail(
                    entry_time=datetime.fromisoformat(t["entry_time"]),
                    exit_time=datetime.fromisoformat(t["exit_time"]) if t.get("exit_time") else None,
                    side=t["side"],
                    entry_price=Decimal(str(t["entry_price"])),
                    exit_price=Decimal(str(t["exit_price"])) if t.get("exit_price") else None,
                    quantity=Decimal(str(t["quantity"])),
                    pnl=Decimal(str(t["pnl"])) if t.get("pnl") else None,
                    pnl_percent=Decimal(str(t["pnl_percent"])) if t.get("pnl_percent") else None,
                    exit_reason=t.get("exit_reason")
                )
                for t in (r.trades or [])
            ],
            created_at=r.created_at
        )
        for r in results
    ]
