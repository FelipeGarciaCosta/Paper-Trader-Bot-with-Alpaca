import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { normalizeCryptoSymbol } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiquidateButton } from '@/components/positions/LiquidateButton';
import { getOpenPositions, syncPositions } from '@/services/tradingApi';
import type { Position } from '@/types/trading';

type AssetClassFilter = 'all' | 'crypto' | 'us_equity';

export const PositionsTable = () => {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClassFilter>('all');
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const data = await getOpenPositions();
      // Sort by market_value descending (mayor a menor)
      const sorted = data.sort((a, b) => {
        const valueA = a.market_value || 0;
        const valueB = b.market_value || 0;
        return valueB - valueA;
      });
      setPositions(sorted);
      setFilteredPositions(sorted);
    } catch (error) {
      console.error('Failed to fetch positions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  useEffect(() => {
    if (assetClassFilter === 'all') {
      setFilteredPositions(positions);
    } else {
      setFilteredPositions(
        positions.filter((position) => position.asset_class === assetClassFilter)
      );
    }
  }, [assetClassFilter, positions]);

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      await syncPositions(); // Sync con Alpaca
      const data = await getOpenPositions(); // Obtener TODAS las posiciones del DB
      // Sort by market_value descending
      const sorted = data.sort((a, b) => {
        const valueA = a.market_value || 0;
        const valueB = b.market_value || 0;
        return valueB - valueA;
      });
      setPositions(sorted);
    } catch (error) {
      console.error('Sync failed', error);
    } finally {
      setSyncLoading(false);
    }
  };

  const getAssetBadge = (assetClass?: string) => {
    if (assetClass === 'crypto') {
      return <Badge variant="secondary">CRYPTO</Badge>;
    }
    if (assetClass === 'us_equity') {
      return <Badge variant="outline">STOCK</Badge>;
    }
    return null;
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="text-lg font-semibold">Top Positions</h3>
                <div className="text-xs text-muted-foreground">By Market Value</div>
            </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 pl-2 bg-slate-200 rounded-md">
              <span className="text-sm text-muted-foreground">Asset Class:</span>
              <Select
                value={assetClassFilter}
                onValueChange={(value) => setAssetClassFilter(value as AssetClassFilter)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by asset class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="us_equity">US Equity</SelectItem>
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
          <div className="text-center py-8 text-muted-foreground">Loading positions...</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            {/* Fixed Header */}
            <Table>
              <TableHeader>
                <TableRow className="grid grid-cols-[2fr_1.2fr_1fr_1.5fr_1.3fr_160px] gap-4">
                  <TableHead className="flex items-center">Asset</TableHead>
                  <TableHead className="flex items-center justify-center">Price</TableHead>
                  <TableHead className="flex items-center justify-center">Qty</TableHead>
                  <TableHead className="flex items-center justify-center">Market Value</TableHead>
                  <TableHead className="flex items-center justify-center">Total P/L ($)</TableHead>
                  <TableHead className="flex items-center justify-center"></TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            {/* Scrollable Body */}
            <div className="max-h-[280px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableBody>
                  {filteredPositions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No positions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPositions.map((position) => (
                      <TableRow key={position.id} className="grid grid-cols-[2fr_1.2fr_1fr_1.5fr_1.3fr_160px] gap-4">
                        <TableCell className="font-medium flex items-center">
                          <div className="flex items-center gap-2">
                            <span
                              className="cursor-pointer hover:underline hover:text-primary transition-colors"
                              onClick={() => navigate('/Explore', { state: { symbol: normalizeCryptoSymbol(position.symbol) } })}
                            >
                              {position.symbol}
                            </span>
                            {getAssetBadge(position.asset_class)}
                          </div>
                        </TableCell>
                        <TableCell className="flex items-center justify-center">
                          ${position.current_price ? Number(position.current_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                        </TableCell>
                        <TableCell className="flex items-center justify-center">
                          {position.qty ? parseFloat(position.qty).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 5 }) : '0'}
                        </TableCell>
                        <TableCell className="flex items-center justify-center">
                          ${position.market_value ? Number(position.market_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                        </TableCell>
                        <TableCell className="flex items-center justify-center">
                          <span
                            className={
                              (position.unrealized_pl || 0) >= 0 ? 'text-bullish' : 'text-bearish'
                            }
                          >
                            {(position.unrealized_pl || 0) >= 0 ? '+' : ''}$
                            {position.unrealized_pl ? Number(position.unrealized_pl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </span>
                        </TableCell>
                        <TableCell className="flex items-center justify-center">
                          <LiquidateButton
                            position={position}
                            onLiquidateSuccess={fetchPositions}
                            variant="outline"
                            size="sm"
                            className="w-full hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Card>
    </>
  );
};
