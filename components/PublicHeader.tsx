import Link from 'next/link';

/**
 * Masthead for pages anyone can see without logging in. It doesn't read the
 * session (so these pages can be cached); signed-in people who tap "Log in"
 * are sent straight to their dashboard.
 */
export function PublicHeader() {
  return (
    <header className="masthead" style={{ borderBottom: '3px double var(--ink)' }}>
      <div className="stack" style={{ gap: 2 }}>
        <Link href="/" className="logo" style={{ fontSize: 'clamp(40px, 7vw, 56px)' }}>OnWatch</Link>
        <span className="tag">The market, read for you.</span>
      </div>
      <nav aria-label="Site" className="right" style={{ gap: 12 }}>
        <Link href="/stock" className="bold" style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>Stocks</Link>
        <Link href="/login" className="btn">Log in</Link>
        <Link href="/" className="btn solid">Sign up free</Link>
      </nav>
    </header>
  );
}
