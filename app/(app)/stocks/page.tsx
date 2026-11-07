import type { Metadata } from 'next';
import Link from 'next/link';
import { getHoldings } from '@/lib/portfolio';
import { analyzeHoldings, getUniverse } from '@/lib/data';
import { StockList } from '@/components/StockList';

export const metadata: Metadata = { title: 'My stocks' };
export const dynamic = 'force-dynamic';

export default async function StocksPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  const holdings = await getHoldings();
  const universe = await getUniverse();
  const stocks = await analyzeHoldings(holdings, universe);
  return (
    <div className="stack" style={{ gap: 0, paddingTop: 8 }}>
      <div className="row-between" style={{ paddingBottom: 12 }}>
        <div className="stack" style={{ gap: 2 }}>
          <div className="kicker">My stocks</div>
          <h1 className="head" style={{ fontSize: 'clamp(36px, 5vw, 54px)' }}>Tap a stock to see everything</h1>
        </div>
        <Link href="/settings#holdings" className="btn">+ Add a stock</Link>
      </div>
      {stocks.length === 0
        ? <p className="lede" style={{ padding: '24px 0' }}>You haven’t added any stocks yet. <Link href="/settings#holdings">Add your first one</Link>.</p>
        : <StockList stocks={stocks} holdings={holdings} initialOpen={open?.toUpperCase() ?? null} />}
    </div>
  );
}
