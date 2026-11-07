'use client';

import { useEffect, useRef, useState } from 'react';
import { arrowPct, money, tone } from '@/lib/format';

interface Row { ticker: string; price: number; changePct: number }
interface Data { gainers: Row[]; losers: Row[]; updated: number }

const POLL_MS = 30000;

function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ICT';
}

export function LiveMovers({ initial, mine }: { initial: Data; mine: string[] }) {
  const [data, setData] = useState<Data>(initial);
  const [flash, setFlash] = useState<Record<string, 'up' | 'down'>>({});
  const prev = useRef<Map<string, number>>(new Map([...initial.gainers, ...initial.losers].map((r) => [r.ticker, r.price])));

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/movers', { cache: 'no-store' });
        if (!res.ok) return;
        const next = (await res.json()) as Data;
        if (stop) return;
        const f: Record<string, 'up' | 'down'> = {};
        for (const r of [...next.gainers, ...next.losers]) {
          const p = prev.current.get(r.ticker);
          if (p != null && p !== r.price) f[r.ticker] = r.price > p ? 'up' : 'down';
          prev.current.set(r.ticker, r.price);
        }
        setData(next);
        setFlash(f);
        setTimeout(() => !stop && setFlash({}), 1500);
      } catch { /* keep the last good data */ }
    };
    const id = setInterval(tick, POLL_MS);
    return () => { stop = true; clearInterval(id); };
  }, []);

  const table = (title: string, rows: Row[], cls: 'up' | 'down') => (
    <table className="t">
      <caption className={`head ${cls}`} style={{ textAlign: 'left', fontSize: 22, padding: '8px 0 4px' }}>{title}</caption>
      <thead><tr><th style={{ width: 28 }}>#</th><th style={{ textAlign: 'left' }}>Stock</th><th>Price</th><th>Change</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={4} className="note" style={{ textAlign: 'left' }}>None right now.</td></tr>}
        {rows.map((r, i) => (
          <tr key={r.ticker} className={flash[r.ticker] ? `flash-${flash[r.ticker]}` : undefined}>
            <td className="bold" style={{ color: 'var(--muted)' }}>{i + 1}</td>
            <td className="heavy" style={{ textAlign: 'left' }}>{r.ticker}{mine.includes(r.ticker) ? ' ★' : ''}</td>
            <td>{money(r.price)}</td>
            <td className={`heavy ${tone(r.changePct)}`}>{arrowPct(r.changePct, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <section aria-labelledby="mv-title" className="section">
      <div className="row-between">
        <div className="stack" style={{ gap: 2 }}>
          <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="live-dot" aria-hidden="true" />Live movers</div>
          <h2 id="mv-title" className="head h2">Top 10 gainers &amp; losers</h2>
        </div>
        <span className="small bold num">Updated {fmtTime(data.updated)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0 28px' }}>
        {table('Top 10 gainers', data.gainers, 'up')}
        {table('Top 10 losers', data.losers, 'down')}
      </div>
      <p className="note">Among the ~40 largest US stocks. Refreshes every 30 seconds while this page is open; prices may lag by a minute or two.</p>
    </section>
  );
}
