'use client';

import type { Prefs } from '@/app/portfolio-actions';

export const DEFAULT_PREFS: Prefs = {
  briefTime: '07:00', briefChannel: 'email', alertBigMove: true, alertEarnings: true, alertMoodFlip: false, alertUndervalued: false,
};

const TIMES: Array<[string, string]> = [
  ['06:30', '6:30 AM (Bangkok time)'],
  ['07:00', '7:00 AM (Bangkok time)'],
  ['08:00', '8:00 AM (Bangkok time)'],
  ['20:30', 'Before the US market opens (8:30 PM)'],
];

export function PrefsFields({ value, onChange }: { value: Prefs; onChange: (p: Prefs) => void }) {
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => onChange({ ...value, [k]: v });
  const alerts: Array<[keyof Prefs, string]> = [
    ['alertBigMove', 'A stock I own moves 5% or more'],
    ['alertEarnings', 'Earnings or a big event is coming up'],
    ['alertMoodFlip', 'The crowd’s mood flips on a stock I own'],
    ['alertUndervalued', 'A stock I own becomes undervalued'],
  ];
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="field">
        <label htmlFor="pref-time">Send my brief at</label>
        <select id="pref-time" className="select" value={value.briefTime} onChange={(e) => set('briefTime', e.target.value)}>
          {TIMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <p className="small" style={{ fontSize: 12.5 }}>For now every brief goes out once a day, between 6 and 7 AM Bangkok time, Tuesday to Saturday (after each US session). We’ll use your chosen time once more send times open up.</p>
      </div>
      <fieldset style={{ margin: 0, padding: 0, border: 'none' }}>
        <legend className="bold" style={{ fontSize: 13, paddingBottom: 6 }}>Alert me when</legend>
        {alerts.map(([k, l], i) => (
          <label key={k} className="check" style={i === alerts.length - 1 ? { borderBottom: '1px solid var(--rule)' } : undefined}>
            <input type="checkbox" checked={Boolean(value[k])} onChange={(e) => set(k, e.target.checked as never)} /> {l}
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="pref-ch">Send to</label>
        <select id="pref-ch" className="select" value={value.briefChannel} onChange={(e) => set('briefChannel', e.target.value as Prefs['briefChannel'])}>
          <option value="email">Email</option>
          <option value="line">LINE (coming soon)</option>
          <option value="push">Phone notification (coming soon)</option>
          <option value="none">Don’t send, I’ll check the site</option>
        </select>
      </div>
    </div>
  );
}
