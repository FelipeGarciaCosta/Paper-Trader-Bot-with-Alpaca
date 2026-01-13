import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createOrder } from '@/services/tradingApi';
import { useToast } from '@/hooks/use-toast';
import type { OrderSide, OrderType, CreateOrderRequest } from '@/types/trading';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';

interface OrderFormProps {
  symbol: string;
  currentPrice?: number;
  onOrderCreated?: () => void;
}

export const OrderForm = ({ symbol, currentPrice, onOrderCreated }: OrderFormProps) => {
  const { toast } = useToast();
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'shares' | 'dollars'>('shares');
  const [dollarAmount, setDollarAmount] = useState('');

  const handleDollarAmountChange = (value: string) => {
    setDollarAmount(value);
    if (value && currentPrice) {
      const dollars = parseFloat(value);
      if (!isNaN(dollars) && dollars > 0) {
        const calculatedQty = dollars / currentPrice;
        setQuantity(calculatedQty.toFixed(8));
      } else {
        setQuantity('');
      }
    } else {
      setQuantity('');
    }
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    if (value && currentPrice) {
      const qty = parseFloat(value);
      if (!isNaN(qty) && qty > 0) {
        const calculatedDollars = qty * currentPrice;
        setDollarAmount(calculatedDollars.toFixed(2));
      } else {
        setDollarAmount('');
      }
    } else {
      setDollarAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure we have a valid quantity value
    const qtyValue = parseFloat(quantity);
    if (!quantity || isNaN(qtyValue) || qtyValue <= 0) {
      toast({
        title: 'Invalid quantity',
        description: 'Please enter a valid quantity or dollar amount',
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
      };

      const order = await createOrder(orderRequest);
      
      toast({
        title: 'Order created successfully',
        description: `${side.toUpperCase()} ${quantity} ${symbol} at ${order.filled_avg_price?.toFixed(2) || 'market'}`,
      });

      // Reset form
      setQuantity('');
      setPrice('');
      
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
        <div className="pb-1">
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

        {/* Choose how to buy */}
        <div className="">
          <Label>Choose how to buy</Label>
          <RadioGroup value={inputMode} onValueChange={(v) => setInputMode(v as 'shares' | 'dollars')} className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shares" id="shares" />
              <Label htmlFor="shares" className="font-normal cursor-pointer">Shares</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dollars" id="dollars" />
              <Label htmlFor="dollars" className="font-normal cursor-pointer">Dollars</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Quantity or Dollar Amount */}
        <div className="space-y-2">
          <Label>{inputMode === 'shares' ? 'Quantity' : 'Dollar Amount'}</Label>
          {inputMode === 'shares' ? (
            <Input
              type="number"
              step="0.0001"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              required
            />
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={dollarAmount}
                onChange={(e) => handleDollarAmountChange(e.target.value)}
                className="pl-7"
                required
              />
            </div>
          )}
        </div>

        {/* Limit Price (only for limit orders) */}
        {orderType === 'limit' && (
          <div className="">
            <Label>Limit Price</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={currentPrice ? currentPrice.toFixed(2) : "0.00"}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
        )}

        {/* Estimated values */}
        {currentPrice && (
          <div className=" text-sm bg-muted/50 p-3 rounded-md">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Quantity:</span>
              <span className="font-medium">{quantity ? parseFloat(quantity).toFixed(8) : '0.00000000'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Cost:</span>
              <span className="font-medium">${dollarAmount ? parseFloat(dollarAmount).toFixed(2) : '0.00'}</span>
            </div>
          </div>
        )}

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
