import { useMemo, useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

type Props = {
    value: string;
    onSelect: (symbol: string) => void;
};

const ASSETS = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc., Class A' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'TSLA', name: 'Tesla, Inc.' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
    { symbol: 'IVV', name: 'iShares Core S&P 500 ETF' },
    { symbol: 'META', name: 'Meta Platforms, Inc. (formerly FB)' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble Company' },
    { symbol: 'MA', name: 'Mastercard Incorporated' },
    { symbol: 'DIS', name: 'Walt Disney Company' },
    { symbol: 'HD', name: 'Home Depot, Inc.' },
    { symbol: 'T', name: 'AT&T Inc.' },
    { symbol: 'UNH', name: 'UnitedHealth Group Incorporated' },
    { symbol: 'INTC', name: 'Intel Corporation' },
    { symbol: 'KO', name: 'Coca-Cola Company' },
];

const CRYPTOS = [
    { symbol: 'BTC/USD', name: 'Bitcoin' },
    { symbol: 'ETH/USD', name: 'Ethereum' },
    { symbol: 'SOL/USD', name: 'Solana' },
    { symbol: 'XRP/USD', name: 'Ripple' },
    { symbol: 'DOGE/USD', name: 'Dogecoin' },
    { symbol: 'ADA/USD', name: 'Cardano' },
    { symbol: 'AVAX/USD', name: 'Avalanche' },
    { symbol: 'LINK/USD', name: 'Chainlink' },
    { symbol: 'LTC/USD', name: 'Litecoin' },
    { symbol: 'BCH/USD', name: 'Bitcoin Cash' },
    { symbol: 'SHIB/USD', name: 'Shiba Inu' },
    { symbol: 'DOT/USD', name: 'Polkadot' },
    { symbol: 'UNI/USD', name: 'Uniswap' },
    { symbol: 'AAVE/USD', name: 'Aave' },
    { symbol: 'ALGO/USD', name: 'Algorand' },
    { symbol: 'MATIC/USD', name: 'Polygon/Polygon Ecosystem Token' },
    { symbol: 'NEAR/USD', name: 'Near Protocol' },
    { symbol: 'USDT/USD', name: 'Tether' },
    { symbol: 'USDC/USD', name: 'USD Coin' },
    { symbol: 'BAT/USD', name: 'Basic Attention Token' },
];
/*Si la búsqueda está vacía, devuelve la lista completa.
Busca coincidencias en el campo symbol. Si hay al menos una coincidencia en symbol, devuelve SOLO esas coincidencias ordenadas por relevancia (priorizando startsWith / aparición más temprana, luego símbolos más cortos).
Si no hay coincidencias en symbol, busca coincidencias en name y devuelve esas coincidencias ordenadas por relevancia (aparecen primero las que contienen la búsqueda más al inicio). */
export default function ExploreAssets({ value, onSelect }: Props) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'assets' | 'cryptos'>('assets');
    const [query, setQuery] = useState('');

    const list = mode === 'assets' ? ASSETS : CRYPTOS;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        // If no query, return full list
        if (!q) return list;

        // Helper that returns index of match or -1
        const indexOf = (s: string, sub: string) => s.toLowerCase().indexOf(sub);

        // First, find items where the SYMBOL matches the query
        const symbolMatches = list.filter(item => indexOf(item.symbol, q) !== -1);

        if (symbolMatches.length > 0) {
            // If any symbol matches, we prioritize showing ONLY the symbol matches.
            // Sort by best symbol match: earlier index (startsWith -> index 0) ranks higher,
            // then shorter symbol length as tie-breaker, then alphabetically.
            return symbolMatches.sort((a, b) => {
                const ia = indexOf(a.symbol, q);
                const ib = indexOf(b.symbol, q);
                if (ia !== ib) return ia - ib;
                if (a.symbol.length !== b.symbol.length) return a.symbol.length - b.symbol.length;
                return a.symbol.localeCompare(b.symbol);
            });
        }

        // If no symbol matched, then search by NAME and return name matches.
        const nameMatches = list.filter(item => indexOf(item.name, q) !== -1);

        // Sort name matches by earliest index of match and then alphabetically
        return nameMatches.sort((a, b) => {
            const ia = indexOf(a.name, q);
            const ib = indexOf(b.name, q);
            if (ia !== ib) return ia - ib;
            return a.name.localeCompare(b.name);
        });
    }, [list, query]);

    const handleChoose = (s: string) => {
        onSelect(s);
        setOpen(false);
        setQuery('');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm">{value}</div>
            </DialogTrigger>

            <DialogContent>
                <DialogTitle>Choose symbol</DialogTitle>
                <DialogDescription className="mb-4">Select an asset or crypto to explore.</DialogDescription>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-40">
                        <Select value={mode} onValueChange={(v) => setMode(v as 'assets' | 'cryptos')}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="assets">
                                    <div className="flex items-center gap-2">
                                        <img src="/Nasdaq.svg" alt="Nasdaq" className="h-4 w-4" />
                                        Assets
                                    </div>

                                </SelectItem>

                                <SelectItem value="cryptos">
                                    <div className="flex items-center gap-2">
                                        <img src="/bitcoin-brands-solid.svg" alt="Bitcoin" className="h-4 w-4" />
                                        Cryptos
                                    </div>
                                </SelectItem>

                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1">
                        <Input placeholder={mode === 'assets' ? 'Search asset' : 'Search crypto'} value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                </div>

                <Card className="max-h-72 overflow-auto">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No results</div>
                    ) : (
                        <ul>
                            {filtered.map(item => (
                                <li key={item.symbol} className="px-4 py-3 hover:bg-muted cursor-pointer flex justify-between items-center" onClick={() => handleChoose(item.symbol)}>
                                    <div>
                                        <div className="font-medium">{item.symbol}</div>
                                        <div className="text-sm text-muted-foreground">{item.name}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </DialogContent>
        </Dialog>
    );
}
