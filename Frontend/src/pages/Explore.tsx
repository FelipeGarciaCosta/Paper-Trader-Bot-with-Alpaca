import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TradingChart } from '@/components/trading/TradingChart';
import { OrderForm } from '@/components/orders/OrderForm';
import { PositionsList } from '@/components/positions/PositionsList';
import { TradingHistory } from '@/components/trading/TradingHistory';
import ExploreAssets from '@/components/trading/ExploreAssets';
import { normalizeCryptoSymbol } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const Explore = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  
  // Get initial symbol from state or query params
  const getSymbolFromLocation = (): string => {
    // Check state first (from navigation)
    const state = location.state as { symbol?: string } | null;
    if (state?.symbol) {
      return normalizeCryptoSymbol(state.symbol);
    }
    // Check query params
    const params = new URLSearchParams(location.search);
    const symbolParam = params.get('symbol');
    return symbolParam ? normalizeCryptoSymbol(symbolParam) : 'BTC/USD';
  };

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => getSymbolFromLocation());
  const previousSymbolRef = useRef<string>(selectedSymbol);

  // Update symbol when location changes
  useEffect(() => {
    // Check state first
    const state = location.state as { symbol?: string } | null;
    let newSymbol: string | null = null;
    
    if (state?.symbol) {
      newSymbol = normalizeCryptoSymbol(state.symbol);
    } else {
      // Check query params
      const params = new URLSearchParams(location.search);
      const symbolParam = params.get('symbol');
      if (symbolParam) {
        newSymbol = normalizeCryptoSymbol(symbolParam);
      }
    }
    
    // Only update if the symbol actually changed
    if (newSymbol && newSymbol !== previousSymbolRef.current) {
      previousSymbolRef.current = newSymbol;
      setSelectedSymbol(newSymbol);
    }
  }, [location.search, location.state]);

  // Handler passed to the modal: set local state and push the selected symbol into the URL
  const handleSelect = (sym: string) => {
    setSelectedSymbol(sym);
    // Update the URL query string without reloading the page
    navigate(`/Explore?symbol=${encodeURIComponent(sym)}`, { replace: true, state: null });
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
              <TradingChart symbol={selectedSymbol} onPriceUpdate={setCurrentPrice} />
            </div>
            <div>
              {isAuthenticated ? (
                <OrderForm
                  symbol={selectedSymbol}
                  currentPrice={currentPrice}
                  onOrderCreated={() => {
                    console.log('Order created successfully');
                  }}
                />
              ) : (
                <div className="bg-card border border-border rounded-lg p-6 text-center">
                  <p className="text-muted-foreground mb-4">Please login to place orders</p>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Go to Login
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Positions and History - Only show if authenticated */}
          {isAuthenticated && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PositionsList symbol={selectedSymbol} />
              <TradingHistory symbol={selectedSymbol} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Explore;
