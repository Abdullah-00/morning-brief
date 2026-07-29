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
  draftEditionSchema,
  type DraftEdition,
  type DraftStory,
  type WatchItem,
} from '@morning-brief/shared';
import { SOURCES } from '../src/sources.js';
import { ingestBatch } from '../src/pipeline/ingest.js';
import { clusterArticles, hasBody } from '../src/pipeline/dedupe.js';
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

  const stories: DraftStory[] = ranked.slice(0, maxStories).map((cluster) => {
    // Only the lead carries text worth summarising; the rest corroborate.
    const sourceText = hasBody(cluster.lead) ? cluster.lead.content : '';

    const seen = new Set<string>();
    const sources = cluster.articles
      .filter((article) => {
        if (seen.has(article.source)) return false;
        seen.add(article.source);
        return true;
      })
      .slice(0, 6)
      .map((article) => ({ name: article.source, url: article.url }));

    return {
      id: cluster.id,
      headline: cluster.lead.title,
      category: cluster.category,
      region: cluster.region,
      sources,
      articleCount: cluster.independentSources,
      publishedAt: cluster.publishedAt,
      score: Number(cluster.score.toFixed(4)),
      sourceText,
    };
  });

  const watchToday: WatchItem[] = buildWatchList(articles);

  const degraded: string[] = [];
  if (failed.length > 0) degraded.push(`sources:${failed.length} feeds unavailable`);
  if (marketResult.failed.length > 0) {
    degraded.push(`markets:${marketResult.failed.join(', ')} unpriced`);
  }

  const draft: DraftEdition = {
    date: riyadhDate(now),
    generatedAt: now.toISOString(),
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
