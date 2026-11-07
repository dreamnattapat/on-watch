import { env } from './config';

// Crowd mood from Reddit's investing communities (free API, optional).
// X, Facebook and Instagram need paid or partner API access; when those are
// added later they can feed the same Mood shape.

export interface Mood {
  bullPct: number;
  posts: number;
  label: 'Bullish' | 'Neutral' | 'Bearish';
  themes: string[];
  sources: string;
}

const BULL = ['buy', 'bull', 'bullish', 'calls', 'long', 'moon', 'beat', 'beats', 'upgrade', 'undervalued', 'breakout', 'rally', 'strong', 'growth', 'record', 'surge', 'soar', 'higher', 'up'];
const BEAR = ['sell', 'bear', 'bearish', 'puts', 'short', 'dump', 'miss', 'misses', 'downgrade', 'overvalued', 'crash', 'weak', 'falling', 'fall', 'drop', 'lawsuit', 'cut', 'cuts', 'lower', 'down', 'bubble'];
const STOP = new Set('the a an and or of to in on for is it its this that with at by from as be are was will what why how i my me you your we they he she them their our just get got has have had do does did not no yes so if than then too very can about into out over after before more most new now today week stock stocks shares share company market price dd yolo'.split(' '));

export function moodLabel(bullPct: number): Mood['label'] {
  return bullPct >= 60 ? 'Bullish' : bullPct <= 42 ? 'Bearish' : 'Neutral';
}

/** Score post titles with a simple word list and pull out the most-mentioned topics. */
export function scoreTitles(ticker: string, titles: string[]): Mood | null {
  if (titles.length < 3) return null;
  let bull = 0, bear = 0;
  const counts = new Map<string, number>();
  for (const t of titles) {
    const words = t.toLowerCase().replace(/[^a-z0-9$ ]/g, ' ').split(/\s+/).filter(Boolean);
    let b = 0, s = 0;
    for (const w of words) {
      if (BULL.includes(w)) b++;
      if (BEAR.includes(w)) s++;
    }
    if (b > s) bull++; else if (s > b) bear++;
    for (let i = 0; i < words.length - 1; i++) {
      const a = words[i], c = words[i + 1];
      if (STOP.has(a) || STOP.has(c) || a.length < 3 || c.length < 3 || a.includes(ticker.toLowerCase()) || c.includes(ticker.toLowerCase())) continue;
      const k = `${a} ${c}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const scored = bull + bear;
  const bullPct = scored ? Math.round((bull / scored) * 100) : 50;
  const themes = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  return { bullPct, posts: titles.length, label: moodLabel(bullPct), themes, sources: 'Reddit' };
}

let token: { value: string; exp: number } | null = null;

async function redditToken(): Promise<string | null> {
  if (!env.redditId || !env.redditSecret) return null;
  if (token && token.exp > Date.now()) return token.value;
  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${env.redditId}:${env.redditSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'OnWatch/1.0',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { access_token: string; expires_in: number };
    token = { value: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
    return token.value;
  } catch {
    return null;
  }
}

export async function getMood(ticker: string): Promise<Mood | null> {
  const tk = await redditToken();
  if (!tk) return null;
  try {
    const q = encodeURIComponent(`"$${ticker}" OR "${ticker}"`);
    const res = await fetch(
      `https://oauth.reddit.com/r/stocks+wallstreetbets+investing+StockMarket/search?q=${q}&restrict_sr=1&sort=new&t=day&limit=100`,
      { headers: { Authorization: `Bearer ${tk}`, 'User-Agent': 'OnWatch/1.0' }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: { children?: Array<{ data: { title: string } }> } };
    const titles = (j.data?.children ?? []).map((c) => c.data.title);
    return scoreTitles(ticker, titles);
  } catch {
    return null;
  }
}
