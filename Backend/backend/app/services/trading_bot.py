"""
Live Trading Bot Service

Manages the execution of trading strategies in real-time (paper trading).
Periodically fetches latest bars, runs strategy, and places orders via Alpaca.

Architecture:
- Uses asyncio for non-blocking periodic execution
- Completely separate from backtesting
- Uses the same strategy engine for signal generation
- Handles order placement through Alpaca
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.bot_config import BotConfig, BotRun
from app.services.alpaca_client import AlpacaClient
from app.services.strategy import Bar, EMACrossoverStrategy, SignalType

logger = logging.getLogger(__name__)


class TradingBotManager:
    """
    Singleton manager for the live trading bot.
    Ensures only one bot instance runs at a time.
    """
    
    _instance: Optional['TradingBot'] = None
    _lock = asyncio.Lock()
    
    @classmethod
    async def start_bot(
        cls, 
        config: BotConfig, 
        run_id: int,
        db: Session,
        alpaca_client: AlpacaClient
    ) -> 'TradingBot':
        """Start the trading bot with given configuration"""
        async with cls._lock:
            if cls._instance is not None and cls._instance.is_running:
                raise RuntimeError("Bot is already running")
            
            cls._instance = TradingBot(config, run_id, db, alpaca_client)
            asyncio.create_task(cls._instance.run())
            
            return cls._instance
    
    @classmethod
    async def stop_bot(cls) -> None:
        """Stop the currently running bot"""
        async with cls._lock:
            if cls._instance is not None:
                await cls._instance.stop()
                cls._instance = None
    
    @classmethod
    def get_bot(cls) -> Optional['TradingBot']:
        """Get the current bot instance"""
        return cls._instance


class TradingBot:
    """
    Live trading bot that executes strategy in real-time.
    
    Workflow:
    1. Periodically fetch latest bars from Alpaca
    2. Run strategy to check for signals
    3. If signal and no position, place order
    4. Monitor positions for stop loss / take profit
    """
    
    def __init__(
        self,
        config: BotConfig,
        run_id: int,
        db: Session,
        alpaca_client: AlpacaClient
    ):
        """
        Initialize trading bot.
        
        Args:
            config: Bot configuration
            run_id: Database ID of the current run
            db: Database session
            alpaca_client: Alpaca API client
        """
        self.config = config
        self.config_id = config.id  # Store ID to avoid detached instance errors
        
        # Extract config values as simple attributes to avoid detached instance errors
        self.symbol = config.symbol
        self.timeframe = config.timeframe
        self.quantity = config.quantity
        self.fast_ema_period = config.fast_ema_period
        self.slow_ema_period = config.slow_ema_period
        self.stop_loss_percent = config.stop_loss_percent
        self.take_profit_percent = config.take_profit_percent
        
        self.run_id = run_id
        self.db = db
        self.alpaca = alpaca_client
        
        # Initialize strategy
        self.strategy = EMACrossoverStrategy(
            fast_period=self.fast_ema_period,
            slow_period=self.slow_ema_period,
            stop_loss_percent=self.stop_loss_percent,
            take_profit_percent=self.take_profit_percent
        )
        
        # Bot state
        self.is_running = False
        self.signals_generated = 0
        self.orders_placed = 0
        self.last_error: Optional[str] = None
        
        # Activity monitoring
        self.last_signal: Optional[str] = None  # "BUY", "SELL", or None
        self.last_signal_time: Optional[datetime] = None
        self.current_price: Optional[Decimal] = None
        self.fast_ema_value: Optional[Decimal] = None
        self.slow_ema_value: Optional[Decimal] = None
        self.last_check_time: Optional[datetime] = None
        self.next_check_time: Optional[datetime] = None
        
        # Execution interval (in seconds)
        # For 5Min bars, check every 5 minutes
        self.check_interval = self._get_check_interval()
    
    def _get_check_interval(self) -> int:
        """Determine check interval based on timeframe"""
        timeframe = self.timeframe.lower()
        
        if 'min' in timeframe:
            minutes = int(timeframe.replace('min', ''))
            return minutes * 60
        elif 'hour' in timeframe:
            hours = int(timeframe.replace('hour', ''))
            return hours * 3600
        elif 'day' in timeframe:
            return 86400  # 1 day
        else:
            return 300  # Default to 5 minutes
    
    async def run(self) -> None:
        """Main bot loop"""
        self.is_running = True
        logger.info(f"Trading bot started for {self.symbol} on {self.timeframe}")
        
        try:
            while self.is_running:
                await self._execute_cycle()
                await asyncio.sleep(self.check_interval)
        
        except Exception as e:
            logger.exception("Bot encountered an error")
            self.last_error = str(e)
            self._update_run_status("error", str(e))
        
        finally:
            self.is_running = False
            logger.info("Trading bot stopped")
    
    async def stop(self) -> None:
        """Stop the bot gracefully"""
        logger.info("Stopping trading bot...")
        self.is_running = False
        self._update_run_status("stopped")
    
    async def _execute_cycle(self) -> None:
        """Execute one trading cycle"""
        try:
            logger.debug(f"Executing bot cycle for {self.symbol}")
            
            # Update timing
            self.last_check_time = datetime.utcnow()
            self.next_check_time = self.last_check_time + timedelta(seconds=self.check_interval)
            
            # 1. Fetch latest bars
            bars = await self._fetch_latest_bars()
            
            if len(bars) < self.strategy.slow_period:
                logger.warning(f"Not enough bars ({len(bars)}) for strategy")
                return
            
            # Update current price from latest bar
            if bars:
                self.current_price = bars[-1].close
            
            # 2. Check current position
            has_position = await self._check_existing_position()
            
            # 3. Generate signals and calculate EMAs
            signals = self.strategy.generate_signals(bars)
            
            # Extract EMA values from strategy state (if available)
            if hasattr(self.strategy, '_last_fast_ema'):
                self.fast_ema_value = self.strategy._last_fast_ema
            if hasattr(self.strategy, '_last_slow_ema'):
                self.slow_ema_value = self.strategy._last_slow_ema
            
            # 4. Act on signals (only if no position)
            if signals and not has_position:
                latest_signal = signals[-1]  # Most recent signal
                self.signals_generated += 1
                
                # Track signal details
                self.last_signal = latest_signal.signal_type.value.upper()
                self.last_signal_time = datetime.utcnow()
                
                await self._handle_signal(latest_signal)
            
            # 5. Update run statistics
            self._update_run_stats()
        
        except Exception as e:
            logger.exception("Error in bot cycle")
            self.last_error = str(e)
    
    async def _fetch_latest_bars(self) -> list[Bar]:
        """Fetch latest bars from Alpaca"""
        # Calculate lookback period (need enough bars for slow EMA + buffer)
        lookback_bars = self.strategy.slow_period * 2
        
        # Determine if symbol is crypto or stock
        is_crypto = '/' in self.symbol
        
        # Calculate start time based on timeframe
        end_time = datetime.utcnow()
        start_time = self._calculate_start_time(end_time, lookback_bars)
        
        # Format date for Alpaca API (YYYY-MM-DD format)
        start_date_str = start_time.strftime('%Y-%m-%d')
        
        try:
            if is_crypto:
                # Fetch crypto bars
                bars_data = self.alpaca.get_crypto_bars(
                    symbols=self.symbol,
                    timeframe=self.timeframe,
                    start=start_date_str,
                    limit=lookback_bars
                )
            else:
                # Fetch stock bars
                bars_data = self.alpaca.get_stock_bars(
                    symbol=self.symbol,
                    timeframe=self.timeframe,
                    start=start_date_str,
                    limit=lookback_bars
                )
            
            # Convert to Bar objects
            bars = [Bar.from_alpaca_bar(b) for b in bars_data]
            logger.debug(f"Fetched {len(bars)} bars for {self.symbol}")
            
            return bars
        
        except Exception as e:
            logger.error(f"Failed to fetch bars: {e}")
            return []
    
    def _calculate_start_time(self, end_time: datetime, num_bars: int) -> datetime:
        """Calculate start time based on number of bars needed"""
        timeframe = self.timeframe.lower()
        
        if 'min' in timeframe:
            minutes = int(timeframe.replace('min', ''))
            delta = timedelta(minutes=minutes * num_bars)
        elif 'hour' in timeframe:
            hours = int(timeframe.replace('hour', ''))
            delta = timedelta(hours=hours * num_bars)
        elif 'day' in timeframe:
            delta = timedelta(days=num_bars)
        else:
            delta = timedelta(hours=num_bars)  # Default
        
        return end_time - delta
    
    async def _check_existing_position(self) -> bool:
        """Check if we have an open position for this symbol"""
        try:
            positions = self.alpaca.list_positions()
            
            for pos in positions:
                if pos.get('symbol') == self.symbol:
                    logger.debug(f"Found existing position for {self.symbol}")
                    return True
            
            return False
        
        except Exception as e:
            logger.error(f"Failed to check positions: {e}")
            return False  # Assume no position to be safe
    
    async def _handle_signal(self, signal) -> None:
        """Handle a trading signal by placing an order"""
        try:
            if signal.signal_type == SignalType.BUY:
                self._place_buy_order()
            elif signal.signal_type == SignalType.SELL:
                self._place_sell_order()
        
        except Exception as e:
            logger.error(f"Failed to handle signal: {e}")
            self.last_error = str(e)
    
    def _place_buy_order(self) -> None:
        """Place a buy order"""
        try:
            # Prepare order parameters
            order_params = {
                'symbol': self.symbol,
                'qty': str(self.quantity),
                'side': 'buy',
                'type': 'market',
                'time_in_force': 'gtc'
            }
            
            # Add stop loss and take profit if configured
            if self.stop_loss_percent:
                stop_loss_price = self.strategy.calculate_stop_loss(
                    Decimal(str(0)),  # Will be filled by Alpaca based on execution price
                    'buy'
                )
                # Note: Alpaca supports bracket orders with stop_loss and take_profit
                # For simplicity, we'll place a basic market order here
                # You can extend this to use bracket orders
            
            order = self.alpaca.submit_order(**order_params)
            self.orders_placed += 1
            
            logger.info(f"Placed BUY order for {self.symbol}: {order}")
        
        except Exception as e:
            logger.error(f"Failed to place buy order: {e}")
            raise
    
    def _place_sell_order(self) -> None:
        """Place a sell order (or close position if long)"""
        try:
            # Check if we have a long position to close
            positions = self.alpaca.list_positions()
            has_long_position = any(
                p.get('symbol') == self.symbol and p.get('side') == 'long'
                for p in positions
            )
            
            if has_long_position:
                # Close the position
                self.alpaca.delete_position(self.symbol)
                self.orders_placed += 1
                logger.info(f"Closed long position for {self.symbol}")
            else:
                # Place a short sell order (if allowed)
                # Note: Paper trading may not support shorting all assets
                logger.info(f"SELL signal but no long position to close for {self.symbol}")
        
        except Exception as e:
            logger.error(f"Failed to place sell order: {e}")
            raise
    
    def _update_run_status(self, status: str, error_msg: Optional[str] = None) -> None:
        """Update the bot run status in database"""
        try:
            run = self.db.query(BotRun).filter(BotRun.id == self.run_id).first()
            if run:
                run.status = status
                if error_msg:
                    run.error_message = error_msg
                if status in ["stopped", "error"]:
                    run.stopped_at = datetime.utcnow()
                self.db.commit()
        except Exception as e:
            logger.error(f"Failed to update run status: {e}")
            self.db.rollback()
    
    def _update_run_stats(self) -> None:
        """Update run statistics"""
        try:
            run = self.db.query(BotRun).filter(BotRun.id == self.run_id).first()
            if run:
                run.signals_generated = self.signals_generated
                run.orders_placed = self.orders_placed
                self.db.commit()
        except Exception as e:
            logger.error(f"Failed to update run stats: {e}")
            self.db.rollback()
