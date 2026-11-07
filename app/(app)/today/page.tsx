import type { Metadata } from 'next';
import Link from 'next/link';
import { getHoldings } from '@/lib/portfolio';
import { analyzeHoldings, buildPortfolio, getMarketOverview, getUniverse, getWeekAhead, topMovers } from '@/lib/data';
import { buildBrief } from '@/lib/brief';
import { BriefPanel, FearGreedPanel, Heatmap, PortfolioPanel, SectorRotation, WeekAhead } from '@/components/today';
import { LiveMovers } from '@/components/LiveMovers';

export const metadata: Metadata = { title: 'Today' };
export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const holdings = await getHoldings();
  const universe = await getUniverse();
  const [stocks, overview, week] = await Promise.all([
    analyzeHoldings(holdings, universe),
    getMarketOverview(universe),
    getWeekAhead(holdings.map((h) => h.ticker)),
  ]);
  const pf = buildPortfolio(holdings, new Map(stocks.map((s) => [s.ticker, s.quote])));
  const brief = buildBrief(stocks, pf, week, overview.spy?.changePct ?? null);
  const mine = new Set(holdings.map((h) => h.ticker));

  if (!holdings.length) {
    return (
      <div className="stack" style={{ gap: 16, padding: '32px 0' }}>
        <h1 className="head h1">Add your first stock</h1>
        <p className="lede">Tell us what you own and your brief, returns and analysis appear here.</p>
        <Link href="/settings" className="btn solid big" style={{ alignSelf: 'flex-start' }}>Add stocks →</Link>
      </div>
    );
  }

  return (
    <>
      <PortfolioPanel pf={pf} stocks={stocks} spyPct={overview.spy?.changePct ?? null} qqqPct={overview.qqq?.changePct ?? null} />
      <div className="cols">
        <div className="main-col">
          <BriefPanel brief={brief} />
          <Heatmap heat={overview.heat} mine={mine} />
          <LiveMovers initial={topMovers(universe)} mine={[...mine]} />
          <div className="split" style={{ gap: 28 }}>
            <SectorRotation sectors={overview.sectors} />
            <FearGreedPanel fg={overview.fearGreed} history={overview.fgHistory} />
          </div>
        </div>
        <aside className="side-col">
          <WeekAhead events={week} />
        </aside>
      </div>
    </>
  );
}
