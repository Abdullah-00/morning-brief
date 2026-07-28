import type { Article, Category, Region } from '@morning-brief/shared';
import type { FeedItem } from '../lib/rss.js';
import type { Source } from '../sources.js';

/** Query parameters that identify a campaign, not a document. */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^mc_[ce]id$/i,
  /^ref$/i,
  /^ref_src$/i,
  /^source$/i,
  /^cmpid$/i,
  /^smid$/i,
  /^partner$/i,
  /^ito$/i,
  /^at_medium$/i,
  /^at_campaign$/i,
];

/**
 * Reduces a URL to a stable identity so the same article syndicated with
 * different tracking tails collapses to one entry. Spec: Step 3, "remove
 * identical URLs".
 */
export function canonicalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = '';
    url.protocol = 'https:';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.some((pattern) => pattern.test(key))) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();

    // Trailing slashes are not meaningful for article paths.
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    const query = url.searchParams.toString();
    return `${url.origin}${url.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return raw.trim();
  }
}

/** Stable id derived from the canonical URL — no randomness, so reruns are idempotent. */
export function articleId(canonicalUrl: string): string {
  let hash = 2166136261;
  for (let index = 0; index < canonicalUrl.length; index += 1) {
    hash ^= canonicalUrl.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Google News titles are suffixed with the publisher (" - Reuters"), and its
 * items carry the real outlet in <source>. Recovering it keeps the source chips
 * honest and stops the suffix polluting similarity comparisons.
 */
export function splitGoogleNewsTitle(title: string): { title: string; publisher: string | null } {
  const match = /^(.*?)\s+-\s+([^-]{2,40})$/.exec(title.trim());
  if (!match?.[1] || !match[2]) return { title: title.trim(), publisher: null };
  return { title: match[1].trim(), publisher: match[2].trim() };
}

/**
 * Tidies a publisher name for the source chips: drops the domain suffix outlets
 * put in their feed metadata, and falls back to the registry name when the feed
 * answers in a script the rest of the page isn't set in (SPA labels itself
 * "وكالة الأنباء السعودية").
 */
export function cleanPublisherName(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  const cleaned = raw.replace(/\.(com|net|org|co\.uk)$/i, '').trim();
  if (cleaned.length === 0) return fallback;
  if (!/[a-z]/i.test(cleaned)) return fallback;
  return cleaned;
}

/**
 * Some categories are better inferred from the headline than from the feed it
 * arrived on — a Reuters wire item about an OpenAI release belongs in AI, not
 * World. Only ever promotes toward a higher-priority category.
 */
const CATEGORY_HINTS: ReadonlyArray<{ category: Category; pattern: RegExp }> = [
  {
    category: 'ai',
    pattern: /\b(artificial intelligence|\bAI\b|LLM|GPT|OpenAI|Anthropic|Claude|Gemini|DeepMind|Nvidia|neural|machine learning|chatbot|inference|datacent(er|re)|GPU)\b/i,
  },
  {
    category: 'saudi',
    pattern: /\b(Saudi|Riyadh|Jeddah|Dammam|Mecca|Makkah|Medina|KSA|Tadawul|Aramco|SABIC|PIF|Public Investment Fund|NEOM|Qiddiya|Red Sea Global|Vision 2030|MBS|Crown Prince|Shoura|Hajj|Umrah|the Kingdom)\b/i,
  },
  {
    category: 'middleEast',
    pattern: /\b(Middle East|Gulf|GCC|UAE|Emirates|Qatar|Kuwait|Bahrain|Oman|Iran|Iraq|Israel|Gaza|Lebanon|Syria|Yemen|Jordan|Egypt|Turkey|Houthi|Hezbollah)\b/i,
  },
  {
    category: 'cyber',
    pattern: /\b(ransomware|breach|vulnerability|CVE-\d|zero-day|malware|phishing|cyber ?attack|CISA|exploit|threat actor|data leak)\b/i,
  },
];

function inferCategory(text: string, fallback: Category, priorityOf: (c: Category) => number): Category {
  let best = fallback;
  for (const hint of CATEGORY_HINTS) {
    if (hint.pattern.test(text) && priorityOf(hint.category) < priorityOf(best)) {
      best = hint.category;
    }
  }
  return best;
}

/**
 * Subject matter a morning intelligence brief has no use for. General-interest
 * outlets carry a lot of it — Ligue 1 transfers and box-office numbers arrive on
 * the same wire as Gulf policy.
 */
const NOISE_PATTERN =
  /\b(football|soccer|premier league|la liga|ligue 1|serie a|bundesliga|world cup qualifier|fifa|uefa|nba|nfl|mlb|nhl|cricket|wicket|tennis|wimbledon|olympic|boxing|ufc|formula one|f1 grand prix|golf|striker|midfielder|goalkeeper|head coach|as coach|new coach|transfer window|match report|full-time|kick-off|box office|red carpet|grammy|oscars|celebrity|singer|rapper|actress|reality (?:tv|show)|horoscope|zodiac|recipe|deal of the day|prime day|best deals|discount code|obituary|dies at \d+|weather forecast)\b/i;

/**
 * Terms that make a story matter regardless of its surface subject. A stadium
 * story is noise; a PIF stadium acquisition is Vision 2030 coverage.
 */
const SIGNAL_OVERRIDE_PATTERN =
  /\b(Saudi|PIF|Public Investment Fund|Vision 2030|sovereign wealth|acquisition|acquire[sd]?|merger|IPO|billion|investment|regulat|sanction|antitrust|lawsuit|policy|government|ministry)\b/i;

/**
 * Syndication furniture that feeds append to every description. It is not
 * reporting, and left in place it becomes the text a summariser works from —
 * "The post ... appeared first on SecurityWeek" was two thirds of one story's
 * available body.
 */
const BOILERPLATE_PATTERNS: readonly RegExp[] = [
  /\bThe post .*? appeared first on [^.]*\.?/i,
  // Newsletter promos lead the description as often as they trail it, so these
  // are not anchored to the end — MIT Technology Review opens with one, and an
  // end-anchored pattern left it as the entire summary of a front-page story.
  /\bThis (?:article|post|story) (?:originally |first )?appeared (?:on|in) [^.]*\.?/i,
  /\bTo get stories like this in your inbox[^.]*\.?/i,
  /\bSign up (?:for|to) [^.]{0,80}?newsletter[^.]*\.?/i,
  /\bSubscribe to [^.]{0,80}\.?/i,
  /\bContinue reading\b.*$/i,
  /\bRead (?:more|the full story)\b.*$/i,
  /\bClick here to .*$/i,
  /\[…\]\s*$/,
  /\[\.\.\.\]\s*$/,
];

/** Removes syndication furniture and trailing ellipsis stubs from body text. */
export function cleanBody(text: string): string {
  let cleaned = text;
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

export function isNoise(title: string): boolean {
  if (!NOISE_PATTERN.test(title)) return false;
  return !SIGNAL_OVERRIDE_PATTERN.test(title);
}

export interface NormalizeContext {
  source: Source;
  /** Injected so normalize stays pure and testable. */
  now: Date;
  priorityOf: (category: Category) => number;
}

/**
 * Converts one feed item into the unified Article schema. Returns null for items
 * we can't place on a timeline or that are too old to belong in a morning brief.
 */
export function normalizeItem(item: FeedItem, context: NormalizeContext): Article | null {
  const { source, now, priorityOf } = context;

  const isProxy = source.tier === 'proxy';
  const { title, publisher } = isProxy
    ? splitGoogleNewsTitle(item.title)
    : { title: item.title.trim(), publisher: null };

  if (title.length < 12) return null;
  if (isNoise(title)) return null;

  const url = canonicalizeUrl(item.link);
  if (!/^https?:\/\//i.test(url)) return null;

  // No date means we can't rank it honestly; treating it as "now" would let
  // undated feeds dominate the front page.
  if (!item.publishedAt) return null;

  const ageHours = (now.getTime() - new Date(item.publishedAt).getTime()) / 3_600_000;
  if (ageHours > 48 || ageHours < -6) return null;

  // For everything-outlets the feed's own category means nothing, so start from
  // the neutral bucket and let the headline earn a better one.
  const fallbackCategory: Category = source.generalNews ? 'global' : source.category;
  const category = inferCategory(`${title} ${item.description}`, fallbackCategory, priorityOf);
  const region: Region = source.generalNews && category === 'global' ? 'global' : source.region;

  return {
    id: articleId(url),
    title,
    content: isProxy ? '' : cleanBody(item.description).slice(0, 4_000),
    source: cleanPublisherName(publisher ?? item.publisher, source.name),
    sourceCredibility: source.credibility,
    url,
    publishedAt: item.publishedAt,
    category,
    region,
  };
}
