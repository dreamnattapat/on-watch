// The stocks used for the heatmap, live movers and screener.
// Kept to ~40 large US companies so a free Finnhub plan can refresh them.
// `w` is the heatmap tile width (bigger companies get bigger tiles).

export const UNIVERSE: Array<{ t: string; w: 1 | 2 }> = [
  { t: 'AAPL', w: 2 }, { t: 'MSFT', w: 2 }, { t: 'NVDA', w: 2 }, { t: 'AMZN', w: 2 }, { t: 'GOOGL', w: 2 }, { t: 'META', w: 2 },
  { t: 'TSLA', w: 1 }, { t: 'AVGO', w: 1 }, { t: 'JPM', w: 1 }, { t: 'LLY', w: 1 }, { t: 'V', w: 1 }, { t: 'MA', w: 1 },
  { t: 'XOM', w: 1 }, { t: 'UNH', w: 1 }, { t: 'COST', w: 1 }, { t: 'WMT', w: 1 }, { t: 'HD', w: 1 }, { t: 'PG', w: 1 },
  { t: 'JNJ', w: 1 }, { t: 'NFLX', w: 1 }, { t: 'ORCL', w: 1 }, { t: 'CRM', w: 1 }, { t: 'AMD', w: 1 }, { t: 'BAC', w: 1 },
  { t: 'KO', w: 1 }, { t: 'PEP', w: 1 }, { t: 'MRK', w: 1 }, { t: 'ABBV', w: 1 }, { t: 'CVX', w: 1 }, { t: 'ADBE', w: 1 },
  { t: 'CSCO', w: 1 }, { t: 'PFE', w: 1 }, { t: 'INTC', w: 1 }, { t: 'MU', w: 1 }, { t: 'DIS', w: 1 }, { t: 'NKE', w: 1 },
];

export const UNIVERSE_TICKERS = UNIVERSE.map((u) => u.t);

// Sector ETFs for the money-rotation chart.
export const SECTORS: Array<{ etf: string; name: string }> = [
  { etf: 'XLK', name: 'Technology' },
  { etf: 'XLC', name: 'Communication' },
  { etf: 'XLY', name: 'Consumer disc.' },
  { etf: 'XLP', name: 'Consumer staples' },
  { etf: 'XLE', name: 'Energy' },
  { etf: 'XLF', name: 'Financials' },
  { etf: 'XLV', name: 'Health care' },
  { etf: 'XLI', name: 'Industrials' },
  { etf: 'XLB', name: 'Materials' },
  { etf: 'XLRE', name: 'Real estate' },
  { etf: 'XLU', name: 'Utilities' },
];

/** Which sector ETF best represents a Finnhub industry name. */
export function sectorEtfFor(industry: string): string | null {
  const i = industry.toLowerCase();
  if (/semiconductor|technology|software|hardware|electronic|communications equipment/.test(i)) return 'XLK';
  if (/media|entertainment|telecom|interactive/.test(i)) return 'XLC';
  if (/retail|automobile|hotel|restaurant|leisure|textile|apparel|consumer products/.test(i)) return 'XLY';
  if (/beverage|food|tobacco|household/.test(i)) return 'XLP';
  if (/energy|oil|gas/.test(i)) return 'XLE';
  if (/bank|financial|insurance|capital markets/.test(i)) return 'XLF';
  if (/pharma|biotech|health|medical|life sciences/.test(i)) return 'XLV';
  if (/aerospace|machinery|industrial|transport|airline|logistics|construction/.test(i)) return 'XLI';
  if (/chemical|metal|mining|material|paper/.test(i)) return 'XLB';
  if (/real estate|reit/.test(i)) return 'XLRE';
  if (/utilit/.test(i)) return 'XLU';
  return null;
}

// Companies whose business mix needs a sum-of-the-parts style view.
export const TYPE_OVERRIDES: Record<string, string> = {
  AMZN: 'Mixed business',
  GOOGL: 'Fast-growing',
  'BRK.B': 'Mixed business',
};
