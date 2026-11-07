import type {
  Bar, CompanyProfile, EarningsEvent, MarketProvider, Metrics, NewsItem, Quote, RecommendationTrend,
} from './types';
import { EMPTY_METRICS } from './types';
import { getDailyHistory, getWeeklyHistory } from './history';
import { isoDate } from '../format';

const BASE = 'https://finnhub.io/api/v1';

// Finnhub's free plan allows 60 calls a minute. Next's fetch cache shares each
// response across every visitor, and this limiter keeps bursts polite.
let active = 0;
const queue: Array<() => void> = [];
const MAX_PARALLEL = 6;

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) await new Promise<void>((r) => queue.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

async function get<T>(path: string, params: Record<string, string>, revalidate: number, key: string): Promise<T | null> {
  const qs = new URLSearchParams({ ...params, token: key }).toString();
  return limited(async () => {
    try {
      const res = await fetch(`${BASE}${path}?${qs}`, { next: { revalidate, tags: ['finnhub'] } });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  });
}

/** Finnhub field names vary between companies, so try several in order. */
function pick(m: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = m[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

function avgSeries(series: Record<string, Array<{ period: string; v: number }>> | undefined, key: string, n = 5): number | null {
  const arr = series?.[key];
  if (!Array.isArray(arr) || !arr.length) return null;
  const vals = arr.slice(0, n).map((x) => x.v).filter((v) => Number.isFinite(v) && v > 0 && v < 400);
  if (vals.length < 2) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function parseMetrics(json: unknown): Metrics {
  const root = (json ?? {}) as { metric?: Record<string, unknown>; series?: { annual?: Record<string, Array<{ period: string; v: number }>> } };
  const m = root.metric ?? {};
  const annual = root.series?.annual;
  const eps = pick(m, ['epsTTM', 'epsBasicExclExtraItemsTTM', 'epsExclExtraItemsTTM', 'epsInclExtraItemsTTM']);
  const salesPerShare = pick(m, ['revenuePerShareTTM', 'revenuePerShareAnnual']);
  const epsSeries = annual?.eps;
  const epsAvg5y = Array.isArray(epsSeries) && epsSeries.length >= 3
    ? epsSeries.slice(0, 5).reduce((a, b) => a + b.v, 0) / Math.min(5, epsSeries.length)
    : null;
  const de = pick(m, ['totalDebt/totalEquityQuarterly', 'totalDebt/totalEquityAnnual', 'longTermDebt/equityQuarterly']);
  return {
    ...EMPTY_METRICS,
    pe: pick(m, ['peTTM', 'peBasicExclExtraTTM', 'peExclExtraTTM', 'peInclExtraTTM']),
    peHistoryAvg: avgSeries(annual, 'pe'),
    ps: pick(m, ['psTTM', 'psAnnual']),
    pb: pick(m, ['pbQuarterly', 'pbAnnual', 'ptbvQuarterly']),
    eps,
    epsAvg5y,
    epsGrowth: pick(m, ['epsGrowth5Y', 'epsGrowth3Y', 'epsGrowthTTMYoy']),
    revenueGrowth: pick(m, ['revenueGrowthTTMYoy', 'revenueGrowth3Y', 'revenueGrowth5Y']),
    netMargin: pick(m, ['netProfitMarginTTM', 'netProfitMarginAnnual']),
    debtToEquity: de,
    dividendYield: pick(m, ['dividendYieldIndicatedAnnual', 'currentDividendYieldTTM']),
    dividendPerShare: pick(m, ['dividendPerShareTTM', 'dividendPerShareAnnual', 'dividendsPerShareTTM']),
    bookValuePerShare: pick(m, ['bookValuePerShareQuarterly', 'bookValuePerShareAnnual']),
    salesPerShare,
    fcfPerShare: pick(m, ['freeCashFlowPerShareTTM', 'cashFlowPerShareTTM', 'cashFlowPerShareAnnual']),
    roe: pick(m, ['roeTTM', 'roeRfy', 'roe5Y']),
    beta: pick(m, ['beta']),
    high52: pick(m, ['52WeekHigh']),
    low52: pick(m, ['52WeekLow']),
  };
}

export function createFinnhub(key: string): MarketProvider {
  return {
    name: 'finnhub',

    async getQuote(ticker) {
      const q = await get<{ c: number; d: number; dp: number; pc: number; t: number }>('/quote', { symbol: ticker }, 60, key);
      if (!q || !q.c) return null;
      return { ticker, price: q.c, prevClose: q.pc, change: q.d, changePct: q.dp, time: q.t } satisfies Quote;
    },

    async getProfile(ticker) {
      const p = await get<{ name?: string; finnhubIndustry?: string; marketCapitalization?: number }>('/stock/profile2', { symbol: ticker }, 604800, key);
      if (!p || !p.name) return null;
      return { ticker, name: p.name, industry: p.finnhubIndustry ?? '', marketCap: p.marketCapitalization ?? 0 } satisfies CompanyProfile;
    },

    async getMetrics(ticker) {
      const j = await get<unknown>('/stock/metric', { symbol: ticker, metric: 'all' }, 86400, key);
      return j ? parseMetrics(j) : null;
    },

    async getCompanyNews(ticker, days) {
      const to = new Date();
      const from = new Date(Date.now() - days * 86400000);
      const arr = await get<Array<{ id: number; headline: string; summary: string; source: string; url: string; datetime: number }>>(
        '/company-news', { symbol: ticker, from: isoDate(from), to: isoDate(to) }, 900, key);
      return (arr ?? []).slice(0, 30).map((n) => ({
        id: String(n.id), ticker, headline: n.headline, summary: n.summary, source: n.source, url: n.url, datetime: n.datetime,
      } satisfies NewsItem));
    },

    async getMarketNews() {
      const arr = await get<Array<{ id: number; headline: string; summary: string; source: string; url: string; datetime: number }>>(
        '/news', { category: 'general' }, 900, key);
      return (arr ?? []).slice(0, 30).map((n) => ({
        id: String(n.id), headline: n.headline, summary: n.summary, source: n.source, url: n.url, datetime: n.datetime,
      }));
    },

    async getEarnings(from, to) {
      const j = await get<{ earningsCalendar?: Array<{ symbol: string; date: string; hour: string }> }>(
        '/calendar/earnings', { from, to }, 21600, key);
      return (j?.earningsCalendar ?? []).map((e) => ({ ticker: e.symbol, date: e.date, hour: e.hour ?? '' } satisfies EarningsEvent));
    },

    async getRecommendation(ticker) {
      const arr = await get<RecommendationTrend[]>('/stock/recommendation', { symbol: ticker }, 86400, key);
      return arr && arr.length ? arr[0] : null;
    },

    getWeekly: (ticker: string): Promise<Bar[]> => getWeeklyHistory(ticker),
    getDaily: (ticker: string): Promise<Bar[]> => getDailyHistory(ticker),
  };
}
