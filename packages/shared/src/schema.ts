import { z } from 'zod';
import { CATEGORY_KEYS, REGION_KEYS, SECTION_KEYS } from './categories';

export const categorySchema = z.enum(CATEGORY_KEYS);
export const regionSchema = z.enum(REGION_KEYS);
export const sectionKeySchema = z.enum(SECTION_KEYS);

/** A single normalised item from one publisher. Spec: Data Pipeline, Step 2. */
export const articleSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  /** Body text: RSS description for Tier A, extracted article text for Tier B. May be empty. */
  content: z.string(),
  source: z.string(),
  sourceCredibility: z.number().min(0).max(1),
  url: z.string().url(),
  publishedAt: z.string().datetime(),
  category: categorySchema,
  region: regionSchema,
});
export type Article = z.infer<typeof articleSchema>;

/** One outbound link shown under a story. */
export const storySourceSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});
export type StorySource = z.infer<typeof storySourceSchema>;

/**
 * A cluster of articles reporting the same event, summarised into one story unit.
 * Spec: Front Page requires headline, summary, why it matters, sources, timestamp,
 * category, and a link to original reporting.
 */
export const storyClusterSchema = z.object({
  id: z.string(),
  headline: z.string().min(1),
  summary: z.string(),
  whyItMatters: z.string(),
  category: categorySchema,
  region: regionSchema,
  sources: z.array(storySourceSchema).min(1),
  /** Count of independent publishers, which is what ranking rewards. */
  articleCount: z.number().int().positive(),
  publishedAt: z.string().datetime(),
  score: z.number(),
  /** False when the summary came from the extractive fallback rather than a model. */
  aiGenerated: z.boolean(),
});
export type StoryCluster = z.infer<typeof storyClusterSchema>;

/** `unknown` means we hold a price but no trustworthy reference to change against. */
export const marketDirectionSchema = z.enum(['up', 'down', 'flat', 'unknown']);
export type MarketDirection = z.infer<typeof marketDirectionSchema>;

/** Spec: Markets Dashboard — value, % change, direction, timestamp. */
export const marketQuoteSchema = z.object({
  symbol: z.string(),
  label: z.string(),
  value: z.number(),
  /** Null when the provider's reference close failed validation — printed as "—". */
  changePercent: z.number().nullable(),
  direction: marketDirectionSchema,
  currency: z.string(),
  asOf: z.string().datetime(),
});
export type MarketQuote = z.infer<typeof marketQuoteSchema>;

export const marketsBlockSchema = z.object({
  quotes: z.array(marketQuoteSchema),
  aiSummary: z.string(),
  asOf: z.string().datetime(),
  stale: z.boolean(),
});
export type MarketsBlock = z.infer<typeof marketsBlockSchema>;

export const watchKindSchema = z.enum([
  'earnings',
  'macro',
  'centralBank',
  'geopolitical',
  'announcement',
]);
export type WatchKind = z.infer<typeof watchKindSchema>;

/** Spec: What to Watch Today. */
export const watchItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: watchKindSchema,
  /** Free-form when-label ("Today", "14:30 GST"), not a strict timestamp. */
  when: z.string(),
  sourceUrl: z.string().url().nullable(),
});
export type WatchItem = z.infer<typeof watchItemSchema>;

/** Masthead status. `updating` means a chunked pipeline run is still in flight. */
export const editionStatusSchema = z.enum(['live', 'updating', 'stale']);
export type EditionStatus = z.infer<typeof editionStatusSchema>;

export const editionSectionsSchema = z.object({
  ai: z.array(storyClusterSchema),
  saudi: z.array(storyClusterSchema),
  middleEast: z.array(storyClusterSchema),
  usWorld: z.array(storyClusterSchema),
  /** Spec: "Only shown when meaningful stories exist" — absent, not empty, when sparse. */
  radar: z.array(storyClusterSchema).optional(),
});
export type EditionSections = z.infer<typeof editionSectionsSchema>;

export const editionSchema = z.object({
  /** Riyadh calendar date, YYYY-MM-DD. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generatedAt: z.string().datetime(),
  status: editionStatusSchema,
  /** Names the fallbacks that fired this run, e.g. ["summaries:extractive"]. */
  degraded: z.array(z.string()),
  frontPage: z.array(storyClusterSchema),
  sections: editionSectionsSchema,
  markets: marketsBlockSchema,
  watchToday: z.array(watchItemSchema),
});
export type Edition = z.infer<typeof editionSchema>;

/** Model output contract for one story. Spec: Step 5, structured JSON output. */
export const summaryResultSchema = z.object({
  summary: z.string().min(1),
  whyItMatters: z.string().min(1),
});
export type SummaryResult = z.infer<typeof summaryResultSchema>;

// ---------------------------------------------------------------------------
// Draft edition — the handoff between the generator and the Worker
// ---------------------------------------------------------------------------

/**
 * A clustered, ranked, but not yet summarised story.
 *
 * The generator produces these; the Worker turns them into StoryClusters by
 * writing the summary and "why it matters". `sourceText` is the only material
 * the model is given, so a story with none can never be summarised into
 * something we cannot support.
 */
export const draftStorySchema = z.object({
  id: z.string(),
  headline: z.string().min(1),
  category: categorySchema,
  region: regionSchema,
  sources: z.array(storySourceSchema).min(1),
  articleCount: z.number().int().positive(),
  publishedAt: z.string().datetime(),
  score: z.number(),
  /** Body text from the lead article, capped. Empty when no publisher served any. */
  sourceText: z.string(),
});
export type DraftStory = z.infer<typeof draftStorySchema>;

export const draftEditionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generatedAt: z.string().datetime(),
  degraded: z.array(z.string()),
  stories: z.array(draftStorySchema),
  markets: z.object({
    quotes: z.array(marketQuoteSchema),
    asOf: z.string().datetime(),
    stale: z.boolean(),
    /** Deterministic description of the numbers, used to ground the model. */
    factualSummary: z.string(),
  }),
  watchToday: z.array(watchItemSchema),
});
export type DraftEdition = z.infer<typeof draftEditionSchema>;
