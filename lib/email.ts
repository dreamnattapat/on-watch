import { env } from './config';
import { MINUS } from './format';

// Email sending through Resend (resend.com). Free plan: 3,000 emails a month.
// Without RESEND_API_KEY every send is skipped and reported as not configured.

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
}

export const emailEnabled = () => Boolean(env.resendKey);

/** Link in the email footer: opens a page with an "unsubscribe" button. */
export function unsubscribeUrl(token: string, kind: 'user' | 'sub'): string {
  return `${env.siteUrl.replace(/\/$/, '')}/unsubscribe?t=${token}&k=${kind}`;
}

/** For the List-Unsubscribe header: mail apps POST here for one-click unsubscribe. */
export function oneClickUrl(token: string, kind: 'user' | 'sub'): string {
  return `${env.siteUrl.replace(/\/$/, '')}/api/unsubscribe?t=${token}&k=${kind}`;
}

/** Today's date in Bangkok, YYYY-MM-DD, used to avoid sending twice in a day. */
export function bangkokToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}


/** Sends up to 100 emails per request with Resend's batch API. Returns how many were accepted. */
export async function sendEmails(emails: OutgoingEmail[]): Promise<{ sent: number; error?: string }> {
  if (!env.resendKey) return { sent: 0, error: 'RESEND_API_KEY is not set' };
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100).map((e) => ({
      from: env.emailFrom,
      to: [e.to],
      subject: e.subject,
      html: e.html,
      text: e.text,
      headers: e.unsubscribeUrl ? {
        'List-Unsubscribe': `<${e.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      } : undefined,
    }));
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
        cache: 'no-store',
      });
      if (!res.ok) return { sent, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
      sent += chunk.length;
    } catch (e) {
      return { sent, error: String(e) };
    }
  }
  return { sent };
}

// ---------------------------------------------------------------------------
// Templates. Plain table layout with inline styles so every mail app renders it.
// ---------------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const GREEN = '#0a7d3b', RED = '#c8102e', INK = '#111111', MUTED = '#555555';
const colorFor = (v: number | null) => (v == null || v === 0 ? INK : v > 0 ? GREEN : RED);
const fmtPct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? MINUS : ''}${Math.abs(v).toFixed(1)}%`);
const fmtUsd = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? MINUS : ''}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

function shell(title: string, inner: string, footer: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4"><tr><td align="center" style="padding:16px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:6px solid ${INK}">
<tr><td style="padding:20px 24px 8px;font-family:'Arial Narrow',Arial,sans-serif;font-size:34px;font-weight:800;letter-spacing:-0.5px">ONWATCH</td></tr>
${inner}
<tr><td style="padding:20px 24px 24px;border-top:1px solid #dddddd;font-size:12px;line-height:1.5;color:${MUTED}">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export interface BriefStockLine {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  why: string | null;
  earnings: string | null;
}

export interface BriefEmailInput {
  firstName: string;
  dateLabel: string;
  headline: string;
  marketLine: string;
  dayUsd: number | null;
  dayPct: number | null;
  totalUsd: number | null;
  totalPct: number | null;
  stocks: BriefStockLine[];
  siteUrl: string;
  unsubscribeUrl: string;
  ctaUrl: string;
  ctaLabel: string;
  sponsor?: { text: string; url: string } | null;
}

export function renderBrief(b: BriefEmailInput): { subject: string; html: string; text: string } {
  const subject = `${b.headline} · your OnWatch brief`;
  const greet = b.firstName ? `Good morning, ${esc(b.firstName)}.` : 'Good morning.';
  const totals = b.dayUsd != null ? `
<tr><td style="padding:8px 24px 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding:8px 0;border-top:1px solid #dddddd" width="50%"><div style="font-size:11px;font-weight:700;letter-spacing:1px;color:${RED}">LAST SESSION</div>
<div style="font-size:26px;font-weight:800;color:${colorFor(b.dayUsd)}">${fmtUsd(b.dayUsd)}</div><div style="font-size:13px;font-weight:700;color:${colorFor(b.dayPct)}">${fmtPct(b.dayPct)}</div></td>
<td style="padding:8px 0;border-top:1px solid #dddddd" width="50%"><div style="font-size:11px;font-weight:700;letter-spacing:1px">TOTAL RETURN</div>
<div style="font-size:26px;font-weight:800;color:${colorFor(b.totalUsd)}">${fmtUsd(b.totalUsd)}</div><div style="font-size:13px;font-weight:700;color:${colorFor(b.totalPct)}">${b.totalPct != null ? `${fmtPct(b.totalPct)} since you bought` : ''}</div></td>
</tr></table></td></tr>` : '';
  const rows = b.stocks.map((s) => `
<tr><td style="padding:12px 0;border-top:1px solid #dddddd">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-family:'Arial Narrow',Arial,sans-serif;font-size:22px;font-weight:800">${esc(s.ticker)}<div style="font-family:Arial,sans-serif;font-size:12px;font-weight:400;color:${MUTED}">${esc(s.name)}</div></td>
<td align="right" style="font-size:16px;font-weight:700">${s.price != null ? `$${s.price.toFixed(2)}` : '—'}<div style="font-size:14px;font-weight:800;color:${colorFor(s.changePct)}">${fmtPct(s.changePct)}</div></td>
</tr></table>
${s.why ? `<div style="font-size:14px;line-height:1.5;padding-top:4px">${esc(s.why)}</div>` : ''}
${s.earnings ? `<div style="font-size:12px;font-weight:700;color:${RED};padding-top:4px">${esc(s.earnings)}</div>` : ''}
</td></tr>`).join('');
  const sponsor = b.sponsor ? `
<tr><td style="padding:12px 24px"><div style="border:1px solid #dddddd;padding:12px;font-size:13px;line-height:1.5">
<div style="font-size:10px;font-weight:700;letter-spacing:1px;color:${MUTED}">SPONSORED</div>
<a href="${esc(b.sponsor.url)}" style="color:${INK}">${esc(b.sponsor.text)}</a></div></td></tr>` : '';
  const inner = `
<tr><td style="padding:0 24px;font-size:12px;font-weight:700;letter-spacing:1px;color:${RED}">YOUR 2-MINUTE BRIEF · ${esc(b.dateLabel.toUpperCase())}</td></tr>
<tr><td style="padding:6px 24px 4px;font-family:'Arial Narrow',Arial,sans-serif;font-size:30px;font-weight:800;line-height:1.05;text-transform:uppercase">${esc(b.headline)}</td></tr>
<tr><td style="padding:4px 24px 8px;font-size:15px;line-height:1.5">${greet} ${esc(b.marketLine)}</td></tr>
${totals}
<tr><td style="padding:4px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
${sponsor}
<tr><td style="padding:16px 24px"><a href="${esc(b.ctaUrl)}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:1px;padding:14px 20px">${esc(b.ctaLabel.toUpperCase())} →</a></td></tr>`;
  const footer = `OnWatch gives information, not investment advice. Prices are from the last US close.<br>
<a href="${esc(b.unsubscribeUrl)}" style="color:${MUTED}">Unsubscribe</a> · <a href="${esc(b.siteUrl)}" style="color:${MUTED}">${esc(b.siteUrl.replace(/^https?:\/\//, ''))}</a>`;

  const text = [
    `ONWATCH · ${b.dateLabel}`, b.headline.toUpperCase(), '', `${b.firstName ? `Good morning, ${b.firstName}.` : 'Good morning.'} ${b.marketLine}`,
    b.dayUsd != null ? `Last session: ${fmtUsd(b.dayUsd)} (${fmtPct(b.dayPct)}). Total return: ${fmtUsd(b.totalUsd)}${b.totalPct != null ? ` (${fmtPct(b.totalPct)})` : ''}.` : '',
    '', ...b.stocks.map((s) => `${s.ticker} ${s.price != null ? `$${s.price.toFixed(2)}` : ''} ${fmtPct(s.changePct)}${s.why ? ` — ${s.why}` : ''}${s.earnings ? ` [${s.earnings}]` : ''}`),
    b.sponsor ? `\nSponsored: ${b.sponsor.text} ${b.sponsor.url}` : '',
    '', `${b.ctaLabel}: ${b.ctaUrl}`, '', `Unsubscribe: ${b.unsubscribeUrl}`, 'OnWatch gives information, not investment advice.',
  ].filter((l) => l !== undefined).join('\n');
  return { subject, html: shell(subject, inner, footer), text };
}

export function renderConfirm(confirmUrl: string, tickers: string[]): { subject: string; html: string; text: string } {
  const subject = 'Confirm your free OnWatch brief';
  const list = tickers.length ? ` on ${tickers.join(', ')}` : '';
  const inner = `
<tr><td style="padding:8px 24px;font-family:'Arial Narrow',Arial,sans-serif;font-size:30px;font-weight:800;text-transform:uppercase">One tap to confirm</td></tr>
<tr><td style="padding:4px 24px 12px;font-size:15px;line-height:1.5">You asked for the free 2-minute morning brief${esc(list)}. Tap below to start getting it.</td></tr>
<tr><td style="padding:8px 24px 20px"><a href="${esc(confirmUrl)}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:1px;padding:14px 20px">CONFIRM MY BRIEF →</a></td></tr>`;
  return {
    subject,
    html: shell(subject, inner, 'If you didn’t ask for this, ignore this email and nothing will be sent.'),
    text: `You asked for the free OnWatch morning brief${list}. Confirm here: ${confirmUrl}\n\nIf you didn't ask for this, ignore this email.`,
  };
}
