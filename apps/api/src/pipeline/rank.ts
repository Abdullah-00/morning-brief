import { CATEGORIES } from '@morning-brief/shared';
import type { ArticleCluster } from './dedupe.js';
import { hoursBetween } from '../lib/time.js';

/**
 * Importance scoring. Spec: Step 4 — global impact, source credibility, number
 * of independent sources, recency, and relevance to Saudi/Middle East/AI.
 *
 * "Global impact" is not directly observable, so it is approximated by the
 * category priority (the spec's own ordering) plus corroboration: an event that
 * several independent newsrooms all chose to cover is, empirically, a bigger
 * event than one that only a single outlet ran.
 */

export const WEIGHTS = {
  category: 0.35,
  credibility: 0.15,
  corroboration: 0.2,
  recency: 0.2,
  region: 0.1,
} as const;

/** Half-life in hours for the recency term. A morning brief is about today. */
export const RECENCY_HALF_LIFE_HOURS = 12;

export function recencyScore(publishedAt: string, now: Date = new Date()): number {
  const age = Math.max(0, hoursBetween(publishedAt, now));
  if (!Number.isFinite(age)) return 0;
  return 2 ** (-age / RECENCY_HALF_LIFE_HOURS);
}

/** Saturating: the jump from 1 to 3 outlets matters far more than 8 to 10. */
export function corroborationScore(independentSources: number): number {
  return Math.min(1, Math.log1p(Math.max(0, independentSources - 1)) / Math.log(6));
}

export function averageCredibility(cluster: ArticleCluster): number {
  if (cluster.articles.length === 0) return 0;
  const total = cluster.articles.reduce((sum, article) => sum + article.sourceCredibility, 0);
  return total / cluster.articles.length;
}

export function scoreCluster(cluster: ArticleCluster, now: Date = new Date()): number {
  const meta = CATEGORIES[cluster.category];
  return (
    WEIGHTS.category * meta.weight +
    WEIGHTS.credibility * averageCredibility(cluster) +
    WEIGHTS.corroboration * corroborationScore(cluster.independentSources) +
    WEIGHTS.recency * recencyScore(cluster.publishedAt, now) +
    WEIGHTS.region * meta.regionBoost
  );
}

export interface ScoredCluster extends ArticleCluster {
  score: number;
}

/** Scores every cluster and returns them highest-first. */
export function rankClusters(
  clusters: readonly ArticleCluster[],
  now: Date = new Date(),
): ScoredCluster[] {
  return clusters
    .map((cluster) => ({ ...cluster, score: scoreCluster(cluster, now) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
}
