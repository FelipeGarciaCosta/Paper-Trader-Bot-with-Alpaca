import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRecentOrders, syncOrders } from '@/services/tradingApi';
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

interface OrdersTableProps {
  symbol?: string;
}

export const OrdersTable = ({ symbol }: OrdersTableProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const data = await getRecentOrders();
      // Filter by symbol if provided
      const symbolFiltered = symbol 
        ? data.filter(order => order.symbol === symbol)
        : data;
      setOrders(symbolFiltered);
      setFilteredOrders(symbolFiltered);
      setLoading(false);
    };

    fetchOrders();
  }, [symbol]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  }, [statusFilter, orders]);

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      await syncOrders();
      const data = await getRecentOrders();
      // Apply symbol filter if provided
      const symbolFiltered = symbol 
        ? data.filter(order => order.symbol === symbol)
        : data;
      setOrders(symbolFiltered);
    } catch (error) {
      console.error('Sync failed', error);
    } finally {
      setSyncLoading(false);
    }
  };

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
        <div className="flex items-center gap-4 ">
          <div className='flex items-center gap-4 pl-2 bg-slate-200 rounded-md'>
          <span className="text-sm text-muted-foreground">Status:</span>
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
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncLoading}>
            {syncLoading ? (
              'Syncing...'
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
      ) : (
        <>
          <div className="border rounded-md overflow-hidden">
            {/* Fixed Header */}
            <Table>
              <TableHeader>
                <TableRow className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1.2fr_1.2fr] gap-4">
                  <TableHead className="flex items-center">Symbol</TableHead>
                  <TableHead className="flex items-center justify-center">Side</TableHead>
                  <TableHead className="flex items-center justify-center">Type</TableHead>
                  <TableHead className="flex items-center justify-center">Quantity</TableHead>
                  <TableHead className="flex items-center justify-center">Avg Fill Price</TableHead>
                  <TableHead className="flex items-center justify-center">Status</TableHead>
                  <TableHead className="flex items-center justify-center">Date</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            {/* Scrollable Body */}
            <div className="max-h-[280px] overflow-y-auto overflow-x-auto">
              <Table>
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
                        className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1.2fr_1.2fr] gap-4 hover:bg-muted cursor-pointer"
                        onClick={() => navigate(`/viewOrder/${order.id}`)}
                      >
                        <TableCell className="font-medium flex items-center">{order.symbol}</TableCell>
                        <TableCell className="flex items-center justify-center">
                          <span className={order.side === 'buy' ? 'text-bullish' : 'text-bearish'}>
                            {String(order.side || '-').toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize flex items-center justify-center">{order.order_type || order.order_type}</TableCell>
                        <TableCell className="flex items-center justify-center">{order.qty ? order.qty : '-'}</TableCell>
                        <TableCell className="flex items-center justify-center">
                          {order.filled_avg_price
                            ? `$${Number(order.filled_avg_price).toLocaleString()}`
                            : order.price
                              ? `$${Number(order.price).toLocaleString()}`
                              : '-'}
                        </TableCell>
                        <TableCell className="flex items-center justify-center">
                          <Badge variant={getStatusBadgeVariant(String(order.status) as OrderStatus)}>
                            {String(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground flex items-center justify-center">
                          {order.created_at ? new Date(String(order.created_at)).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/Explore')}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gray-300 text-sm font-semibold text-gray-700 hover:bg-yellow-300 hover:shadow transition-colors duration-150 focus:outline-none"
          >
            + Add Order
          </button>
        </>
      )}
    </Card>
  );
};
