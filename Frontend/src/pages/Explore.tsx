import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TradingChart } from '@/components/TradingChart';
import { OrderForm } from '@/components/OrderForm';
import { PositionsList } from '@/components/PositionsList';
import { TradingHistory } from '@/components/TradingHistory';
import ExploreAssets from '@/components/ExploreAssets';

const Explore = () => {
  // Initialize selectedSymbol from the `symbol` URL query parameter when present.
  // Fallback to 'BTCUSD' when no parameter is provided.
  const location = useLocation();
  const getInitialSymbol = () => {
    try {
      const params = new URLSearchParams(location.search);
      return params.get('symbol') ?? 'BTC/USD';
    } catch (e) {
      return 'BTC/USD';
    }
  };

  const [selectedSymbol, setSelectedSymbol] = useState<string>(getInitialSymbol);
  const navigate = useNavigate();

  // If the URL changes (e.g. user navigates to /explore?symbol=XXX), update selectedSymbol.
  useEffect(() => {
    const s = getInitialSymbol();
    setSelectedSymbol(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Handler passed to the modal: set local state and push the selected symbol into the URL
  const handleSelect = (sym: string) => {
    setSelectedSymbol(sym);
    // Update the URL query string without reloading the page so the selection is shareable.
    navigate(`?symbol=${encodeURIComponent(sym)}`, { replace: false });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Symbol Selector */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Explore Assets</h2>
            <div className="w-48">
              <ExploreAssets value={selectedSymbol} onSelect={handleSelect} />
            </div>
          </div>

          {/* Chart and Order Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TradingChart symbol={selectedSymbol} />
            </div>
            <div>
              <OrderForm
                symbol={selectedSymbol}
                currentPrice={33333}// Placeholder price
                onOrderCreated={() => {
                  // Refresh data after order creation
                  window.location.reload();
                }}
              />
            </div>
          </div>

          {/* Positions and History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PositionsList />
            <TradingHistory />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Explore;
