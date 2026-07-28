import type { DraftStory, MarketQuote } from '@morning-brief/shared';

/**
 * Prompts for the summarisation step. Spec Step 5 sets the rules: no
 * hallucination, no speculation, no political bias, source-grounded.
 *
 * The strongest guard is structural rather than textual — the model is handed
 * only the publisher's own text and told the text is all it has. Stories with no
 * body never reach a model at all (see summarize.ts).
 */

export const STORY_SYSTEM_PROMPT = `You are a wire editor for a daily morning briefing.

You will be given the text of a news report. Write a factual digest of it.

Rules, in order of importance:
1. Use ONLY facts present in the supplied text. You have no other knowledge of this story.
2. If the text does not support a claim, leave the claim out. Never fill a gap with what is usually true.
3. Do not speculate about consequences, motives, or what happens next.
4. No political slant. Attribute contested claims to whoever made them.
5. Plain declarative sentences. No hype, no adjectives of scale, no editorialising.

Respond with a JSON object only, no prose around it, in exactly this shape:
{"summary": "2-3 sentences of what happened", "whyItMatters": "1 sentence on the concrete significance, grounded in the text"}`;

export function buildStoryPrompt(story: DraftStory): string {
  const outlets = story.sources.map((source) => source.name).join(', ');
  return `Headline: ${story.headline}
Reported by: ${outlets}
Number of outlets carrying it: ${story.articleCount}

Report text:
"""
${story.sourceText.slice(0, 3_500)}
"""

Write the JSON object now.`;
}

export const MARKET_SYSTEM_PROMPT = `You are a markets writer for a daily morning briefing.

You will be given the closing figures for a set of instruments. Write 2-3 sentences describing what the numbers show.

Rules:
1. Use ONLY the supplied figures. Do not add context, history, or causes — you do not know why anything moved.
2. Never explain a move. Describe it.
3. If an instrument's change is listed as unavailable, do not mention its change at all.
4. Plain declarative sentences.

Respond with a JSON object only: {"summary": "your 2-3 sentences"}`;

export function buildMarketPrompt(quotes: readonly MarketQuote[], factual: string): string {
  const table = quotes
    .map((quote) => {
      const change =
        quote.changePercent === null
          ? 'change unavailable'
          : `${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent}%`;
      return `${quote.label}: ${quote.value} ${quote.currency} (${change})`;
    })
    .join('\n');

  return `Figures:
${table}

Computed summary of the same figures: ${factual}

Write the JSON object now.`;
}
