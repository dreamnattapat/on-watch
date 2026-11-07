import type { Metadata } from 'next';
import { getHoldings, getProfile } from '@/lib/portfolio';
import { authEnabled } from '@/lib/config';
import { getUser } from '@/lib/supabase/server';
import { Settings } from './Settings';
import { signOut } from '@/app/auth-actions';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [holdings, profile, user] = await Promise.all([getHoldings(), getProfile(), getUser()]);
  return (
    <div className="stack" style={{ gap: 24, paddingTop: 8, maxWidth: 760 }}>
      <div className="stack" style={{ gap: 2 }}>
        <div className="kicker">Settings</div>
        <h1 className="head" style={{ fontSize: 'clamp(34px, 5vw, 44px)' }}>Your stocks and briefs</h1>
        {user?.email && <p className="small" style={{ fontSize: 14 }}>Signed in as {user.email}</p>}
      </div>
      <Settings holdings={holdings} profile={profile} demo={!authEnabled} />
      {authEnabled && (
        <form action={signOut}>
          <button type="submit" className="btn">Log out</button>
        </form>
      )}
    </div>
  );
}
