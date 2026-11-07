'use server';

import { env } from '@/lib/config';
import { createAdminClient, createClient, getUser } from '@/lib/supabase/server';
import { emailEnabled, renderConfirm, sendEmails } from '@/lib/email';
import { buildBriefEmail, createBriefContext, oneClickUrl, unsubscribeUrl } from '@/lib/emailBrief';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TICKER = /^[A-Z][A-Z.]{0,5}$/;

export interface SubscribeState { ok?: boolean; message?: string; error?: string }

/** Newsletter sign-up from public pages. Double opt-in: we email a confirm link first. */
export async function subscribe(_prev: SubscribeState, form: FormData): Promise<SubscribeState> {
  if (String(form.get('company') ?? '')) return { ok: true, message: 'Thanks!' }; // bot trap
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const tickers = String(form.get('tickers') ?? '').split(',').map((t) => t.trim().toUpperCase()).filter((t) => TICKER.test(t)).slice(0, 10);
  const source = String(form.get('source') ?? '').slice(0, 40);
  if (!EMAIL.test(email) || email.length > 254) return { error: 'Please enter a valid email address.' };

  const admin = createAdminClient();
  if (!admin) return { error: 'Sign-ups aren’t switched on yet. Please try again soon.' };

  const { data: existing } = await admin.from('subscribers').select('id, tickers, token, confirmed, unsubscribed').eq('email', email).maybeSingle();
  let token: string;
  let confirmed = false;
  if (existing) {
    const merged = [...new Set([...(existing.tickers as string[]), ...tickers])].slice(0, 20);
    const reset = existing.unsubscribed ? { unsubscribed: false, confirmed: false } : {};
    await admin.from('subscribers').update({ tickers: merged, ...reset }).eq('id', existing.id);
    token = existing.token as string;
    confirmed = Boolean(existing.confirmed) && !existing.unsubscribed;
  } else {
    const { data, error } = await admin.from('subscribers').insert({ email, tickers, source }).select('token').single();
    if (error || !data) return { error: 'Something went wrong. Please try again.' };
    token = data.token as string;
  }

  if (confirmed) return { ok: true, message: `You’re already subscribed. We’ve added ${tickers.join(', ') || 'this stock'} to your brief.` };
  if (!emailEnabled()) return { ok: true, message: 'You’re on the list. Your first brief arrives once we switch on email sending.' };

  const link = `${env.siteUrl.replace(/\/$/, '')}/subscribe/confirm?t=${token}`;
  const mail = renderConfirm(link, tickers);
  const r = await sendEmails([{ to: email, ...mail }]);
  if (r.error) return { error: 'We couldn’t send the confirmation email. Please try again later.' };
  return { ok: true, message: `Almost done: check ${email} and tap the link to confirm.` };
}

/** Settings button: send yourself today's brief right now. */
export async function sendTestBrief(): Promise<{ message?: string; error?: string }> {
  const user = await getUser();
  if (!user?.email) return { error: 'Please log in again.' };
  if (!emailEnabled()) return { error: 'Email sending isn’t set up yet (RESEND_API_KEY is missing).' };
  const supabase = (await createClient())!;
  const [{ data: profile }, { data: holdings }] = await Promise.all([
    supabase.from('profiles').select('first_name, email_token').eq('id', user.id).maybeSingle(),
    supabase.from('holdings').select('ticker, shares, avg_cost').order('created_at'),
  ]);
  if (!holdings?.length) return { error: 'Add a stock first, then try again.' };
  const mail = await buildBriefEmail({
    ctx: createBriefContext(),
    firstName: profile?.first_name ?? '',
    holdings: holdings.map((h) => ({ ticker: h.ticker, shares: h.shares == null ? null : Number(h.shares), avgCost: h.avg_cost == null ? null : Number(h.avg_cost) })),
    unsubscribeUrl: unsubscribeUrl(String(profile?.email_token ?? ''), 'user'),
    forSubscriber: false,
  });
  const r = await sendEmails([{ to: user.email, ...mail, unsubscribeUrl: oneClickUrl(String(profile?.email_token ?? ''), 'user') }]);
  if (r.error) return { error: `Sending failed: ${r.error}` };
  return { message: `Sent to ${user.email}. Check your inbox (and spam, the first time).` };
}

/** Stop the daily brief, from the link in an email. */
export async function unsubscribeAction(token: string, kind: string): Promise<{ ok: boolean }> {
  return { ok: await doUnsubscribe(token, kind) };
}

export async function doUnsubscribe(token: string, kind: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  if (kind === 'user') {
    const { error } = await admin.from('profiles').update({ brief_channel: 'none' }).eq('email_token', token);
    return !error;
  }
  const { error } = await admin.from('subscribers').update({ unsubscribed: true }).eq('token', token);
  return !error;
}
