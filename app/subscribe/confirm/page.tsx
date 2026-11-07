import Link from 'next/link';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { PublicHeader } from '@/components/PublicHeader';

export const metadata: Metadata = { title: 'Confirm your brief', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  let ok = false;
  let tickers: string[] = [];
  if (t && /^[0-9a-f-]{36}$/i.test(t)) {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin.from('subscribers').update({ confirmed: true, unsubscribed: false }).eq('token', t).select('tickers').maybeSingle();
      ok = Boolean(data);
      tickers = (data?.tickers as string[] | undefined) ?? [];
    }
  }
  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <PublicHeader />
      <div className="stack" style={{ gap: 14, paddingTop: 28 }}>
        <h1 className="head h1">{ok ? 'You’re in' : 'That link didn’t work'}</h1>
        <p className="lede">{ok
          ? `Your free 2-minute brief${tickers.length ? ` on ${tickers.join(', ')}` : ''} arrives each morning, Bangkok time.`
          : 'It may have expired or been copied incompletely. Try signing up again from any stock page.'}</p>
        <p style={{ fontSize: 15 }}>Want it to cover everything you own, with your returns in dollars? <Link href="/" className="bold">Create a free account</Link>.</p>
      </div>
    </div>
  );
}
