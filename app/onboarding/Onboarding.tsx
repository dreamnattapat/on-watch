'use client';

import { useState, useTransition } from 'react';
import { HoldingsEditor } from '@/components/HoldingsEditor';
import { DEFAULT_PREFS, PrefsFields } from '@/components/PrefsFields';
import { finishOnboarding, lookupTicker, type HoldingInput, type Prefs } from '@/app/portfolio-actions';

export function Onboarding({ firstName }: { firstName: string }) {
  const [step, setStep] = useState<2 | 3>(2);
  const [holdings, setHoldings] = useState<HoldingInput[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  return (
    <div className="card">
      <div className="stack" style={{ gap: 8 }}>
        <div className="label" style={{ color: 'var(--muted)' }}>Step {step} of 3</div>
        <div className="progress" aria-hidden="true"><span className="on" /><span className="on" /><span className={step === 3 ? 'on' : ''} /></div>
      </div>

      {step === 2 && (
        <>
          <h1 className="head" style={{ fontSize: 38, lineHeight: 1 }}>{firstName ? `What do you own, ${firstName}?` : 'What do you own?'}</h1>
          <p style={{ fontSize: 15 }}>Add each US stock you own. Shares and cost let us show your profit and loss; you can skip them and add later.</p>
          <HoldingsEditor
            holdings={holdings}
            onAdd={async (h) => {
              const r = await lookupTicker(h.ticker);
              if (!r.ok) return r.error;
              setHoldings((x) => [...x, { ...h, ticker: r.ticker }]);
              return undefined;
            }}
            onRemove={async (t) => setHoldings((x) => x.filter((h) => h.ticker !== t))}
          />
          <button className="btn solid big" type="button" onClick={() => setStep(3)}>
            {holdings.length ? 'Continue →' : 'Skip for now →'}
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="head" style={{ fontSize: 38, lineHeight: 1 }}>Your daily brief</h1>
          <p style={{ fontSize: 15 }}>Choose when your brief arrives and what’s worth a nudge. You can change this any time.</p>
          <PrefsFields value={prefs} onChange={setPrefs} />
          {error && <div role="alert" className="error">{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn big" type="button" onClick={() => setStep(2)}>← Back</button>
            <button
              className="btn solid big"
              style={{ flex: 1 }}
              type="button"
              disabled={pending}
              onClick={() => start(async () => {
                const r = await finishOnboarding(holdings, prefs);
                if (r?.error) setError(r.error);
              })}
            >
              {pending ? 'Saving…' : 'Open my dashboard →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
