import type { Bar } from './types';

// Price history for stage analysis, support levels and the fear & greed gauge.
// Finnhub's free plan no longer includes candles, so we use two free public
// sources: Yahoo Finance's chart endpoint first, then Stooq's CSV as a backup.

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; OnWatch/1.0)' };

export function parseYahooChart(json: unknown): Bar[] {
  const r = (json as { chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<Record<string, Array<number | null>>> } }> } })
    ?.chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0];
  if (!q) return [];
  const bars: Bar[] = [];
  ts.forEach((t, i) => {
    const close = q.close?.[i];
    if (close == null) return;
    bars.push({
      date: new Date(t * 1000).toISOString().slice(0, 10),
      open: q.open?.[i] ?? close,
      high: q.high?.[i] ?? close,
      low: q.low?.[i] ?? close,
      close,
      volume: q.volume?.[i] ?? 0,
    });
  });
  return bars;
}

export function parseStooqCsv(csv: string): Bar[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2 || !/^Date,Open,High,Low,Close/i.test(lines[0])) return [];
  return lines.slice(1).map((l) => {
    const [date, o, h, lo, c, v] = l.split(',');
    return { date, open: +o, high: +h, low: +lo, close: +c, volume: +(v ?? 0) };
  }).filter((b) => Number.isFinite(b.close));
}

async function yahoo(symbol: string, range: string, interval: string): Promise<Bar[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, { headers: UA, next: { revalidate: 21600 } });
    if (!res.ok) return [];
    return parseYahooChart(await res.json());
  } catch {
    return [];
  }
}

async function stooq(symbol: string, interval: 'w' | 'd'): Promise<Bar[]> {
  try {
    const s = symbol.startsWith('^') ? symbol.toLowerCase() : `${symbol.toLowerCase().replace('.', '-')}.us`;
    const res = await fetch(`https://stooq.com/q/d/l/?s=${s}&i=${interval}`, { headers: UA, next: { revalidate: 21600 } });
    if (!res.ok) return [];
    const bars = parseStooqCsv(await res.text());
    return interval === 'w' ? bars.slice(-110) : bars.slice(-260);
  } catch {
    return [];
  }
}

export async function getWeeklyHistory(ticker: string): Promise<Bar[]> {
  const y = await yahoo(ticker.replace('.', '-'), '2y', '1wk');
  if (y.length > 40) return y;
  return stooq(ticker, 'w');
}

export async function getDailyHistory(ticker: string): Promise<Bar[]> {
  const y = await yahoo(ticker.replace('.', '-'), '1y', '1d');
  if (y.length > 100) return y;
  return stooq(ticker, 'd');
}
