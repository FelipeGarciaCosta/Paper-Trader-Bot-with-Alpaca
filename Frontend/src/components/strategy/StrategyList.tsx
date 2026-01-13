import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Plus } from 'lucide-react';
import { listBotConfigs } from '@/services/tradingApi';
import type { BotConfig } from '@/types/trading';

interface StrategyListProps {
  onStrategySelect: (strategy: BotConfig) => void;
  selectedStrategy?: BotConfig | null;
  showCreateButton?: boolean;
}

export const StrategyList = ({ 
  onStrategySelect, 
  selectedStrategy, 
  showCreateButton = true 
}: StrategyListProps) => {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<BotConfig[]>([]);

  const loadStrategies = useCallback(async () => {
    try {
      const configs = await listBotConfigs();
      setStrategies(configs);
      
      // Auto-select first strategy if available and none selected
      if (configs.length > 0 && !selectedStrategy) {
        onStrategySelect(configs[0]);
      }
    } catch (err) {
      console.error('Failed to load strategies:', err);
    }
  }, [selectedStrategy, onStrategySelect]);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Choose Your Strategy</CardTitle>
            <CardDescription>Select a saved strategy configuration to use</CardDescription>
          </div>
          {showCreateButton && (
            <Button
              onClick={() => navigate('/strategy')}
              variant="outline"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Strategy
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {strategies.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No strategies found. Create one in the Strategy Config page.
            </p>
          ) : (
            strategies.map((strategy, index) => (
              <div
                key={index}
                onClick={() => onStrategySelect(strategy)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedStrategy === strategy
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`w-5 h-5 ${
                      selectedStrategy === strategy ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <p className="font-semibold">{strategy.symbol} - {strategy.timeframe}</p>
                      <p className="text-sm text-muted-foreground">
                        Fast EMA: {strategy.fast_ema_period} | Slow EMA: {strategy.slow_ema_period} | 
                        Qty: {strategy.quantity}
                      </p>
                    </div>
                  </div>
                  {strategy.stop_loss_percent && (
                    <Badge variant="outline">SL: {strategy.stop_loss_percent}%</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
