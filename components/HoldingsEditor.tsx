'use client';

import { useState } from 'react';
import type { HoldingInput } from '@/app/portfolio-actions';

const POPULAR = ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA'];

/**
 * Add / remove stocks with optional shares and average cost.
 * `onAdd` may verify the ticker on the server and return an error.
 */
export function HoldingsEditor({
  holdings,
  onAdd,
  onRemove,
}: {
  holdings: HoldingInput[];
  onAdd: (h: HoldingInput) => Promise<string | undefined>;
  onRemove: (ticker: string) => Promise<void>;
}) {
  const [tk, setTk] = useState('');
  const [sh, setSh] = useState('');
  const [cost, setCost] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(ticker: string, shares = sh, avg = cost) {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    if (holdings.some((h) => h.ticker === t)) { setErr(`${t} is already in your list.`); return; }
    setBusy(true);
    setErr('');
    const e = await onAdd({ ticker: t, shares: shares ? Number(shares) : null, avgCost: avg ? Number(avg) : null });
    setBusy(false);
    if (e) { setErr(e); return; }
    setTk(''); setSh(''); setCost('');
  }

  const popular = POPULAR.filter((t) => !holdings.some((h) => h.ticker === t));

  return (
    <div className="stack" style={{ gap: 16 }}>
      {popular.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span className="label" style={{ color: 'var(--muted)' }}>Popular</span>
          {popular.map((t) => (
            <button key={t} type="button" className="preset" style={{ height: 36, fontWeight: 800 }} onClick={() => add(t, '', '')} disabled={busy}>{t}</button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); add(tk); }}
        className="stack"
        style={{ gap: 10 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, alignItems: 'end' }}>
          <div className="field">
            <label htmlFor="h-tk">Ticker</label>
            <input id="h-tk" className="input" placeholder="e.g. AAPL" value={tk} onChange={(e) => { setTk(e.target.value.toUpperCase()); setErr(''); }} style={{ textTransform: 'uppercase' }} autoCapitalize="characters" />
          </div>
          <div className="field">
            <label htmlFor="h-sh">Shares</label>
            <input id="h-sh" className="input" type="number" inputMode="decimal" min="0" step="any" placeholder="10" value={sh} onChange={(e) => setSh(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="h-cost">Avg. cost ($)</label>
            <input id="h-cost" className="input" type="number" inputMode="decimal" min="0" step="any" placeholder="150.00" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        {err && <div role="alert" className="error">{err}</div>}
        <button type="submit" className="btn" disabled={busy || !tk}>{busy ? 'Checking…' : '+ Add stock'}</button>
      </form>
      <div>
        <div className="label" style={{ paddingBottom: 6, borderBottom: '1px solid var(--ink)' }}>Your stocks ({holdings.length})</div>
        {holdings.length === 0 && <p className="note" style={{ padding: '12px 0', fontSize: 14 }}>No stocks yet. Tap a popular one above or type a ticker.</p>}
        {holdings.map((h) => (
          <div key={h.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
            <span className="stack" style={{ gap: 0 }}>
              <span className="heavy" style={{ fontSize: 16 }}>{h.ticker}</span>
              <span className="small">
                {[h.shares != null ? `${h.shares} ${h.shares === 1 ? 'share' : 'shares'}` : null, h.avgCost != null ? `avg. $${h.avgCost.toFixed(2)}` : null].filter(Boolean).join(' · ') || 'Shares and cost not added yet'}
              </span>
            </span>
            <button type="button" aria-label={`Remove ${h.ticker}`} onClick={() => onRemove(h.ticker)} style={{ width: 44, height: 44, border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
