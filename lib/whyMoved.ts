import Anthropic from '@anthropic-ai/sdk';
import { env } from './config';
import type { NewsItem } from './market/types';
import { pct } from './format';
import type { Mood } from './sentiment';

// "Why it moved today": a headline plus 1–3 ranked drivers.
// With an Anthropic key the daily job asks Claude to write it from the news;
// otherwise a rules-based version is built from news, sector and market moves.

export type DriverWeight = 'Main driver' | 'Contributing' | 'Minor';

export interface Driver {
  title: string;
  weight: DriverWeight;
  detail: string;
  source: string;
}

export interface WhyMoved {
  headline: string;
  drivers: Driver[];
  /** "ai" when written by Claude, "rules" for the template version. */
  by: 'ai' | 'rules';
}

export interface MoveContext {
  ticker: string;
  name: string;
  changePct: number;
  sectorName: string | null;
  sectorChangePct: number | null;
  marketChangePct: number | null;
  news: NewsItem[];
  mood: Mood | null;
}

const dir = (v: number) => (v >= 0 ? 'Up' : 'Down');

/** A short label for what a headline is about, for "Down 5.1% on …". */
export function newsTopic(headline: string): string {
  const h = headline.toLowerCase();
  if (/upgrade|downgrade|price target|analyst|estimate|rating|broker/.test(h)) return 'analyst moves';
  if (/earnings|results|quarter|revenue|guidance|profit|outlook/.test(h)) return 'earnings news';
  if (/price cut|cuts prices|prices|discount/.test(h)) return 'pricing news';
  if (/deal|acquir|merger|buyout|stake/.test(h)) return 'deal news';
  if (/lawsuit|probe|regulat|antitrust|fine|ban|export/.test(h)) return 'legal or policy news';
  if (/spending|capex|invest|data.center|ai /.test(h)) return 'spending plans';
  if (/launch|unveil|product|release/.test(h)) return 'product news';
  return 'company news';
}

export function ruleBasedWhy(c: MoveContext): WhyMoved {
  const move = c.changePct;
  const drivers: Driver[] = [];
  const recent = c.news.filter((n) => Date.now() / 1000 - n.datetime < 36 * 3600).slice(0, 2);
  const sectorSame = c.sectorChangePct != null && Math.sign(c.sectorChangePct) === Math.sign(move) && Math.abs(c.sectorChangePct) >= 0.5;
  const stockSpecific = c.sectorChangePct == null || Math.abs(move) > Math.abs(c.sectorChangePct) * 2;

  recent.forEach((n, i) => {
    drivers.push({
      title: n.headline,
      weight: i === 0 && stockSpecific ? 'Main driver' : 'Contributing',
      detail: n.summary ? n.summary.slice(0, 220) : 'From today’s news coverage.',
      source: n.source,
    });
  });
  if (sectorSame && c.sectorName) {
    drivers.push({
      title: `${c.sectorName} stocks moved together`,
      weight: drivers.length === 0 || !stockSpecific ? 'Main driver' : 'Contributing',
      detail: `The ${c.sectorName.toLowerCase()} sector moved ${pct(c.sectorChangePct)} today, so part of this move was the whole group, not ${c.ticker} alone.`,
      source: 'Market data',
    });
  }
  if (c.marketChangePct != null && Math.abs(c.marketChangePct) >= 0.4 && Math.sign(c.marketChangePct) === Math.sign(move)) {
    drivers.push({
      title: c.marketChangePct > 0 ? 'Broad market up' : 'Broad market down',
      weight: drivers.length === 0 ? 'Main driver' : 'Minor',
      detail: `The S&P 500 moved ${pct(c.marketChangePct)}.`,
      source: 'Market data',
    });
  }
  if (c.mood && c.mood.posts >= 20) {
    drivers.push({
      title: `Crowd mood: ${c.mood.label.toLowerCase()}`,
      weight: 'Minor',
      detail: `${c.mood.bullPct}% of ${c.mood.posts} recent posts leaned bullish. This is mood, not new facts.`,
      source: c.mood.sources,
    });
  }
  if (!drivers.length) {
    drivers.push({ title: 'No clear news', weight: 'Main driver', detail: 'We found no company news today. Small moves like this are often just normal trading.', source: 'Market data' });
  }
  // Keep at most one main driver, and order them.
  let seenMain = false;
  drivers.forEach((d) => { if (d.weight === 'Main driver') { if (seenMain) d.weight = 'Contributing'; seenMain = true; } });
  const order: Record<DriverWeight, number> = { 'Main driver': 0, Contributing: 1, Minor: 2 };
  drivers.sort((a, b) => order[a.weight] - order[b.weight]);

  const main = drivers[0];
  const reason = main.source === 'Market data' ? main.title.toLowerCase() : newsTopic(main.title);
  return { headline: `${dir(move)} ${pct(Math.abs(move)).replace('+', '')} on ${reason}`, drivers: drivers.slice(0, 3), by: 'rules' };
}

export async function aiWhy(c: MoveContext): Promise<WhyMoved | null> {
  if (!env.anthropicKey) return null;
  const client = new Anthropic({ apiKey: env.anthropicKey });
  const news = c.news.slice(0, 8).map((n) => `- ${n.headline} (${n.source}): ${n.summary.slice(0, 300)}`).join('\n') || '- (no company news found)';
  const prompt = `You write for OnWatch, a calm, plain-English stock briefing for everyday investors.
Explain why ${c.name} (${c.ticker}) moved ${pct(c.changePct)} today.
Context: sector ${c.sectorName ?? 'unknown'} ${c.sectorChangePct != null ? pct(c.sectorChangePct) : 'n/a'}; S&P 500 ${c.marketChangePct != null ? pct(c.marketChangePct) : 'n/a'}.
${c.mood ? `Crowd mood on Reddit: ${c.mood.bullPct}% bullish over ${c.mood.posts} posts.` : ''}
Recent news:
${news}

Rules: only use the facts above; never invent numbers or events; if the news doesn't explain it, say so. Separate facts from crowd mood. Short sentences, no jargon, no advice.
Reply with JSON only:
{"headline": "max 8 words, e.g. 'Up 6.2% on earnings hopes'", "drivers": [{"title": "max 8 words", "weight": "Main driver|Contributing|Minor", "detail": "one or two sentences", "source": "where this came from"}]}
Use 1 to 3 drivers, exactly one "Main driver".`;
  try {
    const msg = await client.messages.create({
      model: env.anthropicModel,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as { headline: string; drivers: Driver[] };
    if (!json.headline || !Array.isArray(json.drivers) || !json.drivers.length) return null;
    const weights: DriverWeight[] = ['Main driver', 'Contributing', 'Minor'];
    return {
      headline: String(json.headline).slice(0, 80),
      drivers: json.drivers.slice(0, 3).map((d) => ({
        title: String(d.title).slice(0, 90),
        weight: weights.includes(d.weight) ? d.weight : 'Contributing',
        detail: String(d.detail).slice(0, 400),
        source: String(d.source ?? 'News').slice(0, 60),
      })),
      by: 'ai',
    };
  } catch {
    return null;
  }
}
