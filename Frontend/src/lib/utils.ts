import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function to merge class names with Tailwind CSS support
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes crypto symbols to include the slash separator.
 * Alpaca API returns crypto symbols differently in different endpoints:
 * - Orders endpoint: BTC/USD (with slash)
 * - Positions endpoint: BTCUSD (without slash)
 * 
 * This function ensures consistent format by adding the slash if missing.
 * Only affects symbols ending in USD.
 * 
 * @param symbol - The symbol to normalize (e.g., "BTCUSD" or "BTC/USD")
 * @returns Normalized symbol (e.g., "BTC/USD")
 */
export function normalizeCryptoSymbol(symbol: string): string {
  // If symbol already has a slash, return as is
  if (symbol.includes('/')) {
    return symbol;
  }
  
  // If symbol ends with USD and doesn't have a slash, add it
  // This handles crypto symbols like BTCUSD -> BTC/USD
  if (symbol.endsWith('USD') && symbol.length > 3) {
    return symbol.slice(0, -3) + '/USD';
  }
  
  // For non-crypto symbols (stocks), return as is
  return symbol;
}
