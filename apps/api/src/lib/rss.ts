/**
 * Dependency-free RSS 2.0 / Atom / RDF parser.
 *
 * Deliberately not built on HTMLRewriter: this has to run unchanged in the
 * Worker, in Node for the dry-run script, and in vitest. Feeds are small and
 * well-formed enough that a scanning parser beats pulling in an XML library we'd
 * then have to keep inside the free plan's CPU budget.
 */

export interface FeedItem {
  title: string;
  link: string;
  /** description / summary / content:encoded, HTML stripped. */
  description: string;
  /** ISO 8601, or null when the feed gave us nothing parseable. */
  publishedAt: string | null;
  /** Atom <source> or RSS <source>, used by Google News to name the real publisher. */
  publisher: string | null;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

/** Decodes named and numeric XML/HTML entities. Runs twice for feeds that double-encode. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body.startsWith('#')) {
      const codePoint = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      if (Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
      return match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Strips tags, decodes entities, and collapses whitespace. */
export function stripHtml(input: string): string {
  const withoutScripts = input
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  // Feeds routinely encode markup twice (&amp;lt;p&amp;gt;), so alternate
  // stripping and decoding. The final pass must be a strip, not a decode \u2014
  // decoding last simply re-materialises the tags it was meant to remove.
  let text = withoutScripts;
  for (let pass = 0; pass < 3; pass += 1) {
    const stripped = text.replace(/<[^>]*>/g, ' ');
    const decoded = decodeEntities(stripped);
    if (decoded === text) break;
    text = decoded;
  }
  text = text.replace(/<[^>]*>/g, ' ');

  return (
    text
      // Several outlets inject zero-width spaces and soft hyphens mid-word; they
      // survive into summaries and break word matching in clustering.
      .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function unwrapCdata(raw: string): string {
  const trimmed = raw.trim();
  const match = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(trimmed);
  return match?.[1] ?? trimmed;
}

/** Returns the inner text of the first matching tag, CDATA unwrapped. */
function tagText(block: string, ...names: string[]): string | null {
  for (const name of names) {
    const pattern = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i');
    const match = pattern.exec(block);
    if (match?.[1] !== undefined) {
      const value = unwrapCdata(match[1]).trim();
      if (value.length > 0) return value;
    }
  }
  return null;
}

/** Returns an attribute value from the first matching self-closing or open tag. */
function tagAttr(block: string, name: string, attr: string): string | null {
  const pattern = new RegExp(`<${name}\\b([^>]*)>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(block)) !== null) {
    const attrs = match[1] ?? '';
    // Atom feeds carry several <link> elements; the alternate one is the article.
    const rel = /\brel\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1];
    if (rel !== undefined && rel !== 'alternate') continue;
    const value = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']*)["']`, 'i').exec(attrs)?.[1];
    if (value) return decodeEntities(value);
  }
  return null;
}

/**
 * Timezone abbreviations that `new Date()` refuses to parse. Wamda stamps its
 * feed "EEST" and every item was being dropped for want of a date.
 *
 * Only unambiguous abbreviations are mapped. IST and AST mean different things
 * in different countries, so they fall through to the strip-and-assume-UTC path
 * below rather than being silently mis-shifted.
 */
const TIMEZONE_OFFSETS: Record<string, string> = {
  UT: '+0000', UTC: '+0000', GMT: '+0000', Z: '+0000',
  WET: '+0000', WEST: '+0100', BST: '+0100',
  CET: '+0100', CEST: '+0200',
  EET: '+0200', EEST: '+0300',
  MSK: '+0300', GST: '+0400',
  EST: '-0500', EDT: '-0400', CST: '-0600', CDT: '-0500',
  MST: '-0700', MDT: '-0600', PST: '-0800', PDT: '-0700',
};

/** Normalises the several date formats feeds use into ISO 8601. */
export function parseFeedDate(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  const candidates = [trimmed];

  // Swap a trailing alphabetic zone for a numeric offset, or drop it entirely.
  const zoneMatch = /\s([A-Z]{2,5})$/.exec(trimmed);
  if (zoneMatch?.[1]) {
    const offset = TIMEZONE_OFFSETS[zoneMatch[1]];
    const stem = trimmed.slice(0, zoneMatch.index);
    candidates.push(`${stem} ${offset ?? '+0000'}`);
  }

  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!Number.isFinite(parsed.getTime())) continue;
    // Guard against feeds with absurd dates poisoning the recency score.
    const year = parsed.getUTCFullYear();
    if (year < 2000 || year > 2100) continue;
    return parsed.toISOString();
  }

  return null;
}

const ITEM_PATTERN = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;

/**
 * Feeds are ordered newest-first, and some publish their whole archive — the
 * OpenAI feed returns over a thousand items. Parsing all of them would blow the
 * free plan's 10ms CPU budget to reach content the freshness filter discards
 * anyway.
 */
export const MAX_ITEMS_PER_FEED = 80;

/**
 * Parses a feed document into items. Malformed entries are skipped rather than
 * throwing — one bad item must never cost us the rest of the feed.
 */
export function parseFeed(xml: string, maxItems = MAX_ITEMS_PER_FEED): FeedItem[] {
  const items: FeedItem[] = [];
  let match: RegExpExecArray | null;

  ITEM_PATTERN.lastIndex = 0;
  while ((match = ITEM_PATTERN.exec(xml)) !== null) {
    if (items.length >= maxItems) break;
    const block = match[2];
    if (!block) continue;

    const title = tagText(block, 'title');
    if (!title) continue;

    // RSS puts the URL in <link>text</link>; Atom puts it in <link href="..."/>.
    const link = tagText(block, 'link') ?? tagAttr(block, 'link', 'href') ?? tagText(block, 'guid');
    if (!link || !/^https?:\/\//i.test(link.trim())) continue;

    const rawDescription =
      tagText(block, 'content:encoded', 'description', 'summary', 'content') ?? '';

    items.push({
      title: stripHtml(title),
      link: decodeEntities(link.trim()),
      description: stripHtml(rawDescription),
      publishedAt: parseFeedDate(
        tagText(block, 'pubDate', 'published', 'updated', 'dc:date', 'date'),
      ),
      publisher: tagText(block, 'source'),
    });
  }

  return items;
}
