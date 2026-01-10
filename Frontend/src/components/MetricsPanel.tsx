import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { getTradingMetrics } from '@/services/tradingApi';
import type { TradingMetrics } from '@/types/trading';
import { TrendingUp, Target, BarChart3, TrendingDown } from 'lucide-react';

export const MetricsPanel = () => {
  const [metrics, setMetrics] = useState<TradingMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await getTradingMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-6">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        ))}
      </div>
    );
  }

  const isProfitable = metrics.total_pnl >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total P&L */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Total P&L</p>
          {isProfitable ? (
            <TrendingUp className="w-5 h-5 text-bullish" />
          ) : (
            <TrendingDown className="w-5 h-5 text-bearish" />
          )}
        </div>
        <p className={`text-2xl font-bold ${isProfitable ? 'text-bullish' : 'text-bearish'}`}>
          {isProfitable ? '+' : ''}${metrics.total_pnl.toFixed(2)}
        </p>
        <p className={`text-sm ${isProfitable ? 'text-bullish' : 'text-bearish'}`}>
          {isProfitable ? '+' : ''}{metrics.total_pnl_percent.toFixed(2)}%
        </p>
      </Card>

      {/* Win Rate */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <Target className="w-5 h-5 text-primary" />
        </div>
        <p className="text-2xl font-bold">{metrics.win_rate.toFixed(1)}%</p>
        <p className="text-sm text-muted-foreground">
          {metrics.winning_trades}W / {metrics.losing_trades}L
        </p>
      </Card>

      {/* Profit Factor */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Profit Factor</p>
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <p className="text-2xl font-bold">{metrics.profit_factor.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">
          Avg Win: ${metrics.average_win.toFixed(0)}
        </p>
      </Card>

      {/* Max Drawdown */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Max Drawdown</p>
          <TrendingDown className="w-5 h-5 text-bearish" />
        </div>
        <p className="text-2xl font-bold text-bearish">
          ${metrics.max_drawdown.toFixed(2)}
        </p>
        <p className="text-sm text-bearish">
          {metrics.max_drawdown_percent.toFixed(2)}%
        </p>
      </Card>
    </div>
  );
};
