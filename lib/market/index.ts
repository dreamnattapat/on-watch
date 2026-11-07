import { env } from '../config';
import { createFinnhub } from './finnhub';
import { demoProvider } from './demo';
import type { MarketProvider, Quote } from './types';

export * from './types';

/** The active market data source: Finnhub when a key is set, demo data otherwise. */
export const market: MarketProvider = env.finnhubKey ? createFinnhub(env.finnhubKey) : demoProvider;

export const isDemoData = market.name === 'demo';

export async function getQuotes(tickers: string[]): Promise<Map<string, Quote>> {
  const results = await Promise.all(tickers.map((t) => market.getQuote(t)));
  const map = new Map<string, Quote>();
  results.forEach((q) => q && map.set(q.ticker, q));
  return map;
}
