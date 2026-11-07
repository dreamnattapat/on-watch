import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/AuthForms';
import { env } from '@/lib/config';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/today';
  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <header className="masthead" style={{ borderBottom: '3px double var(--ink)', marginBottom: 28 }}>
        <Link href="/" className="logo" style={{ fontSize: 52 }}>OnWatch</Link>
      </header>
      <LoginForm next={next} enableApple={env.enableApple} error={sp.error} />
    </div>
  );
}
