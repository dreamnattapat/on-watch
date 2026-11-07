import type { EarningsEvent } from './market/types';

// Display helpers for earnings dates, shown in Bangkok time because US
// reports land in the middle of the Thai night or evening.

const TZ = 'Asia/Bangkok';

/** Hours that New York is offset from UTC on a given date (−5 in winter, −4 in summer). */
export function nyOffsetHours(dateIso: string): number {
  const d = new Date(`${dateIso}T12:00:00Z`);
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' })
      .formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-5';
    const m = part.match(/GMT([+-]\d+)/);
    return m ? parseInt(m[1], 10) : -5;
  } catch {
    return -5;
  }
}

/** Calendar days from today (Bangkok) until the date. 0 = today. */
export function daysUntil(dateIso: string, now = new Date()): number {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now); // YYYY-MM-DD
  return Math.round((Date.parse(`${dateIso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

/** The moment the report is expected, as a UTC Date (US 8:00 AM for bmo, 4:00 PM for amc). */
export function reportMoment(e: Pick<EarningsEvent, 'date' | 'hour'>): Date | null {
  const usHour = e.hour === 'bmo' ? 8 : e.hour === 'amc' ? 16 : null;
  if (usHour == null) return null;
  const utcHour = usHour - nyOffsetHours(e.date);
  return new Date(Date.parse(`${e.date}T00:00:00Z`) + utcHour * 3600000);
}

export function shortDate(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function longDate(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function whenLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 14) return 'Next week';
  return `In ${Math.round(days / 7)} weeks`;
}

export function sessionLabel(hour: string): string {
  if (hour === 'bmo') return 'before the US market opens';
  if (hour === 'amc') return 'after the US market closes';
  return 'time not confirmed yet';
}

/** e.g. "Fri 21 Nov, around 4:00 AM Bangkok time". */
export function bangkokTimeLabel(e: Pick<EarningsEvent, 'date' | 'hour'>): string | null {
  const m = reportMoment(e);
  if (!m) return null;
  const day = m.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
  const time = m.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
  return `${day}, around ${time} Bangkok time`;
}
