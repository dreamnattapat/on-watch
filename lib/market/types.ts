export interface Quote {
  ticker: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  /** Unix seconds of the last trade. */
  time: number;
}

export interface CompanyProfile {
  ticker: string;
  name: string;
  industry: string;
  /** Market cap in millions of USD. */
  marketCap: number;
}

/** Fundamentals. Every field can be missing; analysis code must cope with null. */
export interface Metrics {
  pe: number | null;
  /** Average P/E over the last ~5 fiscal years. */
  peHistoryAvg: number | null;
  ps: number | null;
  pb: number | null;
  eps: number | null;
  /** Average EPS over the last ~5 fiscal years (for cyclicals). */
  epsAvg5y: number | null;
  /** Expected / recent earnings growth, % per year. */
  epsGrowth: number | null;
  revenueGrowth: number | null;
  /** Revenue growth over ~3 years, % per year. */
  revenueGrowth3y: number | null;
  /** Latest quarter's revenue vs. the same quarter a year ago, %. */
  revenueGrowthQ: number | null;
  netMargin: number | null;
  grossMargin: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  dividendPerShare: number | null;
  bookValuePerShare: number | null;
  salesPerShare: number | null;
  fcfPerShare: number | null;
  roe: number | null;
  beta: number | null;
  high52: number | null;
  low52: number | null;
}

export interface NewsItem {
  id: string;
  ticker?: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  /** Unix seconds. */
  datetime: number;
}

export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EarningsEvent {
  ticker: string;
  date: string;
  /** "bmo" before market open, "amc" after market close, or "". */
  hour: string;
  epsEstimate?: number | null;
  revenueEstimate?: number | null;
  quarter?: number | null;
  year?: number | null;
}

/** One past quarter: what analysts expected vs. what the company reported. */
export interface EarningsResult {
  period: string;
  quarter: number;
  year: number;
  actual: number | null;
  estimate: number | null;
  surprisePct: number | null;
}

export interface RecommendationTrend {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  period: string;
}

export interface MarketProvider {
  readonly name: string;
  /** Latest quote. `maxAgeSec` sets how stale a cached quote may be (default 60s). */
  getQuote(ticker: string, maxAgeSec?: number): Promise<Quote | null>;
  getProfile(ticker: string): Promise<CompanyProfile | null>;
  getMetrics(ticker: string): Promise<Metrics | null>;
  getCompanyNews(ticker: string, days: number): Promise<NewsItem[]>;
  getMarketNews(): Promise<NewsItem[]>;
  getEarnings(from: string, to: string): Promise<EarningsEvent[]>;
  /** The next scheduled earnings report for one stock, if known. */
  getNextEarnings(ticker: string): Promise<EarningsEvent | null>;
  /** The last few reported quarters, newest first. */
  getEarningsHistory(ticker: string): Promise<EarningsResult[]>;
  getRecommendation(ticker: string): Promise<RecommendationTrend | null>;
  /** Comparable companies in the same industry. */
  getPeers(ticker: string): Promise<string[]>;
  /** About two years of weekly bars, oldest first. */
  getWeekly(ticker: string): Promise<Bar[]>;
  /** About one year of daily bars, oldest first. */
  getDaily(ticker: string): Promise<Bar[]>;
}

export const EMPTY_METRICS: Metrics = {
  pe: null, peHistoryAvg: null, ps: null, pb: null, eps: null, epsAvg5y: null, epsGrowth: null,
  revenueGrowth: null, revenueGrowth3y: null, revenueGrowthQ: null, netMargin: null, grossMargin: null, debtToEquity: null, dividendYield: null, dividendPerShare: null,
  bookValuePerShare: null, salesPerShare: null, fcfPerShare: null, roe: null, beta: null, high52: null, low52: null,
};
