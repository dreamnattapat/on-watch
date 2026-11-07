'use client';

import { useActionState } from 'react';
import { subscribe, type SubscribeState } from '@/app/email-actions';

export function SubscribeBox({ tickers, source, title, blurb }: { tickers: string[]; source: string; title: string; blurb: string }) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribe, {});
  return (
    <section aria-labelledby="sub-title" style={{ border: '2px solid var(--ink)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="kicker">Free daily brief</div>
      <h2 id="sub-title" className="head" style={{ fontSize: 28, lineHeight: 1 }}>{title}</h2>
      <p style={{ fontSize: 14 }}>{blurb}</p>
      {state.ok ? (
        <p role="status" className="success" style={{ fontSize: 15 }}>{state.message}</p>
      ) : (
        <form action={action} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input type="hidden" name="tickers" value={tickers.join(',')} />
          <input type="hidden" name="source" value={source} />
          <div aria-hidden="true" style={{ position: 'absolute', left: -9999 }}>
            <label>Company <input name="company" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <label htmlFor="sub-email" className="sr-only">Email</label>
          <input id="sub-email" name="email" type="email" required placeholder="you@email.com" autoComplete="email" className="input" style={{ flex: '1 1 220px' }} />
          <button type="submit" className="btn solid big" disabled={pending}>{pending ? 'Sending…' : 'Get the brief'}</button>
          {state.error && <div role="alert" className="error" style={{ width: '100%' }}>{state.error}</div>}
        </form>
      )}
    </section>
  );
}
