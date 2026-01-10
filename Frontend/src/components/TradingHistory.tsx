import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTradingHistory } from '@/services/tradingApi';
import type { ClosedPosition } from '@/types/trading';

export const TradingHistory = () => {
  const [history, setHistory] = useState<ClosedPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getTradingHistory();
        setHistory(data);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Trading History</h3>
        <p className="text-muted-foreground">Loading history...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Trading History</h3>
      
      {history.length === 0 ? (
        <p className="text-muted-foreground">No trading history yet</p>
      ) : (
        <div className="space-y-3">
          {history.map((trade) => {
            const isProfit = trade.realized_pnl >= 0;
            
            return (
              <div 
                key={trade.id} 
                className="p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{trade.symbol}</h4>
                        <Badge 
                          variant={trade.side === 'buy' ? 'default' : 'destructive'}
                          className={trade.side === 'buy' ? 'bg-bullish' : 'bg-bearish'}
                        >
                          {trade.side.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {trade.quantity} @ ${trade.entry_price.toFixed(2)} → ${trade.exit_price.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(trade.closed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`text-right ${isProfit ? 'text-bullish' : 'text-bearish'}`}>
                    <p className="font-bold text-lg">
                      {isProfit ? '+' : ''}${trade.realized_pnl.toFixed(2)}
                    </p>
                    <p className="text-sm">
                      {isProfit ? '+' : ''}{trade.realized_pnl_percent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
