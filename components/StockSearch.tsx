'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StockSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim().toUpperCase().replace(/^\$/, '');
        if (!/^[A-Z][A-Z.]{0,5}$/.test(t)) { setErr('Type a US ticker, like RKLB or NVDA.'); return; }
        router.push(`/stock/${t}`);
      }}
      className="stack"
      style={{ gap: 6, maxWidth: 520 }}
    >
      <label htmlFor="stock-q" className="label">Look up a stock</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="stock-q" className="input" style={{ flex: 1, textTransform: 'uppercase' }} placeholder="e.g. RKLB" value={q}
          onChange={(e) => { setQ(e.target.value); setErr(''); }} autoCapitalize="characters" autoComplete="off" />
        <button type="submit" className="btn solid big">Go</button>
      </div>
      {err && <span role="alert" className="error">{err}</span>}
    </form>
  );
}
