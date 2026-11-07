import { NextResponse, type NextRequest } from 'next/server';
import { market } from '@/lib/market';
import { usSession } from '@/lib/marketHours';

// Live prices for a short list of tickers (the user's own stocks).
// Each quote is cached for ~15s and shared by everyone who holds that stock.
export async function GET(request: NextRequest) {
  const tickers = [...new Set((request.nextUrl.searchParams.get('t') ?? '').toUpperCase().split(','))]
    .filter((t) => /^[A-Z][A-Z.]{0,5}$/.test(t))
    .slice(0, 40);
  const quotes = (await Promise.all(tickers.map((t) => market.getQuote(t, 15)))).filter((q) => q != null);
  return NextResponse.json(
    { quotes, session: usSession(), updated: Date.now() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
