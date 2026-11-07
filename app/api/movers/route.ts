import { NextResponse } from 'next/server';
import { getQuotes } from '@/lib/market';
import { UNIVERSE_TICKERS } from '@/lib/universe';

// Polled by the Live movers table. Quotes are cached for ~60s server-side and
// shared by every visitor, so polling doesn't multiply market-data calls.
export async function GET() {
  const quotes = await getQuotes(UNIVERSE_TICKERS);
  const rows = [...quotes.values()].map((q) => ({ ticker: q.ticker, price: q.price, changePct: q.changePct }));
  return NextResponse.json(
    {
      gainers: rows.filter((r) => r.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 10),
      losers: rows.filter((r) => r.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 10),
      updated: Date.now(),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' } },
  );
}
