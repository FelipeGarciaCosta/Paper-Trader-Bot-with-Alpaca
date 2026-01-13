"""
Backtesting Service

Simulates trading strategy on historical data without placing real orders.
Completely independent of live trading execution.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import logging

from app.services.strategy import (
    Bar, 
    Signal, 
    SignalType, 
    EMACrossoverStrategy
)

logger = logging.getLogger(__name__)


@dataclass
class BacktestTrade:
    """Represents a completed trade in backtesting"""
    entry_time: datetime
    exit_time: Optional[datetime]
    side: str  # "buy" or "sell"
    entry_price: Decimal
    exit_price: Optional[Decimal]
    quantity: Decimal
    pnl: Optional[Decimal]
    pnl_percent: Optional[Decimal]
    exit_reason: Optional[str]  # "signal", "stop_loss", "take_profit"


@dataclass
class EquityPoint:
    """Point on the equity curve"""
    timestamp: datetime
    equity: Decimal


@dataclass
class BacktestResult:
    """Complete backtest results"""
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
    trades: List[BacktestTrade]


class Backtester:
    """
    Backtesting engine that simulates strategy on historical data.
    
    This is a simple backtester that:
    1. Runs the strategy to generate signals
    2. Simulates entering/exiting positions based on signals
    3. Tracks equity over time
    4. Calculates performance metrics
    """
    
    def __init__(
        self,
        symbol: str,
        timeframe: str,
        strategy: EMACrossoverStrategy,
        initial_capital: Decimal,
        quantity_per_trade: Decimal
    ):
        """
        Initialize backtester.
        
        Args:
            symbol: Trading symbol
            timeframe: Bar timeframe
            strategy: Strategy instance to test
            initial_capital: Starting capital
            quantity_per_trade: Position size for each trade
        """
        self.symbol = symbol
        self.timeframe = timeframe
        self.strategy = strategy
        self.initial_capital = initial_capital
        self.quantity_per_trade = quantity_per_trade
        
        self.current_position: Optional[BacktestTrade] = None
        self.completed_trades: List[BacktestTrade] = []
        self.equity_curve: List[EquityPoint] = []
        self.cash = initial_capital
    
    def run(self, bars: List[Bar]) -> BacktestResult:
        """
        Run backtest on historical bars.
        
        Args:
            bars: Historical price bars (must be sorted chronologically)
        
        Returns:
            Backtest results with all metrics
        """
        if not bars:
            raise ValueError("No bars provided for backtesting")
        
        logger.info(f"Starting backtest for {self.symbol} with {len(bars)} bars")
        
        # Generate all signals from strategy
        signals = self.strategy.generate_signals(bars)
        logger.info(f"Strategy generated {len(signals)} signals")
        
        # Create a map of timestamp -> signal for efficient lookup
        signal_map = {signal.timestamp: signal for signal in signals}
        
        # Simulate trading through each bar
        for i, bar in enumerate(bars):
            # Check for signals at this timestamp
            signal = signal_map.get(bar.timestamp)
            
            # Handle existing position
            if self.current_position is not None:
                self._check_exit_conditions(bar)
            
            # Handle new signals (only if no position)
            if signal and self.current_position is None:
                self._handle_signal(signal, bar)
            
            # Update equity curve
            current_equity = self._calculate_current_equity(bar.close)
            self.equity_curve.append(EquityPoint(
                timestamp=bar.timestamp,
                equity=current_equity
            ))
        
        # Close any remaining position at the end
        if self.current_position is not None:
            final_bar = bars[-1]
            self._close_position(
                final_bar.close, 
                final_bar.timestamp, 
                "end_of_backtest"
            )
        
        # Calculate final metrics
        return self._calculate_results(bars[0].timestamp, bars[-1].timestamp)
    
    def _handle_signal(self, signal: Signal, bar: Bar) -> None:
        """Handle a new trading signal"""
        if signal.signal_type == SignalType.BUY:
            self._open_position("buy", signal.price, bar.timestamp)
        elif signal.signal_type == SignalType.SELL:
            self._open_position("sell", signal.price, bar.timestamp)
    
    def _open_position(self, side: str, price: Decimal, timestamp: datetime) -> None:
        """Open a new position"""
        # Check if we have enough cash
        position_cost = price * self.quantity_per_trade
        if position_cost > self.cash:
            logger.warning(f"Insufficient cash to open {side} position: need {position_cost}, have {self.cash}")
            return
        
        self.current_position = BacktestTrade(
            entry_time=timestamp,
            exit_time=None,
            side=side,
            entry_price=price,
            exit_price=None,
            quantity=self.quantity_per_trade,
            pnl=None,
            pnl_percent=None,
            exit_reason=None
        )
        
        # Deduct cost from cash
        self.cash -= position_cost
        logger.info(f"Opened {side} position at {price}, quantity={self.quantity_per_trade}")
    
    def _check_exit_conditions(self, bar: Bar) -> None:
        """Check if current position should be exited"""
        if self.current_position is None:
            return
        
        # Check stop loss
        if self.strategy.should_exit_on_stop_loss(
            self.current_position.entry_price,
            bar.close,
            self.current_position.side
        ):
            stop_price = self.strategy.calculate_stop_loss(
                self.current_position.entry_price,
                self.current_position.side
            )
            self._close_position(stop_price, bar.timestamp, "stop_loss")
            return
        
        # Check take profit
        if self.strategy.should_exit_on_take_profit(
            self.current_position.entry_price,
            bar.close,
            self.current_position.side
        ):
            tp_price = self.strategy.calculate_take_profit(
                self.current_position.entry_price,
                self.current_position.side
            )
            self._close_position(tp_price, bar.timestamp, "take_profit")
            return
    
    def _close_position(
        self, 
        exit_price: Decimal, 
        timestamp: datetime, 
        reason: str
    ) -> None:
        """Close the current position"""
        if self.current_position is None:
            return
        
        pos = self.current_position
        
        # Calculate PnL
        if pos.side == "buy":
            pnl = (exit_price - pos.entry_price) * pos.quantity
        else:  # sell/short
            pnl = (pos.entry_price - exit_price) * pos.quantity
        
        pnl_percent = (pnl / (pos.entry_price * pos.quantity)) * Decimal(100)
        
        # Update position details
        pos.exit_time = timestamp
        pos.exit_price = exit_price
        pos.pnl = pnl
        pos.pnl_percent = pnl_percent
        pos.exit_reason = reason
        
        # Return position value to cash
        position_value = exit_price * pos.quantity
        self.cash += position_value
        
        # Add to completed trades
        self.completed_trades.append(pos)
        self.current_position = None
        
        logger.info(
            f"Closed {pos.side} position at {exit_price}, "
            f"PnL={pnl:.2f} ({pnl_percent:.2f}%), reason={reason}"
        )
    
    def _calculate_current_equity(self, current_price: Decimal) -> Decimal:
        """Calculate current total equity (cash + position value)"""
        equity = self.cash
        
        if self.current_position is not None:
            position_value = current_price * self.current_position.quantity
            equity += position_value
        
        return equity
    
    def _calculate_results(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> BacktestResult:
        """Calculate final backtest metrics"""
        final_capital = self.equity_curve[-1].equity if self.equity_curve else self.initial_capital
        total_pnl = final_capital - self.initial_capital
        total_pnl_percent = (total_pnl / self.initial_capital) * Decimal(100)
        
        # Count winning and losing trades
        winning_trades = sum(1 for t in self.completed_trades if t.pnl and t.pnl > 0)
        losing_trades = sum(1 for t in self.completed_trades if t.pnl and t.pnl < 0)
        total_trades = len(self.completed_trades)
        
        win_rate = Decimal(0)
        if total_trades > 0:
            win_rate = (Decimal(winning_trades) / Decimal(total_trades)) * Decimal(100)
        
        # Calculate max drawdown
        max_drawdown, max_drawdown_percent = self._calculate_max_drawdown()
        
        return BacktestResult(
            symbol=self.symbol,
            timeframe=self.timeframe,
            start_date=start_date,
            end_date=end_date,
            fast_ema_period=self.strategy.fast_period,
            slow_ema_period=self.strategy.slow_period,
            initial_capital=self.initial_capital,
            final_capital=final_capital,
            total_pnl=total_pnl,
            total_pnl_percent=total_pnl_percent,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            max_drawdown=max_drawdown,
            max_drawdown_percent=max_drawdown_percent,
            equity_curve=self.equity_curve,
            trades=self.completed_trades
        )
    
    def _calculate_max_drawdown(self) -> tuple[Decimal, Decimal]:
        """Calculate maximum drawdown and drawdown percentage"""
        if not self.equity_curve:
            return Decimal(0), Decimal(0)
        
        max_equity = self.equity_curve[0].equity
        max_drawdown = Decimal(0)
        max_drawdown_percent = Decimal(0)
        
        for point in self.equity_curve:
            if point.equity > max_equity:
                max_equity = point.equity
            
            drawdown = max_equity - point.equity
            if drawdown > max_drawdown:
                max_drawdown = drawdown
                if max_equity > 0:
                    max_drawdown_percent = (drawdown / max_equity) * Decimal(100)
        
        return max_drawdown, max_drawdown_percent
