import type { CompanyProfile, Metrics } from '../market/types';
import { clamp } from '../format';
import { TYPE_OVERRIDES } from '../universe';

// Valuation that adapts to the kind of company.
// 1. Classify the stock into a type from its sector, growth, margins and dividend.
// 2. Run only the methods that suit that type, with weights.
// 3. For growth companies, value bear / base / bull scenarios with a revenue
//    DCF, and work out what growth today's price already assumes.
// 4. Blend into a fair value and range, rate our confidence, and compare with
//    the price. These are transparent models: estimates, not advice.

export type StockType =
  | 'Fast-growing'
  | 'Steady & profitable'
  | 'High growth, low profit'
  | 'Mixed business'
  | 'Bank'
  | 'Cyclical'
  | 'Dividend payer'
  | 'Turnaround';

export const STOCK_TYPES: StockType[] = [
  'Fast-growing', 'Steady & profitable', 'High growth, low profit', 'Mixed business',
  'Bank', 'Cyclical', 'Dividend payer', 'Turnaround',
];

export type Reading = 'Under' | 'Fair' | 'Over';
export type Confidence = 'High' | 'Medium' | 'Low';

export interface MethodResult {
  key: string;
  name: string;
  note: string;
  /** Weight in the blend, 0–1. 0 means "shown as a check, not blended". */
  weight: number;
  fair: number | null;
  /** Display text when the result is not a price (e.g. reverse DCF). */
  text?: string;
  reading: Reading | null;
}

export interface Scenario {
  name: 'Bear' | 'Base' | 'Bull';
  /** Revenue growth in year 1, % (fades to 3% by year 10). */
  growth: number;
  /** Net profit margin reached by year 7, %. */
  margin: number;
  value: number | null;
}

export interface Valuation {
  type: StockType;
  typeWhy: string;
  methods: MethodResult[];
  fair: number | null;
  low: number | null;
  high: number | null;
  verdict: Reading | null;
  /** Plain-English verdict, e.g. "Priced for optimism". */
  verdictText: string;
  upsidePct: number | null;
  confidence: Confidence;
  confidenceWhy: string;
  scenarios: Scenario[] | null;
  /** Reverse DCF: yearly revenue growth today's price assumes, % (growth companies). */
  impliedGrowth: number | null;
  /** The growth rate we used as "recent growth", %. */
  recentGrowth: number | null;
  /** Margin assumed when working out implied growth, %. */
  targetMargin: number | null;
}

export interface PeerStats {
  /** Median P/E of comparable companies. */
  pe: number | null;
  /** Median price/sales of comparable companies. */
  ps: number | null;
  /** Median revenue growth of comparable companies, %. */
  growth: number | null;
  /** Where the peers came from, for display. */
  source?: string;
}

const BAND = 0.1; // ±10% around fair value counts as "fair"

export function readingFor(price: number, fair: number | null): Reading | null {
  if (fair == null || !(fair > 0)) return null;
  if (price < fair * (1 - BAND)) return 'Under';
  if (price > fair * (1 + BAND)) return 'Over';
  return 'Fair';
}

/** A realistic long-run net margin for a mature company in this industry, %. */
export function targetMarginFor(industry: string, grossMargin: number | null): number {
  const i = industry.toLowerCase();
  let m = 12;
  if (/software|internet|interactive|media/.test(i)) m = 22;
  else if (/semiconductor/.test(i)) m = 22;
  else if (/pharma|biotech/.test(i)) m = 20;
  else if (/technology|hardware|electronic|communications/.test(i)) m = 15;
  else if (/aerospace|defense|machinery|industrial/.test(i)) m = 12;
  else if (/automobile|airline/.test(i)) m = 8;
  else if (/retail|food|distribution/.test(i)) m = 5;
  // A thin gross margin caps how profitable the business can become.
  if (grossMargin != null && grossMargin > 0) m = Math.min(m, grossMargin * 0.45);
  return clamp(m, 3, 30);
}

/** Best estimate of current revenue growth, % per year, from the fields we have. */
export function recentRevenueGrowth(m: Metrics): number | null {
  const vals = [m.revenueGrowth, m.revenueGrowthQ, m.revenueGrowth3y].filter((v): v is number => v != null && Number.isFinite(v));
  if (!vals.length) return null;
  // Lean on the latest figures but smooth one-off quarters.
  const w = [0.45, 0.35, 0.2].slice(0, vals.length);
  const ws = w.reduce((a, b) => a + b, 0);
  return vals.reduce((a, v, i) => a + v * w[i], 0) / ws;
}

export function classify(ticker: string, profile: CompanyProfile | null, m: Metrics): { type: StockType; why: string } {
  const industry = (profile?.industry ?? '').toLowerCase();
  const growth = recentRevenueGrowth(m) ?? 0;
  const epsGrowth = m.epsGrowth ?? 0;
  const margin = m.netMargin ?? 0;
  const dy = m.dividendYield ?? 0;
  const override = TYPE_OVERRIDES[ticker] as StockType | undefined;
  const why: Record<StockType, string> = {
    'Fast-growing': 'Sales or profits are growing quickly. Plain P/E would punish that growth, so we lean on PEG, future earnings and growth-based cash flows.',
    'Steady & profitable': 'A mature business with steady profits. Its own history and its cash flows are the most reliable guide.',
    'High growth, low profit': 'Little or no profit yet, so P/E isn’t meaningful. We project revenue forward with margins rising to a normal level for its industry, test bear, base and bull cases, and ask what growth today’s price assumes.',
    'Mixed business': 'Several very different businesses under one roof. We combine a cash-flow view with sales and earnings comparisons.',
    'Bank': 'For banks, debt is the raw material, so cash-flow models don’t fit. We compare price with book value and returns.',
    'Cyclical': 'Profits swing with the economic cycle. We use average earnings over several years instead of this year’s figure.',
    'Dividend payer': 'Most of the return comes from dividends, so we value the dividend stream directly.',
    'Turnaround': 'Profits are shrinking or negative and growth is slow. We use sales and book value, which are more stable than earnings.',
  };
  let type: StockType;
  if (override) type = override;
  else if (/bank/.test(industry)) type = 'Bank';
  else if ((m.eps ?? 0) <= 0 || (m.netMargin != null && margin < 3)) type = growth >= 12 ? 'High growth, low profit' : 'Turnaround';
  else if (margin < 8 && (m.pe ?? 0) > 80) type = 'High growth, low profit';
  else if (growth >= 15 || epsGrowth >= 20) type = 'Fast-growing';
  else if (/energy|oil|gas|metal|mining|chemical|semiconductor|automobile|airline|steel/.test(industry)) type = 'Cyclical';
  else if (dy >= 3) type = 'Dividend payer';
  else type = 'Steady & profitable';
  return { type, why: why[type] };
}

/** Two-stage discounted cash flow per share. Returns null without a positive base. */
export function dcf(base: number | null, growthPct: number, discount = 0.09, years = 10, terminal = 0.03): number | null {
  if (base == null || !(base > 0)) return null;
  const g1 = clamp(growthPct, -5, 30) / 100;
  let cash = base;
  let pv = 0;
  for (let y = 1; y <= years; y++) {
    const g = y <= 5 ? g1 : g1 + ((terminal - g1) * (y - 5)) / (years - 5);
    cash *= 1 + g;
    pv += cash / Math.pow(1 + discount, y);
  }
  pv += ((cash * (1 + terminal)) / (discount - terminal)) / Math.pow(1 + discount, years);
  return pv;
}

/** Growth rate (% a year for 5 years) that makes the earnings DCF equal today's price. */
export function impliedGrowth(price: number, base: number | null, discount = 0.09): number | null {
  if (base == null || !(base > 0)) return null;
  let lo = -10, hi = 80;
  const f = (g: number) => {
    let cash = base, pv = 0;
    for (let y = 1; y <= 10; y++) {
      const gr = y <= 5 ? g / 100 : g / 100 + ((0.03 - g / 100) * (y - 5)) / 5;
      cash *= 1 + gr;
      pv += cash / Math.pow(1 + discount, y);
    }
    return pv + (cash * 1.03) / (discount - 0.03) / Math.pow(1 + discount, 10);
  };
  if (f(hi) < price) return hi;
  if (f(lo) > price) return lo;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < price) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Revenue-based DCF for companies with little or no profit yet.
 * Revenue grows at `growthPct` for 3 years, then slows in a straight line to 3% by year 10.
 * Net margin moves from today's level to `targetMarginPct` by year 7.
 * Early losses count against the value. Returns per-share value or null.
 */
export function revenueDcf(salesPerShare: number | null, growthPct: number, marginNowPct: number, targetMarginPct: number, discount = 0.11): number | null {
  if (salesPerShare == null || !(salesPerShare > 0)) return null;
  const g0 = clamp(growthPct, -10, 120) / 100;
  const m0 = clamp(marginNowPct, -60, 60) / 100;
  const mT = targetMarginPct / 100;
  let rev = salesPerShare;
  let pv = 0;
  let cash = 0;
  for (let y = 1; y <= 10; y++) {
    const g = y <= 3 ? g0 : g0 + ((0.03 - g0) * (y - 3)) / 7;
    rev *= 1 + g;
    const margin = y >= 7 ? mT : m0 + ((mT - m0) * y) / 7;
    cash = rev * margin;
    pv += cash / Math.pow(1 + discount, y);
  }
  if (cash <= 0) return null;
  pv += ((cash * 1.03) / (discount - 0.03)) / Math.pow(1 + discount, 10);
  return pv > 0 ? pv : null;
}

/** First-year revenue growth (%) that makes the revenue DCF equal today's price. */
export function impliedRevenueGrowth(price: number, salesPerShare: number | null, marginNowPct: number, targetMarginPct: number, discount = 0.11): number | null {
  if (salesPerShare == null || !(salesPerShare > 0)) return null;
  const f = (g: number) => revenueDcf(salesPerShare, g, marginNowPct, targetMarginPct, discount) ?? 0;
  let lo = 0, hi = 120;
  if (f(hi) < price) return hi;
  if (f(lo) > price) return 0;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < price) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function valueStock(ticker: string, price: number, profile: CompanyProfile | null, m: Metrics, peers: PeerStats): Valuation {
  const { type, why } = classify(ticker, profile, m);
  const industry = profile?.industry ?? '';
  const revGrowth = recentRevenueGrowth(m);
  const growth = m.epsGrowth ?? revGrowth ?? 5;
  const beta = m.beta ?? 1;
  const discount = beta > 1.4 ? 0.10 : 0.09;
  const eps = m.eps != null && m.eps > 0 ? m.eps : null;
  const cashBase = m.fcfPerShare != null && m.fcfPerShare > 0 ? m.fcfPerShare : eps;
  const marginNow = m.netMargin ?? 0;
  const tMargin = targetMarginFor(industry, m.grossMargin);
  const growthDiscount = beta > 1.6 || marginNow < 0 ? 0.12 : 0.11;

  // Price/sales adjusted for growth: a company growing twice as fast as its
  // peers deserves a higher multiple (capped between 0.5× and 2.5× peers).
  const psAdj = peers.ps && revGrowth != null
    ? peers.ps * clamp(peers.growth && peers.growth > 2 ? revGrowth / peers.growth : 1 + revGrowth / 40, 0.5, 2.5)
    : null;

  // Bear / base / bull for growth companies.
  const scenarioInputs: Array<[Scenario['name'], number, number, number]> = revGrowth != null ? [
    ['Bear', revGrowth * 0.7, tMargin * 0.85, growthDiscount + 0.01],
    ['Base', revGrowth, tMargin, growthDiscount],
    ['Bull', Math.min(revGrowth * 1.4, 120), Math.min(tMargin * 1.3, 35), growthDiscount - 0.01],
  ] : [];
  const scenarios: Scenario[] = scenarioInputs.map(([name, g, mg, r]) => ({
    name, growth: g, margin: mg, value: revenueDcf(m.salesPerShare, g, marginNow, mg, r),
  }));

  const all: Record<string, Omit<MethodResult, 'weight' | 'reading'>> = {
    peg: { key: 'peg', name: 'PEG-based value', note: 'P/E adjusted for how fast profits grow',
      fair: eps ? eps * clamp(growth, 8, 40) : null },
    fwdPeers: { key: 'fwdPeers', name: 'Forward P/E vs. peers', note: 'Next year’s earnings at similar companies’ P/E',
      fair: eps && peers.pe ? eps * (1 + clamp(growth, 0, 40) / 100) * peers.pe : null },
    peers: { key: 'peers', name: 'P/E vs. peers', note: 'Earnings at similar companies’ P/E',
      fair: eps && peers.pe ? eps * peers.pe : null },
    peHist: { key: 'peHist', name: 'P/E vs. its 5-year average', note: 'Is it pricier than it usually is?',
      fair: eps && m.peHistoryAvg ? eps * m.peHistoryAvg : null },
    dcf: { key: 'dcf', name: 'Cash-flow model (DCF)', note: 'Future cash flows in today’s money',
      fair: dcf(cashBase, growth, discount) },
    revDcf: { key: 'revDcf', name: 'Revenue-based DCF (base case)', note: `Revenue growth of ${Math.round(revGrowth ?? 0)}% for 3 years, slowing to 3%; margin rising to ${Math.round(tMargin)}%`,
      fair: scenarios.find((s) => s.name === 'Base')?.value ?? null },
    salesAdj: { key: 'salesAdj', name: 'Price/sales vs. peers, growth-adjusted', note: 'Sales at peers’ multiple, scaled for faster or slower growth',
      fair: m.salesPerShare && psAdj ? m.salesPerShare * psAdj : null },
    sales: { key: 'sales', name: 'Price/sales vs. peers', note: 'Value per dollar of sales at similar companies',
      fair: m.salesPerShare && peers.ps ? m.salesPerShare * peers.ps : null },
    pb: { key: 'pb', name: 'Price-to-book vs. returns', note: 'Book value, scaled by return on equity',
      fair: m.bookValuePerShare && m.roe != null && m.roe > 0 ? m.bookValuePerShare * clamp(m.roe / 10, 0.5, 3) : null },
    cycle: { key: 'cycle', name: 'P/E on average earnings', note: 'Earnings averaged over the cycle, at peers’ P/E',
      fair: m.epsAvg5y && m.epsAvg5y > 0 && peers.pe ? m.epsAvg5y * Math.min(peers.pe, 25) : null },
    ddm: { key: 'ddm', name: 'Dividend model', note: 'Value of future dividends in today’s money',
      fair: m.dividendPerShare && m.dividendPerShare > 0
        ? (m.dividendPerShare * (1 + clamp(growth, 0, 5) / 100)) / (0.08 - clamp(growth, 0, 5) / 100)
        : null },
  };

  const plans: Record<StockType, Array<[string, number]>> = {
    'Fast-growing': [['peg', 0.3], ['fwdPeers', 0.25], ['dcf', 0.25], ['revDcf', 0.2]],
    'Steady & profitable': [['peHist', 0.4], ['dcf', 0.4], ['peers', 0.2]],
    'High growth, low profit': [['revDcf', 0.6], ['salesAdj', 0.4]],
    'Mixed business': [['dcf', 0.4], ['revDcf', 0.2], ['peers', 0.2], ['salesAdj', 0.2]],
    'Bank': [['pb', 0.6], ['peHist', 0.4]],
    'Cyclical': [['cycle', 0.5], ['dcf', 0.3], ['pb', 0.2]],
    'Dividend payer': [['ddm', 0.5], ['peHist', 0.3], ['dcf', 0.2]],
    'Turnaround': [['salesAdj', 0.5], ['pb', 0.3], ['revDcf', 0.2]],
  };

  const methods: MethodResult[] = plans[type].map(([k, w]) => {
    const r = all[k];
    const fair = r.fair != null && Number.isFinite(r.fair) && r.fair > 0 ? r.fair : null;
    return { ...r, fair, weight: w, reading: readingFor(price, fair) };
  });

  const usable = methods.filter((x) => x.fair != null);
  const wsum = usable.reduce((a, b) => a + b.weight, 0);
  const fair = wsum > 0 ? usable.reduce((a, b) => a + (b.fair as number) * b.weight, 0) / wsum : null;
  methods.forEach((x) => { x.weight = x.fair != null && wsum > 0 ? x.weight / wsum : 0; });

  // Reverse DCF: what growth does today's price assume?
  const growthType = type === 'High growth, low profit' || type === 'Fast-growing' || type === 'Turnaround';
  let ig: number | null = null;
  if (growthType && m.salesPerShare) {
    ig = impliedRevenueGrowth(price, m.salesPerShare, marginNow, tMargin, growthDiscount);
    if (ig != null && revGrowth != null) {
      const expected = Math.max(revGrowth, 1);
      methods.push({
        key: 'reverse', name: 'Reverse DCF', note: `Revenue growth the price assumes, vs. ${Math.round(revGrowth)}% recently`, weight: 0, fair: null,
        text: ig >= 119 ? 'Needs 120%+/yr' : `Needs ${Math.round(ig)}%/yr`,
        reading: ig > expected * 1.3 ? 'Over' : ig < expected * 0.75 ? 'Under' : 'Fair',
      });
    }
  } else if (type === 'Fast-growing') {
    ig = impliedGrowth(price, cashBase, discount);
  }

  // Range and verdict. Growth companies use the bear–bull spread.
  const sc = scenarios.length === 3 && scenarios.every((s) => s.value != null) ? scenarios : null;
  const useScenarios = type === 'High growth, low profit' && sc != null;
  let low: number | null = null, high: number | null = null;
  if (useScenarios) {
    low = Math.min(sc![0].value!, fair ?? Infinity);
    high = Math.max(sc![2].value!, fair ?? 0);
  } else if (fair != null) {
    const vals = usable.map((x) => x.fair as number);
    low = Math.min(fair * (1 - BAND), ...vals.filter((v) => v > fair * 0.6));
    high = Math.max(fair * (1 + BAND), ...vals.filter((v) => v < fair * 1.6));
  }

  let verdict = readingFor(price, fair);
  let verdictText = verdict === 'Under' ? 'Undervalued' : verdict === 'Over' ? 'Overvalued' : verdict === 'Fair' ? 'Fairly valued' : 'Not enough data';
  if (useScenarios && fair != null) {
    const bull = sc![2].value!, bear = sc![0].value!;
    if (price < bear) { verdict = 'Under'; verdictText = 'Undervalued, even in the bear case'; }
    else if (price <= fair * (1 + BAND)) { verdict = price < fair * (1 - BAND) ? 'Under' : 'Fair'; verdictText = verdict === 'Under' ? 'Undervalued' : 'Fairly valued'; }
    else if (price <= bull * (1 + BAND)) { verdict = 'Over'; verdictText = 'Priced for optimism'; }
    else { verdict = 'Over'; verdictText = 'Priced above even the bull case'; }
  }

  // Confidence: how much data we had, and how much the methods agree.
  let confidence: Confidence = 'High';
  let confidenceWhy = 'Several methods agree closely.';
  const vals = usable.map((x) => x.fair as number);
  const spread = vals.length > 1 ? Math.max(...vals) / Math.min(...vals) : 1;
  if (usable.length <= 1) { confidence = 'Low'; confidenceWhy = 'Only one method had enough data.'; }
  else if (type === 'High growth, low profit' || type === 'Turnaround') {
    confidence = 'Low';
    confidenceWhy = 'Without steady profits, value depends heavily on future growth and margins. Small changes in those move the estimate a lot.';
  } else if (spread > 2) { confidence = 'Low'; confidenceWhy = 'The methods disagree a lot, so treat this as a rough guide.'; }
  else if (spread > 1.4 || usable.length < methods.filter((x) => x.key !== 'reverse').length) {
    confidence = 'Medium'; confidenceWhy = spread > 1.4 ? 'The methods give somewhat different answers.' : 'Some methods lacked data.';
  }

  return {
    type, typeWhy: why, methods, fair, low, high, verdict, verdictText,
    upsidePct: fair != null ? (fair / price - 1) * 100 : null,
    confidence, confidenceWhy,
    scenarios: sc && (type === 'High growth, low profit' || type === 'Fast-growing' || type === 'Turnaround') ? sc : null,
    impliedGrowth: ig, recentGrowth: revGrowth, targetMargin: tMargin,
  };
}
