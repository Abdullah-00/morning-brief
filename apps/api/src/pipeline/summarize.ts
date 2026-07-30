import type { DraftStory, MarketQuote, StoryCluster } from '@morning-brief/shared';
import { extractiveSummary, restatesHeadline } from '../ai/extractive.js';
import {
  buildMarketPrompt,
  buildStoryPrompt,
  MARKET_SYSTEM_PROMPT,
  STORY_SYSTEM_PROMPT,
} from '../ai/prompt.js';
import { extractJsonObject, parseSummaryResponse, type Summarizer } from '../ai/provider.js';
import { mapWithConcurrency } from '../lib/http.js';

/** Below this there isn't enough reporting to summarise without inventing. */
export const MIN_TEXT_FOR_MODEL = 160;

/**
 * Model calls allowed per edition.
 *
 * Bounded by subrequests, not by cost. Each `env.AI.run()` is a subrequest and
 * the Workers free plan allows 50 per invocation; the markets call plus the D1
 * and KV writes take about six more, so this leaves comfortable headroom. On
 * budget it is cheap: ~39 neurons a call, so even 36 calls is under 15% of the
 * 10,000/day free allocation.
 */
export const DEFAULT_MAX_MODEL_CALLS = 36;

export interface SummarizeOptions {
  /** Null runs everything through the extractive fallback. */
  summarizer: Summarizer | null;
  /** Caps model calls per run — see DEFAULT_MAX_MODEL_CALLS. */
  maxModelCalls?: number;
  concurrency?: number;
}

export interface SummarizeOutcome {
  stories: StoryCluster[];
  /** Reasons any story fell back, for the edition's `degraded` list. */
  degraded: string[];
}

/**
 * Turns draft stories into finished ones.
 *
 * A story only reaches the model if a publisher actually gave us prose to work
 * from. Headline-only items — which is what the proxied wires are — go straight
 * to the extractive path, because asking a model to write three sentences from a
 * headline is asking it to make two of them up.
 */
export async function summarizeStories(
  drafts: readonly DraftStory[],
  options: SummarizeOptions,
): Promise<SummarizeOutcome> {
  const { summarizer, maxModelCalls = DEFAULT_MAX_MODEL_CALLS, concurrency = 4 } = options;

  const eligible = new Set<string>();
  for (const draft of drafts) {
    if (summarizer && draft.sourceText.length >= MIN_TEXT_FOR_MODEL) {
      if (eligible.size >= maxModelCalls) break;
      eligible.add(draft.id);
    }
  }

  let modelFailures = 0;

  const stories = await mapWithConcurrency(drafts, concurrency, async (draft) => {
    if (summarizer && eligible.has(draft.id)) {
      const raw = await summarizer.complete(STORY_SYSTEM_PROMPT, buildStoryPrompt(draft));
      const parsed = parseSummaryResponse(raw);
      // A model that just rephrases the headline has told the reader nothing;
      // treat it as a failed response rather than printing the same sentence
      // twice under different type.
      if (parsed && !restatesHeadline(parsed.summary, draft.headline)) {
        return finalize(draft, parsed.summary, parsed.whyItMatters, true);
      }
      modelFailures += 1;
    }

    const fallback = extractiveSummary(draft);
    return finalize(draft, fallback.summary, fallback.whyItMatters, false);
  });

  const degraded: string[] = [];
  if (!summarizer) {
    degraded.push('summaries:extractive (no model available)');
  } else {
    const textless = drafts.length - eligible.size;
    if (textless > 0) {
      degraded.push(`summaries:extractive for ${textless} headline-only stories`);
    }
    if (modelFailures > 0) {
      degraded.push(`summaries:${modelFailures} model responses rejected`);
    }
  }

  return {
    stories: stories.filter((story): story is StoryCluster => story !== null),
    degraded,
  };
}

function finalize(
  draft: DraftStory,
  summary: string,
  whyItMatters: string,
  aiGenerated: boolean,
): StoryCluster {
  return {
    id: draft.id,
    headline: draft.headline,
    summary: summary.trim(),
    whyItMatters: whyItMatters.trim(),
    category: draft.category,
    region: draft.region,
    sources: draft.sources,
    articleCount: draft.articleCount,
    publishedAt: draft.publishedAt,
    score: draft.score,
    aiGenerated,
  };
}

/**
 * Writes the markets paragraph. The deterministic description is always computed
 * first and passed to the model as grounding, so a model failure costs us
 * phrasing rather than the paragraph.
 */
export async function summarizeMarkets(
  quotes: readonly MarketQuote[],
  factualSummary: string,
  summarizer: Summarizer | null,
): Promise<{ summary: string; aiGenerated: boolean }> {
  if (!summarizer || quotes.length === 0) {
    return { summary: factualSummary, aiGenerated: false };
  }

  const raw = await summarizer.complete(
    MARKET_SYSTEM_PROMPT,
    buildMarketPrompt(quotes, factualSummary),
  );
  if (!raw) return { summary: factualSummary, aiGenerated: false };

  const parsed = extractJsonObject(raw);
  const summary =
    parsed && typeof parsed === 'object' && 'summary' in parsed
      ? (parsed as { summary?: unknown }).summary
      : null;

  if (typeof summary === 'string' && summary.trim().length > 0) {
    return { summary: summary.trim(), aiGenerated: true };
  }
  return { summary: factualSummary, aiGenerated: false };
}
