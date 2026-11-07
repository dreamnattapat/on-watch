// Central place to read environment variables.
// Every external service is optional: when a key is missing, that part of the
// app falls back to demo data so the site still runs end to end.

/**
 * Supabase's dashboard shows several URLs (e.g. ".../rest/v1/"). The client
 * needs the bare project URL, so strip any API path and trailing slashes.
 */
export function cleanSupabaseUrl(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/\/+$/, '').replace(/\/(rest|auth|storage|realtime)\/v1$/i, '').replace(/\/+$/, '');
}

export const env = {
  supabaseUrl: cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  finnhubKey: process.env.FINNHUB_API_KEY ?? '',
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
  redditId: process.env.REDDIT_CLIENT_ID ?? '',
  redditSecret: process.env.REDDIT_CLIENT_SECRET ?? '',
  cronSecret: process.env.CRON_SECRET ?? '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'),
  resendKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM || 'OnWatch <onboarding@resend.dev>',
  sponsorText: process.env.SPONSOR_TEXT ?? '',
  sponsorUrl: process.env.SPONSOR_URL ?? '',
  enableApple: process.env.NEXT_PUBLIC_ENABLE_APPLE === 'true',
};

/** True when accounts are switched on (Supabase is configured). */
export const authEnabled = Boolean(env.supabaseUrl && env.supabasePublishableKey);

/** True when real market data is switched on (Finnhub key present). */
export const liveData = Boolean(env.finnhubKey);

export const TIMEZONE = 'Asia/Bangkok';
