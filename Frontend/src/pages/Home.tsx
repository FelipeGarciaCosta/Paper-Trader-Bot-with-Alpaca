import { PortfolioChart } from '@/components/PortfolioChart';
import { OrdersTable } from '@/components/OrdersTable';
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

          {/* Recent Orders Table */}
          <OrdersTable />
        </div>
      </main>
    </div>
  );
};

export default Home;
