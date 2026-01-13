import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BarChart3, Play } from 'lucide-react';
import { StrategyList } from '@/components/strategy/StrategyList';
import { runBacktest, getBacktestHistory } from '@/services/tradingApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { BotConfig, BacktestResult } from '@/types/trading';

const BacktestingStrategy = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<BotConfig | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [backtestHistory, setBacktestHistory] = useState<BacktestResult[]>([]);

  const loadBacktestHistory = useCallback(async () => {
    if (!selectedStrategy) return;
    
    try {
      const history = await getBacktestHistory(selectedStrategy.symbol, 10);
      setBacktestHistory(history);
    } catch (err) {
      console.error('Failed to load backtest history:', err);
    }
  }, [selectedStrategy]);

  useEffect(() => {
    if (selectedStrategy) {
      loadBacktestHistory();
    }
  }, [selectedStrategy, loadBacktestHistory]);

  const validateDateRange = () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      setError('End date must be after start date');
      return false;
    }

    if (diffDays > 365) {
      setError('Date range too large. Maximum is 365 days to avoid exceeding API limits');
      return false;
    }

    return true;
  };

  const handleRunBacktest = async () => {
    if (!selectedStrategy) {
      setError('Please select a strategy first');
      return;
    }

    if (!validateDateRange()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await runBacktest({
        symbol: selectedStrategy.symbol,
        timeframe: selectedStrategy.timeframe,
        start_date: startDate,
        end_date: endDate,
        fast_ema_period: selectedStrategy.fast_ema_period,
        slow_ema_period: selectedStrategy.slow_ema_period,
        initial_capital: 100000, // Default initial capital
        quantity: selectedStrategy.quantity,
        stop_loss_percent: selectedStrategy.stop_loss_percent,
        take_profit_percent: selectedStrategy.take_profit_percent,
      });

      setBacktestResult(result);
      
      // Reload history
      const history = await getBacktestHistory(selectedStrategy.symbol, 10);
      setBacktestHistory(history);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to run backtest');
    } finally {
      setIsLoading(false);
    }
  };

  const toNumber = (value: number | string): number => {
    return typeof value === 'string' ? parseFloat(value) : value;
  };

  const formatEquityData = (result: BacktestResult) => {
    return result.equity_curve.map(point => ({
      timestamp: new Date(point.timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      equity: toNumber(point.equity),
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Backtesting Strategy</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Test your strategies against historical data
        </p>

        {/* Strategy Selection */}
        <div className="mb-6">
          <StrategyList 
            selectedStrategy={selectedStrategy}
            onStrategySelect={setSelectedStrategy}
          />
        </div>

        {/* Date Range Selection */}
        {selectedStrategy && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Backtest Parameters</CardTitle>
              <CardDescription>
                Select the date range for backtesting (max 365 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Strategy Selected:</p>
                <p className="font-semibold">{selectedStrategy.symbol} - {selectedStrategy.timeframe}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  EMA: {selectedStrategy.fast_ema_period}/{selectedStrategy.slow_ema_period} | 
                  TP: {selectedStrategy.take_profit_percent}% | 
                  SL: {selectedStrategy.stop_loss_percent}%
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleRunBacktest}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isLoading ? 'Running...' : 'Run Backtest'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Backtest Results */}
        {backtestResult && (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total P/L</p>
                    <p className={`text-2xl font-bold ${toNumber(backtestResult.total_pnl) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      ${toNumber(backtestResult.total_pnl).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Return</p>
                    <p className={`text-2xl font-bold ${toNumber(backtestResult.total_pnl_percent) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {(toNumber(backtestResult.total_pnl_percent) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">{(toNumber(backtestResult.win_rate) * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-2xl font-bold">{backtestResult.total_trades}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Drawdown</p>
                    <p className="text-2xl font-bold text-bearish">
                      {(toNumber(backtestResult.max_drawdown_percent) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Winning Trades</p>
                    <p className="text-2xl font-bold text-bullish">{backtestResult.winning_trades}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Losing Trades</p>
                    <p className="text-2xl font-bold text-bearish">{backtestResult.losing_trades}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Final Capital</p>
                    <p className="text-2xl font-bold">${toNumber(backtestResult.final_capital).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equity Curve */}
            <Card>
              <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
                <CardDescription>Portfolio value over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={formatEquityData(backtestResult)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      domain={['dataMin - 100', 'dataMax + 100']}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfolio Value']}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={false}
                      name="Portfolio Value"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Backtest History */}
        {selectedStrategy && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Backtest History</CardTitle>
              <CardDescription>Previous backtests for {selectedStrategy.symbol}</CardDescription>
            </CardHeader>
            <CardContent>
              {backtestHistory.length > 0 ? (
                <div className="space-y-3">
                  {backtestHistory.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => setBacktestResult(result)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{result.symbol} - {result.timeframe}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(result.start_date).toLocaleDateString()} - {new Date(result.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${toNumber(result.total_pnl) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                            {toNumber(result.total_pnl_percent) >= 0 ? '+' : ''}{(toNumber(result.total_pnl_percent) * 100).toFixed(2)}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {result.total_trades} trades | {(toNumber(result.win_rate) * 100).toFixed(0)}% WR
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No backtest history available for this strategy
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default BacktestingStrategy;
