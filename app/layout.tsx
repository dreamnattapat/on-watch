import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { env } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  robots: { index: false, follow: false },
  title: { default: 'OnWatch — the market, read for you', template: '%s · OnWatch' },
  description: 'Free, personal stock briefs. We read the news, filings and social chatter, then tell you only what matters to the stocks you own.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Libre+Franklin:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
