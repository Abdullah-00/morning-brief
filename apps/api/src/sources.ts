import type { Category, Region } from '@morning-brief/shared';

/**
 * Source registry, mapped to the eight content priorities in the spec.
 *
 * Every URL here was fetched and confirmed to return valid RSS/Atom before being
 * added. Feeds that failed are recorded in EXCLUDED_SOURCES at the bottom so we
 * don't silently re-add a dead endpoint later.
 *
 * `tier` decides how the item is handled downstream:
 *   'direct' — the feed carries usable description text; used for summaries.
 *   'proxy'  — corroboration only. Google News gives a title, publisher and a
 *              working outbound link, but no body text.
 *
 * Proxy items deliberately carry no body. Recovering one is not possible without
 * either scraping Google (its RSS link is an opaque token, and the interstitial
 * never exposes the publisher URL) or defeating the publishers' own bot
 * protection — Arab News and Al Arabiya answer every path, robots.txt included,
 * with a Cloudflare challenge, while Argaam and SPA render articles client-side.
 * So proxy items do the one job they can do honestly: they corroborate. When
 * Reuters and Al Jazeera both run a story, clustering merges them, the source
 * count rises, and ranking promotes it — while the summary is written only from
 * text a publisher actually served us. See pickLead() in pipeline/dedupe.ts.
 *
 * `credibility` (0–1) feeds the ranking score. Wire services and primary sources
 * score highest; aggregators and opinion-heavy outlets score lower.
 */

export type SourceTier = 'direct' | 'proxy';

export interface Source {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly tier: SourceTier;
  readonly category: Category;
  readonly region: Region;
  readonly credibility: number;
  /**
   * True for outlets that cover everything. Their feed category is a publishing
   * address, not a subject — Arab News runs Ebola in Uganda and Ligue 1 next to
   * Saudi policy. For these the category is decided by the headline alone, so a
   * football transfer stops arriving filed under Saudi Arabia.
   */
  readonly generalNews?: boolean;
}

/**
 * Builds a Google News RSS query, the keyless proxy for publishers that block us.
 *
 * The en-US locale is used for every query, including Saudi publishers: `gl=SA`
 * answers with a 302 to a consent interstitial, while `gl=US` returns the feed
 * directly. Coverage of `site:` queries is identical either way.
 */
function googleNews(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

// ---------------------------------------------------------------------------
// Tier A — direct RSS with usable description text
// ---------------------------------------------------------------------------

const AI_SOURCES: Source[] = [
  { id: 'openai', name: 'OpenAI', url: 'https://openai.com/news/rss.xml', tier: 'direct', category: 'ai', region: 'global', credibility: 0.95 },
  { id: 'deepmind', name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', tier: 'direct', category: 'ai', region: 'global', credibility: 0.95 },
  { id: 'techcrunch-ai', name: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', tier: 'direct', category: 'ai', region: 'global', credibility: 0.8 },
  { id: 'verge-ai', name: 'The Verge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', tier: 'direct', category: 'ai', region: 'global', credibility: 0.8 },
  { id: 'mit-tech-review', name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', tier: 'direct', category: 'ai', region: 'global', credibility: 0.9 },
  { id: 'ars-technica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', tier: 'direct', category: 'ai', region: 'global', credibility: 0.85 },
  { id: 'wired-ai', name: 'WIRED', url: 'https://www.wired.com/feed/tag/ai/latest/rss', tier: 'direct', category: 'ai', region: 'global', credibility: 0.8 },
  { id: 'toms-hardware', name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all', tier: 'direct', category: 'ai', region: 'global', credibility: 0.7 },
  { id: 'hacker-news', name: 'Hacker News', url: 'https://hnrss.org/frontpage', tier: 'direct', category: 'ai', region: 'global', credibility: 0.55 },
];

const SAUDI_SOURCES: Source[] = [
  // Deliberately not generalNews: it is a national paper whose Saudi desk is the
  // reason it is here, and defaulting it to world news would under-file the
  // coverage this brief ranks second.
  { id: 'saudi-gazette', name: 'Saudi Gazette', url: 'https://saudigazette.com.sa/rssFeed/74', tier: 'direct', category: 'saudi', region: 'saudi', credibility: 0.8 },
  { id: 'agbi', name: 'AGBI', url: 'https://www.agbi.com/feed/', tier: 'direct', category: 'saudi', region: 'saudi', credibility: 0.85 },
  { id: 'the-national', name: 'The National', url: 'https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml', tier: 'direct', category: 'middleEast', region: 'middleEast', credibility: 0.85 , generalNews: true },
  { id: 'wamda', name: 'Wamda', url: 'https://www.wamda.com/feed', tier: 'direct', category: 'saudiTech', region: 'middleEast', credibility: 0.75 },
];

const MIDDLE_EAST_SOURCES: Source[] = [
  { id: 'al-jazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', tier: 'direct', category: 'middleEast', region: 'middleEast', credibility: 0.85 , generalNews: true },
  { id: 'times-of-israel', name: 'The Times of Israel', url: 'https://www.timesofisrael.com/feed/', tier: 'direct', category: 'middleEast', region: 'middleEast', credibility: 0.75 , generalNews: true },
  { id: 'al-monitor', name: 'Al-Monitor', url: 'https://www.al-monitor.com/rss', tier: 'direct', category: 'middleEast', region: 'middleEast', credibility: 0.8 , generalNews: true },
  { id: 'middle-east-monitor', name: 'Middle East Monitor', url: 'https://www.middleeastmonitor.com/feed/', tier: 'direct', category: 'middleEast', region: 'middleEast', credibility: 0.65 , generalNews: true },
];

const US_WORLD_SOURCES: Source[] = [
  // CNN's own RSS endpoints still return valid XML but have been abandoned:
  // /rss/edition.rss last published in 2024, cnn_topstories in 2023, and
  // money_latest in 2018. Google News is the only live route to CNN.
  { id: 'cnn', name: 'CNN', url: googleNews('site:cnn.com when:1d'), tier: 'proxy', category: 'global', region: 'global', credibility: 0.8, generalNews: true },
  { id: 'bbc-world', name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', tier: 'direct', category: 'global', region: 'global', credibility: 0.9 },
  { id: 'npr', name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', tier: 'direct', category: 'usWorld', region: 'us', credibility: 0.85 },
  { id: 'guardian-world', name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', tier: 'direct', category: 'global', region: 'global', credibility: 0.85 },
  { id: 'nyt-world', name: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', tier: 'direct', category: 'global', region: 'global', credibility: 0.9 },
  { id: 'axios', name: 'Axios', url: 'https://api.axios.com/feed/', tier: 'direct', category: 'usWorld', region: 'us', credibility: 0.8 },
  { id: 'the-hill', name: 'The Hill', url: 'https://thehill.com/news/feed/', tier: 'direct', category: 'usWorld', region: 'us', credibility: 0.7 },
];

const MARKETS_SOURCES: Source[] = [
  { id: 'cnbc-top', name: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', tier: 'direct', category: 'markets', region: 'global', credibility: 0.85 },
  { id: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', tier: 'direct', category: 'markets', region: 'global', credibility: 0.8 },
  { id: 'yahoo-finance', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', tier: 'direct', category: 'markets', region: 'global', credibility: 0.7 },
  { id: 'investing-com', name: 'Investing.com', url: 'https://www.investing.com/rss/news.rss', tier: 'direct', category: 'markets', region: 'global', credibility: 0.65 },
];

const CYBER_SOURCES: Source[] = [
  { id: 'bleeping-computer', name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', tier: 'direct', category: 'cyber', region: 'global', credibility: 0.8 },
  { id: 'krebs', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', tier: 'direct', category: 'cyber', region: 'global', credibility: 0.9 },
  { id: 'the-record', name: 'The Record', url: 'https://therecord.media/feed', tier: 'direct', category: 'cyber', region: 'global', credibility: 0.85 },
  { id: 'dark-reading', name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', tier: 'direct', category: 'cyber', region: 'global', credibility: 0.8 },
  { id: 'hacker-news-sec', name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', tier: 'direct', category: 'cyber', region: 'global', credibility: 0.7 },
  { id: 'security-week', name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/', tier: 'direct', category: 'cyber', region: 'global', credibility: 0.75 },
  { id: 'cisa', name: 'CISA', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', tier: 'direct', category: 'cyber', region: 'us', credibility: 0.95 },
];

// ---------------------------------------------------------------------------
// Tier B — Google News proxy; bodies fetched from the publisher afterwards
// ---------------------------------------------------------------------------

const PROXY_SOURCES: Source[] = [
  { id: 'arab-news', name: 'Arab News', url: googleNews('site:arabnews.com when:1d'), tier: 'proxy', category: 'saudi', region: 'saudi', credibility: 0.85, generalNews: true },
  { id: 'al-arabiya', name: 'Al Arabiya English', url: googleNews('site:english.alarabiya.net when:1d'), tier: 'proxy', category: 'middleEast', region: 'middleEast', credibility: 0.8, generalNews: true },
  { id: 'argaam', name: 'Argaam', url: googleNews('site:argaam.com when:1d'), tier: 'proxy', category: 'markets', region: 'saudi', credibility: 0.85 },
  { id: 'spa', name: 'Saudi Press Agency', url: googleNews('site:spa.gov.sa when:1d'), tier: 'proxy', category: 'saudi', region: 'saudi', credibility: 0.9 },
  { id: 'reuters', name: 'Reuters', url: googleNews('site:reuters.com when:1d'), tier: 'proxy', category: 'global', region: 'global', credibility: 0.95, generalNews: true },
  { id: 'ap', name: 'Associated Press', url: googleNews('site:apnews.com when:1d'), tier: 'proxy', category: 'global', region: 'global', credibility: 0.95, generalNews: true },
  { id: 'bloomberg', name: 'Bloomberg', url: googleNews('site:bloomberg.com when:1d'), tier: 'proxy', category: 'markets', region: 'global', credibility: 0.9, generalNews: true },
  { id: 'vision-2030', name: 'Vision 2030 coverage', url: googleNews('"Vision 2030" Saudi when:1d'), tier: 'proxy', category: 'saudiTech', region: 'saudi', credibility: 0.7 },
  { id: 'pif', name: 'PIF coverage', url: googleNews('"Public Investment Fund" Saudi when:1d'), tier: 'proxy', category: 'saudi', region: 'saudi', credibility: 0.75 },
];

export const SOURCES: readonly Source[] = [
  ...AI_SOURCES,
  ...SAUDI_SOURCES,
  ...MIDDLE_EAST_SOURCES,
  ...US_WORLD_SOURCES,
  ...MARKETS_SOURCES,
  ...CYBER_SOURCES,
  ...PROXY_SOURCES,
];

export const SOURCES_BY_ID: ReadonlyMap<string, Source> = new Map(
  SOURCES.map((source) => [source.id, source]),
);

/**
 * Checked and rejected — kept so a future change doesn't reintroduce them
 * without re-testing. Verified 2026-07-28.
 */
export const EXCLUDED_SOURCES = [
  { name: 'Arab News (direct RSS)', reason: '403 on every path including robots.txt; Cloudflare challenge. Proxied.' },
  { name: 'Al Arabiya (direct RSS)', reason: '403 on every feed path. Proxied.' },
  { name: 'Argaam (direct RSS)', reason: '/en/rss returns HTML, not XML. Proxied.' },
  { name: 'Saudi Press Agency (direct RSS)', reason: 'rss.php returns the HTML app shell. Proxied.' },
  { name: 'CNN (direct RSS)', reason: 'endpoints abandoned — newest items dated 2024, 2023 and 2018. Proxied.' },
  { name: 'VentureBeat AI', reason: 'category feed last published 70 days ago' },
  { name: 'Politico', reason: '403' },
  { name: 'Middle East Eye', reason: 'connection refused' },
  { name: 'Zawya / Khaleej Times / Gulf News / Asharq Al-Awsat', reason: '404, no working feed found' },
  { name: 'Anthropic', reason: 'publishes no RSS feed' },
] as const;
