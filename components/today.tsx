import Link from 'next/link';
import type { MarketOverview, PortfolioSummary, StockAnalysis, WeekEvent } from '@/lib/data';
import type { Brief } from '@/lib/brief';
import { arrowPct, money, pct, signedMoney, tone } from '@/lib/format';
import { Badge, VerdictBadge } from './ui';
import { daysUntil, shortDate, whenLabel } from '@/lib/earnings';

export function PortfolioPanel({ pf, stocks, spyPct, qqqPct }: { pf: PortfolioSummary; stocks: StockAnalysis[]; spyPct: number | null; qqqPct: number | null }) {
  const oneLine = [
    pf.best && pf.best.dayUsd != null && pf.best.dayUsd > 0 ? `${pf.best.ticker} added ${signedMoney(pf.best.dayUsd)}.` : null,
    pf.worst && pf.worst.dayUsd != null && pf.worst.dayUsd < 0 ? `${pf.worst.ticker} cost you ${money(pf.worst.dayUsd)}.` : null,
  ].filter(Boolean).join(' ');
  const hasShares = pf.rows.some((r) => r.shares != null);
  return (
    <section aria-labelledby="pf-title" className="pf">
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <h2 id="pf-title" className="head" style={{ fontSize: 26 }}>Your portfolio</h2>
        <span className="small">All amounts in USD</span>
      </div>
      {hasShares ? (
        <div className="stats">
          <div className="stat">
            <span className="kicker">Today’s return</span>
            <span className={`big num ${tone(pf.dayUsd)}`}>{signedMoney(pf.dayUsd)}</span>
            <span className={`bold ${tone(pf.dayPct)}`} style={{ fontSize: 13 }}>
              {arrowPct(pf.dayPct)} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· S&amp;P {pct(spyPct)} · Nasdaq {pct(qqqPct)}</span>
            </span>
            {oneLine && <span className="small">{oneLine}</span>}
          </div>
          <div className="stat">
            <span className="label">Total return</span>
            <span className={`big num ${tone(pf.totalUsd)}`}>{signedMoney(pf.totalUsd)}</span>
            <span className={`bold ${tone(pf.totalPct)}`} style={{ fontSize: 13 }}>{pf.totalPct != null ? `${pct(pf.totalPct)} since you bought` : 'Add your average cost to see this'}</span>
          </div>
          <div className="stat">
            <span className="label">Portfolio value</span>
            <span className="big num">{money(pf.value)}</span>
            {pf.cost != null && <span className="small" style={{ fontSize: 13 }}>You invested {money(pf.cost)}</span>}
          </div>
        </div>
      ) : (
        <p className="small" style={{ fontSize: 14 }}>Add how many shares you own in <Link href="/settings">Settings</Link> to see your returns in dollars.</p>
      )}
      <div className="table-wrap">
        <table className="t" style={{ minWidth: 740 }}>
          <thead>
            <tr><th>Stock</th><th>Price</th><th>Today</th><th>Today’s return</th><th>Total return</th><th>Next earnings</th><th>Valuation</th></tr>
          </thead>
          <tbody>
            {pf.rows.map((r) => {
              const s = stocks.find((x) => x.ticker === r.ticker);
              return (
                <tr key={r.ticker}>
                  <td>
                    <Link href={`/stocks?open=${r.ticker}`} className="tick-link">{r.ticker}</Link>{' '}
                    {r.shares != null && <span className="small">{r.shares.toLocaleString('en-US')} {r.shares === 1 ? 'share' : 'shares'}</span>}
                  </td>
                  <td>{money(r.price)}</td>
                  <td className={`heavy ${tone(r.changePct)}`}>{arrowPct(r.changePct)}</td>
                  <td className={`heavy ${tone(r.dayUsd)}`}>{signedMoney(r.dayUsd)}</td>
                  <td className={`heavy ${tone(r.totalUsd)}`}>{signedMoney(r.totalUsd)}{r.totalPct != null && <div style={{ fontSize: 12, fontWeight: 600 }}>{pct(r.totalPct)}</div>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {s?.nextEarnings ? (() => {
                      const d = daysUntil(s.nextEarnings.date);
                      return <span className={d <= 7 ? 'down heavy' : ''}>{shortDate(s.nextEarnings.date)}<div className="small" style={{ fontWeight: 600 }}>{whenLabel(d)}</div></span>;
                    })() : <span className="small">—</span>}
                  </td>
                  <td><VerdictBadge v={s?.valuation?.verdict ?? null} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BriefPanel({ brief }: { brief: Brief }) {
  return (
    <>
      <article className="section" style={{ gap: 12 }}>
        <div className="kicker">Your 2-minute brief</div>
        <h1 className="head h1">{brief.headline}</h1>
        <p className="lede">{brief.lead}</p>
      </article>
      {brief.stories.length > 0 && (
        <div className="brief-cols">
          {brief.stories.map((s) => (
            <article key={s.ticker + s.tag}>
              <div className="kicker" style={{ fontSize: 11 }}>{s.ticker} · {s.tag}</div>
              <h3>{s.title}</h3>
              {s.body && <p style={{ color: 'var(--ink-2)' }}>{s.body}</p>}
              <Link href={`/stocks?open=${s.ticker}`} className="link-btn" style={{ display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start' }}>Open {s.ticker} →</Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function tileClass(p: number) {
  if (p <= -3) return 't-dn3';
  if (p <= -0.5) return 't-dn';
  if (p < 0.5) return 't-flat';
  if (p < 3) return 't-up';
  return 't-up3';
}

export function Heatmap({ heat, mine }: { heat: MarketOverview['heat']; mine: Set<string> }) {
  return (
    <section aria-labelledby="hm-title" className="section">
      <div className="stack" style={{ gap: 2 }}>
        <div className="kicker">Heatmap</div>
        <h2 id="hm-title" className="head h2">Today’s biggest movers</h2>
      </div>
      {heat.length === 0 ? <p className="note">Prices are unavailable right now.</p> : (
        <div className="heat">
          {heat.map((c) => (
            <div key={c.ticker} className={`tile ${tileClass(c.changePct)}`} style={{ gridColumn: `span ${c.w}`, gridRow: `span ${c.w === 2 && ['NVDA', 'AAPL', 'MSFT'].includes(c.ticker) ? 2 : 1}` }}>
              <span className="tk">{c.ticker}{mine.has(c.ticker) ? ' ★' : ''}</span>
              <span className="ch">{pct(c.changePct)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="legend">
        <span><span className="sw t-dn3" />Down 3%+</span><span><span className="sw t-dn" />Down</span><span><span className="sw t-flat" />Flat</span>
        <span><span className="sw t-up" />Up</span><span><span className="sw t-up3" />Up 3%+</span>
        <span>★ = in your portfolio · bigger tile = bigger company</span>
      </div>
    </section>
  );
}

export function SectorRotation({ sectors }: { sectors: MarketOverview['sectors'] }) {
  const max = Math.max(1, ...sectors.map((s) => Math.abs(s.changePct)));
  const leaders = sectors.filter((s) => s.changePct > 0).slice(0, 2).map((s) => s.name.toLowerCase());
  const laggards = sectors.filter((s) => s.changePct < 0).slice(-2).map((s) => s.name.toLowerCase());
  const headline = leaders.length && laggards.length ? `Money moves into ${leaders[0]}, out of ${laggards[laggards.length - 1]}`
    : leaders.length ? 'Most sectors rise together' : 'Most sectors fall together';
  return (
    <section aria-labelledby="rot-title" className="stack" style={{ flex: '3 1 340px', gap: 10 }}>
      <div className="stack" style={{ gap: 2 }}>
        <div className="kicker">Money rotation</div>
        <h2 id="rot-title" className="head" style={{ fontSize: 30, lineHeight: 1 }}>{sectors.length ? headline : 'Sector data unavailable'}</h2>
      </div>
      <div>
        {sectors.map((s) => {
          const w = `${Math.round((Math.abs(s.changePct) / max) * 100)}%`;
          return (
            <div key={s.etf} className="dbar">
              <span className="bold">{s.name}</span>
              <div className="l">{s.changePct < 0 && <div className="bar-dn" style={{ width: w }} />}</div>
              <div className="r">{s.changePct > 0 && <div className="bar-up" style={{ width: w }} />}</div>
              <span className={`heavy num ${tone(s.changePct)}`} style={{ textAlign: 'right' }}>{pct(s.changePct)}</span>
            </div>
          );
        })}
      </div>
      <div className="small">Sector change today (SPDR sector funds). Red bars lost money; green bars gained.</div>
    </section>
  );
}

export function FearGreedPanel({ fg, history }: { fg: MarketOverview['fearGreed']; history: MarketOverview['fgHistory'] }) {
  if (!fg) return <section className="stack" style={{ flex: '2 1 260px' }}><div className="kicker">Fear &amp; greed</div><p className="note">Not enough data right now.</p></section>;
  const meaning = fg.score > 55 ? 'Greed often comes before sharp pullbacks. A good time to avoid chasing prices.'
    : fg.score < 45 ? 'Fear often creates bargains for patient investors, but prices can keep falling for a while.'
    : 'The market is calm. No strong signal either way.';
  return (
    <section aria-labelledby="fg-title" className="stack" style={{ flex: '2 1 260px', gap: 10 }}>
      <div className="stack" style={{ gap: 2 }}>
        <div className="kicker">Fear &amp; greed</div>
        <h2 id="fg-title" className="head" style={{ fontSize: 30, lineHeight: 1 }}>The market is feeling {fg.label.toLowerCase()}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="head num" style={{ fontSize: 72, lineHeight: 0.85 }}>{fg.score}</span>
        <span className="label" style={{ fontSize: 14, fontWeight: 800 }}>{fg.label}</span>
      </div>
      <div role="img" aria-label={`Fear and greed score ${fg.score} out of 100: ${fg.label}`} className="stack" style={{ gap: 4 }}>
        <div className="fg-marker"><span style={{ left: `${fg.score}%` }} /></div>
        <div className="fg-scale"><div style={{ background: 'var(--red)' }} /><div style={{ background: '#f2c4cb' }} /><div style={{ background: '#e2e2e2' }} /><div style={{ background: '#b7e4c7' }} /><div style={{ background: 'var(--green)' }} /></div>
        <div className="fg-labels"><span>Extreme fear</span><span>Fear</span><span>Neutral</span><span>Greed</span><span>Extreme greed</span></div>
      </div>
      {history.length > 0 && (
        <table className="t" style={{ fontSize: 13 }}>
          <tbody>
            {history.map((h) => <tr key={h.when}><th scope="row">{h.when}</th><td><span className="heavy">{h.score}</span></td></tr>)}
          </tbody>
        </table>
      )}
      <details>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 36, display: 'flex', alignItems: 'center' }}>How we work this out</summary>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
          {fg.parts.map((p) => <li key={p.name}>{p.name}: {p.detail} → {Math.round(p.score)}</li>)}
        </ul>
      </details>
      <p style={{ fontSize: 13 }}><span className="bold">What it means for you:</span> {meaning}</p>
    </section>
  );
}

const fmtDay = (iso: string) => {
  const d = new Date(iso + 'T12:00:00Z');
  return { dow: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), day: d.getUTCDate() };
};

export function WeekAhead({ events }: { events: WeekEvent[] }) {
  return (
    <section aria-labelledby="wk-title" className="rule-top">
      <h2 id="wk-title" className="head h3" style={{ marginBottom: 4 }}>The week ahead</h2>
      {events.length === 0 && <p className="note" style={{ padding: '8px 0' }}>No big events for your stocks in the next 7 days.</p>}
      {events.map((e) => {
        const d = fmtDay(e.date);
        return (
          <div key={e.date + e.title} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
            <div className="stack" style={{ flex: '0 0 40px', gap: 0 }}>
              <span className="kicker" style={{ fontSize: 11 }}>{d.dow}</span>
              <span className="head" style={{ fontSize: 30, lineHeight: 0.9 }}>{d.day}</span>
            </div>
            <div className="stack" style={{ gap: 4, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
                <span className="bold">{e.title}</span>
                <Badge kind={e.impact.toLowerCase()}>{e.impact}</Badge>
              </div>
              <p style={{ fontSize: 13 }}>{e.why}</p>
              <div className="label" style={{ fontSize: 11, color: 'var(--muted)' }}>{e.affects}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
