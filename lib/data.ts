import { market, getQuotes } from './market';
import type { Bar, CompanyProfile, EarningsEvent, EarningsResult, Metrics, NewsItem, Quote, RecommendationTrend } from './market/types';
import { recentRevenueGrowth } from './analysis/valuation';
import { SECTORS, UNIVERSE, UNIVERSE_TICKERS, sectorEtfFor } from './universe';
import { valueStock, type PeerStats, type Valuation } from './analysis/valuation';
import { analyzeStage, findSupport, type StageResult } from './analysis/stage';
import { riskReward, type RiskReward } from './analysis/riskReward';
import { fearGreed, fearGreedAt, type FearGreed } from './analysis/fearGreed';
import { getMood, type Mood } from './sentiment';
import { ruleBasedWhy, type WhyMoved } from './whyMoved';
import { createAdminClient, createClient } from './supabase/server';
import { authEnabled } from './config';
import { isoDate, median } from './format';
import type { Holding } from './portfolio';
import events from '../data/events.json';

// ---------------------------------------------------------------------------
// Universe: quotes + fundamentals for the ~40 large stocks we track.
// ---------------------------------------------------------------------------

export interface UniverseRow {
  ticker: string;
  quote: Quote | null;
  profile: CompanyProfile | null;
  metrics: Metrics | null;
  sector: string | null;
}

export async function getUniverse(): Promise<UniverseRow[]> {
  return Promise.all(UNIVERSE_TICKERS.map(async (ticker) => {
    const [quote, profile, metrics] = await Promise.all([market.getQuote(ticker), market.getProfile(ticker), market.getMetrics(ticker)]);
    return { ticker, quote, profile, metrics, sector: profile ? sectorEtfFor(profile.industry) : null };
  }));
}

/** Median P/E and P/S of universe companies in the same sector (or all of them). */
export function peerStatsFor(ticker: string, sector: string | null, rows: UniverseRow[]): PeerStats {
  const pool = rows.filter((r) => r.ticker !== ticker && r.metrics && (!sector || r.sector === sector));
  const use = pool.length >= 3 ? pool : rows.filter((r) => r.ticker !== ticker && r.metrics);
  return {
    pe: median(use.map((r) => r.metrics!.pe ?? NaN).filter((v) => v > 0 && v < 80)),
    ps: median(use.map((r) => r.metrics!.ps ?? NaN).filter((v) => v > 0 && v < 40)),
    growth: median(use.map((r) => recentRevenueGrowth(r.metrics!) ?? NaN)),
    source: pool.length >= 3 ? 'large companies in the same sector' : 'large US companies',
  };
}

/** Peers from the company's own industry (Finnhub), falling back to the universe. */
export async function industryPeerStats(ticker: string, sector: string | null, universe: UniverseRow[]): Promise<PeerStats & { names: string[] }> {
  const fallback = { ...peerStatsFor(ticker, sector, universe), names: [] as string[] };
  const peers = (await market.getPeers(ticker)).slice(0, 6);
  if (peers.length < 3) return fallback;
  const ms = (await Promise.all(peers.map(async (t) => [t, await market.getMetrics(t)] as const)))
    .filter((x): x is readonly [string, Metrics] => x[1] != null);
  const ps = median(ms.map(([, m]) => m.ps ?? NaN).filter((v) => v > 0 && v < 80));
  if (ms.length < 3 || ps == null) return fallback;
  return {
    pe: median(ms.map(([, m]) => m.pe ?? NaN).filter((v) => v > 0 && v < 150)) ?? fallback.pe,
    ps,
    growth: median(ms.map(([, m]) => recentRevenueGrowth(m) ?? NaN)),
    source: 'companies in the same industry',
    names: ms.map(([t]) => t),
  };
}

// ---------------------------------------------------------------------------
// Market overview for the Today page.
// ---------------------------------------------------------------------------

export interface MarketOverview {
  heat: Array<{ ticker: string; changePct: number; w: 1 | 2 }>;
  sectors: Array<{ name: string; etf: string; changePct: number }>;
  fearGreed: FearGreed | null;
  fgHistory: Array<{ when: string; score: number }>;
  spy: Quote | null;
  qqq: Quote | null;
}

export async function getMarketOverview(universe: UniverseRow[]): Promise<MarketOverview> {
  const [sectorQuotes, spyDaily, vixDaily, spy, qqq] = await Promise.all([
    getQuotes(SECTORS.map((s) => s.etf)),
    market.getDaily('SPY'),
    market.getDaily('^VIX'),
    market.getQuote('SPY'),
    market.getQuote('QQQ'),
  ]);
  const quoted = universe.filter((r) => r.quote);
  const heat = UNIVERSE.map((u) => {
    const q = universe.find((r) => r.ticker === u.t)?.quote;
    return q ? { ticker: u.t, changePct: q.changePct, w: u.w } : null;
  }).filter((x): x is NonNullable<typeof x> => x != null);
  const sectors = SECTORS.map((s) => {
    const q = sectorQuotes.get(s.etf);
    return q ? { name: s.name, etf: s.etf, changePct: q.changePct } : null;
  }).filter((x): x is NonNullable<typeof x> => x != null).sort((a, b) => b.changePct - a.changePct);
  const advancing = quoted.length ? quoted.filter((r) => (r.quote as Quote).changePct > 0).length / quoted.length : null;
  const fg = fearGreed(spyDaily, vixDaily, advancing);
  const fgHistory = ([['Yesterday', 1], ['Last week', 5], ['Last month', 21]] as const)
    .map(([when, d]) => ({ when, score: fearGreedAt(spyDaily, vixDaily, d) }))
    .filter((x): x is { when: 'Yesterday' | 'Last week' | 'Last month'; score: number } => x.score != null);
  return { heat, sectors, fearGreed: fg, fgHistory, spy, qqq };
}

export function topMovers(universe: UniverseRow[]) {
  const rows = universe.filter((r) => r.quote).map((r) => ({ ticker: r.ticker, price: r.quote!.price, changePct: r.quote!.changePct }));
  return {
    gainers: rows.filter((r) => r.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 10),
    losers: rows.filter((r) => r.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 10),
    updated: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// One stock, fully analyzed.
// ---------------------------------------------------------------------------

export interface StockAnalysis {
  ticker: string;
  name: string;
  quote: Quote | null;
  valuation: Valuation | null;
  stage: StageResult | null;
  support: number | null;
  rr: RiskReward | null;
  mood: Mood | null;
  why: WhyMoved | null;
  news: NewsItem[];
  nextEarnings: EarningsEvent | null;
  earningsHistory: EarningsResult[];
  recommendation: RecommendationTrend | null;
  peerNames: string[];
}

async function savedWhy(ticker: string, day: string): Promise<WhyMoved | null> {
  if (!authEnabled) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from('stock_daily').select('why').eq('ticker', ticker).eq('day', day).maybeSingle();
  return (data?.why as WhyMoved | undefined) ?? null;
}

export async function analyzeStock(ticker: string, universe: UniverseRow[], spyWeekly: Bar[], sectorChange: Map<string, number>, marketChangePct: number | null): Promise<StockAnalysis> {
  const fromUni = universe.find((r) => r.ticker === ticker);
  const [quote, profile, metrics, weekly, news, mood, nextEarnings, earningsHistory] = await Promise.all([
    fromUni?.quote ?? market.getQuote(ticker),
    fromUni?.profile ?? market.getProfile(ticker),
    fromUni?.metrics ?? market.getMetrics(ticker),
    market.getWeekly(ticker),
    market.getCompanyNews(ticker, 3),
    getMood(ticker),
    market.getNextEarnings(ticker),
    market.getEarningsHistory(ticker),
  ]);
  const recommendation = await market.getRecommendation(ticker);
  const sector = profile ? sectorEtfFor(profile.industry) : null;
  const price = quote?.price ?? null;
  const peerStats = await industryPeerStats(ticker, sector, universe);
  const valuation = price && metrics ? valueStock(ticker, price, profile, metrics, peerStats) : null;
  const stage = analyzeStage(weekly, spyWeekly);
  const support = price ? findSupport(weekly, price) : null;
  const rr = price ? riskReward(price, support, valuation?.fair ?? null) : null;

  let why: WhyMoved | null = null;
  if (quote) {
    why = await savedWhy(ticker, isoDate(new Date()));
    if (!why) {
      why = ruleBasedWhy({
        ticker, name: profile?.name ?? ticker, changePct: quote.changePct,
        sectorName: sector ? SECTORS.find((s) => s.etf === sector)?.name ?? null : null,
        sectorChangePct: sector ? sectorChange.get(sector) ?? null : null,
        marketChangePct, news, mood,
      });
    }
  }
  return { ticker, name: profile?.name ?? ticker, quote, valuation, stage, support, rr, mood, why, news: news.slice(0, 3), nextEarnings, earningsHistory, recommendation, peerNames: peerStats.names };
}

export async function analyzeHoldings(holdings: Holding[], universe: UniverseRow[]): Promise<StockAnalysis[]> {
  const [spyWeekly, sectorQuotes, spy] = await Promise.all([
    market.getWeekly('SPY'), getQuotes(SECTORS.map((s) => s.etf)), market.getQuote('SPY'),
  ]);
  const sectorChange = new Map([...sectorQuotes.entries()].map(([k, q]) => [k, q.changePct]));
  return Promise.all(holdings.map((h) => analyzeStock(h.ticker, universe, spyWeekly, sectorChange, spy?.changePct ?? null)));
}

// ---------------------------------------------------------------------------
// Portfolio maths.
// ---------------------------------------------------------------------------

export interface PortfolioRow {
  ticker: string;
  shares: number | null;
  price: number | null;
  changePct: number | null;
  dayUsd: number | null;
  totalUsd: number | null;
  totalPct: number | null;
  value: number | null;
}

export interface PortfolioSummary {
  rows: PortfolioRow[];
  dayUsd: number;
  dayPct: number | null;
  totalUsd: number | null;
  totalPct: number | null;
  value: number;
  cost: number | null;
  best: PortfolioRow | null;
  worst: PortfolioRow | null;
}

export function buildPortfolio(holdings: Holding[], quotes: Map<string, Quote | null>): PortfolioSummary {
  let day = 0, value = 0, cost = 0, costKnown = true;
  const rows: PortfolioRow[] = holdings.map((h) => {
    const q = quotes.get(h.ticker) ?? null;
    const price = q?.price ?? null;
    const dayUsd = q && h.shares != null ? (q.price - q.prevClose) * h.shares : null;
    const val = price != null && h.shares != null ? price * h.shares : null;
    const c = h.shares != null && h.avgCost != null ? h.shares * h.avgCost : null;
    if (dayUsd != null) day += dayUsd;
    if (val != null) value += val;
    if (c != null) cost += c; else if (h.shares != null) costKnown = false;
    return {
      ticker: h.ticker, shares: h.shares, price, changePct: q?.changePct ?? null, dayUsd,
      totalUsd: val != null && c != null ? val - c : null,
      totalPct: val != null && c ? ((val - c) / c) * 100 : null,
      value: val,
    };
  });
  const withDay = rows.filter((r) => r.dayUsd != null);
  const sorted = [...withDay].sort((a, b) => (b.dayUsd as number) - (a.dayUsd as number));
  const prevValue = value - day;
  return {
    rows,
    dayUsd: day,
    dayPct: prevValue > 0 ? (day / prevValue) * 100 : null,
    totalUsd: costKnown && cost > 0 ? value - cost : null,
    totalPct: costKnown && cost > 0 ? ((value - cost) / cost) * 100 : null,
    value,
    cost: costKnown && cost > 0 ? cost : null,
    best: sorted[0] ?? null,
    worst: sorted.length > 1 ? sorted[sorted.length - 1] : null,
  };
}

// ---------------------------------------------------------------------------
// Week ahead: earnings for your stocks plus any market events in data/events.json.
// ---------------------------------------------------------------------------

export interface WeekEvent {
  date: string;
  title: string;
  impact: 'High' | 'Medium' | 'Low';
  why: string;
  affects: string;
}

export async function getWeekAhead(tickers: string[]): Promise<WeekEvent[]> {
  const from = isoDate(new Date());
  const to = isoDate(new Date(Date.now() + 8 * 86400000));
  const earnings = await market.getEarnings(from, to);
  const mine = new Set(tickers);
  const big = new Set(UNIVERSE_TICKERS);
  const list: WeekEvent[] = earnings
    .filter((e) => mine.has(e.ticker) || big.has(e.ticker))
    .map((e) => ({
      date: e.date,
      title: `${e.ticker} earnings${e.hour === 'bmo' ? ' (before open)' : e.hour === 'amc' ? ' (after close)' : ''}`,
      impact: mine.has(e.ticker) ? 'High' : 'Low',
      why: mine.has(e.ticker) ? 'You own this stock. Earnings days often bring the biggest price swings of the quarter.' : 'A large company reporting can move its whole sector.',
      affects: mine.has(e.ticker) ? e.ticker : 'Its sector',
    }));
  for (const ev of events as WeekEvent[]) {
    if (ev.date >= from && ev.date <= to) list.push(ev);
  }
  const rank = { High: 0, Medium: 1, Low: 2 };
  return list.sort((a, b) => a.date.localeCompare(b.date) || rank[a.impact] - rank[b.impact]).slice(0, 6);
}

// ---------------------------------------------------------------------------
// Daily job helper: write shared "why it moved" summaries for held stocks.
// ---------------------------------------------------------------------------

export async function heldTickers(): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from('holdings').select('ticker');
  return [...new Set((data ?? []).map((r) => r.ticker as string))];
}
