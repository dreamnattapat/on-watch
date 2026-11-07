import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { StockSearch } from '@/components/StockSearch';
import { EXTRA_POPULAR, PUBLIC_TICKERS } from '@/lib/popular';

export const metadata: Metadata = {
  title: 'Free stock analysis: fair value, stage and earnings dates',
  description: 'Look up any US stock for a plain-English valuation, Weinstein stage, risk : reward and next earnings date. Free from OnWatch.',
  alternates: { canonical: '/stock' },
};

export default function StockDirectory() {
  return (
    <div className="wrap">
      <PublicHeader />
      <div className="stack" style={{ gap: 18, paddingTop: 24 }}>
        <div className="kicker">Free stock analysis</div>
        <h1 className="head h1">Is it cheap or expensive right now?</h1>
        <p className="lede">Fair value, trend stage, risk : reward and the next earnings date for any US stock, in plain English.</p>
        <StockSearch />
        <section>
          <h2 className="label" style={{ paddingBottom: 8 }}>Popular right now</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EXTRA_POPULAR.map((t) => <Link key={t} href={`/stock/${t}`} className="preset" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontWeight: 800 }}>{t}</Link>)}
          </div>
        </section>
        <section>
          <h2 className="label" style={{ padding: '8px 0' }}>All stocks</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
            {PUBLIC_TICKERS.map((t) => <Link key={t} href={`/stock/${t}`} className="bold" style={{ minHeight: 40, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--rule)' }}>{t}</Link>)}
          </div>
        </section>
      </div>
      <footer className="footer">
        <span>OnWatch gives information, not investment advice.</span>
        <span><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></span>
      </footer>
    </div>
  );
}
