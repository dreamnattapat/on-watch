import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy' };

export default function Privacy() {
  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="masthead" style={{ borderBottom: '3px double var(--ink)', marginBottom: 28 }}>
        <Link href="/" className="logo" style={{ fontSize: 52 }}>OnWatch</Link>
      </header>
      <article className="stack" style={{ gap: 14, fontSize: 16 }}>
        <h1 className="head h1">Privacy</h1>
        <p className="note">Draft. Have this reviewed before launch, including for Thailand’s PDPA.</p>
        <p><strong>What we store:</strong> your email, first name, the stocks you add (with optional share counts and average cost) and your brief settings.</p>
        <p><strong>What we never ask for:</strong> broker logins, bank details or trading access. OnWatch cannot trade for you.</p>
        <p><strong>Who can see it:</strong> only you. Each person’s data is protected by row-level security in our database.</p>
        <p><strong>Shared summaries:</strong> our daily “why it moved” write-ups are made per stock, not per person, and contain no personal data.</p>
        <p><strong>Deleting your data:</strong> remove stocks any time in Settings, or email us to delete your account entirely.</p>
      </article>
    </div>
  );
}
