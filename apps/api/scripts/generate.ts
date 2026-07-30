/**
 * Edition generator.
 *
 * Runs the CPU-heavy half of the pipeline — ingest, normalise, dedupe, cluster,
 * rank, price — and POSTs the result to the Worker, which summarises it with
 * Workers AI and stores it. Lives outside the Worker because clustering a
 * morning's ingest costs ~200ms of CPU and the Workers free plan allows 10ms per
 * invocation; everything else stays on Cloudflare.
 *
 *   npm run pipeline:dry                    print the draft, publish nothing
 *   npm run pipeline:generate               build and publish
 *
 * Env: API_BASE_URL, CRON_SECRET, optional MAX_STORIES.
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES,
  SECTION_KEYS,
  draftEditionSchema,
  type Category,
  type DraftEdition,
  type DraftStory,
  type EditionTrigger,
  type WatchItem,
} from '@morning-brief/shared';
import { SOURCES } from '../src/sources.js';
import { ingestBatch } from '../src/pipeline/ingest.js';
import { clusterArticles, jaccard, normalizeTitle, trigrams } from '../src/pipeline/dedupe.js';
import { rankClusters } from '../src/pipeline/rank.js';
import { describeMarkets, fetchMarkets } from '../src/pipeline/markets.js';
import { buildWatchList } from '../src/pipeline/watch.js';
import { riyadhDate } from '../src/lib/time.js';

const DEFAULT_MAX_STORIES = 28;

export interface GenerateResult {
  draft: DraftEdition;
  report: {
    sourcesOk: number;
    sourcesFailed: string[];
    articles: number;
    clusters: number;
    multiSourceClusters: number;
    storiesWithText: number;
    marketsFailed: string[];
  };
}

/** Most source chips a card renders; the lead is always among them. */
const MAX_SOURCES_PER_STORY = 6;

/** Clusters reserved for each section, so a beat cannot be crowded out entirely. */
const PER_SECTION_QUOTA = 4;

/**
 * Chooses which clusters become drafts.
 *
 * A single global ranking cannot work here, because the category weights make
 * some beats unreachable by arithmetic rather than by merit. Computed from the
 * ranking weights, the best score a cybersecurity story can *ever* achieve —
 * top credibility, six independent outlets, seconds old — is 0.7475, while a
 * freshly filed single-source AI story from a mediocre outlet scores 0.7775. The
 * cutoff for publication has been running around 0.772. So cyber and markets
 * never appeared at all, "On My Radar" had never once been printed, and seven
 * cybersecurity feeds ingested 70 articles a day to no effect.
 *
 * Rather than re-tune weights until the ordering happens to come out right, take
 * the global leaders for the front page and then reserve a quota per section,
 * filled from that section's own ranking. Beats compete within themselves.
 */
export function selectDraftClusters<T extends { category: Category; id: string }>(
  ranked: readonly T[],
  globalCount: number,
  perSection = PER_SECTION_QUOTA,
): T[] {
  const chosen: T[] = [];
  const taken = new Set<string>();

  const add = (cluster: T) => {
    if (taken.has(cluster.id)) return;
    taken.add(cluster.id);
    chosen.push(cluster);
  };

  for (const cluster of ranked.slice(0, globalCount)) add(cluster);

  for (const section of SECTION_KEYS) {
    const inSection = ranked.filter((cluster) => CATEGORIES[cluster.category].section === section);
    for (const cluster of inSection.slice(0, perSection)) add(cluster);
  }

  // Keep overall rank order so downstream front-page selection is unaffected.
  const rank = new Map(ranked.map((cluster, index) => [cluster.id, index]));
  return chosen.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

/** How close a corroborating headline must be before we summarise from its body. */
const BORROW_SIMILARITY_THRESHOLD = 0.35;

/**
 * The prose the summary will be written from.
 *
 * Previously `hasBody(lead) ? lead.content : ''`, which threw away every
 * description shorter than 160 characters — and that empty string is what made
 * the extractive fallback print the headline as the summary.
 *
 * The lead's own body is always preferred, because it is the article the
 * headline came from. Only when the lead has none do we borrow from a
 * corroborating article, and then only if its headline is close enough to be
 * the same story. Borrowing unconditionally produced a card headlined "Battery
 * Startup Raises $550 Million" described as expanding "its agentic data control
 * plane" — text from a different company that had been mis-clustered in. A
 * summary that contradicts its headline is worse than no summary at all.
 */
export function bestSourceText(cluster: {
  lead: { title: string; content: string };
  articles: readonly { title: string; content: string }[];
}): string {
  if (cluster.lead.content.length > 0) return cluster.lead.content.slice(0, 4_000);

  const leadGrams = trigrams(normalizeTitle(cluster.lead.title));

  let best = '';
  for (const article of cluster.articles) {
    if (article.content.length <= best.length) continue;
    const similarity = jaccard(leadGrams, trigrams(normalizeTitle(article.title)));
    if (similarity < BORROW_SIMILARITY_THRESHOLD) continue;
    best = article.content;
  }

  return best.slice(0, 4_000);
}

/**
 * Source chips, lead first.
 *
 * The frontend links the headline to `sources[0]`, so if the lead is not first
 * the headline points at a different article than the one it was taken from —
 * and with the list truncated, a lead far down the ingest order could vanish
 * from the chips entirely while still supplying the words on the page.
 */
export function orderedSources(cluster: {
  lead: { source: string; url: string };
  articles: readonly { source: string; url: string }[];
}): Array<{ name: string; url: string }> {
  const seen = new Set<string>([cluster.lead.source]);
  const ordered = [{ name: cluster.lead.source, url: cluster.lead.url }];

  for (const article of cluster.articles) {
    if (ordered.length >= MAX_SOURCES_PER_STORY) break;
    if (seen.has(article.source)) continue;
    seen.add(article.source);
    ordered.push({ name: article.source, url: article.url });
  }

  return ordered;
}

/**
 * Which trigger this run is serving, set by the workflow. Anything unrecognised
 * (including a local run) counts as manual — only `failsafe` carries a warning,
 * so it must never be inferred.
 */
function readTrigger(): EditionTrigger {
  const raw = process.env.EDITION_TRIGGER;
  return raw === 'scheduled' || raw === 'failsafe' ? raw : 'manual';
}

export async function generateDraft(now = new Date()): Promise<GenerateResult> {
  const maxStories = Number(process.env.MAX_STORIES ?? DEFAULT_MAX_STORIES);

  const [feedResults, marketResult] = await Promise.all([
    ingestBatch(SOURCES, now, 8),
    fetchMarkets(),
  ]);

  const articles = feedResults.flatMap((result) => result.articles);
  const failed = feedResults.filter((result) => !result.ok).map((result) => result.sourceId);

  const clusters = clusterArticles(articles);
  const ranked = rankClusters(clusters, now);

  const stories: DraftStory[] = selectDraftClusters(ranked, maxStories).map((cluster) => {
    const sources = orderedSources(cluster);

    return {
      id: cluster.id,
      headline: cluster.lead.title,
      category: cluster.category,
      region: cluster.region,
      sources,
      // The card renders one chip per source, so claiming more than it shows
      // ("8 sources" above six links) is just wrong.
      articleCount: Math.min(cluster.independentSources, sources.length),
      publishedAt: cluster.publishedAt,
      score: Number(cluster.score.toFixed(4)),
      sourceText: bestSourceText(cluster),
    };
  });

  // Anything already printed as a story must not reappear in the diary below it.
  const publishedUrls = new Set(stories.flatMap((story) => story.sources.map((s) => s.url)));
  const watchToday: WatchItem[] = buildWatchList(articles, { excludeUrls: publishedUrls });

  const degraded: string[] = [];
  if (failed.length > 0) degraded.push(`sources:${failed.length} feeds unavailable`);
  if (marketResult.failed.length > 0) {
    degraded.push(`markets:${marketResult.failed.join(', ')} unpriced`);
  }

  const draft: DraftEdition = {
    date: riyadhDate(now),
    generatedAt: now.toISOString(),
    publishedVia: readTrigger(),
    degraded,
    stories,
    markets: {
      quotes: marketResult.quotes,
      asOf: now.toISOString(),
      stale: marketResult.failed.length > 0,
      factualSummary: describeMarkets(marketResult.quotes),
    },
    watchToday,
  };

  return {
    draft: draftEditionSchema.parse(draft),
    report: {
      sourcesOk: feedResults.length - failed.length,
      sourcesFailed: failed,
      articles: articles.length,
      clusters: clusters.length,
      multiSourceClusters: clusters.filter((cluster) => cluster.independentSources > 1).length,
      storiesWithText: stories.filter((story) => story.sourceText.length > 0).length,
      marketsFailed: marketResult.failed,
    },
  };
}

export async function publishDraft(draft: DraftEdition): Promise<void> {
  const baseUrl = process.env.API_BASE_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl) throw new Error('API_BASE_URL is required to publish');
  if (!secret) throw new Error('CRON_SECRET is required to publish');

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/admin/edition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': secret },
    body: JSON.stringify(draft),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`publish failed: ${response.status} ${body.slice(0, 400)}`);
  }
  console.log('published:', body);
}

/**
 * True when an edition for today's Riyadh date has already been published.
 *
 * Used by the failsafe schedule so it costs nothing on a normal morning: a
 * second run would spend another few thousand Workers AI neurons against a
 * 10,000/day free allocation to reproduce an edition we already have.
 */
async function todaysEditionExists(now: Date): Promise<boolean> {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) return false;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/edition/latest`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return false;
    const edition = (await response.json()) as { date?: string };
    return edition.date === riyadhDate(now);
  } catch {
    // If we cannot tell, build it — a duplicate is cheaper than a missing brief.
    return false;
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const skipIfFresh = process.argv.includes('--skip-if-fresh');
  const started = Date.now();

  if (skipIfFresh && (await todaysEditionExists(new Date()))) {
    console.error("today's edition is already published — nothing to do");
    return;
  }

  const { draft, report } = await generateDraft();

  console.error(`\n--- generation report (${((Date.now() - started) / 1000).toFixed(1)}s) ---`);
  console.error(`sources ok        : ${report.sourcesOk}/${SOURCES.length}`);
  if (report.sourcesFailed.length > 0) {
    console.error(`sources failed    : ${report.sourcesFailed.join(', ')}`);
  }
  console.error(`articles          : ${report.articles}`);
  console.error(`clusters          : ${report.clusters} (${report.multiSourceClusters} multi-source)`);
  console.error(`stories published : ${draft.stories.length} (${report.storiesWithText} with body text)`);
  console.error(`markets           : ${draft.markets.quotes.length}/9 priced`);
  if (report.marketsFailed.length > 0) {
    console.error(`markets failed    : ${report.marketsFailed.join(', ')}`);
  }
  console.error(`watch today       : ${draft.watchToday.length} items`);

  if (dryRun) {
    console.log(JSON.stringify(draft, null, 2));
    return;
  }

  await publishDraft(draft);
}

// Only run when executed directly, so the functions above stay importable in tests.
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
