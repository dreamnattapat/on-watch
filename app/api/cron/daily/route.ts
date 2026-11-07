import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/config';
import { createAdminClient } from '@/lib/supabase/server';
import { heldTickers } from '@/lib/data';
import { market, getQuotes } from '@/lib/market';
import { SECTORS, sectorEtfFor } from '@/lib/universe';
import { getMood } from '@/lib/sentiment';
import { aiWhy, ruleBasedWhy } from '@/lib/whyMoved';
import { isoDate } from '@/lib/format';

// Runs once a day (see vercel.json). Writes one shared "why it moved" summary
// per stock that anyone holds, so AI cost depends on stocks, not users.

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!env.cronSecret || request.headers.get('authorization') !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Supabase secret key not set' }, { status: 500 });

  const tickers = (await heldTickers()).slice(0, 150);
  const [sectorQuotes, spy] = await Promise.all([getQuotes(SECTORS.map((s) => s.etf)), market.getQuote('SPY')]);
  const day = isoDate(new Date());
  const started = Date.now();
  let done = 0;

  for (const ticker of tickers) {
    if (Date.now() - started > 50000) break; // stay inside the function time limit
    const { data: existing } = await admin.from('stock_daily').select('ticker').eq('ticker', ticker).eq('day', day).maybeSingle();
    if (existing) continue;
    const [quote, profile, news, mood] = await Promise.all([
      market.getQuote(ticker), market.getProfile(ticker), market.getCompanyNews(ticker, 2), getMood(ticker),
    ]);
    if (!quote) continue;
    const etf = profile ? sectorEtfFor(profile.industry) : null;
    const ctx = {
      ticker, name: profile?.name ?? ticker, changePct: quote.changePct,
      sectorName: etf ? SECTORS.find((s) => s.etf === etf)?.name ?? null : null,
      sectorChangePct: etf ? sectorQuotes.get(etf)?.changePct ?? null : null,
      marketChangePct: spy?.changePct ?? null, news, mood,
    };
    const why = (await aiWhy(ctx)) ?? ruleBasedWhy(ctx);
    await admin.from('stock_daily').upsert({ ticker, day, change_pct: quote.changePct, why });
    done++;
  }
  return NextResponse.json({ ok: true, day, tickers: tickers.length, written: done });
}
