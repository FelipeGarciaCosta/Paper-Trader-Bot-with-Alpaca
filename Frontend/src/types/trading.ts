//TENGO QUE REVISAR LOS TIPOS NUEVAMENTE POR CAMBIO DE API ALPACA :))))))9

export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'all' | 'open' | 'closed' | 'new' | 'accepted' | 'filled' | 'expired' | 'canceled' | 'replaced' | 'rejected' | 'suspended' | 'partially filled' | 'pending cancel' | 'pending new' | 'pending replace' | 'pending review';

// Alpaca Bar format
export interface AlpacaBar {
  t: string; // Timestamp in RFC-3339 format with nanosecond precision
  o: number; // Opening price
  h: number; // High price
  l: number; // Low price
  c: number; // Closing price
  v: number; // Bar volume
  n: number; // Trade count in the bar
  vw: number; // Volume weighted average price
}

export interface PriceData {
  timestamp: string; // ISO format
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Portfolio value over time
export interface PortfolioValue {
  timestamp: string;
  value: number;
}

export interface RealtimePrice {
  symbol: string;
  price: number;
  timestamp: string;
  change_24h: number;
  change_percent_24h: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  order_type: OrderType;
  qty: number;
  price?: number; // For limit orders
  stop_loss?: number;
  take_profit?: number;
  status: OrderStatus;
  created_at: string;
  filled_at?: string;
  filled_avg_price?: number;
  alpaca_id?: string;
  updated_at?: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: OrderSide;
  entry_price: number;
  quantity: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  stop_loss?: number;
  take_profit?: number;
  opened_at: string;
}

export interface ClosedPosition {
  id: string;
  symbol: string;
  side: OrderSide;
  entry_price: number;
  exit_price: number;
  quantity: number;
  realized_pnl: number;
  realized_pnl_percent: number;
  opened_at: string;
  closed_at: string;
}

export interface TradingMetrics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  total_pnl_percent: number;
  average_win: number;
  average_loss: number;
  profit_factor: number;
  max_drawdown: number;
  max_drawdown_percent: number;
  sharpe_ratio?: number;
}

// Request types for API calls
export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stop_loss?: number;
  take_profit?: number;
}

export interface PriceHistoryRequest {
  symbol: string;
  start?: string; // ISO format
  end?: string; // ISO format
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
}
