import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LiquidateButton } from '@/components/positions/LiquidateButton';
import { getOpenPositions, syncPositions } from '@/services/tradingApi';
import type { Position } from '@/types/trading';
import { TrendingUp, TrendingDown, CloudAlert } from 'lucide-react';

interface PositionsListProps {
  symbol?: string;
}

export const PositionsList = ({ symbol }: PositionsListProps) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPositions = async (sync: boolean = false) => {
    try {
      // If sync is true, sync from Alpaca first, then get from DB
      if (sync) {
        await syncPositions();
      }
      const data = await getOpenPositions();
      setPositions(data);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load with sync
    loadPositions(true);
    
    // Auto-sync every 10 seconds
    const interval = setInterval(() => loadPositions(true), 10000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Open Positions</h3>
        <p className="text-muted-foreground">Loading positions...</p>
      </Card>
    );
  }

  // Normalize symbol for comparison (remove "/" to match both BTC/USD and BTCUSD)
  const normalizeSymbol = (sym: string) => sym.replace('/', '');
  
  // Filter positions by symbol if provided
  const filteredPositions = symbol 
    ? positions.filter(p => normalizeSymbol(p.symbol) === normalizeSymbol(symbol))
    : positions;

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Open Positions</h3>
      
      {filteredPositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CloudAlert className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {symbol ? `No open positions for ${symbol}` : 'No open positions'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPositions.map((position) => {
            const isProfit = (position.unrealized_pl || 0) >= 0;
            const qty = position.qty ? parseFloat(position.qty) : 0;
            const avgPrice = position.avg_entry_price ? Number(position.avg_entry_price) : 0;
            const currentPrice = position.current_price ? Number(position.current_price) : 0;
            const marketValue = position.market_value ? Number(position.market_value) : 0;
            const unrealizedPl = position.unrealized_pl ? Number(position.unrealized_pl) : 0;
            const unrealizedPlpc = position.unrealized_plpc ? Number(position.unrealized_plpc) : 0;
            
            return (
              <div 
                key={position.id} 
                className="p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{position.symbol}</h4>
                      {position.side && (
                        <Badge 
                          variant={position.side === 'long' ? 'default' : 'destructive'}
                          className={position.side === 'long' ? 'bg-bullish' : 'bg-bearish'}
                        >
                          {position.side.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {qty.toFixed(5)} @ ${avgPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className={`text-right ${isProfit ? 'text-bullish' : 'text-bearish'}`}>
                    <div className="flex items-center gap-1 justify-end">
                      {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <p className="font-bold">${unrealizedPl.toFixed(2)}</p>
                    </div>
                    <p className="text-sm">
                      {isProfit ? '+' : ''}{unrealizedPlpc.toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Price</p>
                    <p className="font-medium">${currentPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Market Value</p>
                    <p className="font-medium">${marketValue.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <LiquidateButton
                    position={position}
                    onLiquidateSuccess={() => loadPositions(true)}
                    size="sm"
                    className="w-full hover:bg-bearish"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
