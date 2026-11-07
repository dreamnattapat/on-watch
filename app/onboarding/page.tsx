import Link from 'next/link';
import type { Metadata } from 'next';
import { Onboarding } from './Onboarding';
import { getProfile } from '@/lib/portfolio';

export const metadata: Metadata = { title: 'Set up' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const profile = await getProfile();
  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <header className="masthead" style={{ borderBottom: '3px double var(--ink)', marginBottom: 28 }}>
        <Link href="/" className="logo" style={{ fontSize: 52 }}>OnWatch</Link>
        <span className="label">100% free</span>
      </header>
      <Onboarding firstName={profile?.firstName ?? ''} />
    </div>
  );
}
