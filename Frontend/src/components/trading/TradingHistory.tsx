import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRecentOrders } from '@/services/tradingApi';
import type { Order } from '@/types/trading';
import { CloudAlert } from 'lucide-react';

interface TradingHistoryProps {
  symbol?: string;
}

export const TradingHistory = ({ symbol }: TradingHistoryProps) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getRecentOrders();
        setOrders(data);
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
    const interval = setInterval(loadHistory, 10000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Trading History</h3>
        <p className="text-muted-foreground">Loading history...</p>
      </Card>
    );
  }

  // Normalize symbol for comparison (remove "/" to match both BTC/USD and BTCUSD)
  const normalizeSymbol = (sym: string) => sym.replace('/', '');
  
  // Filter orders by symbol if provided
  const filteredOrders = symbol 
    ? orders.filter(o => normalizeSymbol(o.symbol) === normalizeSymbol(symbol))
    : orders;

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Trading History</h3>
      
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CloudAlert className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {symbol ? `No orders for ${symbol}` : 'No trading history yet'}
          </p>
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto space-y-3">
          {filteredOrders.map((order) => {
            const isFilled = order.status === 'filled';
            
            return (
              <div 
                key={order.id} 
                onClick={() => navigate(`/viewOrder/${order.id}`)}
                className="p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{order.symbol}</h4>
                        <Badge 
                          variant={order.side === 'buy' ? 'default' : 'destructive'}
                          className={order.side === 'buy' ? 'bg-bullish' : 'bg-bearish'}
                        >
                          {order.side.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.qty} @ {order.order_type}
                        {order.filled_avg_price ? ` → $${Number(order.filled_avg_price).toFixed(2)}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}
                      </p>
                    </div>
                  </div>
                  
                  {isFilled && order.filled_avg_price && (
                    <div className="text-right text-muted-foreground">
                      <p className="font-medium">
                        ${Number(order.filled_avg_price).toFixed(2)}
                      </p>
                      <p className="text-xs">
                        Filled
                      </p>
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
