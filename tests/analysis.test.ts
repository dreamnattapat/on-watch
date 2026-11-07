import { describe, expect, it } from 'vitest';
import { classify, dcf, impliedGrowth, readingFor, valueStock } from '../lib/analysis/valuation';
import { analyzeStage, findSupport } from '../lib/analysis/stage';
import { riskReward } from '../lib/analysis/riskReward';
import { fearGreed, labelFor } from '../lib/analysis/fearGreed';
import { scoreTitles } from '../lib/sentiment';
import { parseMetrics } from '../lib/market/finnhub';
import { parseStooqCsv, parseYahooChart } from '../lib/market/history';
import { newsTopic, ruleBasedWhy } from '../lib/whyMoved';
import { EMPTY_METRICS, type Bar } from '../lib/market/types';

const bars = (closes: number[], vol = 1e6): Bar[] =>
  closes.map((c, i) => ({ date: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`, open: c, high: c * 1.01, low: c * 0.99, close: c, volume: vol }));
const series = (n: number, start: number, step: number) => Array.from({ length: n }, (_, i) => start * Math.pow(1 + step, i));

describe('valuation', () => {
  it('classifies by sector, growth and dividend', () => {
    const m = { ...EMPTY_METRICS, eps: 5, pe: 20 };
    expect(classify('X', { ticker: 'X', name: 'X', industry: 'Banking', marketCap: 1 }, m).type).toBe('Bank');
    expect(classify('X', null, { ...m, revenueGrowth: 30, netMargin: 20 }).type).toBe('Fast-growing');
    expect(classify('X', null, { ...m, dividendYield: 4, revenueGrowth: 2 }).type).toBe('Dividend payer');
    expect(classify('X', { ticker: 'X', name: 'X', industry: 'Energy', marketCap: 1 }, { ...m, revenueGrowth: 2 }).type).toBe('Cyclical');
    expect(classify('X', null, { ...m, eps: -1, revenueGrowth: 40 }).type).toBe('High growth, low profit');
    expect(classify('AMZN', null, m).type).toBe('Mixed business');
    expect(classify('X', null, { ...m, revenueGrowth: 5, netMargin: 20 }).type).toBe('Steady & profitable');
  });

  it('DCF grows with the growth rate and reverse DCF inverts it', () => {
    const low = dcf(10, 5)!;
    const high = dcf(10, 20)!;
    expect(high).toBeGreaterThan(low);
    const g = impliedGrowth(high, 10)!;
    expect(g).toBeCloseTo(20, 0);
  });

  it('reads under/fair/over with a ±10% band', () => {
    expect(readingFor(80, 100)).toBe('Under');
    expect(readingFor(95, 100)).toBe('Fair');
    expect(readingFor(120, 100)).toBe('Over');
    expect(readingFor(100, null)).toBeNull();
  });

  it('blends methods and renormalises weights when some are missing', () => {
    const m = { ...EMPTY_METRICS, eps: 10, pe: 20, peHistoryAvg: 20, fcfPerShare: 10, epsGrowth: 6, revenueGrowth: 5, netMargin: 20 };
    const v = valueStock('X', 200, null, m, { pe: null, ps: null });
    expect(v.type).toBe('Steady & profitable');
    const used = v.methods.filter((x) => x.fair != null);
    expect(used.length).toBe(2); // peers missing
    expect(used.reduce((a, b) => a + b.weight, 0)).toBeCloseTo(1);
    expect(v.fair).not.toBeNull();
    expect(v.low!).toBeLessThan(v.fair!);
    expect(v.high!).toBeGreaterThan(v.fair!);
  });

  it('returns no verdict without data', () => {
    const v = valueStock('X', 50, null, EMPTY_METRICS, { pe: null, ps: null });
    expect(v.verdict).toBeNull();
  });
});

describe('stage analysis', () => {
  const spy = bars(series(60, 100, 0.002));
  it('finds stage 2 in a steady uptrend', () => {
    const up = bars(series(60, 50, 0.015)).map((b, i, a) => ({ ...b, volume: i > 0 && b.close > a[i - 1].close ? 2e6 : 1e6 }));
    const r = analyzeStage(up, spy)!;
    expect(r.stage).toBe(2);
    expect(r.checks.aboveAvg && r.checks.avgRising && r.checks.beatsIndex).toBe(true);
  });
  it('finds stage 4 in a downtrend', () => {
    expect(analyzeStage(bars(series(60, 100, -0.015)), spy)!.stage).toBe(4);
  });
  it('finds stage 3 when an uptrend flattens out', () => {
    const closes = [...series(40, 50, 0.02), ...Array.from({ length: 20 }, (_, i) => 50 * Math.pow(1.02, 39) * (i % 2 ? 1.01 : 0.99))];
    expect(analyzeStage(bars(closes), spy)!.stage).toBe(3);
  });
  it('needs enough history', () => {
    expect(analyzeStage(bars(series(20, 100, 0.01)), spy)).toBeNull();
  });
  it('support sits below the price', () => {
    const b = bars(series(60, 50, 0.01));
    const price = b[b.length - 1].close;
    expect(findSupport(b, price)!).toBeLessThan(price);
  });
});

describe('risk : reward', () => {
  it('computes the ratio and verdict', () => {
    const r = riskReward(100, 95, 115)!;
    expect(r.ratio).toBeCloseTo(3);
    expect(r.verdict).toBe('Good');
    expect(r.text).toBe('1 : 3.0');
  });
  it('flags no upside', () => {
    const r = riskReward(100, 90, 80)!;
    expect(r.ratio).toBe(0);
    expect(r.text).toBe('No upside');
    expect(r.verdict).toBe('Poor');
  });
});

describe('fear & greed', () => {
  it('labels scores', () => {
    expect(labelFor(10)).toBe('Extreme fear');
    expect(labelFor(50)).toBe('Neutral');
    expect(labelFor(90)).toBe('Extreme greed');
  });
  it('rises with a strong market and low VIX', () => {
    const strong = fearGreed(bars(series(200, 100, 0.003)), bars(Array(200).fill(12)), 0.9)!;
    const weak = fearGreed(bars(series(200, 100, -0.003)), bars(Array(200).fill(35)), 0.1)!;
    expect(strong.score).toBeGreaterThan(70);
    expect(weak.score).toBeLessThan(30);
  });
});

describe('sentiment', () => {
  it('scores titles and finds themes', () => {
    const m = scoreTitles('TSLA', [
      'TSLA delivery numbers look weak, buying puts', 'Bearish on delivery numbers', 'Selling TSLA after delivery numbers miss',
      'Robotaxi hype is a bubble', 'Still bullish long term on robotaxi',
    ])!;
    expect(m.posts).toBe(5);
    expect(m.label).toBe('Bearish');
    expect(m.themes).toContain('delivery numbers');
  });
  it('needs a few posts', () => {
    expect(scoreTitles('X', ['one', 'two'])).toBeNull();
  });
});

describe('data parsing', () => {
  it('parses Finnhub metrics with fallbacks', () => {
    const m = parseMetrics({
      metric: { peBasicExclExtraTTM: 30, epsTTM: 6, 'totalDebt/totalEquityQuarterly': 1.5, dividendYieldIndicatedAnnual: 0.5, revenueGrowthTTMYoy: 8 },
      series: { annual: { pe: [{ period: '2024', v: 28 }, { period: '2023', v: 30 }, { period: '2022', v: 25 }], eps: [{ period: '2024', v: 6 }, { period: '2023', v: 5 }, { period: '2022', v: 4 }] } },
    });
    expect(m.pe).toBe(30);
    expect(m.eps).toBe(6);
    expect(m.debtToEquity).toBe(1.5);
    expect(m.peHistoryAvg).toBeCloseTo(27.67, 1);
    expect(m.epsAvg5y).toBeCloseTo(5);
  });
  it('parses Yahoo and Stooq history', () => {
    const y = parseYahooChart({ chart: { result: [{ timestamp: [1700000000, 1700604800], indicators: { quote: [{ open: [1, 2], high: [1, 2], low: [1, 2], close: [1, null], volume: [10, 20] }] } }] } });
    expect(y.length).toBe(1);
    const s = parseStooqCsv('Date,Open,High,Low,Close,Volume\n2025-01-03,1,2,0.5,1.5,100\n2025-01-10,1.5,2,1,1.8,200');
    expect(s.map((b) => b.close)).toEqual([1.5, 1.8]);
    expect(parseStooqCsv('No data')).toEqual([]);
  });
});

describe('why it moved (rules)', () => {
  it('names a news topic and ranks one main driver', () => {
    expect(newsTopic('Analysts trim delivery estimates')).toBe('analyst moves');
    const w = ruleBasedWhy({
      ticker: 'TSLA', name: 'Tesla', changePct: -5.1, sectorName: 'Consumer disc.', sectorChangePct: -1.1, marketChangePct: 0.8,
      news: [{ id: '1', headline: 'Analysts trim delivery estimates', summary: 'Brokers cut forecasts.', source: 'Reuters', url: '', datetime: Date.now() / 1000 - 3600 }],
      mood: null,
    });
    expect(w.headline).toBe('Down 5.1% on analyst moves');
    expect(w.drivers.filter((d) => d.weight === 'Main driver').length).toBe(1);
  });
  it('says so when there is no news', () => {
    const w = ruleBasedWhy({ ticker: 'X', name: 'X', changePct: 0.2, sectorName: null, sectorChangePct: null, marketChangePct: 0.1, news: [], mood: null });
    expect(w.drivers[0].title).toBe('No clear news');
  });
});

import { cleanSupabaseUrl } from '../lib/config';
describe('config', () => {
  it('cleans Supabase URLs copied from the dashboard', () => {
    expect(cleanSupabaseUrl('https://abc.supabase.co/rest/v1/')).toBe('https://abc.supabase.co');
    expect(cleanSupabaseUrl(' https://abc.supabase.co/ ')).toBe('https://abc.supabase.co');
    expect(cleanSupabaseUrl('https://abc.supabase.co')).toBe('https://abc.supabase.co');
  });
});
