// US stock market session, worked out in New York time.
// Holidays aren't included; on those days the label may say "open" while prices don't move.

export type Session = 'pre' | 'open' | 'after' | 'closed';

export function usSession(now = new Date()): Session {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = get('weekday');
  if (day === 'Sat' || day === 'Sun') return 'closed';
  const mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return 'pre';
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'open';
  if (mins >= 16 * 60 && mins < 20 * 60) return 'after';
  return 'closed';
}

export function sessionText(s: Session): string {
  switch (s) {
    case 'open': return 'US market open · live prices';
    case 'pre': return 'Before the US open · showing last close';
    case 'after': return 'US market closed for the day · showing closing prices';
    default: return 'US market closed · showing last close';
  }
}
