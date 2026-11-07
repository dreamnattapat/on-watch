import { describe, expect, it } from 'vitest';
import { bangkokToday, oneClickUrl, renderBrief, renderConfirm, unsubscribeUrl } from '../lib/email';


const base = {
  firstName: 'Dream', dateLabel: 'Sat 8 Nov', headline: 'NVDA leads, TSLA lags', marketLine: 'The S&P 500 rose 0.4%.',
  dayUsd: 312.5, dayPct: 1.2, totalUsd: -40, totalPct: -0.5,
  stocks: [{ ticker: 'NVDA', name: 'NVIDIA <Corp>', price: 190.12, changePct: 3.1, why: 'Chip demand & guidance', earnings: 'Earnings tomorrow, after the close' }],
  siteUrl: 'https://on-watch-prj.vercel.app', unsubscribeUrl: 'https://on-watch-prj.vercel.app/unsubscribe?t=x&k=sub',
  ctaUrl: 'https://on-watch-prj.vercel.app/today', ctaLabel: 'Open your dashboard',
};

describe('email brief', () => {
  it('renders the portfolio, colours and escapes text', () => {
    const m = renderBrief(base);
    expect(m.subject).toContain('NVDA leads');
    expect(m.html).toContain('NVIDIA &lt;Corp&gt;');
    expect(m.html).toContain('Chip demand &amp; guidance');
    expect(m.html).toContain('#0a7d3b'); // green for the gain
    expect(m.html).toContain('#c8102e'); // red for the total loss
    expect(m.html).toContain('Unsubscribe');
    expect(m.html).not.toContain('SPONSORED');
    expect(m.text).toContain('Last session: +$313');
  });
  it('shows the sponsor slot only when set', () => {
    const m = renderBrief({ ...base, sponsor: { text: 'Zero-fee US trading', url: 'https://example.com' } });
    expect(m.html).toContain('SPONSORED');
    expect(m.text).toContain('Sponsored: Zero-fee US trading');
  });
  it('hides dollar totals for newsletter subscribers', () => {
    const m = renderBrief({ ...base, dayUsd: null, dayPct: null, totalUsd: null, totalPct: null });
    expect(m.html).not.toContain('TOTAL RETURN');
  });
  it('confirmation email lists the stocks', () => {
    expect(renderConfirm('https://x/confirm?t=1', ['RKLB']).text).toContain('on RKLB');
  });
  it('builds unsubscribe links and a Bangkok date', () => {
    expect(unsubscribeUrl('abc', 'user')).toMatch(/\/unsubscribe\?t=abc&k=user$/);
    expect(oneClickUrl('abc', 'sub')).toMatch(/\/api\/unsubscribe\?t=abc&k=sub$/);
    expect(bangkokToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
