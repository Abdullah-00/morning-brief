import type { Article, Category } from '@morning-brief/shared';
import { CATEGORIES } from '@morning-brief/shared';
import { fetchText, mapWithConcurrency } from '../lib/http.js';
import { parseFeed } from '../lib/rss.js';
import { normalizeItem } from './normalize.js';
import type { Source } from '../sources.js';

export interface FeedResult {
  sourceId: string;
  ok: boolean;
  /** Items kept after normalisation, not raw item count. */
  articles: Article[];
  error?: string;
}

const priorityOf = (category: Category): number => CATEGORIES[category].priority;

/** Fetches and normalises one feed. Never throws — a dead feed is data, not a fault. */
export async function ingestSource(source: Source, now: Date = new Date()): Promise<FeedResult> {
  const response = await fetchText(source.url, { timeoutMs: 8_000, retries: 1 });

  if (!response.ok || !response.body) {
    return { sourceId: source.id, ok: false, articles: [], error: response.error ?? 'empty body' };
  }

  const items = parseFeed(response.body);
  const articles: Article[] = [];
  for (const item of items) {
    const article = normalizeItem(item, { source, now, priorityOf });
    if (article) articles.push(article);
  }

  return { sourceId: source.id, ok: true, articles };
}

/**
 * Ingests a batch of feeds concurrently.
 *
 * Batch size is the caller's problem: on the free plan an invocation gets 50
 * subrequests and 10ms of CPU, so pipeline/run.ts feeds this a slice at a time.
 */
export async function ingestBatch(
  sources: readonly Source[],
  now: Date = new Date(),
  concurrency = 6,
): Promise<FeedResult[]> {
  const results = await mapWithConcurrency(sources, concurrency, (source) =>
    ingestSource(source, now),
  );

  return results.map((result, index) => {
    if (result) return result;
    const source = sources[index];
    return {
      sourceId: source?.id ?? 'unknown',
      ok: false,
      articles: [],
      error: 'task failed',
    };
  });
}
