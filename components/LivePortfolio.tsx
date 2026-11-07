'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { arrowPct, money, pct, signedMoney, tone } from '@/lib/format';
import { sessionText, type Session } from '@/lib/marketHours';

export interface LiveRow {
  ticker: string;
  name: string;
  industry: string;
  shares: number | null;
  avgCost: number | null;
  price: number | null;
  prevClose: number | null;
}

interface QuoteMsg { ticker: string; price: number; prevClose: number }

const OPEN_POLL_MS = 15000;
const CLOSED_POLL_MS = 120000;

/** Turn Finnhub's industry names into short, friendly group labels. */
function groupLabel(industry: string): string {
  const i = industry.toLowerCase();
  if (!i) return 'Other';
  if (/aerospace|defense/.test(i)) return 'Space & defense';
  if (/semiconductor/.test(i)) return 'Chips';
  if (/software|technology|internet|interactive/.test(i)) return 'Tech';
  if (/media|entertainment|communication/.test(i)) return 'Media & internet';
  if (/bank|financial|insurance|capital markets/.test(i)) return 'Finance';
  if (/pharma|biotech|health|medical|life sciences/.test(i)) return 'Health';
  if (/retail|consumer|beverage|food|apparel|textile|hotel|restaurant/.test(i)) return 'Consumer';
  if (/automobile/.test(i)) return 'Cars';
  if (/energy|oil|gas|utilit/.test(i)) return 'Energy';
  return industry;
}

export function LivePortfolio({ rows: initialRows, spyPct, qqqPct, initialSession }: {
  rows: LiveRow[]; spyPct: number | null; qqqPct: number | null; initialSession: Session;
}) {
  const [rows, setRows] = useState(initialRows);
  const [session, setSession] = useState<Session>(initialSession);
  const [updated, setUpdated] = useState<number>(Date.now());
  const [flash, setFlash] = useState<Record<string, 'up' | 'down'>>({});
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    if (!initialRows.length) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tickers = initialRows.map((r) => r.ticker).join(',');
    const tick = async () => {
      let next: Session = session;
      if (!document.hidden) {
        try {
          const res = await fetch(`/api/quotes?t=${tickers}`, { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as { quotes: QuoteMsg[]; session: Session; updated: number };
            if (stop) return;
            const byT = new Map(data.quotes.map((q) => [q.ticker, q]));
            const f: Record<string, 'up' | 'down'> = {};
            const nextRows = rowsRef.current.map((r) => {
              const q = byT.get(r.ticker);
              if (!q) return r;
              if (r.price != null && q.price !== r.price) f[r.ticker] = q.price > r.price ? 'up' : 'down';
              return { ...r, price: q.price, prevClose: q.prevClose };
            });
            setRows(nextRows);
            setFlash(f);
            setSession(data.session);
            setUpdated(data.updated);
            next = data.session;
            setTimeout(() => !stop && setFlash({}), 1200);
          }
        } catch { /* keep the last prices */ }
      }
      if (!stop) timer = setTimeout(tick, next === 'open' ? OPEN_POLL_MS : CLOSED_POLL_MS);
    };
    timer = setTimeout(tick, initialSession === 'open' ? OPEN_POLL_MS : CLOSED_POLL_MS);
    const onVisible = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sum = useMemo(() => {
    let day = 0, value = 0, cost = 0, costKnown = true, any = false;
    const perStock: Array<{ ticker: string; day: number }> = [];
    for (const r of rows) {
      if (r.price == null || r.shares == null) continue;
      any = true;
      const d = r.prevClose != null ? (r.price - r.prevClose) * r.shares : 0;
      day += d;
      value += r.price * r.shares;
      perStock.push({ ticker: r.ticker, day: d });
      if (r.avgCost != null) cost += r.avgCost * r.shares; else costKnown = false;
    }
    perStock.sort((a, b) => b.day - a.day);
    const prev = value - day;
    return {
      any, day, value,
      dayPct: prev > 0 ? (day / prev) * 100 : null,
      total: costKnown && cost > 0 ? value - cost : null,
      totalPct: costKnown && cost > 0 ? ((value - cost) / cost) * 100 : null,
      cost: costKnown && cost > 0 ? cost : null,
      best: perStock[0] && perStock[0].day > 0 ? perStock[0] : null,
      worst: perStock.length > 1 && perStock[perStock.length - 1].day < 0 ? perStock[perStock.length - 1] : null,
    };
  }, [rows]);

  const groups = useMemo(() => {
    const m = new Map<string, LiveRow[]>();
    for (const r of rows) {
      const g = groupLabel(r.industry);
      m.set(g, [...(m.get(g) ?? []), r]);
    }
    return [...m.entries()];
  }, [rows]);

  const time = new Date(updated).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <section aria-labelledby="pf-title" className="pf">
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <h2 id="pf-title" className="head" style={{ fontSize: 26 }}>Your portfolio</h2>
        <span className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {session === 'open' && <span className="live-dot" aria-hidden="true" />}
          {sessionText(session)} · {time} ICT
        </span>
      </div>

      {sum.any ? (
        <div className="stats">
          <div className="stat">
            <span className="kicker">Today’s return</span>
            <span className={`big num ${tone(sum.day)}`}>{signedMoney(sum.day)}</span>
            <span className={`bold ${tone(sum.dayPct)}`} style={{ fontSize: 13 }}>
              {arrowPct(sum.dayPct)} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· S&amp;P {pct(spyPct)} · Nasdaq {pct(qqqPct)}</span>
            </span>
            {(sum.best || sum.worst) && (
              <span className="small">
                {sum.best && <>{sum.best.ticker} added {signedMoney(sum.best.day)}. </>}
                {sum.worst && <>{sum.worst.ticker} cost you {money(sum.worst.day)}.</>}
              </span>
            )}
          </div>
          <div className="stat">
            <span className="label">Total return</span>
            <span className={`big num ${tone(sum.total)}`}>{signedMoney(sum.total)}</span>
            <span className={`bold ${tone(sum.totalPct)}`} style={{ fontSize: 13 }}>
              {sum.totalPct != null ? `${pct(sum.totalPct)} since you bought` : <Link href="/settings#holdings">Add your average cost to see this</Link>}
            </span>
          </div>
          <div className="stat">
            <span className="label">Portfolio value</span>
            <span className="big num">{money(sum.value)}</span>
            {sum.cost != null && <span className="small" style={{ fontSize: 13 }}>You invested {money(sum.cost)}</span>}
          </div>
        </div>
      ) : (
        <p className="small" style={{ fontSize: 14 }}>Add how many shares you own in <Link href="/settings#holdings">Settings</Link> to see your returns in dollars.</p>
      )}

      <div>
        {groups.map(([g, list]) => (
          <div key={g}>
            <div className="label" style={{ fontSize: 11, color: 'var(--muted)', padding: '12px 0 4px' }}>{g}</div>
            {list.map((r) => {
              const ch = r.price != null && r.prevClose ? r.price - r.prevClose : null;
              const chPct = ch != null && r.prevClose ? (ch / r.prevClose) * 100 : null;
              return (
                <Link key={r.ticker} href={`/stocks?open=${r.ticker}`} className={`live-row ${flash[r.ticker] ? `flash-${flash[r.ticker]}` : ''}`}>
                  <span className="stack" style={{ gap: 0, minWidth: 0 }}>
                    <span className="head" style={{ fontSize: 26, lineHeight: 1 }}>{r.ticker}</span>
                    <span className="small" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  </span>
                  <span className="stack" style={{ gap: 0, alignItems: 'flex-end' }}>
                    <span className="bold num" style={{ fontSize: 20 }}>{r.price != null ? r.price.toFixed(2) : '—'}</span>
                    <span className={`bold num ${tone(ch)}`} style={{ fontSize: 14 }}>
                      {ch != null ? `${ch >= 0 ? '+' : '−'}${Math.abs(ch).toFixed(2)}` : ''}&nbsp;&nbsp;{pct(chPct, 2)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
