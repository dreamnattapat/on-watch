import Link from 'next/link';
import { SignUpForm } from '@/components/AuthForms';
import { authEnabled, env } from '@/lib/config';

export default async function Landing({ searchParams }: { searchParams: Promise<{ ticker?: string }> }) {
  const raw = (await searchParams).ticker?.toUpperCase() ?? '';
  const from = /^[A-Z][A-Z.]{0,5}$/.test(raw) ? raw : '';
  return (
    <div className="wrap" style={{ maxWidth: 1180 }}>
      <header className="masthead" style={{ borderBottom: '3px double var(--ink)' }}>
        <Link href="/" className="logo" style={{ fontSize: 52 }}>OnWatch</Link>
        <div className="right">
          <Link href="/login" className="btn">Log in</Link>
        </div>
      </header>
      {!authEnabled && (
        <p className="banner">Demo mode: accounts aren’t switched on yet, so the form below opens the demo dashboard.</p>
      )}
      <div className="cols" style={{ gap: 48, paddingTop: 32 }}>
        <section aria-labelledby="pitch" className="stack" style={{ flex: '1 1 380px', minWidth: 0, gap: 18 }}>
          <div className="kicker">{from ? `Track ${from} and everything else you own` : '100% free · No credit card'}</div>
          <h1 id="pitch" className="head" style={{ fontSize: 'clamp(42px, 6vw, 64px)', lineHeight: 0.92 }}>Stop scrolling five apps to understand your stocks</h1>
          <p className="lede" style={{ fontSize: 18 }}>We read the news, filings and social chatter overnight, then tell you only what matters to the stocks you own.</p>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {[
              ['A 2-minute brief every morning', ', written for your portfolio.'],
              ['Why each stock moved', ', with the crowd’s mood summed up instead of shown.'],
              ['Valuation, stage and risk : reward', ' for every stock you own or screen.'],
            ].map(([b, rest], i) => (
              <li key={b} style={{ display: 'flex', gap: 14, padding: '12px 0', borderTop: '1px solid var(--ink)', borderBottom: i === 2 ? '1px solid var(--ink)' : undefined }}>
                <span className="head" style={{ fontSize: 26, flex: '0 0 26px' }}>{i + 1}</span>
                <span><span className="bold">{b}</span>{rest}</span>
              </li>
            ))}
          </ol>
          <div style={{ display: 'flex', gap: 10, fontSize: 13, color: '#333' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: '0 0 18px', marginTop: 1 }}>
              <rect x="4" y="11" width="16" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span>We never ask for your broker login and we can’t trade for you. You just tell us what you own.</span>
          </div>
        </section>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <SignUpForm enableApple={env.enableApple} />
        </div>
      </div>
      <footer className="footer">
        <span>OnWatch gives information, not investment advice.</span>
        <span><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></span>
      </footer>
    </div>
  );
}
