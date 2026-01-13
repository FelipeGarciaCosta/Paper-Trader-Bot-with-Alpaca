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

// Current portfolio value from account
export interface AccountPortfolioValue {
  portfolio_value: number;
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
  id: number;
  asset_id: string;
  symbol: string;
  exchange?: string;
  asset_class?: string; // 'crypto' | 'us_equity'
  asset_marginable?: boolean;
  qty?: string;
  avg_entry_price?: number;
  side?: string;
  market_value?: number;
  cost_basis?: number;
  unrealized_pl?: number;
  unrealized_plpc?: number;
  unrealized_intraday_pl?: number;
  unrealized_intraday_plpc?: number;
  current_price?: number;
  lastday_price?: number;
  change_today?: number;
  qty_available?: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
  raw?: unknown;
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

// ---------- Bot Types ----------

export interface BotConfig {
  id?: number;
  user_id?: number;
  symbol: string;
  timeframe: string; // e.g. "5Min", "15Min", "1Hour"
  fast_ema_period: number;
  slow_ema_period: number;
  stop_loss_percent?: number;
  take_profit_percent?: number;
  quantity: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BacktestRequest {
  symbol: string;
  timeframe: string;
  start_date: string; // ISO format
  end_date: string; // ISO format
  fast_ema_period: number;
  slow_ema_period: number;
  initial_capital: number;
  quantity: number;
  stop_loss_percent?: number;
  take_profit_percent?: number;
}

export interface TradeDetail {
  entry_time: string;
  exit_time?: string;
  side: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  pnl?: number;
  pnl_percent?: number;
  exit_reason?: string;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
}

export interface BacktestResult {
  id?: number;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  fast_ema_period: number;
  slow_ema_period: number;
  initial_capital: number;
  final_capital: number;
  total_pnl: number;
  total_pnl_percent: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  max_drawdown: number;
  max_drawdown_percent: number;
  equity_curve: EquityPoint[];
  trades: TradeDetail[];
  created_at?: string;
}

export interface BotStatus {
  is_running: boolean;
  config?: BotConfig;
  current_run_id?: number;
  started_at?: string;
  signals_generated: number;
  orders_placed: number;
  last_error?: string;
  
  // Activity monitoring
  last_signal?: string;
  last_signal_time?: string;
  current_price?: number;
  fast_ema_value?: number;
  slow_ema_value?: number;
  last_check_time?: string;
  next_check_time?: string;
}

export interface BotStartRequest {
  config_id?: number;
  config?: Omit<BotConfig, 'id' | 'created_at' | 'updated_at'>;
}

export interface BotStartResponse {
  success: boolean;
  message: string;
  run_id: number;
  config: BotConfig;
}
