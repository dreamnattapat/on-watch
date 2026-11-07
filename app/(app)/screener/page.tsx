import type { Metadata } from 'next';
import { getHoldings } from '@/lib/portfolio';
import { getUniverse, peerStatsFor } from '@/lib/data';
import { market } from '@/lib/market';
import { valueStock } from '@/lib/analysis/valuation';
import { findSupport } from '@/lib/analysis/stage';
import { riskReward } from '@/lib/analysis/riskReward';
import { Screener, type ScreenRow } from '@/components/Screener';

export const metadata: Metadata = { title: 'Screener' };
export const dynamic = 'force-dynamic';

export default async function ScreenerPage() {
  const [universe, holdings] = await Promise.all([getUniverse(), getHoldings()]);
  const mine = new Set(holdings.map((h) => h.ticker));
  const rows: ScreenRow[] = (await Promise.all(universe.map(async (u): Promise<ScreenRow | null> => {
    if (!u.quote || !u.metrics) return null;
    const price = u.quote.price;
    const v = valueStock(u.ticker, price, u.profile, u.metrics, peerStatsFor(u.ticker, u.sector, universe));
    const weekly = await market.getWeekly(u.ticker);
    const rr = riskReward(price, findSupport(weekly, price), v.fair);
    const g = u.metrics.epsGrowth;
    return {
      ticker: u.ticker,
      name: u.profile?.name ?? u.ticker,
      type: v.type,
      price,
      pe: u.metrics.pe,
      peg: u.metrics.pe != null && u.metrics.pe > 0 && g != null && g > 0 ? u.metrics.pe / g : null,
      de: u.metrics.debtToEquity,
      fair: v.fair,
      upside: v.upsidePct,
      verdict: v.verdict,
      rr: rr?.ratio ?? null,
      rrText: rr?.text ?? '—',
      rrVerdict: rr?.verdict ?? null,
      mine: mine.has(u.ticker),
    };
  }))).filter((r): r is ScreenRow => r != null);

  return (
    <div className="stack" style={{ gap: 18, paddingTop: 8 }}>
      <div className="stack" style={{ gap: 2 }}>
        <div className="kicker">Stock screener</div>
        <h1 className="head" style={{ fontSize: 'clamp(34px, 5vw, 44px)' }}>Find stocks at the right price</h1>
        <p className="small" style={{ fontSize: 14 }}>Covers {rows.length} of the largest US companies.</p>
      </div>
      <Screener rows={rows} />
    </div>
  );
}
