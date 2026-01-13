import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ExploreAssets from '@/components/trading/ExploreAssets';
import { ArrowRight, ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react';
import { saveBotConfig } from '@/services/tradingApi';
import type { BotConfig } from '@/types/trading';

const Strategy = () => {
  const navigate = useNavigate();

  const [config, setConfig] = useState<Partial<BotConfig>>({
    symbol: 'BTC/USD',
    timeframe: '5Min',
    fast_ema_period: 9,
    slow_ema_period: 21,
    quantity: 0.01,
    stop_loss_percent: 2,
    take_profit_percent: 5,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSaveConfig = useCallback(async () => {
    try {
      setError(null);
      setSuccess(null);
      
      if (!config.symbol || !config.timeframe || !config.quantity) {
        setError('Please fill in all required fields');
        return;
      }

      await saveBotConfig(config as Omit<BotConfig, 'id' | 'created_at' | 'updated_at'>);
      setSuccess('Configuration saved successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  }, [config]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">EMA Crossover Strategy</h1>
            
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">What is EMA (Exponential Moving Average)?</h2>
                <p className="text-muted-foreground">
                  The Exponential Moving Average is a technical indicator that gives more weight to recent prices,
                  making it more responsive to new information. When a fast EMA crosses above a slow EMA, it signals
                  a potential uptrend (buy signal). When it crosses below, it signals a potential downtrend (sell signal).
                </p>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-2">How to Set the Strategy Properties</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li><strong>Fast EMA Period:</strong> Typically 9-12 periods for quick reactions to price changes</li>
                  <li><strong>Slow EMA Period:</strong> Typically 21-26 periods for trend confirmation</li>
                  <li><strong>Position Size:</strong> The amount to trade per signal (start small)</li>
                  <li><strong>Stop Loss:</strong> Maximum loss percentage before auto-closing (recommended: 1-3%)</li>
                  <li><strong>Take Profit:</strong> Target profit percentage for auto-closing (recommended: 2-5%)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <img 
              src="/EMA.gif" 
              alt="EMA Crossover Chart Animation" 
              className="rounded-lg shadow-lg max-w-full h-auto"
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-500 text-green-700">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Parameters</CardTitle>
              <CardDescription>Configure your EMA Crossover strategy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <ExploreAssets 
                  value={config.symbol || 'Select a symbol'}
                  onSelect={(symbol) => setConfig({ ...config, symbol })}
                />
              </div>
              <div>
                <Label htmlFor="timeframe">Timeframe</Label>
                <select
                  id="timeframe"
                  className="w-full p-2 border rounded-md"
                  value={config.timeframe}
                  onChange={(e) => setConfig({ ...config, timeframe: e.target.value })}
                >
                  <option value="1Min">1 Minute</option>
                  <option value="5Min">5 Minutes</option>
                  <option value="15Min">15 Minutes</option>
                  <option value="1Hour">1 Hour</option>
                  <option value="1Day">1 Day</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fast_ema">Fast EMA Period</Label>
                  <Input
                    id="fast_ema"
                    type="number"
                    value={config.fast_ema_period || ''}
                    onChange={(e) => setConfig({ ...config, fast_ema_period: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
                <div>
                  <Label htmlFor="slow_ema">Slow EMA Period</Label>
                  <Input
                    id="slow_ema"
                    type="number"
                    value={config.slow_ema_period || ''}
                    onChange={(e) => setConfig({ ...config, slow_ema_period: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="quantity">Position Size</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  value={config.quantity || ''}
                  onChange={(e) => setConfig({ ...config, quantity: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
              <CardDescription>Optional stop loss and take profit settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stop_loss">Stop Loss (%)</Label>
                <Input
                  id="stop_loss"
                  type="number"
                  step="0.1"
                  value={config.stop_loss_percent || ''}
                  onChange={(e) => setConfig({ ...config, stop_loss_percent: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="e.g., 2.5"
                />
              </div>
              <div>
                <Label htmlFor="take_profit">Take Profit (%)</Label>
                <Input
                  id="take_profit"
                  type="number"
                  step="0.1"
                  value={config.take_profit_percent || ''}
                  onChange={(e) => setConfig({ ...config, take_profit_percent: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="e.g., 5.0"
                />
              </div>
              <Button onClick={handleSaveConfig} className="w-full">
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Button
            onClick={() => navigate('/backtesting-strategy')}
            size="lg"
            variant="outline"
            className="group relative overflow-hidden h-20 hover-slide-left"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
            <div className="flex flex-col items-start">
              <span className="text-sm text-muted-foreground">Test First</span>
              <span className="text-lg font-semibold">Try it on Backtest</span>
            </div>
            <BarChart3 className="w-6 h-6 ml-auto opacity-50" />
          </Button>

          <Button
            onClick={() => navigate('/paper-trading-live')}
            size="lg"
            className="group relative overflow-hidden h-20 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover-slide-right"
          >
            <TrendingUp className="w-6 h-6 mr-auto opacity-50" />
            <div className="flex flex-col items-end">
              <span className="text-sm opacity-90">Go Live</span>
              <span className="text-lg font-semibold">Try it on Live</span>
            </div>
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </main>

      <style>{`
        @keyframes slideLeft {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-12px); }
        }
        
        @keyframes slideRight {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(12px); }
        }
        
        .hover-slide-left:hover {
          animation: slideLeft 1.5s ease-in-out infinite;
        }
        
        .hover-slide-right:hover {
          animation: slideRight 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Strategy;