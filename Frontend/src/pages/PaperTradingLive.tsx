import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Activity, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { startBot, stopBot, getBotStatus } from '@/services/tradingApi';
import { TradingChart } from '@/components/trading/TradingChart';
import { PositionsList } from '@/components/positions/PositionsList';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { BotActivityMonitor } from '@/components/strategy/BotActivityMonitor';
import { StrategyList } from '@/components/strategy/StrategyList';
import type { BotConfig, BotStatus } from '@/types/trading';

const PaperTradingLive = () => {
  const navigate = useNavigate();
  const [selectedStrategy, setSelectedStrategy] = useState<BotConfig | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load bot status
  const loadBotStatus = useCallback(async () => {
    try {
      const status = await getBotStatus();
      setBotStatus(status);
    } catch (err) {
      console.error('Failed to load bot status:', err);
    }
  }, []);

  useEffect(() => {
    loadBotStatus();
    
    // Poll bot status every 15 seconds when running
    const interval = setInterval(() => {
      if (botStatus?.is_running) {
        loadBotStatus();
      }
    }, 15000);
    
    return () => clearInterval(interval);
  }, [loadBotStatus, botStatus?.is_running]);

  const handleStartBot = async () => {
    if (!selectedStrategy) {
      setError('Please select a strategy first');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setIsLoading(true);

      await startBot({ 
        config_id: selectedStrategy.id
      });
      
      setSuccess('Bot started successfully');
      loadBotStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start bot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopBot = async () => {
    try {
      setError(null);
      setSuccess(null);
      setIsLoading(true);

      await stopBot();
      setSuccess('Bot stopped successfully');
      loadBotStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to stop bot');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Paper Trading Live</h1>
        <p className="text-muted-foreground mb-8">
          Monitor and control your live paper trading bot
        </p>

        {/* Strategy Selection */}
        <StrategyList 
          selectedStrategy={selectedStrategy}
          onStrategySelect={setSelectedStrategy}
        />

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-500">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        {/* Bot Control Panel */}
        {selectedStrategy && (
          <Alert className={`mt-3 mb-6 ${botStatus?.is_running ? 'border-green-500' : 'border-gray-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {botStatus?.is_running ? (
                  <Activity className="w-5 h-5 text-green-600 animate-pulse" />
                ) : (
                  <Square className="w-5 h-5 text-gray-500" />
                )}
                <div>
                  <p className="font-semibold">
                    {botStatus?.is_running ? 'Bot Running' : 'Bot Stopped'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Strategy: {selectedStrategy.symbol} {selectedStrategy.timeframe} | 
                    EMA {selectedStrategy.fast_ema_period}/{selectedStrategy.slow_ema_period}
                  </p>
                </div>
              </div>
              <div>
                {!botStatus?.is_running ? (
                  <Button 
                    onClick={handleStartBot} 
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Bot
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStopBot} 
                    variant="destructive"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Stop Bot
                  </Button>
                )}
              </div>
            </div>
          </Alert>
        )}

        {/* Bot Activity Monitor - Only show when bot is running */}
        {botStatus?.is_running && (
          <div className="mb-6">
            <BotActivityMonitor botStatus={botStatus} />
          </div>
        )}

        {/* Trading Chart - Only show when bot is running */}
        {botStatus?.is_running && selectedStrategy && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Live Chart - {selectedStrategy.symbol}</CardTitle>
            </CardHeader>
            <CardContent>
              <TradingChart 
                symbol={selectedStrategy.symbol}
              />
            </CardContent>
          </Card>
        )}

        {/* Positions and Orders - Only show when bot is running */}
        {botStatus?.is_running && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Open Positions</CardTitle>
                <CardDescription>Currently active positions</CardDescription>
              </CardHeader>
              <CardContent>
                <PositionsList symbol={selectedStrategy.symbol} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders</CardTitle>
                <CardDescription>Recent orders generated by the bot</CardDescription>
              </CardHeader>
              <CardContent>
                <OrdersTable symbol={selectedStrategy.symbol} />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default PaperTradingLive;
