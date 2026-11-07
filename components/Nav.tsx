'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/today', label: 'Today' },
  { href: '/stocks', label: 'My stocks' },
  { href: '/screener', label: 'Screener' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Pages" className="nav">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? 'page' : undefined}>{l.label}</Link>
      ))}
      <span className="spacer" />
      <Link href="/settings" aria-current={path.startsWith('/settings') ? 'page' : undefined} style={{ marginRight: 0 }}>Settings</Link>
    </nav>
  );
}
