import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getPortfolioHistory } from '@/services/tradingApi';
import type { PortfolioValue } from '@/types/trading';

type TimeRange = '1D' | '1M' | '1Y' | 'ALL';

export const PortfolioChart = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioValue[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [loading, setLoading] = useState(true);
  const [lastFetchInfo, setLastFetchInfo] = useState<{ source: string; count: number } | null>(null);

  // Polling: choose reasonable frequency depending on range
  const getPollingIntervalMs = (range: TimeRange) => {
    switch (range) {
      case '1D':
        return 30_000; // 30s for intraday
      case '1M':
        return 60_000; // 1min for monthly
      case '1Y':
        return 300_000; // 5min for yearly
      case 'ALL':
      default:
        return 600_000; // 10min for all-time
    }
  };

  const pollingRef = useRef<number | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    let aborted = false;

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        // Polling should avoid frequent writes to DB, so request without store
        const data = await getPortfolioHistory(timeRange, { store: false, signal: controller.signal });
        if (!aborted) setPortfolioData(data);
        if (!aborted) setLastFetchInfo({ source: '/portfolio/history', count: data.length });
      } catch (err) {
        // ignore aborts
        // eslint-disable-next-line no-console
        console.error('Failed to fetch portfolio history', err);
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    // initial load
    fetchData();

    // setup interval
    const intervalMs = getPollingIntervalMs(timeRange);
    pollingRef.current = window.setInterval(fetchData, intervalMs);

    return () => {
      aborted = true;
      controller.abort();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [timeRange]);

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      // Request with store=true so backend syncs/persists points
      const data = await getPortfolioHistory(timeRange, { store: true });
      setPortfolioData(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Sync failed', err);
    } finally {
      setSyncLoading(false);
    }
  };

  const currentValue = portfolioData[portfolioData.length - 1]?.value || 0;
  const previousValue = portfolioData[0]?.value || 0;
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
  const isPositive = change >= 0;

  // Format chart data and compute dynamic Y domain so small fluctuations are visible
  const chartData = useMemo(() => {
    return portfolioData.map((item) => ({
      rawTime: item.timestamp,
      // format X labels depending on selected range
      time:
        timeRange === '1D'
          ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date(item.timestamp).toLocaleDateString(),
      value: item.value,
    }));
  }, [portfolioData, timeRange]);

  // Compute Y domain with padding; for 1D and 1M we amplify padding so small moves are visible
  const yDomain = useMemo(() => {
    if (!portfolioData || portfolioData.length === 0) return undefined;
    const vals = portfolioData.map((p) => p.value).filter((v) => typeof v === 'number');
    if (vals.length === 0) return undefined;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    let range = max - min;

    // If range is zero or extremely small, base padding on absolute value
    if (range <= 0) {
      const pad = Math.max(1, Math.abs(max) * 0.001);
      return [max - pad, max + pad];
    }

    // For 1D and 1M, increase padding to make small fluctuations visible
    const amplification = timeRange === '1D' ? 0.6 : timeRange === '1M' ? 0.4 : 0.12;
    const pad = range * amplification;

    // Ensure pad is at least a small fraction of current value to avoid too-tight zoom
    const minPad = Math.abs(currentValue) * 0.002; // 0.2%
    const finalPad = Math.max(pad, minPad);

    return [Math.max(0, min - finalPad), max + finalPad];
  }, [portfolioData, timeRange, currentValue]);

  const timeRanges: TimeRange[] = ['1D', '1M', '1Y', 'ALL'];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Your Portfolio</h3>
          {lastFetchInfo ? (
            <div className="text-xs text-muted-foreground">Source: {lastFetchInfo.source} · points: {lastFetchInfo.count}</div>
          ) : null}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-bullish' : 'text-bearish'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncLoading}>
            {syncLoading ? 'Syncing...' :
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            }
          </Button>
        </div>
      </div>

      <div className="h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading chart...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                domain={yDomain as [number, number] | undefined}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={isPositive ? 'hsl(var(--bullish))' : 'hsl(var(--bearish))'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
