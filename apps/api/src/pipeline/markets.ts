import type { MarketDirection, MarketQuote } from '@morning-brief/shared';
import { fetchText, mapWithConcurrency } from '../lib/http.js';

/**
 * Market data. Spec: Markets Dashboard — nine instruments, each with value,
 * % change, direction and a timestamp.
 *
 * Yahoo Finance's v8 chart endpoint covers all nine without an API key, which is
 * what keeps this inside the free tier. It is an unofficial endpoint, so every
 * instrument has a fallback path and a failure never blanks the dashboard: the
 * caller reuses the last stored snapshot and marks it stale.
 */

export interface Instrument {
  readonly symbol: string;
  readonly label: string;
  readonly currency: string;
  /** Yahoo symbol; all nine were verified to resolve before being added. */
  readonly yahoo: string;
  /** CoinGecko id, where one exists, as a second source. */
  readonly coingecko?: string;
  /**
   * Largest one-session move this instrument could credibly make. A computed
   * change beyond it means the provider's reference close is wrong, not that the
   * market moved — see maxDailyMove note below.
   */
  readonly maxDailyMovePercent: number;
}

export const INSTRUMENTS: readonly Instrument[] = [
  { symbol: 'TASI', label: 'TASI', currency: 'SAR', yahoo: '^TASI.SR', maxDailyMovePercent: 12 },
  { symbol: 'SPX', label: 'S&P 500', currency: 'USD', yahoo: '^GSPC', maxDailyMovePercent: 12 },
  { symbol: 'IXIC', label: 'Nasdaq', currency: 'USD', yahoo: '^IXIC', maxDailyMovePercent: 12 },
  { symbol: 'DJI', label: 'Dow Jones', currency: 'USD', yahoo: '^DJI', maxDailyMovePercent: 12 },
  { symbol: 'BTC', label: 'Bitcoin', currency: 'USD', yahoo: 'BTC-USD', coingecko: 'bitcoin', maxDailyMovePercent: 30 },
  { symbol: 'BRENT', label: 'Brent Crude', currency: 'USD', yahoo: 'BZ=F', maxDailyMovePercent: 15 },
  { symbol: 'WTI', label: 'WTI Crude', currency: 'USD', yahoo: 'CL=F', maxDailyMovePercent: 15 },
  { symbol: 'GOLD', label: 'Gold', currency: 'USD', yahoo: 'GC=F', maxDailyMovePercent: 10 },
  // The riyal has been pegged at 3.75 to the dollar for decades. Yahoo's daily
  // history for SAR=X sits around 3.63 while its live price is correct, which
  // produced a 2.91% "move" on a currency that does not move. A 1% band means we
  // print the price and withhold the change rather than invent a peg break.
  { symbol: 'USDSAR', label: 'USD/SAR', currency: 'SAR', yahoo: 'SAR=X', maxDailyMovePercent: 1 },
];

/** Below this the move is noise, and an arrow either way would overstate it. */
const FLAT_THRESHOLD_PERCENT = 0.05;

export function directionOf(changePercent: number | null): MarketDirection {
  if (changePercent === null) return 'unknown';
  if (changePercent > FLAT_THRESHOLD_PERCENT) return 'up';
  if (changePercent < -FLAT_THRESHOLD_PERCENT) return 'down';
  return 'flat';
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketTime?: number;
        currency?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: (number | null)[] }>;
      };
    }> | null;
    error?: unknown;
  };
}

/**
 * The previous session's close, taken from the daily series.
 *
 * `meta.previousClose` is absent on these symbols and `meta.chartPreviousClose`
 * is the close *before the requested range*, not before today — reading it over
 * a 5-day window reported Brent down 13.89% and broke the riyal's peg with a
 * 3.11% move. The second-to-last close in the series is the real one.
 */
function previousCloseFromSeries(closes: readonly (number | null)[] | undefined): number | null {
  if (!closes) return null;
  const valid = closes.filter(
    (close): close is number => typeof close === 'number' && Number.isFinite(close) && close > 0,
  );
  if (valid.length < 2) return null;
  return valid[valid.length - 2] ?? null;
}

async function fetchFromYahoo(instrument: Instrument): Promise<MarketQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(instrument.yahoo)}?interval=1d&range=5d`;
  const response = await fetchText(url, {
    timeoutMs: 8_000,
    retries: 1,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok || !response.body) return null;

  let payload: YahooChartResponse;
  try {
    payload = JSON.parse(response.body) as YahooChartResponse;
  } catch {
    return null;
  }

  const result = payload.chart?.result?.[0];
  const meta = result?.meta;
  const value = meta?.regularMarketPrice;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;

  const previousClose =
    previousCloseFromSeries(result?.indicators?.quote?.[0]?.close) ??
    meta?.previousClose ??
    meta?.chartPreviousClose;
  if (typeof previousClose !== 'number' || previousClose === 0) return null;

  const rawChange = ((value - previousClose) / previousClose) * 100;
  const changePercent =
    Math.abs(rawChange) > instrument.maxDailyMovePercent ? null : Number(rawChange.toFixed(2));

  const asOf =
    typeof meta?.regularMarketTime === 'number'
      ? new Date(meta.regularMarketTime * 1_000).toISOString()
      : new Date().toISOString();

  return {
    symbol: instrument.symbol,
    label: instrument.label,
    value: Number(value.toFixed(4)),
    changePercent,
    direction: directionOf(changePercent),
    currency: meta?.currency ?? instrument.currency,
    asOf,
  };
}

async function fetchFromCoinGecko(instrument: Instrument): Promise<MarketQuote | null> {
  if (!instrument.coingecko) return null;
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${instrument.coingecko}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
  const response = await fetchText(url, {
    timeoutMs: 8_000,
    retries: 0,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok || !response.body) return null;

  try {
    const payload = JSON.parse(response.body) as Record<
      string,
      { usd?: number; usd_24h_change?: number; last_updated_at?: number }
    >;
    const entry = payload[instrument.coingecko];
    if (!entry || typeof entry.usd !== 'number') return null;

    const rawChange = entry.usd_24h_change;
    const changePercent =
      typeof rawChange === 'number' && Math.abs(rawChange) <= instrument.maxDailyMovePercent
        ? Number(rawChange.toFixed(2))
        : null;

    return {
      symbol: instrument.symbol,
      label: instrument.label,
      value: Number(entry.usd.toFixed(4)),
      changePercent,
      direction: directionOf(changePercent),
      currency: 'USD',
      asOf: entry.last_updated_at
        ? new Date(entry.last_updated_at * 1_000).toISOString()
        : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export interface MarketsFetchResult {
  quotes: MarketQuote[];
  /** Symbols no provider could price this run. */
  failed: string[];
}

/**
 * Prices every instrument, trying Yahoo first and CoinGecko where available.
 * Nine subrequests, well inside the free plan's per-invocation budget.
 */
export async function fetchMarkets(
  instruments: readonly Instrument[] = INSTRUMENTS,
): Promise<MarketsFetchResult> {
  const results = await mapWithConcurrency(instruments, 5, async (instrument) => {
    const quote = (await fetchFromYahoo(instrument)) ?? (await fetchFromCoinGecko(instrument));
    return { instrument, quote };
  });

  const quotes: MarketQuote[] = [];
  const failed: string[] = [];
  for (const [index, result] of results.entries()) {
    const instrument = instruments[index];
    if (result?.quote) quotes.push(result.quote);
    else if (instrument) failed.push(instrument.symbol);
  }

  return { quotes, failed };
}

/**
 * A plain-language market summary built from the numbers alone.
 *
 * Used when no model is available, and used as the grounding text when one is —
 * so the model is rephrasing figures we actually hold rather than recalling what
 * markets usually do.
 */
export function describeMarkets(quotes: readonly MarketQuote[]): string {
  if (quotes.length === 0) return 'Market data is unavailable this morning.';

  // Instruments whose change was withheld can't be called movers.
  const priced = quotes.filter(
    (quote): quote is MarketQuote & { changePercent: number } => quote.changePercent !== null,
  );
  if (priced.length === 0) {
    return 'Prices are in, but no reliable session comparison was available this morning.';
  }

  const notable = [...priced]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 3);
  const risers = priced.filter((quote) => quote.direction === 'up').length;
  const fallers = priced.filter((quote) => quote.direction === 'down').length;

  const phrases = notable.map((quote) => {
    const verb = quote.direction === 'up' ? 'up' : quote.direction === 'down' ? 'down' : 'flat at';
    const move =
      quote.direction === 'flat'
        ? formatValue(quote.value)
        : `${Math.abs(quote.changePercent).toFixed(2)}% to ${formatValue(quote.value)}`;
    return `${quote.label} ${verb} ${move}`;
  });

  // "Across the board" means every instrument, so it may only be said when one
  // side is empty. Saying it for a bare majority produced sentences that
  // contradicted the movers they had just named.
  const breadth = describeBreadth(risers, fallers, priced.length);

  return `${phrases.join(', ')}. ${breadth}`;
}

export function describeBreadth(risers: number, fallers: number, total: number): string {
  if (total === 0) return '';
  if (risers === total) return 'Every instrument tracked is higher.';
  if (fallers === total) return 'Every instrument tracked is lower.';
  if (risers === fallers) return `Gains and declines are evenly split, ${risers} apiece.`;
  return risers > fallers
    ? `${risers} of ${total} instruments are higher.`
    : `${fallers} of ${total} instruments are lower.`;
}

function formatValue(value: number): string {
  if (value >= 1_000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 10) return value.toFixed(2);
  return value.toFixed(4);
}
