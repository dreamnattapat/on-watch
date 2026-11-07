import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms' };

export default function Terms() {
  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="masthead" style={{ borderBottom: '3px double var(--ink)', marginBottom: 28 }}>
        <Link href="/" className="logo" style={{ fontSize: 52 }}>OnWatch</Link>
      </header>
      <article className="stack" style={{ gap: 14, fontSize: 16 }}>
        <h1 className="head h1">Terms of use</h1>
        <p className="note">Draft. Have this reviewed by a lawyer before launch.</p>
        <p><strong>Information, not advice.</strong> OnWatch summarises news, public data and online discussion. Nothing on the site is investment, financial, legal or tax advice, or a recommendation to buy or sell any security. Valuations, stages and risk : reward figures are estimates from simple models and can be wrong.</p>
        <p><strong>Data may be delayed or incomplete.</strong> Prices and figures come from third-party sources and may be delayed, inaccurate or unavailable.</p>
        <p><strong>Your decisions are yours.</strong> You are responsible for your own investment decisions. Consider speaking with a licensed adviser.</p>
        <p><strong>Free service.</strong> OnWatch is free and may change or stop at any time.</p>
        <p><strong>Your account.</strong> Keep your login safe. You can delete your stocks and account at any time.</p>
      </article>
    </div>
  );
}
