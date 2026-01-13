import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import type { BotStatus } from '@/types/trading';

interface BotActivityMonitorProps {
  botStatus: BotStatus;
}

export const BotActivityMonitor = ({ botStatus }: BotActivityMonitorProps) => {
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatCountdown = (nextCheckTime?: string) => {
    if (!nextCheckTime) return 'N/A';
    const now = new Date().getTime();
    const next = new Date(nextCheckTime).getTime();
    const diff = Math.max(0, Math.floor((next - now) / 1000));
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    return `${minutes}m ${seconds}s`;
  };

  const getSignalBadge = (signal?: string) => {
    if (!signal) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          No Signal
        </Badge>
      );
    }
    
    if (signal === 'BUY') {
      return (
        <Badge className="bg-bullish flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          BUY
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive" className="bg-bearish flex items-center gap-1">
        <TrendingDown className="w-3 h-3" />
        SELL
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <CardTitle>Bot Activity Monitor</CardTitle>
        </div>
        <CardDescription>Real-time trading bot status and signals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Last Signal */}
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Last Signal</p>
            <div className="flex items-center justify-between">
              {getSignalBadge(botStatus.last_signal)}
              {botStatus.last_signal_time && (
                <span className="text-sm text-muted-foreground">
                  {formatTime(botStatus.last_signal_time)}
                </span>
              )}
            </div>
          </div>

          {/* Current Price */}
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Current Price</p>
            <p className="text-2xl font-bold">
              {botStatus.current_price ? `$${botStatus.current_price.toFixed(2)}` : 'N/A'}
            </p>
          </div>

          {/* Fast EMA */}
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Fast EMA ({botStatus.config?.fast_ema_period || 'N/A'})
            </p>
            <p className="text-xl font-semibold text-bullish">
              {botStatus.fast_ema_value ? `$${botStatus.fast_ema_value.toFixed(6)}` : 'Calculating...'}
            </p>
          </div>

          {/* Slow EMA */}
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Slow EMA ({botStatus.config?.slow_ema_period || 'N/A'})
            </p>
            <p className="text-xl font-semibold text-blue-500">
              {botStatus.slow_ema_value ? `$${botStatus.slow_ema_value.toFixed(6)}` : 'Calculating...'}
            </p>
          </div>

          {/* Last Check */}
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last Check
            </p>
            <p className="text-lg font-medium">
              {formatTime(botStatus.last_check_time)}
            </p>
          </div>

          {/* Next Check */}
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Next Check In
            </p>
            <p className="text-lg font-medium text-primary">
              {formatCountdown(botStatus.next_check_time)}
            </p>
          </div>
        </div>

        {/* Status Summary */}
        <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
          <p className="text-sm font-medium mb-1">Strategy Status</p>
          <p className="text-sm text-muted-foreground">
            {!botStatus.last_signal && 'Monitoring market for EMA crossover signals'}
            {botStatus.last_signal === 'BUY' && 'Last signal was BUY - waiting for position entry or new signal'}
            {botStatus.last_signal === 'SELL' && 'Last signal was SELL - position may have been closed'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
