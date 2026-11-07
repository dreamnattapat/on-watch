import type { Bar } from '../market/types';

// Stan Weinstein's four stages, from weekly bars and the 30-week moving average.

export type Stage = 1 | 2 | 3 | 4;

export const STAGE_NAMES: Record<Stage, string> = { 1: 'Basing', 2: 'Advancing', 3: 'Topping', 4: 'Declining' };

export const STAGE_MEANING: Record<Stage, string> = {
  1: 'Moving sideways after a decline. A break above the top of its range on strong volume would signal a new uptrend.',
  2: 'A healthy uptrend, where long-term holders make most of their gains. A weekly close below the 30-week average would be the first warning.',
  3: 'The uptrend is losing steam and the 30-week average is flattening. Not a sell signal alone, but a reason to stop adding until the trend is clear.',
  4: 'A downtrend. Prices often keep falling in Stage 4. Many investors wait for a new Stage 1 base before buying more.',
};

export interface StageResult {
  stage: Stage;
  checks: { aboveAvg: boolean; avgRising: boolean; volumeOnUp: boolean; beatsIndex: boolean };
  sma30: number;
}

export function sma(values: number[], n: number, endIndex = values.length - 1): number | null {
  if (endIndex + 1 < n) return null;
  let s = 0;
  for (let i = endIndex - n + 1; i <= endIndex; i++) s += values[i];
  return s / n;
}

export function analyzeStage(bars: Bar[], benchmark: Bar[]): StageResult | null {
  if (bars.length < 40) return null;
  const closes = bars.map((b) => b.close);
  const last = closes.length - 1;
  const price = closes[last];
  const ma = sma(closes, 30) as number;
  const ma4 = sma(closes, 30, last - 4) as number;
  const ma26 = sma(closes, 30, Math.max(29, last - 26));
  const slope = (ma / ma4 - 1) * 100;
  const priorTrend = ma26 ? (ma4 / ma26 - 1) * 100 : 0;

  // Volume: are up weeks heavier than down weeks over the last 10 weeks?
  let upV = 0, upN = 0, dnV = 0, dnN = 0;
  for (let i = Math.max(1, last - 9); i <= last; i++) {
    if (closes[i] >= closes[i - 1]) { upV += bars[i].volume; upN++; } else { dnV += bars[i].volume; dnN++; }
  }
  const volumeOnUp = upN > 0 && (dnN === 0 || upV / upN > dnV / dnN);

  // Relative strength vs. the index over ~26 weeks.
  let beatsIndex = false;
  if (benchmark.length > 27 && last > 26) {
    const b = benchmark.map((x) => x.close);
    const stockRet = price / closes[last - 26];
    const idxRet = b[b.length - 1] / b[b.length - 27];
    beatsIndex = stockRet > idxRet;
  }

  const aboveAvg = price > ma;
  const avgRising = slope > 0.5;
  const avgFalling = slope < -0.5;

  // A stalled price hugging a still-rising average after a long climb is a top forming.
  const momentum13 = (price / closes[Math.max(0, last - 13)] - 1) * 100;
  const stalled = Math.abs(momentum13) < 3 && Math.abs(price / ma - 1) < 0.05 && priorTrend > 5;

  let stage: Stage;
  if (aboveAvg && avgRising && !stalled) stage = 2;
  else if (!aboveAvg && avgFalling) stage = 4;
  else stage = priorTrend > 5 ? 3 : 1;

  return { stage, checks: { aboveAvg, avgRising, volumeOnUp, beatsIndex }, sma30: ma };
}

/** Nearest support below the price: the 30-week average or a recent swing low. */
export function findSupport(bars: Bar[], price: number): number | null {
  if (bars.length < 14) return null;
  const closes = bars.map((b) => b.close);
  const candidates = [
    sma(closes, 30),
    Math.min(...bars.slice(-13).map((b) => b.low)),
    Math.min(...bars.slice(-26).map((b) => b.low)),
  ].filter((v): v is number => v != null && v < price * 0.995);
  if (!candidates.length) return price * 0.9;
  return Math.max(...candidates);
}
