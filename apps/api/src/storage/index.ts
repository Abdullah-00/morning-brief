import { editionSchema, type Edition, type MarketsBlock } from '@morning-brief/shared';

/**
 * Storage sits behind one interface with two layers underneath: D1 is the record
 * of what was published, KV is the cache the homepage actually reads. Either can
 * be absent — locally you may have neither — and the Worker still serves.
 */

export interface Env {
  DB?: D1Database;
  EDITION_CACHE?: KVNamespace;
}

export const KV_LATEST_EDITION = 'edition:latest';
export const KV_LATEST_MARKETS = 'markets:latest';
export const kvEditionKey = (date: string): string => `edition:${date}`;

/** Editions older than this are reported as stale in the masthead. */
export const STALE_AFTER_HOURS = 24;

export async function putEdition(env: Env, edition: Edition): Promise<void> {
  const payload = JSON.stringify(edition);

  if (env.EDITION_CACHE) {
    await Promise.all([
      env.EDITION_CACHE.put(KV_LATEST_EDITION, payload),
      // Back editions expire after a month; the archive of record lives in D1.
      env.EDITION_CACHE.put(kvEditionKey(edition.date), payload, {
        expirationTtl: 60 * 60 * 24 * 31,
      }),
    ]);
  }

  if (env.DB) {
    await env.DB.prepare(
      `INSERT INTO daily_editions (date, generated_at, status, payload)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(date) DO UPDATE SET
         generated_at = excluded.generated_at,
         status = excluded.status,
         payload = excluded.payload`,
    )
      .bind(edition.date, edition.generatedAt, edition.status, payload)
      .run();
  }
}

async function readEdition(raw: string | null): Promise<Edition | null> {
  if (!raw) return null;
  try {
    const parsed = editionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** KV first for speed, D1 as the fallback of record. */
export async function getLatestEdition(env: Env): Promise<Edition | null> {
  if (env.EDITION_CACHE) {
    const cached = await readEdition(await env.EDITION_CACHE.get(KV_LATEST_EDITION));
    if (cached) return cached;
  }

  if (env.DB) {
    const row = await env.DB.prepare(
      'SELECT payload FROM daily_editions ORDER BY date DESC LIMIT 1',
    ).first<{ payload: string }>();
    if (row?.payload) return readEdition(row.payload);
  }

  return null;
}

export async function getEditionByDate(env: Env, date: string): Promise<Edition | null> {
  if (env.EDITION_CACHE) {
    const cached = await readEdition(await env.EDITION_CACHE.get(kvEditionKey(date)));
    if (cached) return cached;
  }

  if (env.DB) {
    const row = await env.DB.prepare('SELECT payload FROM daily_editions WHERE date = ?1')
      .bind(date)
      .first<{ payload: string }>();
    if (row?.payload) return readEdition(row.payload);
  }

  return null;
}

export async function putMarkets(env: Env, markets: MarketsBlock): Promise<void> {
  const payload = JSON.stringify(markets);

  if (env.EDITION_CACHE) {
    await env.EDITION_CACHE.put(KV_LATEST_MARKETS, payload);
  }

  if (env.DB) {
    await env.DB.prepare(
      'INSERT INTO market_snapshots (captured_at, payload) VALUES (?1, ?2)',
    )
      .bind(markets.asOf, payload)
      .run();
  }
}

export async function getLatestMarkets(env: Env): Promise<MarketsBlock | null> {
  if (env.EDITION_CACHE) {
    const raw = await env.EDITION_CACHE.get(KV_LATEST_MARKETS);
    if (raw) {
      try {
        return JSON.parse(raw) as MarketsBlock;
      } catch {
        /* fall through to D1 */
      }
    }
  }

  if (env.DB) {
    const row = await env.DB.prepare(
      'SELECT payload FROM market_snapshots ORDER BY captured_at DESC LIMIT 1',
    ).first<{ payload: string }>();
    if (row?.payload) {
      try {
        return JSON.parse(row.payload) as MarketsBlock;
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Rate limiting for the manual refresh button, as a KV token bucket keyed by IP.
 * Fails open: if KV is missing, refreshing is allowed rather than blocked.
 */
export async function allowRefresh(env: Env, clientKey: string, windowSeconds = 60): Promise<boolean> {
  if (!env.EDITION_CACHE) return true;

  const key = `ratelimit:refresh:${clientKey}`;
  const existing = await env.EDITION_CACHE.get(key);
  if (existing) return false;

  await env.EDITION_CACHE.put(key, '1', { expirationTtl: windowSeconds });
  return true;
}
