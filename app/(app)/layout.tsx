import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { authEnabled } from '@/lib/config';
import { isDemoData } from '@/lib/market';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const notes: string[] = [];
  if (isDemoData) notes.push('Showing demo market data. Add a Finnhub key to switch on live prices.');
  if (!authEnabled) notes.push('Demo mode: accounts are off, so this is a sample portfolio.');
  return (
    <div className="wrap">
      <header className="masthead">
        <div className="stack" style={{ gap: 2 }}>
          <Link href="/today" className="logo">OnWatch</Link>
          <div className="tag">The market, read for you. Only what matters to your portfolio.</div>
        </div>
      </header>
      <Nav />
      {notes.length > 0 && <p className="banner">{notes.join(' ')}</p>}
      <main>{children}</main>
      <footer className="footer">
        <span>OnWatch gives information, not investment advice. Prices may be delayed.</span>
        <span><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></span>
      </footer>
    </div>
  );
}
