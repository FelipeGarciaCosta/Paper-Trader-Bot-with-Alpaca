import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRecentOrders } from '@/services/tradingApi';
import type { Order } from '@/types/trading';

const InfoRow = ({ label, value }: { label: string; value?: any }) => (
    <div className="flex justify-between py-2 border-b border-muted/30">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value ?? '-'}</div>
    </div>
);

const ViewOrder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(false);

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="font-semibold mb-3">Lifecycle of Status</h3>
                    <InfoRow label="Created At" value={createdAt} />
                    <InfoRow label="Filled At" value={filledAt} />
                    <InfoRow label="Updated At" value={order.updated_at ? new Date(String(order.updated_at)).toLocaleString() : '-'} />
                </Card>

                <Card className="p-6">
                    <h3 className="font-semibold mb-3">Order Linkages</h3>
                    <InfoRow label="Replaces" value={(order as any).replaces ?? '-'} />
                    <InfoRow label="Replaced By" value={(order as any).replaced_by ?? '-'} />
                </Card>
            </div>
        </div>
    );
};

export default ViewOrder;
