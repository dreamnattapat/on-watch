'use client';

import { useMemo, useState } from 'react';
import { STOCK_TYPES, type Reading } from '@/lib/analysis/valuation';
import { money, num, pct, tone } from '@/lib/format';
import { VerdictBadge } from './ui';

export interface ScreenRow {
  ticker: string;
  name: string;
  type: string;
  price: number;
  pe: number | null;
  peg: number | null;
  de: number | null;
  fair: number | null;
  upside: number | null;
  verdict: Reading | null;
  rr: number | null;
  rrText: string;
  rrVerdict: 'Good' | 'Okay' | 'Poor' | null;
  mine: boolean;
}

interface Filters {
  type: string; pe: string; peg: string; de: string; rr: string;
  vals: Record<Reading, boolean>;
  sort: 'upside' | 'pe' | 'peg' | 'de' | 'rr';
}

const DEFAULTS: Filters = { type: 'any', pe: 'any', peg: 'any', de: 'any', rr: 'any', vals: { Under: true, Fair: true, Over: true }, sort: 'upside' };

const PRESETS: Array<[string, Partial<Filters>]> = [
  ['Bargains', { vals: { Under: true, Fair: false, Over: false }, sort: 'upside' }],
  ['Cheap for its growth', { peg: '1', vals: { Under: true, Fair: true, Over: false }, sort: 'peg' }],
  ['Low-debt value', { pe: '20', de: '0.5', vals: { Under: true, Fair: true, Over: false }, sort: 'pe' }],
  ['Best risk : reward', { rr: '2', sort: 'rr' }],
];

function Select({ id, label, hint, value, onChange, options }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <div className="field">
      <label htmlFor={id} className="label" style={{ fontSize: 12 }}>{label}</label>
      <select id={id} className="select compact" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Screener({ rows }: { rows: ScreenRow[] }) {
  const [f, setF] = useState<Filters>(DEFAULTS);
  const set = (p: Partial<Filters>) => setF((x) => ({ ...x, ...p }));

  const shown = useMemo(() => {
    const lt = (v: number | null, lim: string) => lim === 'any' || (v != null && v > 0 && v < parseFloat(lim));
    const list = rows.filter((r) =>
      (f.type === 'any' || r.type === f.type) && lt(r.pe, f.pe) && lt(r.peg, f.peg) &&
      (f.de === 'any' || (r.de != null && r.de < parseFloat(f.de))) &&
      (f.rr === 'any' || (r.rr != null && r.rr >= parseFloat(f.rr))) &&
      (r.verdict == null ? f.vals.Under && f.vals.Fair && f.vals.Over : f.vals[r.verdict]));
    const key = (r: ScreenRow): number => {
      switch (f.sort) {
        case 'upside': return -(r.upside ?? -999);
        case 'pe': return r.pe != null && r.pe > 0 ? r.pe : 9999;
        case 'peg': return r.peg != null && r.peg > 0 ? r.peg : 9999;
        case 'de': return r.de ?? 9999;
        case 'rr': return -(r.rr ?? -1);
      }
    };
    return list.sort((a, b) => key(a) - key(b));
  }, [rows, f]);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
        <span className="label" style={{ color: 'var(--muted)' }}>Quick screens</span>
        {PRESETS.map(([l, p]) => <button key={l} type="button" className="preset" onClick={() => setF({ ...DEFAULTS, ...p })}>{l}</button>)}
        <button type="button" className="preset" onClick={() => setF(DEFAULTS)}>Reset filters</button>
      </div>

      <div className="filters">
        <Select id="f-type" label="Stock type" hint="Each type is valued with the methods that suit it." value={f.type} onChange={(v) => set({ type: v })}
          options={[['any', 'All types'], ...STOCK_TYPES.map((t) => [t, t] as [string, string])]} />
        <Select id="f-pe" label="P/E ratio" hint="Price vs. yearly profit. Lower = cheaper." value={f.pe} onChange={(v) => set({ pe: v })}
          options={[['any', 'Any'], ['10', 'Under 10'], ['15', 'Under 15'], ['20', 'Under 20'], ['30', 'Under 30']]} />
        <Select id="f-peg" label="PEG ratio" hint="P/E vs. growth. Under 1 = cheap for how fast it grows." value={f.peg} onChange={(v) => set({ peg: v })}
          options={[['any', 'Any'], ['1', 'Under 1'], ['1.5', 'Under 1.5'], ['2', 'Under 2']]} />
        <Select id="f-de" label="Debt ratio" hint="Debt vs. shareholder equity. Lower = safer." value={f.de} onChange={(v) => set({ de: v })}
          options={[['any', 'Any'], ['0.5', 'Under 0.5'], ['1', 'Under 1'], ['2', 'Under 2']]} />
        <Select id="f-rr" label="Risk : reward" hint="Possible gain vs. possible loss. Higher = better odds." value={f.rr} onChange={(v) => set({ rr: v })}
          options={[['any', 'Any'], ['1', '1 : 1 or better'], ['2', '1 : 2 or better'], ['3', '1 : 3 or better']]} />
        <div className="field">
          <span id="f-val" className="label" style={{ fontSize: 12 }}>Stock value</span>
          <div role="group" aria-labelledby="f-val" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['Under', 'Fair', 'Over'] as Reading[]).map((k) => (
              <button key={k} type="button" className={`chip ${k.toLowerCase()}`} aria-pressed={f.vals[k]}
                onClick={() => set({ vals: { ...f.vals, [k]: !f.vals[k] } })}>
                {k === 'Under' ? 'Undervalued' : k === 'Over' ? 'Overvalued' : 'Fair'}
              </button>
            ))}
          </div>
          <span className="hint">Price vs. our fair value estimate.</span>
        </div>
      </div>

      <div className="row-between" style={{ alignItems: 'center' }}>
        <div className="head" style={{ fontSize: 26 }} aria-live="polite">{shown.length} {shown.length === 1 ? 'stock matches' : 'stocks match'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label htmlFor="f-sort" className="label">Sort by</label>
          <select id="f-sort" className="select compact" value={f.sort} onChange={(e) => set({ sort: e.target.value as Filters['sort'] })}>
            <option value="upside">Biggest upside</option><option value="pe">Lowest P/E</option><option value="peg">Lowest PEG</option>
            <option value="de">Lowest debt</option><option value="rr">Best risk : reward</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="t" style={{ minWidth: 860 }}>
          <thead><tr><th>Stock</th><th>Price</th><th>P/E</th><th>PEG</th><th>Debt ratio</th><th>Fair value</th><th>Upside</th><th>Risk : reward</th><th>Value</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.ticker}>
                <td style={{ paddingTop: 10, paddingBottom: 10 }}><span className="heavy">{r.ticker}{r.mine ? ' ★' : ''}</span><div className="small">{r.name} · {r.type}</div></td>
                <td>{money(r.price)}</td>
                <td>{r.pe != null && r.pe > 0 ? num(r.pe) : '—'}</td>
                <td>{r.peg != null && r.peg > 0 ? num(r.peg) : '—'}</td>
                <td>{num(r.de, 2)}</td>
                <td>{money(r.fair)}</td>
                <td className={`heavy ${tone(r.upside)}`}>{pct(r.upside)}</td>
                <td className={`heavy ${r.rrVerdict === 'Good' ? 'up' : r.rrVerdict === 'Poor' ? 'down' : ''}`} style={{ whiteSpace: 'nowrap' }}>{r.rrText}</td>
                <td><VerdictBadge v={r.verdict} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p style={{ fontStyle: 'italic' }}>No stocks match all your filters. Try loosening one, or tap a quick screen.</p>}
      <p className="note">★ = in your portfolio. Fair value and risk : reward are estimates from simple models. Not investment advice.</p>
    </div>
  );
}
