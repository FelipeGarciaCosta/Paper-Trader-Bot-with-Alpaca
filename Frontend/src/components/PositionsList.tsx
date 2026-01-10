import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getOpenPositions } from '@/services/tradingApi';
import type { Position } from '@/types/trading';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const PositionsList = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPositions = async () => {
    try {
      const data = await getOpenPositions();
      setPositions(data);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
    const interval = setInterval(loadPositions, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Open Positions</h3>
        <p className="text-muted-foreground">Loading positions...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Open Positions</h3>
      
      {positions.length === 0 ? (
        <p className="text-muted-foreground">No open positions</p>
      ) : (
        <div className="space-y-4">
          {positions.map((position) => {
            const isProfit = position.unrealized_pnl >= 0;
            
            return (
              <div 
                key={position.id} 
                className="p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{position.symbol}</h4>
                      <Badge 
                        variant={position.side === 'buy' ? 'default' : 'destructive'}
                        className={position.side === 'buy' ? 'bg-bullish' : 'bg-bearish'}
                      >
                        {position.side.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {position.quantity} @ ${position.entry_price.toFixed(2)}
                    </p>
                  </div>
                  <div className={`text-right ${isProfit ? 'text-bullish' : 'text-bearish'}`}>
                    <div className="flex items-center gap-1 justify-end">
                      {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <p className="font-bold">${position.unrealized_pnl.toFixed(2)}</p>
                    </div>
                    <p className="text-sm">
                      {isProfit ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Price</p>
                    <p className="font-medium">${position.current_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Opened</p>
                    <p className="font-medium">
                      {new Date(position.opened_at).toLocaleDateString()}
                    </p>
                  </div>
                  {position.stop_loss && (
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-medium text-bearish">${position.stop_loss.toFixed(2)}</p>
                    </div>
                  )}
                  {position.take_profit && (
                    <div>
                      <p className="text-muted-foreground">Take Profit</p>
                      <p className="font-medium text-bullish">${position.take_profit.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
