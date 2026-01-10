import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createOrder } from '@/services/tradingApi';
import { useToast } from '@/hooks/use-toast';
import type { OrderSide, OrderType, CreateOrderRequest } from '@/types/trading';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';

interface OrderFormProps {
  symbol: string;
  currentPrice: number;
  onOrderCreated?: () => void;
}

export const OrderForm = ({ symbol, currentPrice, onOrderCreated }: OrderFormProps) => {
  const { toast } = useToast();
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || parseFloat(quantity) <= 0) {
      toast({
        title: 'Invalid quantity',
        description: 'Please enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      const orderRequest: CreateOrderRequest = {
        symbol,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        ...(orderType === 'limit' && price && { price: parseFloat(price) }),
        ...(stopLoss && { stop_loss: parseFloat(stopLoss) }),
        ...(takeProfit && { take_profit: parseFloat(takeProfit) }),
      };

      const order = await createOrder(orderRequest);
      
      toast({
        title: 'Order created successfully',
        description: `${side.toUpperCase()} ${quantity} ${symbol} at ${order.filled_price?.toFixed(2) || 'market'}`,
      });

      // Reset form
      setQuantity('');
      setPrice('');
      setStopLoss('');
      setTakeProfit('');
      
      onOrderCreated?.();
    } catch (error) {
      toast({
        title: 'Order failed',
        description: error instanceof Error ? error.message : 'Failed to create order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-6">Place Order</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Side */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={side === 'buy' ? 'default' : 'outline'}
            className={side === 'buy' ? 'bg-bullish hover:bg-bullish/90' : ''}
            onClick={() => setSide('buy')}
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Buy
          </Button>
          <Button
            type="button"
            variant={side === 'sell' ? 'default' : 'outline'}
            className={side === 'sell' ? 'bg-bearish hover:bg-bearish/90' : ''}
            onClick={() => setSide('sell')}
          >
            <ArrowDownRight className="w-4 h-4 mr-2" />
            Sell
          </Button>
        </div>

        {/* Order Type */}
        <div className="space-y-2">
          <Label>Order Type</Label>
          <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            step="0.0001"
            placeholder="0.00"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        {/* Limit Price (only for limit orders) */}
        {orderType === 'limit' && (
          <div className="space-y-2">
            <Label>Limit Price</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={currentPrice.toFixed(2)}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
        )}

        {/* Stop Loss */}
        <div className="space-y-2">
          <Label>Stop Loss (Optional)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          />
        </div>

        {/* Take Profit */}
        <div className="space-y-2">
          <Label>Take Profit (Optional)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className={`w-full ${side === 'buy' ? 'bg-bullish hover:bg-bullish/90' : 'bg-bearish hover:bg-bearish/90'}`}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {side === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};
