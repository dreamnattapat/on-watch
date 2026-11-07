import { ImageResponse } from 'next/og';
import { analyzeOne } from '@/lib/data';
import { money } from '@/lib/format';

// The preview card shown when someone shares a stock page on LINE, X, Facebook…
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

// Barlow Condensed (the site's headline font), fetched just for the letters used.
async function headlineFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const s = /^[A-Z][A-Z.]{0,5}$/.test(t) ? await analyzeOne(t).catch(() => null) : null;
  const v = s?.valuation;
  const big = `ONWATCH${t}${v?.verdictText ?? '—'}${v?.fair != null && s?.quote ? `${money(v.fair)} vs ${money(s.quote.price)}` : ''}`;
  const font = await headlineFont(big);
  const head = font ? { fontFamily: 'Barlow' } : {};
  const color = v?.verdict === 'Under' ? '#0a7d3b' : v?.verdict === 'Over' ? '#c8102e' : '#111111';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', padding: 64, borderTop: '16px solid #111111' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...head, fontSize: 56, fontWeight: 800 }}>ONWATCH</div>
          <div style={{ fontSize: 26, color: '#444444' }}>Free stock analysis</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...head, fontSize: 180, fontWeight: 800, lineHeight: 1 }}>{t}</div>
          <div style={{ fontSize: 36, color: '#333333' }}>{s?.name ?? ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 24, color: '#444444' }}>VALUATION</div>
            <div style={{ ...head, fontSize: 64, fontWeight: 800, color }}>{v?.verdictText ?? '—'}</div>
          </div>
          {v?.fair != null && s?.quote && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 24, color: '#444444' }}>FAIR VALUE vs PRICE</div>
              <div style={{ ...head, fontSize: 64, fontWeight: 800 }}>{`${money(v.fair)} vs ${money(s.quote.price)}`}</div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: 'Barlow', data: font, weight: 800, style: 'normal' }] : undefined },
  );
}
