import { env } from './config';
import { market } from './market';
import type { Quote } from './market/types';
import { savedWhy } from './data';
import { daysUntil, longDate, sessionLabel } from './earnings';
import { isoDate, pct } from './format';
import { renderBrief, type BriefStockLine } from './email';

// Builds the daily email brief. A shared context caches each stock's data so
// a thousand people holding NVDA cost one lookup, not a thousand.

export interface BriefHolding { ticker: string; shares: number | null; avgCost: number | null }

interface StockInfo { quote: Quote | null; name: string; why: string | null; earnings: string | null }

export function createBriefContext() {
  const cache = new Map<string, Promise<StockInfo>>();
  const day = isoDate(new Date());
  const info = (ticker: string) => {
    let p = cache.get(ticker);
    if (!p) {
      p = (async () => {
        const [quote, profile, why, next] = await Promise.all([
          market.getQuote(ticker), market.getProfile(ticker), savedWhy(ticker, day), market.getNextEarnings(ticker),
        ]);
        let earnings: string | null = null;
        if (next) {
          const d = daysUntil(next.date);
          if (d >= 0 && d <= 7) earnings = `Earnings ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : longDate(next.date)}, ${sessionLabel(next.hour)}`;
        }
        return { quote, name: profile?.name ?? ticker, why: why ? `${why.headline}. ${why.drivers[0]?.title ?? ''}`.trim() : null, earnings };
      })();
      cache.set(ticker, p);
    }
    return p;
  };
  const marketLine = (async () => {
    const [spy, qqq] = await Promise.all([market.getQuote('SPY'), market.getQuote('QQQ')]);
    if (!spy && !qqq) return '';
    return `In the last US session the S&P 500 moved ${pct(spy?.changePct)} and the Nasdaq ${pct(qqq?.changePct)}.`;
  })();
  return { info, marketLine };
}

export type BriefContext = ReturnType<typeof createBriefContext>;

export async function buildBriefEmail(opts: {
  ctx: BriefContext;
  firstName: string;
  holdings: BriefHolding[];
  unsubscribeUrl: string;
  forSubscriber: boolean;
}) {
  const { ctx, holdings } = opts;
  const infos = await Promise.all(holdings.slice(0, 25).map(async (h) => ({ h, i: await ctx.info(h.ticker) })));
  const stocks: BriefStockLine[] = infos.map(({ h, i }) => ({
    ticker: h.ticker, name: i.name, price: i.quote?.price ?? null, changePct: i.quote?.changePct ?? null, why: i.why, earnings: i.earnings,
  }));

  let day = 0, value = 0, cost = 0, costKnown = true, anyShares = false;
  for (const { h, i } of infos) {
    if (!i.quote || h.shares == null) continue;
    anyShares = true;
    day += (i.quote.price - i.quote.prevClose) * h.shares;
    value += i.quote.price * h.shares;
    if (h.avgCost != null) cost += h.avgCost * h.shares; else costKnown = false;
  }
  const prev = value - day;

  const moved = stocks.filter((s) => s.changePct != null).sort((a, b) => (b.changePct as number) - (a.changePct as number));
  const best = moved[0], worst = moved[moved.length - 1];
  let headline = 'A quiet session for your stocks';
  if (moved.length && moved.some((s) => Math.abs(s.changePct as number) >= 1)) {
    if (best && worst && best !== worst && (best.changePct as number) > 0 && (worst.changePct as number) < 0) headline = `${best.ticker} leads, ${worst.ticker} lags`;
    else if (best && (best.changePct as number) > 0) headline = `${best.ticker} leads the way`;
    else if (worst) headline = `A tough session, led lower by ${worst.ticker}`;
  }
  const soon = stocks.find((s) => s.earnings);
  if (soon) headline = `${headline}; ${soon.ticker} reports soon`;

  const site = env.siteUrl.replace(/\/$/, '');
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' });
  return renderBrief({
    firstName: opts.firstName,
    dateLabel,
    headline,
    marketLine: await ctx.marketLine,
    dayUsd: anyShares ? day : null,
    dayPct: anyShares && prev > 0 ? (day / prev) * 100 : null,
    totalUsd: anyShares && costKnown && cost > 0 ? value - cost : null,
    totalPct: anyShares && costKnown && cost > 0 ? ((value - cost) / cost) * 100 : null,
    stocks,
    siteUrl: site,
    unsubscribeUrl: opts.unsubscribeUrl,
    ctaUrl: opts.forSubscriber ? `${site}/stock/${holdings[0]?.ticker ?? ''}` : `${site}/today`,
    ctaLabel: opts.forSubscriber ? 'See the full analysis' : 'Open your dashboard',
    sponsor: env.sponsorText && env.sponsorUrl ? { text: env.sponsorText, url: env.sponsorUrl } : null,
  });
}

export { bangkokToday, oneClickUrl, unsubscribeUrl } from './email';
