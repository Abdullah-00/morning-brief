import type { MarketQuote } from '@morning-brief/shared';

/** Asia/Riyadh is a fixed UTC+3 with no daylight saving. */
export const RIYADH_TIME_ZONE = 'Asia/Riyadh';

/** "Tuesday, 28 July 2026" — the masthead dateline. */
export function formatRiyadhDate(isoDate: string): string {
  // Noon avoids the date shifting when the string is interpreted as UTC.
  const date = new Date(`${isoDate}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: RIYADH_TIME_ZONE,
  }).format(date);
}

/** "05:34 Riyadh" — the edition timestamp. */
export function formatRiyadhTime(isoTimestamp: string): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: RIYADH_TIME_ZONE,
  }).format(new Date(isoTimestamp));
  return `${time} Riyadh`;
}

/** Relative age, rounded the way a reader would say it. */
export function formatRelative(isoTimestamp: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(isoTimestamp).getTime()) / 60_000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

/** Index and commodity levels read better without trailing noise; FX needs it. */
export function formatQuoteValue(quote: MarketQuote): string {
  const { value } = quote;
  if (value >= 1_000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  if (value >= 10) return value.toFixed(2);
  return value.toFixed(4);
}

export function formatChangePercent(changePercent: number | null): string {
  if (changePercent === null) return '—';
  const sign = changePercent > 0 ? '+' : '';
  return `${sign}${changePercent.toFixed(2)}%`;
}
