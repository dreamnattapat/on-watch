# OnWatch

**The market, read for you.** A free website that reads the news, filings and social chatter, then tells each person only what matters to the stocks they own.

- **Today:** your portfolio's return in USD, a 2-minute brief, a heatmap, live top-10 gainers/losers, money rotation between sectors, a fear & greed gauge, and the week ahead.
- **My stocks:** tap a stock to see why it moved, the latest news, crowd mood, Weinstein stage analysis, a valuation check matched to the type of company, and risk : reward.
- **Screener:** filter ~40 large US stocks by stock type, P/E, PEG, debt ratio, risk : reward and under/fair/overvalued.
- **Accounts:** sign up with Google or email, add your stocks, choose when your brief arrives. Each person can only see their own data.

The site **runs with no setup at all**. Without keys it shows demo data and a sample portfolio, so you can try every page first.

---

## Set it up (about 20 minutes)

You'll create three free accounts: **Supabase** (logins + database), **Finnhub** (market data) and **Vercel** (hosting).

### 1. Supabase: accounts and saved portfolios

1. Go to [supabase.com](https://supabase.com), sign up, and click **New project**. Pick the Singapore region (closest to Thailand) and save the database password somewhere safe.
2. When it's ready, open **SQL Editor → New query**, paste everything from `supabase/migrations/0001_init.sql`, and click **Run**. This creates the tables and the security rules. Then do the same with `0002_email.sql` (email subscribers and unsubscribe links).
3. Open **Project Settings → API Keys** and copy:
   - the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - the **publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - the **secret key** → `SUPABASE_SECRET_KEY` (keep this one private; never put it in the browser or in chat)
4. Open **Authentication → URL Configuration**:
   - **Site URL:** your Vercel address once you have it (e.g. `https://onwatch.vercel.app`)
   - **Redirect URLs:** add `https://YOUR-SITE/auth/callback` and `http://localhost:3000/auth/callback`
5. **Google sign-in** (optional but recommended): **Authentication → Sign In / Providers → Google**. Supabase shows the exact steps for creating a Google OAuth client and the callback URL to paste into Google Cloud.
6. **Apple sign-in** needs a paid Apple Developer account ($99/year). Skip it for now; the Apple button stays hidden until you set `NEXT_PUBLIC_ENABLE_APPLE=true`.

### 2. Finnhub: prices, news and fundamentals

1. Sign up at [finnhub.io](https://finnhub.io) and copy your API key from the dashboard → `FINNHUB_API_KEY`.
2. The free plan allows 60 requests a minute. OnWatch caches every response and shares it across all visitors, so this covers the early stage. Price history for stage analysis comes from free public sources (Yahoo Finance, with Stooq as a backup), so no key is needed for that.

### 3. Vercel: put it online

1. Push this code to a GitHub repo (e.g. `onwatch`).
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, click **Add New → Project**, and import the repo.
3. Before clicking Deploy, open **Environment Variables** and add every value from `.env.example` that you have. Also add `CRON_SECRET` with any long random string. Vercel sends it to the daily job automatically.
4. Click **Deploy**. Copy the site address back into Supabase's **Site URL** (step 1.4).

### 4. Optional extras

| What | Why | How |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI-written "why it moved" summaries instead of rule-based ones | [console.anthropic.com](https://console.anthropic.com) → API Keys. Summaries are made **once per stock per day** and shared, so the cost depends on how many different stocks people hold, not how many users you have. |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | Crowd mood from r/stocks, r/wallstreetbets, r/investing and r/StockMarket | [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → create app → type **script**. |
| `RESEND_API_KEY` + `EMAIL_FROM` | The daily email brief, sign-up confirmations, and the "Email me a test brief" button in Settings | Sign up at [resend.com](https://resend.com), add and verify your domain (a few DNS records), then create an API key. Until a domain is verified, Resend only delivers to your own login email. |
| `SPONSOR_TEXT` + `SPONSOR_URL` | A one-line "Sponsored" slot in every brief | e.g. `SPONSOR_TEXT=Trade US stocks with zero commission at …` |
| Vercel Web Analytics | Page views, top pages, where visitors come from | Vercel project → **Analytics** → **Enable**. The code is already in place. |
| Google Search Console | Get the public stock pages into Google | [search.google.com/search-console](https://search.google.com/search-console) → add your site → **Sitemaps** → submit `sitemap.xml`. |
| `data/events.json` | Market-wide events (Fed meetings, CPI…) in "The week ahead" | Add entries like `{"date":"2026-12-09","title":"Fed rate decision","impact":"High","why":"…","affects":"All your stocks"}`. Earnings dates are added automatically. |

---

## Run it on your computer

```bash
npm install
cp .env.example .env.local   # fill in what you have; empty = demo mode
npm run dev                  # http://localhost:3000
npm test                     # analysis unit tests
npm run build                # production build
```

## How it works

```
app/                    Pages (Next.js App Router)
  page.tsx              Landing + sign-up (step 1)
  onboarding/           Add stocks (step 2) and brief settings (step 3)
  (app)/today           Portfolio, brief, heatmap, movers, sectors, fear & greed, week ahead
  (app)/stocks          Per-stock detail: why it moved, news, mood, stage, valuation, risk : reward
  (app)/screener        Filters and sorting over the stock universe
  (app)/settings        Manage stocks and brief preferences
  api/movers            Live movers, polled every 30s (cached server-side)
  stock/[ticker]        Public, search-friendly analysis page for any US stock (+ share image)
  stock/                Public stock directory and search
  sitemap.ts, robots.ts For search engines
  api/cron/daily        Daily job: writes shared "why it moved" summaries
  api/cron/brief        Morning email: members get their portfolio, subscribers their stocks
  subscribe/, unsubscribe/  Double opt-in and one-click unsubscribe
lib/
  market/               Finnhub provider, price history (Yahoo/Stooq), demo data
  analysis/             valuation.ts, stage.ts, riskReward.ts, fearGreed.ts
  whyMoved.ts           Rule-based and AI explanations
  sentiment.ts          Reddit crowd mood
  brief.ts              Picks the headline and stories for each person
  email.ts, emailBrief.ts  Resend sending and the email templates
  data.ts               Puts it all together for the pages
supabase/migrations/    Database tables and row-level security
proxy.ts                Keeps sessions fresh and protects app pages
```

### Valuation by stock type

Each stock is classified, then valued with the methods that fit:

| Type | Methods (weight) |
|---|---|
| Fast-growing | PEG-based value 40% · forward P/E vs. peers 30% · DCF 30% · reverse DCF check |
| Steady & profitable | P/E vs. 5-year average 40% · DCF 40% · P/E vs. peers 20% |
| High growth, low profit | Price/sales vs. peers 60% · DCF 40% · reverse DCF check |
| Mixed business | DCF 50% · P/E vs. peers 25% · price/sales vs. peers 25% |
| Bank | Price-to-book vs. returns 60% · P/E vs. 5-year average 40% |
| Cyclical | P/E on average earnings 50% · DCF 30% · price-to-book 20% |
| Dividend payer | Dividend model 50% · P/E vs. 5-year average 30% · DCF 20% |
| Turnaround | Price/sales vs. peers 60% · price-to-book 40% |

If a method has no data, its weight is shared among the others. Price more than 10% below the blended fair value counts as **undervalued**, more than 10% above as **overvalued**.

**Stage analysis** uses the 30-week moving average, its slope, volume on up vs. down weeks, and 6-month strength vs. the S&P 500.
**Risk : reward** compares the drop to the nearest support (the 30-week average or a recent swing low) with the rise to fair value.
**Fear & greed** is OnWatch's own gauge from four free signals: the S&P 500 vs. its 125-day average, one-month momentum, the VIX, and how many large stocks are rising today.

## Costs while it's free

| Service | Free plan covers |
|---|---|
| Supabase | 50,000 monthly active users, 500 MB database |
| Vercel (Hobby) | Personal, non-commercial projects. Move to Pro ($20/month) if you add ads or sponsorships. |
| Finnhub | 60 calls/minute. Upgrade if many people hold many different stocks. |
| Anthropic (optional) | Pay-as-you-go. Roughly cents per stock per day with a small model. |
| Resend (optional) | 3,000 emails a month, 100 a day. Pro is $20/month for 50,000. |
| Vercel Web Analytics | 50,000 events a month on Hobby. |

**Before you earn money from the site:** move Vercel to Pro, and check the market-data licence. Finnhub's free key is for personal use; showing its data on public pages for a business needs a commercial plan.

## Not done yet (next steps)

- **Brief by LINE or phone notification.** Email works today (once a day, 6–7 AM Bangkok time on Vercel's free plan; per-person send times need Vercel Pro).
- **X, Facebook and Instagram** mood: these need paid or partner API access. Reddit works today.
- **Economic calendar** (Fed, CPI): add dates to `data/events.json` until a data source is chosen.
- **Legal review** of the Terms and Privacy pages (they are drafts), including Thailand's PDPA and SEC rules on investment advice.

OnWatch gives information, not investment advice.
