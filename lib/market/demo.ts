import type { Bar, CompanyProfile, EarningsEvent, EarningsResult, MarketProvider, Metrics, NewsItem, Quote, RecommendationTrend } from './types';
import { EMPTY_METRICS } from './types';
import { isoDate } from '../format';

// Demo data used when no FINNHUB_API_KEY is set, so the whole site can be
// tried before any accounts are created. Every page shows a "demo data" note.

type Row = [
  t: string, name: string, industry: string, capBn: number, price: number, chgPct: number,
  pe: number, peHist: number, epsGrowth: number, revGrowth: number, margin: number,
  de: number, divYield: number, roe: number, beta: number, stage: 1 | 2 | 3 | 4,
];

const ROWS: Row[] = [
  ['NVDA', 'NVIDIA', 'Semiconductors', 4500, 186, 6.2, 52, 60, 45, 60, 52, 0.15, 0.02, 90, 1.7, 2],
  ['AAPL', 'Apple', 'Technology', 3950, 268, 0.8, 34, 28, 9, 6, 24, 1.5, 0.4, 150, 1.2, 3],
  ['TSLA', 'Tesla', 'Automobiles', 1300, 410, -5.1, 180, 90, 5, 2, 6, 0.2, 0, 9, 2.1, 4],
  ['META', 'Meta Platforms', 'Media', 1770, 703, -2.3, 26, 24, 24, 20, 38, 0.3, 0.3, 35, 1.3, 2],
  ['AMZN', 'Amazon', 'Retail', 2450, 230, -0.4, 35, 60, 22, 11, 10, 0.5, 0, 22, 1.3, 1],
  ['MSFT', 'Microsoft', 'Technology', 3800, 510, 1.1, 36, 33, 15, 15, 36, 0.3, 0.7, 33, 0.9, 2],
  ['GOOGL', 'Alphabet', 'Media', 3100, 255, 1.9, 24, 25, 18, 13, 30, 0.1, 0.4, 32, 1.0, 2],
  ['AVGO', 'Broadcom', 'Semiconductors', 1600, 340, 3.0, 70, 40, 25, 30, 30, 0.9, 0.7, 25, 1.2, 2],
  ['JPM', 'JPMorgan Chase', 'Banking', 830, 300, 0.3, 15, 12, 8, 6, 32, 1.3, 1.9, 17, 1.1, 2],
  ['LLY', 'Eli Lilly', 'Pharmaceuticals', 750, 795.4, -3.0, 55, 50, 35, 35, 30, 1.6, 0.7, 75, 0.5, 3],
  ['V', 'Visa', 'Financial Services', 650, 340, 0.6, 32, 33, 12, 10, 53, 0.5, 0.7, 50, 0.95, 2],
  ['MA', 'Mastercard', 'Financial Services', 520, 570, 0.4, 37, 38, 13, 12, 45, 2.3, 0.5, 170, 1.1, 2],
  ['XOM', 'Exxon Mobil', 'Energy', 490, 115, 2.1, 15, 13, 3, -2, 10, 0.2, 3.4, 13, 0.9, 1],
  ['UNH', 'UnitedHealth', 'Health Care', 300, 330, -1.4, 17, 22, 2, 8, 4, 0.8, 2.6, 15, 0.6, 4],
  ['COST', 'Costco', 'Retail', 410, 920, 0.2, 52, 40, 10, 8, 3, 0.4, 0.5, 30, 0.8, 3],
  ['WMT', 'Walmart', 'Retail', 820, 102, 0.5, 38, 28, 8, 5, 3, 0.7, 0.9, 22, 0.6, 2],
  ['HD', 'Home Depot', 'Retail', 380, 385, -0.6, 26, 23, 4, 3, 10, 6.5, 2.4, 250, 1.0, 1],
  ['PG', 'Procter & Gamble', 'Consumer products', 360, 152, -0.2, 23, 25, 5, 2, 19, 0.7, 2.7, 31, 0.4, 4],
  ['JNJ', 'Johnson & Johnson', 'Pharmaceuticals', 450, 188, 0.4, 18, 22, 6, 5, 22, 0.6, 2.7, 28, 0.5, 2],
  ['NFLX', 'Netflix', 'Media', 470, 1100, -1.2, 45, 45, 28, 16, 27, 0.6, 0, 40, 1.3, 3],
  ['ORCL', 'Oracle', 'Technology', 640, 228, 2.6, 52, 30, 12, 15, 21, 4.1, 0.9, 80, 1.2, 3],
  ['CRM', 'Salesforce', 'Technology', 240, 250, -0.9, 38, 60, 20, 9, 16, 0.2, 0.7, 11, 1.2, 4],
  ['AMD', 'Advanced Micro Devices', 'Semiconductors', 370, 229.7, 4.4, 110, 70, 30, 30, 9, 0.05, 0, 5, 1.9, 2],
  ['BAC', 'Bank of America', 'Banking', 380, 50, -0.3, 14, 12, 8, 4, 28, 1.1, 2.1, 10, 1.3, 2],
  ['KO', 'Coca-Cola', 'Beverages', 300, 69.5, 0.1, 24, 25, 6, 3, 25, 1.6, 2.9, 40, 0.5, 1],
  ['PEP', 'PepsiCo', 'Beverages', 200, 146, -0.5, 21, 25, 4, 1, 10, 2.4, 3.8, 50, 0.5, 4],
  ['MRK', 'Merck', 'Pharmaceuticals', 210, 84, 0.9, 11, 15, 10, 4, 30, 0.8, 3.8, 38, 0.4, 1],
  ['ABBV', 'AbbVie', 'Pharmaceuticals', 390, 220, 0.7, 80, 30, 8, 7, 7, 20, 3.0, 60, 0.6, 2],
  ['CVX', 'Chevron', 'Energy', 300, 155, 1.8, 18, 13, 2, -3, 8, 0.2, 4.4, 10, 1.0, 1],
  ['ADBE', 'Adobe', 'Technology', 150, 350, -1.8, 22, 40, 14, 10, 30, 0.6, 0, 50, 1.2, 4],
  ['CSCO', 'Cisco', 'Communications equipment', 270, 68, 0.3, 26, 17, 6, 6, 18, 0.6, 2.4, 22, 0.9, 2],
  ['PFE', 'Pfizer', 'Pharmaceuticals', 140, 24.5, -2.0, 9, 14, 3, 1, 15, 0.7, 7.0, 9, 0.6, 1],
  ['INTC', 'Intel', 'Semiconductors', 160, 36.1, -5.0, 80, 15, -10, -2, -5, 0.5, 0, -2, 1.1, 2],
  ['MU', 'Micron', 'Semiconductors', 150, 133.1, 4.0, 12, 18, 45, 40, 18, 0.3, 0.3, 14, 1.3, 2],
  ['DIS', 'Walt Disney', 'Media', 205, 113, -0.8, 18, 35, 15, 4, 10, 0.4, 1.0, 8, 1.4, 1],
  ['NKE', 'Nike', 'Textiles & apparel', 100, 66.9, -4.4, 30, 30, -10, -5, 7, 0.9, 2.4, 25, 1.1, 4],
];

const ETFS: Array<[string, number, number]> = [
  ['XLK', 280, 2.4], ['XLC', 115, 0.9], ['XLY', 230, -1.1], ['XLP', 80, -0.6], ['XLE', 92, 1.6], ['XLF', 54, -0.2],
  ['XLV', 140, -1.4], ['XLI', 150, 0.3], ['XLB', 90, -0.4], ['XLRE', 42, -2.2], ['XLU', 82, -1.9],
  ['SPY', 680, 0.8], ['QQQ', 610, 1.1], ['^VIX', 16.4, -3.0],
];

const byTicker = new Map(ROWS.map((r) => [r[0], r]));

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function demoQuote(t: string): Quote | null {
  const r = byTicker.get(t);
  const e = ETFS.find((x) => x[0] === t);
  const price = r ? r[4] : e ? e[1] : null;
  const chg = r ? r[5] : e ? e[2] : 0;
  if (price == null) return null;
  const prev = price / (1 + chg / 100);
  return { ticker: t, price, prevClose: prev, change: price - prev, changePct: chg, time: Math.floor(Date.now() / 1000) };
}

/** Weekly bars shaped like the requested Weinstein stage, ending at today's price. */
function demoWeekly(t: string): Bar[] {
  const r = byTicker.get(t);
  const e = ETFS.find((x) => x[0] === t);
  const price = r ? r[4] : e ? e[1] : 100;
  const stage = r ? r[15] : 2;
  const rnd = seeded(t + 'w');
  const n = 104;
  const drift = (i: number) => {
    const late = i > n - 30;
    switch (stage) {
      case 1: return i < 45 ? -0.01 : late ? 0.001 : 0.0;
      case 2: return i < 50 ? 0.001 : 0.009;
      case 3: return i < 84 ? 0.01 : 0.0;
      case 4: return i < 60 ? 0.006 : -0.012;
    }
  };
  const closes: number[] = [100];
  for (let i = 1; i < n; i++) closes.push(closes[i - 1] * Math.exp(drift(i) + (rnd() - 0.5) * 0.03));
  const scale = price / closes[n - 1];
  const start = Date.now() - n * 7 * 86400000;
  return closes.map((c0, i) => {
    const c = c0 * scale;
    const up = i > 0 && c >= closes[i - 1] * scale;
    const vol = (1 + rnd()) * 1e7 * (stage === 2 && up ? 1.3 : stage === 4 && !up ? 1.3 : 1);
    return {
      date: isoDate(new Date(start + i * 7 * 86400000)),
      open: c * (1 - (rnd() - 0.5) * 0.02), high: c * (1 + rnd() * 0.03), low: c * (1 - rnd() * 0.03), close: c, volume: Math.round(vol),
    };
  });
}

function demoDaily(t: string): Bar[] {
  const rnd = seeded(t + 'd');
  const n = 250;
  const e = ETFS.find((x) => x[0] === t);
  const price = e ? e[1] : byTicker.get(t)?.[4] ?? 100;
  const isVix = t === '^VIX';
  const closes: number[] = [100];
  for (let i = 1; i < n; i++) {
    closes.push(isVix ? 16 + (rnd() - 0.5) * 6 : closes[i - 1] * Math.exp(0.0007 + (rnd() - 0.5) * 0.02));
  }
  const scale = isVix ? 1 : price / closes[n - 1];
  const start = Date.now() - n * 86400000 * 1.45;
  return closes.map((c0, i) => {
    const c = isVix && i === n - 1 ? price : c0 * scale;
    return { date: isoDate(new Date(start + i * 86400000 * 1.45)), open: c, high: c * 1.01, low: c * 0.99, close: c, volume: 1e8 };
  });
}

function demoMetrics(t: string): Metrics | null {
  const r = byTicker.get(t);
  if (!r) return null;
  const [, , , , price, , pe, peHist, epsGrowth, revGrowth, margin, de, divYield, roe, beta] = r;
  const eps = price / pe;
  const salesPerShare = margin > 0 ? eps / (margin / 100) : price / 4;
  return {
    ...EMPTY_METRICS,
    pe, peHistoryAvg: peHist, eps, epsAvg5y: eps * 0.9, epsGrowth, revenueGrowth: revGrowth, netMargin: margin,
    debtToEquity: de, dividendYield: divYield, dividendPerShare: (price * divYield) / 100,
    bookValuePerShare: roe > 0 ? eps / (roe / 100) : price / 3, salesPerShare, ps: price / salesPerShare,
    pb: roe > 0 ? price / (eps / (roe / 100)) : 3, fcfPerShare: eps * 0.95, roe, beta,
    high52: price * 1.15, low52: price * 0.7,
  };
}

const NEWS: Record<string, Array<[string, string, number]>> = {
  NVDA: [['Analysts preview next week’s earnings, with data-center sales in focus', 'Several brokers raised price targets ahead of the report.', 2],
    ['Chip stocks rally as AI spending forecasts climb', 'Semiconductor shares rose broadly.', 5]],
  AAPL: [['Supplier reports point to steady phone demand this quarter', 'Orders from Asian suppliers are holding up.', 9]],
  TSLA: [['Analysts trim delivery estimates on softer European demand', 'Some brokers lowered quarterly delivery forecasts.', 3],
    ['Tesla cuts prices again in China', 'Lower prices may support volume but squeeze margins.', 6]],
  META: [['Reports say Meta plans another rise in AI data-center spending', 'Investors weigh higher capital spending against ad growth.', 3]],
  AMZN: [['Retailers start the holiday season with early discounts', 'The holiday quarter is Amazon’s largest.', 7]],
};

function demoNews(t: string): NewsItem[] {
  return (NEWS[t] ?? []).map(([headline, summary, hrs], i) => ({
    id: `${t}-${i}`, ticker: t, headline, summary, source: 'Demo News', url: 'https://example.com', datetime: Math.floor(Date.now() / 1000) - hrs * 3600,
  }));
}

function nextWeekday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return isoDate(d);
}

export const demoProvider: MarketProvider = {
  name: 'demo',
  getQuote: async (t) => demoQuote(t),
  getProfile: async (t): Promise<CompanyProfile | null> => {
    const r = byTicker.get(t);
    return r ? { ticker: t, name: r[1], industry: r[2], marketCap: r[3] * 1000 } : null;
  },
  getMetrics: async (t) => demoMetrics(t),
  getCompanyNews: async (t) => demoNews(t),
  getMarketNews: async () => [],
  getEarnings: async (): Promise<EarningsEvent[]> => [
    { ticker: 'NVDA', date: nextWeekday(4), hour: 'amc' },
    { ticker: 'WMT', date: nextWeekday(5), hour: 'bmo' },
  ],
  getNextEarnings: async (t): Promise<EarningsEvent | null> => {
    const r = byTicker.get(t);
    if (!r) return null;
    const rnd = seeded(t + 'e');
    const offset = t === 'NVDA' ? 4 : 5 + Math.floor(rnd() * 80);
    const eps = r[4] / r[6] / 4;
    return { ticker: t, date: nextWeekday(offset), hour: rnd() > 0.5 ? 'amc' : 'bmo', epsEstimate: Math.round(eps * 100) / 100, revenueEstimate: null, quarter: null, year: null };
  },
  getEarningsHistory: async (t): Promise<EarningsResult[]> => {
    const r = byTicker.get(t);
    if (!r) return [];
    const rnd = seeded(t + 'h');
    const eps = r[4] / r[6] / 4;
    const now = new Date();
    return [0, 1, 2, 3].map((i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 3 * (i + 1), 1);
      const q = Math.floor(d.getMonth() / 3) + 1;
      const est = Math.round(eps * (1 - i * 0.04) * 100) / 100;
      const act = Math.round(est * (1 + (rnd() - 0.35) * 0.12) * 100) / 100;
      return { period: isoDate(d), quarter: q, year: d.getFullYear(), actual: act, estimate: est, surprisePct: ((act - est) / est) * 100 };
    });
  },
  getRecommendation: async (): Promise<RecommendationTrend | null> => null,
  getWeekly: async (t) => demoWeekly(t),
  getDaily: async (t) => demoDaily(t),
};
