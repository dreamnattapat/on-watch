import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/config';
import { createAdminClient } from '@/lib/supabase/server';
import { emailEnabled, sendEmails, type OutgoingEmail } from '@/lib/email';
import { bangkokToday, buildBriefEmail, createBriefContext, oneClickUrl, unsubscribeUrl, type BriefHolding } from '@/lib/emailBrief';

// The morning email. Runs after /api/cron/daily has written the day's
// "why it moved" summaries (see vercel.json), weekday US sessions only.
// Members get their whole portfolio with dollar returns; newsletter
// subscribers get the stocks they signed up for from public pages.

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!env.cronSecret || request.headers.get('authorization') !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Supabase secret key not set' }, { status: 500 });
  if (!emailEnabled()) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });

  const today = bangkokToday();
  const started = Date.now();
  const ctx = createBriefContext();
  const outbox: { mail: OutgoingEmail; mark: () => PromiseLike<unknown> }[] = [];

  // --- Members ------------------------------------------------------------
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, first_name, email_token, last_brief_on')
    .eq('brief_channel', 'email')
    .eq('onboarded', true);
  const due = (profiles ?? []).filter((p) => p.last_brief_on !== today);

  const emails = new Map<string, string>();
  if (due.length) {
    for (let page = 1; page <= 20; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      for (const u of data?.users ?? []) if (u.email) emails.set(u.id, u.email.toLowerCase());
      if (!data || data.users.length < 1000) break;
    }
  }
  const holdingsBy = new Map<string, BriefHolding[]>();
  if (due.length) {
    const { data: rows } = await admin.from('holdings').select('user_id, ticker, shares, avg_cost').in('user_id', due.map((p) => p.id)).order('created_at');
    for (const r of rows ?? []) {
      const list = holdingsBy.get(r.user_id) ?? [];
      list.push({ ticker: r.ticker, shares: r.shares == null ? null : Number(r.shares), avgCost: r.avg_cost == null ? null : Number(r.avg_cost) });
      holdingsBy.set(r.user_id, list);
    }
  }

  let skipped = 0;
  for (const p of due) {
    if (Date.now() - started > 40000) { skipped++; continue; }
    const to = emails.get(p.id);
    const holdings = holdingsBy.get(p.id) ?? [];
    if (!to || !holdings.length) continue;
    const token = String(p.email_token);
    const mail = await buildBriefEmail({ ctx, firstName: p.first_name ?? '', holdings, unsubscribeUrl: unsubscribeUrl(token, 'user'), forSubscriber: false });
    outbox.push({ mail: { to, ...mail, unsubscribeUrl: oneClickUrl(token, 'user') }, mark: () => admin.from('profiles').update({ last_brief_on: today }).eq('id', p.id) });
  }

  // --- Newsletter subscribers ---------------------------------------------
  const memberEmails = new Set(emails.values());
  const { data: subs } = await admin
    .from('subscribers')
    .select('id, email, tickers, token, last_brief_on')
    .eq('confirmed', true)
    .eq('unsubscribed', false)
    .limit(2000);
  for (const s of subs ?? []) {
    if (s.last_brief_on === today || memberEmails.has(s.email) || !(s.tickers as string[]).length) continue;
    if (Date.now() - started > 40000) { skipped++; continue; }
    const token = String(s.token);
    const holdings = (s.tickers as string[]).map((ticker) => ({ ticker, shares: null, avgCost: null }));
    const mail = await buildBriefEmail({ ctx, firstName: '', holdings, unsubscribeUrl: unsubscribeUrl(token, 'sub'), forSubscriber: true });
    outbox.push({ mail: { to: s.email, ...mail, unsubscribeUrl: oneClickUrl(token, 'sub') }, mark: () => admin.from('subscribers').update({ last_brief_on: today }).eq('id', s.id) });
  }

  // --- Send ----------------------------------------------------------------
  const result = await sendEmails(outbox.map((o) => o.mail));
  await Promise.all(outbox.slice(0, result.sent).map((o) => o.mark()));

  return NextResponse.json({ day: today, queued: outbox.length, sent: result.sent, skippedForTime: skipped, error: result.error ?? null });
}
