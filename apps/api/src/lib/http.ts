/**
 * Outbound fetch helpers.
 *
 * Every external call in this Worker goes through here so the timeout, the
 * User-Agent, and the "never throw, return null" contract are uniform. The free
 * plan allows 50 subrequests per invocation, so callers are responsible for
 * batching — see pipeline/run.ts.
 */

export const USER_AGENT =
  'Mozilla/5.0 (compatible; MorningBrief/1.0; +https://github.com/morning-brief)';

export interface FetchTextOptions {
  timeoutMs?: number;
  /** Extra attempts after the first. Only network/5xx failures are retried. */
  retries?: number;
  headers?: Record<string, string>;
}

export interface FetchTextResult {
  ok: boolean;
  status: number;
  body: string | null;
  /** The URL after redirects — needed to resolve Google News links to publishers. */
  finalUrl: string;
  error?: string;
}

export async function fetchText(
  url: string,
  options: FetchTextOptions = {},
): Promise<FetchTextResult> {
  const { timeoutMs = 8_000, retries = 1, headers = {} } = options;

  let lastError = 'unknown';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5',
          'Accept-Language': 'en',
          ...headers,
        },
      });

      if (!response.ok) {
        lastError = `http ${response.status}`;
        // 4xx is a decision, not a blip — retrying just burns subrequests.
        if (response.status < 500) {
          return { ok: false, status: response.status, body: null, finalUrl: response.url || url, error: lastError };
        }
        continue;
      }

      return {
        ok: true,
        status: response.status,
        body: await response.text(),
        finalUrl: response.url || url,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, status: 0, body: null, finalUrl: url, error: lastError };
}

/** Runs tasks with a concurrency cap. Results keep input order; failures become null. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      const item = items[index];
      if (item === undefined) return;
      try {
        results[index] = await task(item, index);
      } catch {
        results[index] = null;
      }
    }
  });

  await Promise.all(workers);
  return results;
}
