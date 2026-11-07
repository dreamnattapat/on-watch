import type { Bar } from '../market/types';
import { clamp } from '../format';
import { sma } from './stage';

// OnWatch's own fear & greed gauge (0 = extreme fear, 100 = extreme greed),
// built from four free signals. Each becomes a 0–100 score and they are averaged.

export interface FearGreed {
  score: number;
  label: string;
  parts: Array<{ name: string; score: number; detail: string }>;
}

export function labelFor(score: number): string {
  if (score < 25) return 'Extreme fear';
  if (score < 45) return 'Fear';
  if (score <= 55) return 'Neutral';
  if (score <= 75) return 'Greed';
  return 'Extreme greed';
}

const scale = (v: number, lo: number, hi: number) => clamp(((v - lo) / (hi - lo)) * 100, 0, 100);

export function fearGreed(spyDaily: Bar[], vixDaily: Bar[], advancingShare: number | null): FearGreed | null {
  const parts: FearGreed['parts'] = [];
  const spy = spyDaily.map((b) => b.close);
  if (spy.length > 126) {
    const ma125 = sma(spy, 125) as number;
    const gap = (spy[spy.length - 1] / ma125 - 1) * 100;
    parts.push({ name: 'S&P 500 vs. its 125-day average', score: scale(gap, -8, 8), detail: `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}%` });
  }
  if (spy.length > 21) {
    const mom = (spy[spy.length - 1] / spy[spy.length - 21] - 1) * 100;
    parts.push({ name: 'One-month momentum', score: scale(mom, -6, 6), detail: `${mom >= 0 ? '+' : ''}${mom.toFixed(1)}%` });
  }
  if (vixDaily.length) {
    const vix = vixDaily[vixDaily.length - 1].close;
    parts.push({ name: 'Volatility (VIX)', score: scale(32 - vix, 0, 20), detail: vix.toFixed(1) });
  }
  if (advancingShare != null) {
    parts.push({ name: 'Large stocks rising today', score: clamp(advancingShare * 100, 0, 100), detail: `${Math.round(advancingShare * 100)}%` });
  }
  if (!parts.length) return null;
  const score = Math.round(parts.reduce((a, b) => a + b.score, 0) / parts.length);
  return { score, label: labelFor(score), parts };
}

/** Score on a past day, for the "yesterday / last week / last month" history. */
export function fearGreedAt(spyDaily: Bar[], vixDaily: Bar[], daysAgo: number): number | null {
  if (spyDaily.length <= daysAgo + 130 || vixDaily.length <= daysAgo) return null;
  const r = fearGreed(spyDaily.slice(0, spyDaily.length - daysAgo), vixDaily.slice(0, vixDaily.length - daysAgo), null);
  return r ? r.score : null;
}
