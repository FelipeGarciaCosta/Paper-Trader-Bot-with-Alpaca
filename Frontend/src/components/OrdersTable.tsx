import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getRecentOrders } from '@/services/tradingApi';
import type { Order, OrderStatus } from '@/types/trading';

const orderStatuses: (Lowercase<OrderStatus> | 'all')[] = [
  'all',
  'open',
  'closed',
  'new',
  'accepted',
  'filled',
  'expired',
  'canceled',
  'replaced',
  'rejected',
  'suspended',
  'partially filled',
  'pending cancel',
  'pending new',
  'pending replace',
  'pending review',
];

export const OrdersTable = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const data = await getRecentOrders();
      setOrders(data);
      setFilteredOrders(data);
      setLoading(false);
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  }, [statusFilter, orders]);

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'filled':
        return 'default';
      case 'pending new':
        return 'secondary';
      case 'canceled':
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const navigate = useNavigate();

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Orders</h3>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {orderStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Avg Fill Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted cursor-pointer"
                    onClick={() => navigate(`/viewOrder/${order.id}`)}
                  >
                    <TableCell className="font-medium">{order.symbol}</TableCell>
                    <TableCell>
                      <span className={order.side === 'buy' ? 'text-bullish' : 'text-bearish'}>
                        {String(order.side || '').toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">{order.order_type || order.order_type}</TableCell>
                    <TableCell>{order.qty ?? order.qty}</TableCell>
                    <TableCell>
                      {order.filled_avg_price
                        ? `$${Number(order.filled_avg_price).toLocaleString()}`
                        : order.price
                          ? `$${Number(order.price).toLocaleString()}`
                          : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(String(order.status) as OrderStatus)}>
                        {String(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.created_at ? new Date(String(order.created_at)).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <button
            type="button"
            onClick={() => navigate('/Explore')}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gray-300 text-sm font-semibold text-gray-700 hover:bg-yellow-300 hover:shadow transition-colors duration-150 focus:outline-none"
          >
            + Add Order
          </button>
        </div>
      )}
    </Card>
  );
};
