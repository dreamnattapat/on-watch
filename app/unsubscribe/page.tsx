import type { Metadata } from 'next';
import { PublicHeader } from '@/components/PublicHeader';
import { Unsubscribe } from './Unsubscribe';

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } };
export const dynamic = 'force-dynamic';

// A button (not an automatic unsubscribe on page load), so email security
// scanners that open links can't unsubscribe people by accident.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; k?: string }> }) {
  const { t = '', k = 'sub' } = await searchParams;
  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <PublicHeader />
      <div className="stack" style={{ gap: 14, paddingTop: 28 }}>
        <h1 className="head h1">Stop the daily brief?</h1>
        <Unsubscribe token={t} kind={k === 'user' ? 'user' : 'sub'} />
      </div>
    </div>
  );
}
