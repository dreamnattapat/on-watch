'use client';

import { useState } from 'react';
import type { StockAnalysis } from '@/lib/data';
import { STAGE_MEANING, STAGE_NAMES, type Stage } from '@/lib/analysis/stage';
import { arrowPct, money, num, pct, signedMoney, timeAgo, tone } from '@/lib/format';
import { Badge, VerdictBadge } from './ui';
import type { Holding } from '@/lib/portfolio';

const STAGE_PATHS: Record<Stage, string> = {
  1: 'M2 36 C 18 28, 34 42, 50 34 S 80 40, 98 32',
  2: 'M2 46 C 30 42, 60 22, 98 4',
  3: 'M2 16 C 20 6, 38 20, 55 10 S 84 20, 98 14',
  4: 'M2 6 C 30 10, 62 30, 98 46',
};
const CHECK_LABELS: Array<[keyof NonNullable<StockAnalysis['stage']>['checks'], string]> = [
  ['aboveAvg', 'Price above its 30-week average'],
  ['avgRising', '30-week average is rising'],
  ['volumeOnUp', 'Volume higher on up weeks'],
  ['beatsIndex', 'Beating the S&P 500 (6 months)'],
];
const READ_CLASS = { Under: 'under', Fair: 'fair', Over: 'over' } as const;
const WEIGHT_CLASS = { 'Main driver': 'main', Contributing: 'contrib', Minor: 'minor' } as const;

function Detail({ s, holding }: { s: StockAnalysis; holding?: Holding }) {
  const v = s.valuation;
  const price = s.quote?.price ?? 0;
  let lo = 0, hi = 1;
  if (v?.low != null && v.high != null) { lo = Math.min(v.low, price) * 0.85; hi = Math.max(v.high, price) * 1.1; }
  const pos = (x: number) => `${(((x - lo) / (hi - lo)) * 100).toFixed(1)}%`;
  const rr = s.rr;
  const span = rr ? rr.riskPct + Math.max(rr.rewardPct, 0) : 1;
  const sh = holding?.shares ?? null;

  return (
    <div className="stock-body">
      <div>
        <section>
          <div className="kicker">Why it moved today</div>
          <h2 className="head" style={{ fontSize: 30, lineHeight: 1 }}>{s.why?.headline ?? 'No data yet'}</h2>
          <ol className="drivers">
            {s.why?.drivers.map((d, i) => (
              <li key={i}>
                <span className="n">{i + 1}</span>
                <div className="stack" style={{ gap: 3, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
                    <span className="bold" style={{ fontSize: 15 }}>{d.title}</span>
                    <Badge kind={WEIGHT_CLASS[d.weight]}>{d.weight}</Badge>
                  </div>
                  <p style={{ fontSize: 14 }}>{d.detail}</p>
                  <div className="label" style={{ fontSize: 11, color: 'var(--muted)' }}>Source: {d.source}</div>
                </div>
              </li>
            ))}
          </ol>
          {s.why?.by === 'rules' && <p className="note">Summarised automatically from today’s news and market moves.</p>}
        </section>

        {s.news.length > 0 && (
          <section>
            <div className="kicker">Latest news</div>
            {s.news.map((n) => (
              <article key={n.id} className="stack" style={{ gap: 4, padding: '10px 0', borderTop: '1px solid var(--rule)' }}>
                <div className="label" style={{ fontSize: 11, color: 'var(--muted)' }}>{n.source} · {timeAgo(n.datetime)}</div>
                <h3 style={{ fontSize: 16, lineHeight: 1.35 }}><a href={n.url} target="_blank" rel="noopener noreferrer">{n.headline}</a></h3>
                {n.summary && <p style={{ fontSize: 14 }}>{n.summary.slice(0, 240)}{n.summary.length > 240 ? '…' : ''}</p>}
              </article>
            ))}
          </section>
        )}

        <section>
          <div className="kicker">What the crowd is saying</div>
          {s.mood ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                <span>{s.mood.bullPct}% bullish</span><span className="small">{s.mood.posts} posts today</span>
              </div>
              <div style={{ height: 10, background: '#e6e6e6' }} aria-hidden="true">
                <div style={{ height: '100%', width: `${s.mood.bullPct}%`, background: s.mood.label === 'Bearish' ? 'var(--red)' : 'var(--green)' }} />
              </div>
              {s.mood.themes.length > 0 && <p style={{ fontSize: 14 }}><span className="bold">Talking about:</span> {s.mood.themes.join(' / ')}</p>}
              <p className="small">From {s.mood.sources}. Opinions summed up, not shown.</p>
            </>
          ) : <p className="note">Crowd mood isn’t switched on yet.</p>}
        </section>
      </div>

      <div>
        <section>
          <div className="kicker">Stage analysis</div>
          {s.stage ? (
            <>
              <h2 className="head" style={{ fontSize: 30, lineHeight: 1 }}>Stage {s.stage.stage}: {STAGE_NAMES[s.stage.stage]}</h2>
              <div className="stages">
                {([1, 2, 3, 4] as Stage[]).map((n) => (
                  <div key={n} className={n === s.stage!.stage ? 'on' : ''}>
                    <svg viewBox="0 0 100 50" width="100%" height="40" preserveAspectRatio="none" aria-hidden="true">
                      <path d={STAGE_PATHS[n]} fill="none" stroke={n === s.stage!.stage ? '#fff' : '#111'} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <span className="label" style={{ fontSize: 11 }}>{n} · {STAGE_NAMES[n]}</span>
                    <span className="label" style={{ fontSize: 11 }}>{n === s.stage!.stage ? '▲ Now' : ' '}</span>
                  </div>
                ))}
              </div>
              <div className="checks">
                {CHECK_LABELS.map(([k, l]) => (
                  <div key={k}><span className={`mk ${s.stage!.checks[k] ? '' : 'down'}`}>{s.stage!.checks[k] ? '✓ Yes' : '✗ No'}</span><span>{l}</span></div>
                ))}
              </div>
              <p style={{ fontSize: 14 }}><span className="bold">What it means for you:</span> {STAGE_MEANING[s.stage.stage]}</p>
            </>
          ) : <p className="note">Not enough price history yet.</p>}
        </section>

        <section>
          <div className="kicker">Valuation check</div>
          {v && v.verdict ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
                <h2 className={`head ${v.verdict === 'Over' ? 'down' : v.verdict === 'Under' ? 'up' : ''}`} style={{ fontSize: 40, lineHeight: 1 }}>
                  {v.verdict === 'Under' ? 'Undervalued' : v.verdict === 'Over' ? 'Overvalued' : 'Fairly valued'}
                </h2>
                <span style={{ fontSize: 14 }}>Fair value about {money(v.fair)} ({pct(v.upsidePct)} vs. today).</span>
              </div>
              <div className="typebox">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <span className="label">Stock type</span><Badge kind="type">{v.type}</Badge>
                </div>
                <p style={{ fontSize: 14 }}>{v.typeWhy}</p>
              </div>
              {v.low != null && v.high != null && (
                <div role="img" aria-label={`Fair value range ${money(v.low)} to ${money(v.high)}; price ${money(price)}`} className="stack" style={{ gap: 4 }}>
                  <div className="range">
                    <div className="track" />
                    <div className="band" style={{ left: pos(v.low), width: `calc(${pos(v.high)} - ${pos(v.low)})` }} />
                    <div className="mark" style={{ left: pos(price) }}><span className="label" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>Price {money(price)}</span><span /></div>
                  </div>
                  <div className="range-labels num"><span style={{ left: pos(v.low) }}>{money(v.low)}</span><span style={{ left: pos(v.high) }}>{money(v.high)}</span></div>
                  <span className="small">Grey band = fair value range. Red line = today’s price.</span>
                </div>
              )}
              <table className="t">
                <thead><tr><th>Method</th><th>Weight</th><th>Fair value</th><th>Reading</th></tr></thead>
                <tbody>
                  {v.methods.map((m) => (
                    <tr key={m.key}>
                      <th scope="row">{m.name}<div className="small" style={{ fontWeight: 400 }}>{m.note}</div></th>
                      <td>{m.weight > 0 ? `${Math.round(m.weight * 100)}%` : m.fair == null && !m.text ? '—' : 'Check'}</td>
                      <td className="bold" style={{ whiteSpace: 'nowrap' }}>{m.text ?? money(m.fair)}</td>
                      <td>{m.reading ? <Badge kind={READ_CLASS[m.reading]}>{m.reading}</Badge> : <span className="small">n/a</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {v.impliedGrowth != null && v.type === 'High growth, low profit' && (
                <p className="callout"><span className="bold">Reverse DCF:</span> today’s price assumes about {Math.round(v.impliedGrowth)}% cash-flow growth every year for five years, then slowing.</p>
              )}
              <p className="note">Not investment advice. Simple models; estimates can be far off.</p>
            </>
          ) : <p className="note">Not enough financial data to value this stock.</p>}
        </section>

        <section>
          <div className="kicker">Risk : reward</div>
          {rr ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
                <h2 className={`head ${rr.verdict === 'Good' ? 'up' : rr.verdict === 'Poor' ? 'down' : ''}`} style={{ fontSize: 40, lineHeight: 1 }}>{rr.text}</h2>
                <Badge kind={rr.verdict.toLowerCase()}>{rr.verdict}</Badge>
              </div>
              <div role="img" aria-label={`Risk ${num(rr.riskPct)}% to support, reward ${num(rr.rewardPct)}% to fair value`} className="stack" style={{ gap: 6 }}>
                <div className="rrbar">
                  <div className="risk" style={{ width: `${(rr.riskPct / span) * 100}%` }} />
                  <div className="now" />
                  <div className="rew" style={{ width: `${(Math.max(rr.rewardPct, 0) / span) * 100}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }} className="num">
                  <span className="down bold">Support {money(s.support)} ({pct(-rr.riskPct)})</span>
                  <span className="bold">Now {money(price)}</span>
                  <span className={`bold ${tone(rr.rewardPct)}`}>Target {money(v?.fair)} ({pct(rr.rewardPct)})</span>
                </div>
              </div>
              {sh != null && s.support != null && v?.fair != null && (
                <p style={{ fontSize: 14 }}><span className="bold">On your {sh} shares:</span>{' '}
                  {v.fair > price
                    ? <>you risk about {money((price - s.support) * sh, 0)} to make about {money((v.fair - price) * sh, 0)}.</>
                    : <>you could lose about {money((price - s.support) * sh, 0)} if it falls to support, and fair value sits below today’s price.</>}
                </p>
              )}
              <p className="small">Risk = the drop to the nearest support level, where many investors set a stop-loss. Reward = the rise to our fair value. 1 : 2 or better is usually seen as worth it.</p>
            </>
          ) : <p className="note">Needs both a support level and a fair value.</p>}
        </section>
      </div>
    </div>
  );
}

export function StockList({ stocks, holdings, initialOpen }: { stocks: StockAnalysis[]; holdings: Holding[]; initialOpen: string | null }) {
  const [open, setOpen] = useState<string | null>(initialOpen ?? stocks[0]?.ticker ?? null);
  return (
    <div>
      {stocks.map((s) => {
        const isOpen = open === s.ticker;
        const ch = s.quote?.changePct ?? null;
        const h = holdings.find((x) => x.ticker === s.ticker);
        const dayUsd = s.quote && h?.shares != null ? (s.quote.price - s.quote.prevClose) * h.shares : null;
        return (
          <div key={s.ticker} className="stock" id={s.ticker}>
            <button type="button" className="stock-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.ticker)}>
              <span className="who"><span className="tk">{s.ticker}</span><span className="small" style={{ fontSize: 13 }}>{s.name}</span></span>
              <span className="px">
                <span className="bold num" style={{ fontSize: 18 }}>{money(s.quote?.price)}</span>
                <span className={`heavy num ${tone(ch)}`} style={{ fontSize: 14 }}>{arrowPct(ch)}{dayUsd != null && <> · {signedMoney(dayUsd)}</>}</span>
              </span>
              <span className="tags">
                {s.mood && <Badge kind={s.mood.label.toLowerCase()}>{s.mood.label === 'Bullish' ? '▲' : s.mood.label === 'Bearish' ? '▼' : '–'} {s.mood.label}</Badge>}
                {s.stage && <Badge kind="fair">Stage {s.stage.stage}</Badge>}
                <VerdictBadge v={s.valuation?.verdict ?? null} />
              </span>
              <span className="chev" aria-hidden="true">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <Detail s={s} holding={h} />}
          </div>
        );
      })}
      <div style={{ borderTop: '2px solid var(--ink)' }} />
    </div>
  );
}
