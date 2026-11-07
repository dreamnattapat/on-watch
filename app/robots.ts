import type { MetadataRoute } from 'next';
import { env } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl.replace(/\/$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/today', '/stocks', '/screener', '/settings', '/onboarding', '/api/', '/auth/', '/unsubscribe', '/subscribe/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
