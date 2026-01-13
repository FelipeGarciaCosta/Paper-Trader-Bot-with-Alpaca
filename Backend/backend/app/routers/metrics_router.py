from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.position import Position
from app.models.order import Order
from app.models.user import User
from app.core.dependencies import get_current_user
from decimal import Decimal

router = APIRouter()


@router.get("/")
def get_trading_metrics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Calculate trading metrics based on current positions and order history.
    """
    # Get all positions
    positions = db.query(Position).all()
    
    # Get all filled orders
    filled_orders = db.query(Order).filter(Order.status == "filled").all()
    
    # Calculate metrics from positions
    total_pnl = Decimal("0")
    total_pnl_percent = Decimal("0")
    max_drawdown = Decimal("0")
    max_drawdown_percent = Decimal("0")
    
    position_count = 0
    for position in positions:
        if position.unrealized_pl:
            total_pnl += Decimal(str(position.unrealized_pl))
            position_count += 1
        
        # Calculate drawdown (negative unrealized_pl)
        if position.unrealized_pl and Decimal(str(position.unrealized_pl)) < 0:
            if Decimal(str(position.unrealized_pl)) < max_drawdown:
                max_drawdown = Decimal(str(position.unrealized_pl))
        
        if position.unrealized_plpc:
            total_pnl_percent += Decimal(str(position.unrealized_plpc))
            if Decimal(str(position.unrealized_plpc)) < max_drawdown_percent:
                max_drawdown_percent = Decimal(str(position.unrealized_plpc))
    
    # Calculate average P/L percent if we have positions
    if position_count > 0:
        avg_pnl_percent = total_pnl_percent / position_count
    else:
        avg_pnl_percent = Decimal("0")
    
    # Calculate win/loss metrics from filled orders
    # Group buy and sell orders by symbol to determine trades
    symbol_trades = {}
    
    for order in filled_orders:
        symbol = order.symbol
        if symbol not in symbol_trades:
            symbol_trades[symbol] = {"buys": [], "sells": []}
        
        if order.side == "buy":
            symbol_trades[symbol]["buys"].append(order)
        elif order.side == "sell":
            symbol_trades[symbol]["sells"].append(order)
    
    # Calculate completed trades (matching buys and sells)
    winning_trades = 0
    losing_trades = 0
    total_wins = Decimal("0")
    total_losses = Decimal("0")
    
    for symbol, trades in symbol_trades.items():
        buys = trades["buys"]
        sells = trades["sells"]
        
        # Calculate average buy price and average sell price
        if not buys or not sells:
            continue
        
        # Calculate average buy price
        total_buy_qty = Decimal("0")
        total_buy_cost = Decimal("0")
        for buy in buys:
            if buy.filled_avg_price and buy.qty:
                qty = Decimal(str(buy.qty))
                price = Decimal(str(buy.filled_avg_price))
                total_buy_qty += qty
                total_buy_cost += price * qty
        
        # Calculate average sell price
        total_sell_qty = Decimal("0")
        total_sell_revenue = Decimal("0")
        for sell in sells:
            if sell.filled_avg_price and sell.qty:
                qty = Decimal(str(sell.qty))
                price = Decimal(str(sell.filled_avg_price))
                total_sell_qty += qty
                total_sell_revenue += price * qty
        
        # Only calculate if we have both buys and sells
        if total_buy_qty > 0 and total_sell_qty > 0:
            avg_buy_price = total_buy_cost / total_buy_qty
            avg_sell_price = total_sell_revenue / total_sell_qty
            
            # Compare average prices, not totals
            # If sell price is higher than buy price, it's a win
            if avg_sell_price > avg_buy_price:
                # Calculate P/L based on the quantity sold
                trade_pnl = (avg_sell_price - avg_buy_price) * total_sell_qty
                winning_trades += 1
                total_wins += trade_pnl
            elif avg_sell_price < avg_buy_price:
                trade_pnl = (avg_buy_price - avg_sell_price) * total_sell_qty
                losing_trades += 1
                total_losses += trade_pnl
    
    # Calculate derived metrics
    total_trades = winning_trades + losing_trades
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    
    average_win = (total_wins / winning_trades) if winning_trades > 0 else 0
    average_loss = (total_losses / losing_trades) if losing_trades > 0 else 0
    
    profit_factor = (total_wins / total_losses) if total_losses > 0 else (total_wins if total_wins > 0 else 0)
    
    # Sharpe ratio is complex to calculate properly, so we'll use a simplified version
    # For now, return a placeholder based on profit factor
    sharpe_ratio = float(profit_factor) * 0.5 if profit_factor > 0 else 0
    
    return {
        "total_trades": total_trades,
        "winning_trades": winning_trades,
        "losing_trades": losing_trades,
        "win_rate": float(win_rate),
        "total_pnl": float(total_pnl),
        "total_pnl_percent": float(avg_pnl_percent),
        "average_win": float(average_win),
        "average_loss": float(average_loss),
        "profit_factor": float(profit_factor),
        "max_drawdown": float(max_drawdown),
        "max_drawdown_percent": float(max_drawdown_percent),
        "sharpe_ratio": sharpe_ratio,
    }
