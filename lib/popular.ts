import { UNIVERSE_TICKERS } from './universe';

// Stocks people often look up, beyond the large-company universe.
// Each gets a public page and a sitemap entry so search engines can find it.
export const EXTRA_POPULAR = [
  'RKLB', 'PLTR', 'SOFI', 'COIN', 'HOOD', 'SMCI', 'ARM', 'SHOP', 'UBER', 'ASTS',
  'IONQ', 'HIMS', 'MSTR', 'RIVN', 'NIO', 'SNOW', 'NET', 'CRWD', 'PYPL', 'TSM',
];

export const PUBLIC_TICKERS = [...new Set([...UNIVERSE_TICKERS, ...EXTRA_POPULAR])].sort();
