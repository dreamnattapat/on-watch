import Link from 'next/link';

/** Masthead for the stock lookup pages (kept static so they can be cached). */
export function PublicHeader() {
  const nav = { fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' as const, minHeight: 44, display: 'inline-flex', alignItems: 'center' };
  return (
    <header className="masthead" style={{ borderBottom: '3px double var(--ink)' }}>
      <Link href="/today" className="logo" style={{ fontSize: 'clamp(40px, 7vw, 56px)' }}>OnWatch</Link>
      <nav aria-label="Site" className="right" style={{ gap: 14 }}>
        <Link href="/stock" className="bold" style={nav}>Look up</Link>
        <Link href="/today" className="btn solid">Back to Today</Link>
      </nav>
    </header>
  );
}
