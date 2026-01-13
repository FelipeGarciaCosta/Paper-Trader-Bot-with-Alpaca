import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getRecentOrders, cancelOrder } from '@/services/tradingApi';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/types/trading';

const OPEN_STATUSES = ['accepted', 'new', 'partially_filled', 'calculated', 'pending_new', 'pending_cancel', 'accepted_for_bidding'];

const InfoRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div className="flex justify-between py-2 border-b border-muted/30">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value ?? '-'}</div>
    </div>
);

const ViewOrder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [canceling, setCanceling] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const orders = await getRecentOrders();
                const found = orders.find(o => String(o.id) === String(id) || String(o.alpaca_id) === String(id));
                if (found) setOrder(found as Order);
            } catch (e) {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleCancelOrder = async () => {
        if (!order?.alpaca_id) return;
        
        setCanceling(true);
        try {
            await cancelOrder(order.alpaca_id);
            toast({
                title: 'Order canceled',
                description: `Order for ${order.symbol} has been canceled successfully.`,
            });
            setCancelDialogOpen(false);
            // Reload order data
            const orders = await getRecentOrders();
            const found = orders.find(o => String(o.id) === String(id) || String(o.alpaca_id) === String(id));
            if (found) setOrder(found as Order);
        } catch (error) {
            toast({
                title: 'Cancelation failed',
                description: error instanceof Error ? error.message : 'Failed to cancel order',
                variant: 'destructive',
            });
        } finally {
            setCanceling(false);
        }
    };

    const isOrderCancelable = order && OPEN_STATUSES.includes(String(order.status).toLowerCase());

    if (loading) return <div className="p-6">Loading...</div>;
    if (!order) {
        return (
            <div className="p-6">
                <button className="underline mb-4" onClick={() => navigate(-1)}>← Back to Orders</button>
                <Card className="p-6">No order found</Card>
            </div>
        );
    }

    const createdAt = order.created_at ? new Date(String(order.created_at)).toLocaleString() : '-';
    const filledAt = order.filled_at ? new Date(String(order.filled_at)).toLocaleString() : '-';

    return (
        <div className="container mt-5 p-6 rounded-lg border bg-card text-card-foreground">
            <h1
                className="text-2xl font-semibold mb-4 cursor-pointer hover:underline"
                title={String(order.symbol)}
                onClick={() => {
                    // Navigate to Explore and pass the symbol as a query parameter so Explore will pick it up
                    navigate(`/explore?symbol=${encodeURIComponent(String(order.symbol))}`);
                }}
            >
                {order.symbol ?? 'Order'}
            </h1>
            <button
                onClick={() => navigate('/')}
                className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gray-100 text-sm font-medium text-gray-700 hover:bg-yellow-200 hover:shadow transition-colors duration-150 focus:outline-none"
            >
                ← Back to Home
            </button>

            <Card className="p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <InfoRow label="Order ID" value={order.alpaca_id ?? order.id} />
                        <InfoRow label="Status" value={<Badge>{String(order.status)}</Badge>} />
                        <InfoRow label="Symbol" value={order.symbol} />
                        <InfoRow label="Side" value={String(order.side)} />
                        <InfoRow label="Order Type" value={order.order_type ?? order.order_type} />
                        <InfoRow label="Quantity" value={order.qty ?? order.qty} />
                    </div>

                    <div>
                        <InfoRow label="Created At" value={createdAt} />
                        <InfoRow label="Filled At" value={filledAt} />
                    </div>
                </div>
            </Card>

            {isOrderCancelable && (
                <div className="mt-6">
                    <Button
                        variant="destructive"
                        onClick={() => setCancelDialogOpen(true)}
                        disabled={canceling}
                    >
                        {canceling ? 'Canceling...' : 'Cancel Order'}
                    </Button>
                </div>
            )}

            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this order for <strong>{order.symbol}</strong>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelOrder} disabled={canceling}>
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ViewOrder;
