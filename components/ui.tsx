import type { Reading } from '@/lib/analysis/valuation';

export function Badge({ kind, children }: { kind: string; children: React.ReactNode }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

const VERDICT: Record<Reading, [string, string]> = {
  Under: ['under', 'Undervalued'],
  Fair: ['fair', 'Fair value'],
  Over: ['over', 'Overvalued'],
};

export function VerdictBadge({ v }: { v: Reading | null }) {
  if (!v) return <span className="small">Not enough data</span>;
  const [k, l] = VERDICT[v];
  return <Badge kind={k}>{l}</Badge>;
}
