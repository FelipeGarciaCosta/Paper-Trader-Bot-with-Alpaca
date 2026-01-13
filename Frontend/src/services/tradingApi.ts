import type {
  PriceData,
  AlpacaBar,
  RealtimePrice,
  Order,
  Position,
  ClosedPosition,
  TradingMetrics,
  CreateOrderRequest,
  PriceHistoryRequest,
  PortfolioValue,
  BotConfig,
  BacktestRequest,
  BacktestResult,
  BotStatus,
  BotStartRequest,
  BotStartResponse,
} from '@/types/trading';

const BASE_URL = 'http://localhost:8000';

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Mock data generators 
const generateMockAlpacaBars = (symbol: string): AlpacaBar[] => {
  const data: AlpacaBar[] = [];
  let price = 50000; // Starting price
  const now = Date.now();

  for (let i = 100; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 60 * 1000).toISOString();
    const change = (Math.random() - 0.48) * 1000;
    price += change;

    const high = price + Math.random() * 500;
    const low = price - Math.random() * 500;
    const volume = Math.random() * 1000000;

    data.push({
      t: timestamp,
      o: price - change / 2,
      h: high,
      l: low,
      c: price,
      v: Math.floor(volume),
      n: Math.floor(Math.random() * 1000) + 100,
      vw: price,
    });
  }

  return data;
};

const generateMockPriceHistory = (symbol: string): PriceData[] => {
  const bars = generateMockAlpacaBars(symbol);
  return bars.map(bar => ({
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }));
};

const generateMockPortfolioHistory = (timeRange: string): PortfolioValue[] => {
  const data: PortfolioValue[] = [];
  let value = 100000; // Starting portfolio value
  const now = Date.now();

  let periods = 30;
  let interval = 24 * 60 * 60 * 1000; // 1 day

  switch (timeRange) {
    case '1D':
      periods = 24;
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case '1M':
      periods = 30;
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
    case '1Y':
      periods = 365;
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
    case 'ALL':
      periods = 730; // 2 years
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
  }

  for (let i = periods; i >= 0; i--) {
    const timestamp = new Date(now - i * interval).toISOString();
    const change = (Math.random() - 0.48) * 500;
    value += change;

    data.push({
      timestamp,
      value: Math.max(value, 0),
    });
  }

  return data;
};

const mockPositions: Position[] = [
  {
    id: 1,
    asset_id: 'mock-asset-1',
    symbol: 'BTC/USD',
    asset_class: 'crypto',
    qty: '0.5',
    avg_entry_price: 48500,
    current_price: 50234,
    market_value: 25117,
    unrealized_pl: 867,
    unrealized_plpc: 3.57,
  },
];

const mockClosedPositions: ClosedPosition[] = [
  {
    id: 'c1',
    symbol: 'ETHUSD',
    side: 'buy',
    entry_price: 3200,
    exit_price: 3450,
    quantity: 2,
    realized_pnl: 500,
    realized_pnl_percent: 7.81,
    opened_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    closed_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'c2',
    symbol: 'BTC/USD',
    side: 'sell',
    entry_price: 51000,
    exit_price: 49500,
    quantity: 0.3,
    realized_pnl: 450,
    realized_pnl_percent: 2.94,
    opened_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    closed_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
];

/**
 * GET /prices?symbol=XYZ&start=...&end=...
 * Fetches historical price data for a symbol
 */
export const getPriceHistory = async (
  params: PriceHistoryRequest,
  signal?: AbortSignal
): Promise<PriceData[]> => {
  // Map frontend interval shorthand to Alpaca timeframe strings
  const intervalToTimeframe = (interval?: string) => {
    switch (interval) {
      case '1m':
        return '1Min';
      case '5m':
        return '5Min';
      case '15m':
        return '15Min';
      case '1h':
        return '1Hour';
      case '4h':
        return '4Hour';
      case '1d':
        return '1Day';
      default:
        // default timeframe used by the chart is 5 minutes
        return '5Min';
    }
  };

  // If the symbol looks like a crypto (contains a slash like BTC/USD) route to crypto endpoint
  if (params.symbol.includes('/')) {
    const tf = intervalToTimeframe(params.interval);
    const cryptoBars = await getCryptoHistory({ symbols: params.symbol, timeframe: tf, start: params.start, end: params.end, limit: 1000, sort: 'asc' }, signal);
    return cryptoBars.map(b => ({
      timestamp: b.timestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
    }));
  }

  const paramsObj: Record<string, string> = {
    symbol: params.symbol,
    timeframe: intervalToTimeframe(params.interval),
  };

  if (params.start) paramsObj.start = params.start;
  if (params.end) paramsObj.end = params.end;

  const queryParams = new URLSearchParams(paramsObj);
  const response = await fetch(`${BASE_URL}/market-data/prices?${queryParams.toString()}`, { signal });
  if (!response.ok) throw new Error('Failed to fetch price history');
  return response.json();
};

/**
 * POST /orders
 * Creates a new order
 */
export const createOrder = async (order: CreateOrderRequest): Promise<Order> => {
  const response = await fetch(`${BASE_URL}/orders/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(order),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create order' }));
    throw new Error(error.detail || 'Failed to create order');
  }
  return response.json();
};

/** * Cancels an order by alpaca_id
 */
export const cancelOrder = async (orderId: string): Promise<void> => {
  const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to cancel order' }));
    throw new Error(error.detail || 'Failed to cancel order');
  }
};

/** * GET /positions
 * Fetches all open positions from database
 */
export const getOpenPositions = async (): Promise<Position[]> => {
  const response = await fetch(`${BASE_URL}/positions/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch positions');
  return response.json();
};

/**
 * POST /positions/sync
 * Syncs positions from Alpaca to database
 */
export const syncPositions = async (): Promise<Position[]> => {
  const response = await fetch(`${BASE_URL}/positions/sync`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to sync positions');
  return response.json();
};

/**
 * DELETE /positions/{symbol_or_asset_id}
 * Liquidates a position (closes it on Alpaca)
 */
export const liquidatePosition = async (symbolOrAssetId: string): Promise<Order> => {
  const response = await fetch(`${BASE_URL}/positions/${symbolOrAssetId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to liquidate position');
  return response.json();
};

/**
 * GET /history?symbol=XYZ
 * Fetches trading history (closed positions)
 */
export const getTradingHistory = async (symbol?: string): Promise<ClosedPosition[]> => {
  // TODO: Uncomment when connecting to real backend
  /*
  const url = symbol 
    ? `${BASE_URL}/history?symbol=${symbol}`
    : `${BASE_URL}/history`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
  */

  // Mock implementation
  await new Promise(resolve => setTimeout(resolve, 300));
  return symbol
    ? mockClosedPositions.filter(p => p.symbol === symbol)
    : mockClosedPositions;
};

/**
 * GET /portfolio/history?timeRange=1M
 * Fetches portfolio value over time
 */
export const getPortfolioHistory = async (
  timeRange: string,
  options?: { signal?: AbortSignal }
): Promise<PortfolioValue[]> => {
  // Call backend endpoint to retrieve portfolio history
  const params = new URLSearchParams({ timeRange });
  const response = await fetch(`${BASE_URL}/portfolio/history?${params.toString()}`, { signal: options?.signal });
  if (!response.ok) throw new Error('Failed to fetch portfolio history');
  return response.json();
};

/**
 * GET /portfolio/value
 * Fetches current portfolio value from Alpaca account
 */
export const getAccountPortfolioValue = async (signal?: AbortSignal): Promise<number> => {
  const response = await fetch(`${BASE_URL}/portfolio/value`, { signal });
  if (!response.ok) throw new Error('Failed to fetch portfolio value');
  const data: { portfolio_value: number } = await response.json();
  return data.portfolio_value;
};

interface CryptoBar {
  symbol: string;
  timeframe: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * GET /market-data/crypto/{loc}/bars
 * Fetches historical crypto bars proxied by backend and maps to PriceData[] used by charts
 */
export const getCryptoHistory = async (
  params: {
    loc?: string;
    symbols: string;
    timeframe?: string;
    start?: string;
    end?: string;
    limit?: number;
    sort?: 'asc' | 'desc';
  },
  signal?: AbortSignal
): Promise<PriceData[]> => {
  const {
    loc = 'us',
    symbols,
    timeframe = '1Min',
    start,
    end,
    limit = 1000,
    sort = 'asc',
  } = params;

  const q: Record<string, string> = {
    symbols,
    timeframe,
    limit: String(limit),
    sort,
  };
  if (start) q.start = start;
  if (end) q.end = end;

  const query = new URLSearchParams(q);
  const url = `${BASE_URL}/market-data/crypto/${encodeURIComponent(loc)}/bars?${query.toString()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Failed to fetch crypto history');

  const data = await res.json();
  // backend returns array of { symbol, timeframe, timestamp, open, high, low, close, volume, ... }
  return (data as CryptoBar[]).map((b) => ({
    timestamp: b.timestamp,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
  }));
};

export const syncOrders = async (): Promise<void> => {
  const response = await fetch(`${BASE_URL}/orders/sync`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to sync orders');
  return response.json();

};

/**
 * GET /orders/recent
 * Fetches recent orders with all statuses
 */
export const getRecentOrders = async (): Promise<Order[]> => {
  // TODO: Uncomment when connecting to real backend

  //sync before fetching
  await syncOrders();
  const response = await fetch(`${BASE_URL}/orders/?status=all`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch recent orders');
  return response.json();


  // Mock implementation used during development
  await new Promise(resolve => setTimeout(resolve, 300));

  const mockOrders: Order[] = [
    {
      id: 'order_1',
      symbol: 'BTC/USD',
      side: 'buy',
      order_type: 'market',
      qty: 0.5,
      status: 'filled',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      filled_at: new Date(Date.now() - 86400000 + 1000).toISOString(),
      filled_avg_price: 50234,
    }
  ];

  return mockOrders;
};

/**
 * GET /metrics
 * Fetches aggregated trading metrics
 */
export const getTradingMetrics = async (): Promise<TradingMetrics> => {
  const response = await fetch(`${BASE_URL}/metrics/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch metrics');
  return response.json();
};

// ---------- Bot API Functions ----------

/**
 * POST /bot/config
 * Create or update bot configuration
 */
export const saveBotConfig = async (config: Omit<BotConfig, 'id' | 'created_at' | 'updated_at'>): Promise<BotConfig> => {
  const response = await fetch(`${BASE_URL}/bot/config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to save bot config' }));
    throw new Error(error.detail || 'Failed to save bot config');
  }
  return response.json();
};

/**
 * GET /bot/config/{symbol}
 * Get bot configuration for a symbol
 */
export const getBotConfig = async (symbol: string): Promise<BotConfig> => {
  const response = await fetch(`${BASE_URL}/bot/config/${encodeURIComponent(symbol)}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Bot configuration not found');
    }
    throw new Error('Failed to fetch bot config');
  }
  return response.json();
};

/**
 * GET /bot/config
 * List all bot configurations
 */
export const listBotConfigs = async (): Promise<BotConfig[]> => {
  const response = await fetch(`${BASE_URL}/bot/config`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch bot configs');
  return response.json();
};

/**
 * POST /bot/backtest
 * Run a backtest
 */
export const runBacktest = async (request: BacktestRequest): Promise<BacktestResult> => {
  const response = await fetch(`${BASE_URL}/bot/backtest`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to run backtest' }));
    throw new Error(error.detail || 'Failed to run backtest');
  }
  return response.json();
};

/**
 * GET /bot/backtest/history
 * Get historical backtest results
 */
export const getBacktestHistory = async (symbol?: string, limit: number = 10): Promise<BacktestResult[]> => {
  const params = new URLSearchParams();
  if (symbol) params.append('symbol', symbol);
  params.append('limit', limit.toString());
  
  const response = await fetch(`${BASE_URL}/bot/backtest/history?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch backtest history');
  return response.json();
};

/**
 * POST /bot/start
 * Start the trading bot
 */
export const startBot = async (request: BotStartRequest): Promise<BotStartResponse> => {
  const response = await fetch(`${BASE_URL}/bot/start`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to start bot' }));
    throw new Error(error.detail || 'Failed to start bot');
  }
  return response.json();
};

/**
 * POST /bot/stop
 * Stop the trading bot
 */
export const stopBot = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${BASE_URL}/bot/stop`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to stop bot' }));
    throw new Error(error.detail || 'Failed to stop bot');
  }
  return response.json();
};

/**
 * GET /bot/status
 * Get bot status
 */
export const getBotStatus = async (): Promise<BotStatus> => {
  const response = await fetch(`${BASE_URL}/bot/status`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch bot status');
  return response.json();
};
