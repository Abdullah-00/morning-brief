import type { Article, WatchItem, WatchKind } from '@morning-brief/shared';
import { articleId } from './normalize.js';
import { jaccard, normalizeTitle, trigrams } from './dedupe.js';

/** Looser than story clustering: two diary lines about one event are redundant
 *  even when they share less wording than two reports of it would. */
const WATCH_SIMILARITY_THRESHOLD = 0.3;

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

/**
 * Note there is no generic `announcement` pattern any more.
 *
 * It matched phrases like "ahead of" and "is set to", which appear in almost any
 * headline, and it supplied most of the diary's junk — a WNBA story made the list
 * on "ahead of" alone. The remaining four kinds all require concrete calendar
 * vocabulary. `announcement` stays in the schema for stored editions.
 */
const WATCH_PATTERNS: readonly WatchPattern[] = [
  { kind: 'centralBank', pattern: /\b(Fed|FOMC|Federal Reserve|ECB|Bank of England|BOJ|Bank of Japan|SAMA|rate decision|interest rate decision|policy meeting)\b/i },
  { kind: 'earnings', pattern: /\b(earnings|quarterly results|Q[1-4] results|reports? (?:earnings|results)|profit report)\b/i },
  { kind: 'macro', pattern: /\b(CPI|inflation data|jobs report|nonfarm payrolls|GDP (?:data|figures|report)|PMI|unemployment rate|retail sales data)\b/i },
  { kind: 'geopolitical', pattern: /\b(summit|talks (?:resume|begin|continue)|ceasefire deadline|OPEC\+?(?: meeting)?|G7|G20|UN Security Council|election)\b/i },
];

/** Phrases that mean the event is imminent rather than historical. */
const FORWARD_LOOKING =
  /\b(today|tonight|this (?:morning|afternoon|evening|week)|tomorrow|later (?:today|this week)|due|expected|scheduled|upcoming|ahead of|set to|will)\b/i;

/**
 * Signals the event has already happened, so it is news rather than a diary
 * entry.
 *
 * Was previously tested against the title only, with a much shorter vocabulary,
 * which let four of six items in one edition be things that had already
 * occurred: "Fed Chairman Warsh's credibility in question after leaving rates
 * unchanged", "Asian Stocks Set to Fall, Fed Keeps Rates on Hold", "Clashes
 * Erupt in Pakistani Kashmir". It now covers reporting verbs in the simple past
 * and present, and is checked against the body text too.
 */
const PAST_TENSE =
  /\b(yesterday|last (?:week|month|year|night)|announced|reported|posted|released|concluded|ended|said on|kept|keeps|left|leaving|held|holds|erupt(?:s|ed)|miss(?:es|ed)|beat|fell|rose|slid|jumped|climbed|dropped|surged|tumbled|closed|decided|vote[sd]|ruled|resigned|stepped down|grew|grows|expand(?:s|ed)|rise|rises|fall|falls|leaves|unchanged|steady|has (?:already )?(?:been|begun|started)|after (?:the )?(?:decision|meeting|vote|report))\b/i;

export interface WatchOptions {
  limit?: number;
  /**
   * Canonical URLs already printed as stories. The diary sits below the news on
   * the same page, so repeating a story there wastes a slot and reads as a bug —
   * one edition carried a Meta earnings story on the front page and twice more
   * in the diary.
   */
  excludeUrls?: ReadonlySet<string>;
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
  const { limit = 5, excludeUrls } = options;

  const items: Array<WatchItem & { weight: number; grams: Set<string> }> = [];
  const seenHeadlines = new Set<string>();

  for (const article of articles) {
    if (excludeUrls?.has(article.url)) continue;
    const haystack = `${article.title} ${article.content.slice(0, 300)}`;

    // The forward-looking test reads the body too, so a retrospective headline
    // could qualify on a stray "will" further down. The past-tense test has to
    // read the same text, or it only ever sees half the evidence.
    if (!FORWARD_LOOKING.test(haystack)) continue;
    if (PAST_TENSE.test(article.title) || PAST_TENSE.test(haystack)) continue;

    // Matched against the headline alone. Against title + body, a passing
    // mention of "the Fed" anywhere in an article filed a Bitcoin price page as
    // a central bank decision.
    const matched = WATCH_PATTERNS.find((entry) => entry.pattern.test(article.title));
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
      grams: trigrams(normalizeTitle(article.title)),
    });
  }

  // Without a per-kind cap the list fills with one topic: a morning of Fed
  // previews produced six central-bank entries and nothing else, which is a
  // single story repeated rather than a diary.
  // Two per kind. The duplicate Fed and earnings entries that once justified a
  // cap of one came from matching the article body; with the kind patterns now
  // anchored to the headline, two entries of a kind are usually two events.
  const perKindCap = 2;
  const usedByKind = new Map<WatchKind, number>();
  const diverse: typeof items = [];

  for (const item of items.sort((a, b) => b.weight - a.weight)) {
    const used = usedByKind.get(item.kind) ?? 0;
    if (used >= perKindCap) continue;

    // The exact-prefix check alone let the same event in under two different
    // headlines — one edition listed the same Fed decision twice, and the same
    // Meta earnings twice more.
    const duplicate = diverse.some(
      (existing) => jaccard(existing.grams, item.grams) >= WATCH_SIMILARITY_THRESHOLD,
    );
    if (duplicate) continue;

    usedByKind.set(item.kind, used + 1);
    diverse.push(item);
    if (diverse.length >= limit) break;
  }

  return diverse.map(({ weight: _weight, grams: _grams, ...item }) => item);
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
