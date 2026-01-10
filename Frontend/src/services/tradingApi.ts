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
} from '@/types/trading';

const BASE_URL = 'http://localhost:8000';

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
    id: '1',
    symbol: 'BTC/USD',
    side: 'buy',
    entry_price: 48500,
    quantity: 0.5,
    current_price: 50234,
    unrealized_pnl: 867,
    unrealized_pnl_percent: 3.57,
    stop_loss: 47000,
    take_profit: 52000,
    opened_at: new Date(Date.now() - 86400000 * 2).toISOString(),
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
  // TODO: Uncomment when connecting to real backend
  /*
  const response = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  if (!response.ok) throw new Error('Failed to create order');
  return response.json();
  */
  // Mock implementation
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    id: `order_${Date.now()}`,
    ...order,
    qty: order.quantity,
    order_type: order.type,
    status: 'filled',
    created_at: new Date().toISOString(),
    filled_avg_price: order.price || 50234,
    filled_at: new Date().toISOString(),
  };
};

/**
 * GET /positions
 * Fetches all open positions
 */
export const getOpenPositions = async (): Promise<Position[]> => {
  // TODO: Uncomment when connecting to real backend
  /*
  const response = await fetch(`${BASE_URL}/positions`);
  if (!response.ok) throw new Error('Failed to fetch positions');
  return response.json();
  */

  // Mock implementation
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockPositions;
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
  options?: { store?: boolean; signal?: AbortSignal }
): Promise<PortfolioValue[]> => {
  // Call backend endpoint to retrieve portfolio history
  const paramsObj: Record<string, string> = { timeRange };
  if (options?.store !== undefined) {
    paramsObj.store = options.store ? 'true' : 'false';
  }
  const params = new URLSearchParams(paramsObj);
  const response = await fetch(`${BASE_URL}/portfolio/history?${params.toString()}`, { signal: options?.signal });
  if (!response.ok) throw new Error('Failed to fetch portfolio history');
  return response.json();
};

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
  return (data as Array<any>).map((b) => ({
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
    headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`${BASE_URL}/orders/?status=all`);
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
  // TODO: Uncomment when connecting to real backend
  /*
  const response = await fetch(`${BASE_URL}/metrics`);
  if (!response.ok) throw new Error('Failed to fetch metrics');
  return response.json();
  */

  // Mock implementation
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    total_trades: 24,
    winning_trades: 16,
    losing_trades: 8,
    win_rate: 66.67,
    total_pnl: 5420,
    total_pnl_percent: 12.4,
    average_win: 520,
    average_loss: -280,
    profit_factor: 1.86,
    max_drawdown: -1250,
    max_drawdown_percent: -3.2,
    sharpe_ratio: 1.8,
  };
};
