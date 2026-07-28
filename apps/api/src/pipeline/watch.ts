import type { Article, WatchItem, WatchKind } from '@morning-brief/shared';
import { articleId } from './normalize.js';

/**
 * "What to Watch Today". Spec: earnings, macro data releases, central bank
 * decisions, geopolitical events, scheduled announcements.
 *
 * There is no free calendar API behind this, so the diary is read out of the
 * morning's own coverage: reporting that points at something scheduled. That
 * keeps every entry attributable to a story we actually hold — each item links
 * back to the article it came from — rather than asserting a schedule we can't
 * source.
 */

interface WatchPattern {
  kind: WatchKind;
  pattern: RegExp;
}

const WATCH_PATTERNS: readonly WatchPattern[] = [
  { kind: 'centralBank', pattern: /\b(Fed|FOMC|Federal Reserve|ECB|Bank of England|BOJ|Bank of Japan|SAMA|rate decision|interest rate decision|policy meeting)\b/i },
  { kind: 'earnings', pattern: /\b(earnings|quarterly results|Q[1-4] results|reports? (?:earnings|results)|profit report)\b/i },
  { kind: 'macro', pattern: /\b(CPI|inflation data|jobs report|nonfarm payrolls|GDP (?:data|figures|report)|PMI|unemployment rate|retail sales data)\b/i },
  { kind: 'geopolitical', pattern: /\b(summit|talks (?:resume|begin|continue)|ceasefire deadline|OPEC\+?(?: meeting)?|G7|G20|UN Security Council|election)\b/i },
  { kind: 'announcement', pattern: /\b(is (?:set|due|expected) to|will (?:announce|unveil|publish|release|meet|host)|scheduled for|due (?:on|this week)|expected (?:on|this week)|ahead of)\b/i },
];

/** Phrases that mean the event is imminent rather than historical. */
const FORWARD_LOOKING =
  /\b(today|tonight|this (?:morning|afternoon|evening|week)|tomorrow|later (?:today|this week)|due|expected|scheduled|upcoming|ahead of|set to|will)\b/i;

const PAST_TENSE =
  /\b(yesterday|last (?:week|month|year|night)|announced|reported|posted|released|concluded|ended|said on)\b/i;

export interface WatchOptions {
  limit?: number;
}

/**
 * Extracts scheduled events from the morning's articles.
 *
 * The forward-looking test does the real work: "the Fed will decide on Thursday"
 * belongs in the diary, "the Fed decided yesterday" is news that already broke.
 */
export function buildWatchList(
  articles: readonly Article[],
  options: WatchOptions = {},
): WatchItem[] {
  const { limit = 6 } = options;

  const items: Array<WatchItem & { weight: number }> = [];
  const seenHeadlines = new Set<string>();

  for (const article of articles) {
    const haystack = `${article.title} ${article.content.slice(0, 300)}`;

    if (!FORWARD_LOOKING.test(haystack)) continue;
    if (PAST_TENSE.test(article.title)) continue;

    const matched = WATCH_PATTERNS.find((entry) => entry.pattern.test(haystack));
    if (!matched) continue;

    const key = article.title.toLowerCase().slice(0, 60);
    if (seenHeadlines.has(key)) continue;
    seenHeadlines.add(key);

    items.push({
      id: articleId(`watch:${article.url}`),
      title: article.title,
      kind: matched.kind,
      when: describeWhen(haystack),
      sourceUrl: article.url,
      // Central bank and macro events outrank a generic scheduled announcement.
      weight: kindWeight(matched.kind) * article.sourceCredibility,
    });
  }

  // Without a per-kind cap the list fills with one topic: a morning of Fed
  // previews produced six central-bank entries and nothing else, which is a
  // single story repeated rather than a diary.
  const perKindCap = 2;
  const usedByKind = new Map<WatchKind, number>();
  const diverse: typeof items = [];

  for (const item of items.sort((a, b) => b.weight - a.weight)) {
    const used = usedByKind.get(item.kind) ?? 0;
    if (used >= perKindCap) continue;
    usedByKind.set(item.kind, used + 1);
    diverse.push(item);
    if (diverse.length >= limit) break;
  }

  return diverse.map(({ weight: _weight, ...item }) => item);
}

function kindWeight(kind: WatchKind): number {
  switch (kind) {
    case 'centralBank':
      return 1;
    case 'macro':
      return 0.9;
    case 'earnings':
      return 0.8;
    case 'geopolitical':
      return 0.7;
    case 'announcement':
      return 0.5;
  }
}

function describeWhen(text: string): string {
  if (/\btoday\b/i.test(text)) return 'Today';
  if (/\btonight\b/i.test(text)) return 'Tonight';
  if (/\btomorrow\b/i.test(text)) return 'Tomorrow';
  if (/\bthis week\b/i.test(text)) return 'This week';
  const weekday = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.exec(text);
  if (weekday?.[1]) {
    const day = weekday[1];
    return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
  }
  return 'Ahead';
}
