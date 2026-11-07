import type { CompanyProfile, Metrics } from '../market/types';
import { clamp } from '../format';
import { TYPE_OVERRIDES } from '../universe';

// Valuation that adapts to the kind of company.
// 1. Classify the stock into a type from its sector, growth, margins and dividend.
// 2. Run only the methods that suit that type, with weights.
// 3. Blend them into a fair value and a range, then compare with the price.
// These are deliberately simple, transparent models. They are estimates, not advice.

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

export interface Valuation {
  type: StockType;
  typeWhy: string;
  methods: MethodResult[];
  fair: number | null;
  low: number | null;
  high: number | null;
  verdict: Reading | null;
  upsidePct: number | null;
  /** Reverse-DCF: annual growth the current price assumes, % (when computed). */
  impliedGrowth: number | null;
}

export interface PeerStats {
  /** Median P/E of comparable companies. */
  pe: number | null;
  /** Median price/sales of comparable companies. */
  ps: number | null;
}

const BAND = 0.1; // ±10% around fair value counts as "fair"

export function readingFor(price: number, fair: number | null): Reading | null {
  if (fair == null || !(fair > 0)) return null;
  if (price < fair * (1 - BAND)) return 'Under';
  if (price > fair * (1 + BAND)) return 'Over';
  return 'Fair';
}

export function classify(ticker: string, profile: CompanyProfile | null, m: Metrics): { type: StockType; why: string } {
  const industry = (profile?.industry ?? '').toLowerCase();
  const growth = m.revenueGrowth ?? 0;
  const epsGrowth = m.epsGrowth ?? 0;
  const margin = m.netMargin ?? 0;
  const dy = m.dividendYield ?? 0;
  const override = TYPE_OVERRIDES[ticker] as StockType | undefined;
  const why: Record<StockType, string> = {
    'Fast-growing': 'Sales or profits are growing quickly. Plain P/E would punish that growth, so we lean on PEG and future earnings.',
    'Steady & profitable': 'A mature business with steady profits. Its own history and its cash flows are the most reliable guide.',
    'High growth, low profit': 'Profits are small compared with the share price, so P/E isn’t meaningful. We value it on sales and ask what growth today’s price assumes.',
    'Mixed business': 'Several very different businesses under one roof. We combine a cash-flow view with sales and earnings comparisons.',
    'Bank': 'For banks, debt is the raw material, so cash-flow models don’t fit. We compare price with book value and returns.',
    'Cyclical': 'Profits swing with the economic cycle. We use average earnings over several years instead of this year’s figure.',
    'Dividend payer': 'Most of the return comes from dividends, so we value the dividend stream directly.',
    'Turnaround': 'Profits are shrinking or negative right now. We use sales and book value, which are more stable than earnings.',
  };
  let type: StockType;
  if (override) type = override;
  else if (/bank/.test(industry)) type = 'Bank';
  else if ((m.eps ?? 0) <= 0 || epsGrowth < -5) type = growth > 15 ? 'High growth, low profit' : 'Turnaround';
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
    // Growth fades in a straight line from g1 to the terminal rate over the period.
    const g = y <= 5 ? g1 : g1 + ((terminal - g1) * (y - 5)) / (years - 5);
    cash *= 1 + g;
    pv += cash / Math.pow(1 + discount, y);
  }
  const tv = (cash * (1 + terminal)) / (discount - terminal);
  pv += tv / Math.pow(1 + discount, years);
  return pv;
}

/** Growth rate (% a year for 5 years) that makes the DCF equal today's price. */
export function impliedGrowth(price: number, base: number | null, discount = 0.09): number | null {
  if (base == null || !(base > 0)) return null;
  let lo = -10, hi = 80;
  const f = (g: number) => {
    // Unclamped variant so high growth rates can be searched.
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

export function valueStock(ticker: string, price: number, profile: CompanyProfile | null, m: Metrics, peers: PeerStats): Valuation {
  const { type, why } = classify(ticker, profile, m);
  const growth = m.epsGrowth ?? m.revenueGrowth ?? 5;
  const discount = (m.beta ?? 1) > 1.4 ? 0.10 : 0.09;
  const eps = m.eps != null && m.eps > 0 ? m.eps : null;
  const cashBase = m.fcfPerShare != null && m.fcfPerShare > 0 ? m.fcfPerShare : eps;

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
    sales: { key: 'sales', name: 'Price/sales vs. peers', note: 'Value per dollar of sales at similar companies',
      fair: m.salesPerShare && peers.ps ? m.salesPerShare * peers.ps : null },
    pb: { key: 'pb', name: 'Price-to-book vs. returns', note: 'Book value, scaled by return on equity',
      fair: m.bookValuePerShare && m.roe != null ? m.bookValuePerShare * clamp(m.roe / 10, 0.5, 3) : null },
    cycle: { key: 'cycle', name: 'P/E on average earnings', note: 'Earnings averaged over the cycle, at peers’ P/E',
      fair: m.epsAvg5y && m.epsAvg5y > 0 && peers.pe ? m.epsAvg5y * Math.min(peers.pe, 25) : null },
    ddm: { key: 'ddm', name: 'Dividend model', note: 'Value of future dividends in today’s money',
      fair: m.dividendPerShare && m.dividendPerShare > 0
        ? (m.dividendPerShare * (1 + clamp(growth, 0, 5) / 100)) / (0.08 - clamp(growth, 0, 5) / 100)
        : null },
  };

  const plans: Record<StockType, Array<[string, number]>> = {
    'Fast-growing': [['peg', 0.4], ['fwdPeers', 0.3], ['dcf', 0.3]],
    'Steady & profitable': [['peHist', 0.4], ['dcf', 0.4], ['peers', 0.2]],
    'High growth, low profit': [['sales', 0.6], ['dcf', 0.4]],
    'Mixed business': [['dcf', 0.5], ['peers', 0.25], ['sales', 0.25]],
    'Bank': [['pb', 0.6], ['peHist', 0.4]],
    'Cyclical': [['cycle', 0.5], ['dcf', 0.3], ['pb', 0.2]],
    'Dividend payer': [['ddm', 0.5], ['peHist', 0.3], ['dcf', 0.2]],
    'Turnaround': [['sales', 0.6], ['pb', 0.4]],
  };

  const methods: MethodResult[] = plans[type].map(([k, w]) => {
    const r = all[k];
    const fair = r.fair != null && Number.isFinite(r.fair) && r.fair > 0 ? r.fair : null;
    return { ...r, fair, weight: w, reading: readingFor(price, fair) };
  });

  const usable = methods.filter((x) => x.fair != null);
  const wsum = usable.reduce((a, b) => a + b.weight, 0);
  const fair = wsum > 0 ? usable.reduce((a, b) => a + (b.fair as number) * b.weight, 0) / wsum : null;

  // Show each method's real share of the blend after missing ones drop out.
  methods.forEach((x) => { x.weight = x.fair != null && wsum > 0 ? x.weight / wsum : 0; });

  let ig: number | null = null;
  if (type === 'High growth, low profit' || type === 'Fast-growing') {
    ig = impliedGrowth(price, cashBase, discount);
    if (ig != null) {
      const expected = Math.max(growth, 1);
      methods.push({
        key: 'reverse', name: 'Reverse DCF', note: 'Growth the price assumes, vs. recent growth', weight: 0, fair: null,
        text: `Needs ${Math.round(ig)}%/yr`,
        reading: ig > expected * 1.5 ? 'Over' : ig < expected * 0.75 ? 'Under' : 'Fair',
      });
    }
  }

  let low: number | null = null, high: number | null = null;
  if (fair != null) {
    const vals = usable.map((x) => x.fair as number);
    low = Math.min(fair * (1 - BAND), ...vals.filter((v) => v > fair * 0.6));
    high = Math.max(fair * (1 + BAND), ...vals.filter((v) => v < fair * 1.6));
  }

  return {
    type, typeWhy: why, methods, fair, low, high,
    verdict: readingFor(price, fair),
    upsidePct: fair != null ? (fair / price - 1) * 100 : null,
    impliedGrowth: ig,
  };
}
