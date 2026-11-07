import type { StockAnalysis, PortfolioSummary, WeekEvent } from './data';
import { pct, signedMoney } from './format';

// The 2-minute brief: a headline, one paragraph, and up to three stories,
// picked by what matters most to this person's stocks today.

export interface BriefStory {
  ticker: string;
  tag: string;
  title: string;
  body: string;
}

export interface Brief {
  headline: string;
  lead: string;
  stories: BriefStory[];
}

export function buildBrief(stocks: StockAnalysis[], pf: PortfolioSummary, week: WeekEvent[], marketPct: number | null): Brief {
  const moves = stocks.filter((s) => s.quote).map((s) => ({ s, ch: s.quote!.changePct }));
  if (!moves.length) {
    return { headline: 'Add your first stock', lead: 'Your brief appears here once you add the stocks you own.', stories: [] };
  }
  const best = [...moves].sort((a, b) => b.ch - a.ch)[0];
  const worst = [...moves].sort((a, b) => a.ch - b.ch)[0];
  let headline: string;
  if (moves.every((m) => Math.abs(m.ch) < 1)) headline = 'A quiet day for your stocks';
  else if (best.ch > 0 && worst.ch < 0 && best.s.ticker !== worst.s.ticker) headline = `${best.s.ticker} leads, ${worst.s.ticker} lags`;
  else if (best.ch > 0) headline = `${best.s.ticker} leads a strong day`;
  else headline = `A tough day, led lower by ${worst.s.ticker}`;

  const mineEvents = week.filter((e) => stocks.some((s) => e.affects.includes(s.ticker)));
  const parts: string[] = [];
  if (pf.dayPct != null) {
    parts.push(`Your stocks are ${pf.dayPct >= 0 ? 'up' : 'down'} ${pct(Math.abs(pf.dayPct)).replace('+', '')} today (${signedMoney(pf.dayUsd)})${marketPct != null ? `, against ${pct(marketPct)} for the S&P 500` : ''}.`);
  }
  if (mineEvents.length) parts.push(`${mineEvents.length === 1 ? 'One of your stocks has' : `${mineEvents.length} of your stocks have`} a big event this week.`);
  const bearish = stocks.filter((s) => s.mood?.label === 'Bearish');
  if (bearish.length) parts.push(`The crowd has turned sour on ${bearish.map((s) => s.ticker).join(' and ')}.`);
  parts.push('Here is what matters, and nothing you don’t need.');

  const stories: BriefStory[] = [];
  const used = new Set<string>();
  const add = (st: BriefStory) => { if (!used.has(st.ticker) && stories.length < 3) { stories.push(st); used.add(st.ticker); } };

  for (const e of mineEvents) {
    const t = stocks.find((s) => e.affects.includes(s.ticker));
    if (t) add({ ticker: t.ticker, tag: 'Event', title: e.title, body: e.why });
  }
  for (const m of [...moves].sort((a, b) => Math.abs(b.ch) - Math.abs(a.ch))) {
    if (Math.abs(m.ch) < 1.5) break;
    add({ ticker: m.s.ticker, tag: `${m.ch > 0 ? 'Up' : 'Down'} ${pct(Math.abs(m.ch)).replace('+', '')}`, title: m.s.why?.drivers[0]?.title ?? m.s.why?.headline ?? 'A big move today', body: m.s.why?.drivers[0]?.detail ?? '' });
  }
  for (const s of bearish) add({ ticker: s.ticker, tag: 'Mood shift', title: 'The crowd turns sour', body: `${s.mood!.bullPct}% of recent posts lean bullish. That’s mood, not news, but worth knowing.` });
  for (const s of stocks.filter((x) => x.valuation?.verdict === 'Under')) {
    add({ ticker: s.ticker, tag: 'Value', title: 'Trading below fair value', body: `Our estimate puts fair value about ${pct(s.valuation!.upsidePct)} above today’s price.` });
  }
  return { headline, lead: parts.join(' '), stories };
}
