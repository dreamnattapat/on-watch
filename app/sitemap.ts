import type { MetadataRoute } from 'next';
import { env } from '@/lib/config';
import { PUBLIC_TICKERS } from '@/lib/popular';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl.replace(/\/$/, '');
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/stock`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...PUBLIC_TICKERS.map((t) => ({ url: `${base}/stock/${t}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 })),
  ];
}
