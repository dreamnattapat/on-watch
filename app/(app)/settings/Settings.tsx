'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HoldingsEditor } from '@/components/HoldingsEditor';
import { PrefsFields } from '@/components/PrefsFields';
import { addHolding, removeHolding, savePrefs, type HoldingInput, type Prefs } from '@/app/portfolio-actions';
import type { Holding, Profile } from '@/lib/portfolio';

export function Settings({ holdings, profile, demo }: { holdings: Holding[]; profile: Profile | null; demo: boolean }) {
  const router = useRouter();
  const [list, setList] = useState<HoldingInput[]>(holdings);
  const [name, setName] = useState(profile?.firstName ?? '');
  const [prefs, setPrefs] = useState<Prefs>({
    briefTime: profile?.briefTime ?? '07:00',
    briefChannel: (profile?.briefChannel as Prefs['briefChannel']) ?? 'email',
    alertBigMove: profile?.alertBigMove ?? true,
    alertEarnings: profile?.alertEarnings ?? true,
    alertMoodFlip: profile?.alertMoodFlip ?? false,
    alertUndervalued: profile?.alertUndervalued ?? false,
  });
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <section id="holdings" className="card">
        <h2 className="head" style={{ fontSize: 30 }}>My stocks</h2>
        {demo && <p className="note">Demo mode: changes here aren’t saved until Supabase is connected.</p>}
        <HoldingsEditor
          holdings={list}
          onAdd={async (h) => {
            const r = await addHolding(h);
            if (r.error && !demo) return r.error;
            setList((x) => [...x, h]);
            router.refresh();
            return undefined;
          }}
          onRemove={async (t) => {
            const r = await removeHolding(t);
            if (!r.error || demo) setList((x) => x.filter((h) => h.ticker !== t));
            router.refresh();
          }}
        />
      </section>

      <section className="card">
        <h2 className="head" style={{ fontSize: 30 }}>Daily brief</h2>
        <div className="field">
          <label htmlFor="st-name">First name</label>
          <input id="st-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
        </div>
        <PrefsFields value={prefs} onChange={setPrefs} />
        {msg && <div role="status" className={msg.ok ? 'success' : 'error'}>{msg.text}</div>}
        <button
          type="button"
          className="btn solid big"
          disabled={pending}
          onClick={() => start(async () => {
            const r = await savePrefs({ ...prefs, firstName: name });
            setMsg(r.ok ? { ok: true, text: 'Saved.' } : { text: r.error ?? 'Something went wrong.' });
          })}
        >
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </section>
    </>
  );
}
