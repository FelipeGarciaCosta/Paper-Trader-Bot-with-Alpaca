import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { getPriceHistory } from '@/services/tradingApi';
import type { PriceData, RealtimePrice } from '@/types/trading';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TradingChartProps {
  symbol: string;
}

export const TradingChart = ({ symbol }: TradingChartProps) => {
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  const [realtimePrice, setRealtimePrice] = useState<RealtimePrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1d'>('5m');

  useEffect(() => {
    const controller = new AbortController();
    const computeStartForTimeframe = (tf: string) => {
      const now = new Date();
      const start = new Date(now);
      switch (tf) {
        case '1m':
          start.setDate(now.getDate() - 0.5); // last 12 hours
          break;
        case '5m':
          start.setDate(now.getDate() - 3); // last 3 days
          break;
        case '15m':
          start.setDate(now.getDate() - 7); // last week
          break;
        case '1h':
          start.setDate(now.getDate() - 14); // last 2 weeks
          break;
        case '4h':
          start.setDate(now.getDate() - 7); // last week
          break;
        case '1d':
        default:
          start.setDate(now.getDate() - 30); // last month
          break;
      }
      return start.toISOString();
    };

    const loadData = async () => {
      setLoading(true);
      try {
        const start = computeStartForTimeframe(timeframe);
        const history = await getPriceHistory({ symbol, interval: timeframe, start } as any, controller.signal);
        setPriceHistory(history);

        // Derive realtime-like data from the fetched history: take the last bar as current price
        if (history && history.length > 0) {
          const last = history[history.length - 1];
          const first = history[0];
          const price = Number(last.close);
          const change_24h = Number(last.close) - Number(first.close);
          const change_percent_24h = first && Number(first.close) !== 0 ? (change_24h / Number(first.close)) * 100 : 0;
          setRealtimePrice({
            symbol,
            price,
            timestamp: String(last.timestamp),
            change_24h,
            change_percent_24h,
          } as RealtimePrice);
        } else {
          setRealtimePrice(null);
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        setLoading(false);
      }
    };
    let cancelled = false;
    const isFetching = { current: false } as { current: boolean };

    // Schedule initial load
    (async () => {
      if (isFetching.current) return;
      isFetching.current = true;
      try {
        await loadData();
      } finally {
        isFetching.current = false;
      }
    })();

    // Determine polling interval for realtime price based on selected timeframe
    const getPollMs = (intv: string) => {
      switch (intv) {
        case '1m':
        case '5m':
          return 5000; // 5s for high-frequency intervals
        case '15m':
          return 15000; // 15s
        case '1h':
          return 30000; // 30s
        case '4h':
        case '1d':
        default:
          return 60000; // 60s for larger intervals
      }
    };

    const pollMs = getPollMs(timeframe);
    const pollId = window.setInterval(async () => {
      try {
        // Refresh the latest bars and update priceHistory + realtime derived data
        if (isFetching.current) return;
        isFetching.current = true;
        try {
          const start2 = computeStartForTimeframe(timeframe);
          const latest = await getPriceHistory({ symbol, interval: timeframe, start: start2 } as any);
          if (latest && latest.length > 0 && !cancelled) {
            setPriceHistory(latest);
            const last = latest[latest.length - 1];
            const first = latest[0];
            const price = Number(last.close);
            const change_24h = Number(last.close) - Number(first.close);
            const change_percent_24h = first && Number(first.close) !== 0 ? (change_24h / Number(first.close)) * 100 : 0;
            setRealtimePrice({ symbol, price, timestamp: String(last.timestamp), change_24h, change_percent_24h } as RealtimePrice);
          }
        } finally {
          isFetching.current = false;
        }
      } catch (error) {
        console.error('Error updating price:', error);
      }
    }, pollMs);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(pollId);
    };
  }, [symbol, timeframe]);

  const chartData = priceHistory.map(p => ({
    time: new Date(p.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    price: p.close,
  }));

  // Compute min/max for Y axis domain so the chart is not squashed into a flat line.
  // We add a padding based on the data spread (and a small absolute floor) so
  // the chart will show visible variation even for small price changes.
  const prices = priceHistory.map(p => Number(p.close)).filter(p => Number.isFinite(p));
  const minPrice = prices.length ? Math.min(...prices) : undefined;
  const maxPrice = prices.length ? Math.max(...prices) : undefined;

  let yDomain: [number, number] | undefined = undefined;
  if (minPrice !== undefined && maxPrice !== undefined) {
    const spread = maxPrice - minPrice;
    // padding: if spread is zero or very small, use a small absolute padding (0.5% of price or 0.01)
    // otherwise use 10% of spread to make fluctuations visible.
    const padFromSpread = spread > 0 ? spread * 0.1 : 0;
    const padFromPrice = Math.max(maxPrice * 0.002, 0.01);
    const padding = Math.max(padFromSpread, padFromPrice);
    yDomain = [Math.max(0, minPrice - padding), maxPrice + padding];
  }

  const isPositive = (realtimePrice?.change_percent_24h || 0) >= 0;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold">{symbol}</h3>

            </div>
            <p className="text-3xl font-bold mt-1">
              {realtimePrice ? `$${realtimePrice.price.toFixed(2)}` : '—'}
            </p>
          </div>
          {realtimePrice && (
            <div>
              <div className={`flex items-center gap-1 ${isPositive ? 'text-bullish' : 'text-bearish'}`}>
                {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <span className="text-lg font-semibold">
                  {isPositive ? '+' : ''}{realtimePrice.change_percent_24h.toFixed(2)}%
                </span>
                <span className="text-sm ml-1">
                  ({isPositive ? '+' : ''}${realtimePrice.change_24h.toFixed(2)})
                </span>
              </div>
              <div className="w-full flex justify-end">
                <Select value={timeframe} onValueChange={(v: string) => setTimeframe(v as '1m' | '5m' | '15m' | '1h' | '4h' | '1d')}>
                  <SelectTrigger className="w-17">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1m</SelectItem>
                    <SelectItem value="5m">5m</SelectItem>
                    <SelectItem value="15m">15m</SelectItem>
                    <SelectItem value="1h">1h</SelectItem>
                    <SelectItem value="4h">4h</SelectItem>
                    <SelectItem value="1d">1d</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading chart data...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              // If we computed a yDomain from the data, use it. Otherwise fallback to automatic domain.
              domain={yDomain ? yDomain : ['auto', 'auto']}
              tickFormatter={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
              tickCount={6}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
