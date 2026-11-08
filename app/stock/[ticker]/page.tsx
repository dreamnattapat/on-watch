import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { analyzeOne } from '@/lib/data';
import { arrowPct, money, tone } from '@/lib/format';
import { daysUntil, longDate, shortDate, whenLabel } from '@/lib/earnings';
import { STAGE_NAMES } from '@/lib/analysis/stage';
import { StockDetail } from '@/components/StockList';
import { Badge, VerdictBadge } from '@/components/ui';
import { PublicHeader } from '@/components/PublicHeader';
import { PUBLIC_TICKERS } from '@/lib/popular';

// Look up any stock (logged-in only). Cached for 30 minutes.
export const revalidate = 1800;

// Built on first visit, then served from cache and refreshed in the background.
export async function generateStaticParams() {
  return [];
}

const getStock = cache(async (raw: string) => {
  const ticker = raw.toUpperCase();
  if (!/^[A-Z][A-Z.]{0,5}$/.test(ticker)) return null;
  return analyzeOne(ticker);
});

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const s = await getStock(ticker);
  if (!s) return { title: 'Stock not found' };
  const v = s.valuation;
  const bits = [
    v?.fair != null && s.quote ? `${v.verdictText}: fair value about ${money(v.fair)} vs. ${money(s.quote.price)}` : null,
    s.stage ? `Stage ${s.stage.stage} (${STAGE_NAMES[s.stage.stage].toLowerCase()})` : null,
    s.nextEarnings ? `Next earnings ${longDate(s.nextEarnings.date)}` : null,
  ].filter(Boolean);
  const title = `${s.ticker} fair value, stage & earnings date`;
  const description = `${s.name} (${s.ticker}): ${bits.join('. ')}. Free, plain-English analysis from OnWatch.`;
  return {
    title,
    description,
    alternates: { canonical: `/stock/${s.ticker}` },
    openGraph: { title: `${s.ticker}: ${v?.verdictText ?? 'analysis'} · OnWatch`, description, type: 'article' },
    twitter: { card: 'summary_large_image', title: `${s.ticker}: ${v?.verdictText ?? 'analysis'}`, description },
  };
}

export default async function PublicStockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const s = await getStock(ticker);
  if (!s) notFound();
  const ch = s.quote?.changePct ?? null;
  const v = s.valuation;
  const others = PUBLIC_TICKERS.filter((t) => t !== s.ticker).slice(0, 60);

  return (
    <div className="wrap">
      <PublicHeader />
      <article>
        <header className="row-between" style={{ padding: '20px 0 14px', borderBottom: '3px solid var(--ink)', alignItems: 'flex-end' }}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="kicker">Stock analysis</div>
            <h1 className="head" style={{ fontSize: 'clamp(44px, 8vw, 72px)' }}>{s.ticker}</h1>
            <p style={{ fontSize: 16 }}>{s.name}</p>
          </div>
          <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
            <span className="head num" style={{ fontSize: 40, lineHeight: 1 }}>{money(s.quote?.price)}</span>
            <span className={`heavy num ${tone(ch)}`}>{arrowPct(ch)} today</span>
          </div>
        </header>

        <section aria-label="Summary" className="stats" style={{ padding: '16px 0', borderBottom: '1px solid var(--ink)' }}>
          <div className="stat">
            <span className="label">Valuation</span>
            <span><VerdictBadge v={v?.verdict ?? null} /></span>
            {v?.fair != null && <span style={{ fontSize: 14 }}>Fair value about <span className="bold">{money(v.fair)}</span></span>}
          </div>
          <div className="stat">
            <span className="label">Trend</span>
            <span className="bold" style={{ fontSize: 18 }}>{s.stage ? `Stage ${s.stage.stage}: ${STAGE_NAMES[s.stage.stage]}` : '—'}</span>
          </div>
          <div className="stat">
            <span className="label">Next earnings</span>
            {s.nextEarnings
              ? <span className="bold" style={{ fontSize: 18 }}>{shortDate(s.nextEarnings.date)} <Badge kind={daysUntil(s.nextEarnings.date) <= 7 ? 'high' : 'fair'}>{whenLabel(daysUntil(s.nextEarnings.date))}</Badge></span>
              : <span className="small">Not announced</span>}
          </div>
          <div className="stat">
            <span className="label">Risk : reward</span>
            <span className={`bold ${s.rr?.verdict === 'Good' ? 'up' : s.rr?.verdict === 'Poor' ? 'down' : ''}`} style={{ fontSize: 18 }}>{s.rr?.text ?? '—'}</span>
          </div>
        </section>


        <StockDetail s={s} />


        <nav aria-label="More stocks" style={{ paddingTop: 28 }}>
          <div className="label" style={{ paddingBottom: 8 }}>More stocks</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
            {others.map((t) => <Link key={t} href={`/stock/${t}`} className="bold" style={{ fontSize: 14, minHeight: 32, display: 'inline-flex', alignItems: 'center' }}>{t}</Link>)}
          </div>
        </nav>
      </article>
      <footer className="footer">
        <span>OnWatch gives information, not investment advice. Prices may be delayed. Updated about every 30 minutes.</span>
        <span><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></span>
      </footer>
    </div>
  );
}
