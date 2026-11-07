// Risk : reward = the possible rise to fair value vs. the possible drop to support.

export type RRVerdict = 'Good' | 'Okay' | 'Poor';

export interface RiskReward {
  riskPct: number;
  rewardPct: number;
  /** Reward divided by risk. 0 when there is no upside. */
  ratio: number;
  verdict: RRVerdict;
  text: string;
}

export function riskReward(price: number, support: number | null, target: number | null): RiskReward | null {
  if (support == null || target == null || !(price > 0)) return null;
  const riskPct = Math.max(0.1, ((price - support) / price) * 100);
  const rewardPct = ((target - price) / price) * 100;
  const ratio = rewardPct > 0 ? rewardPct / riskPct : 0;
  const verdict: RRVerdict = ratio >= 2 ? 'Good' : ratio >= 1 ? 'Okay' : 'Poor';
  return { riskPct, rewardPct, ratio, verdict, text: ratio > 0 ? `1 : ${ratio.toFixed(1)}` : 'No upside' };
}
