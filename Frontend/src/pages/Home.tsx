import { PortfolioChart } from '@/components/trading/PortfolioChart';
import { PositionsTable } from '@/components/positions/PositionsTable';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { MetricsPanel } from '@/components/MetricsPanel';

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Metrics Panel */}
          <MetricsPanel />

          {/* Portfolio Chart */}
          <PortfolioChart />

          {/* Top Positions Table */}
          <PositionsTable />

          {/* Recent Orders Table */}
          <OrdersTable />
        </div>
      </main>
    </div>
  );
};

export default Home;
