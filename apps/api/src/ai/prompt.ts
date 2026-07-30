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

You will be given a headline and the text of a news report. The reader has already read the headline. Your job is to tell them what the headline does not.

Rules, in order of importance:
1. Use ONLY facts present in the supplied text. You have no other knowledge of this story.
2. If the text does not support a claim, leave the claim out. Never fill a gap with what is usually true.
3. NEVER restate the headline. Every sentence must add specifics the headline omits: figures, names, dates, amounts, locations, who said what. If the text offers no such detail, write the single most useful fact it does contain rather than padding.
4. Do not forecast or speculate about what happens next. For "whyItMatters", state a concrete consequence or stake that the text itself establishes — what changes, for whom, by how much. Do not restate what the story is; say what it bears on. If the text supports nothing beyond the events themselves, return an empty string for whyItMatters rather than a circular sentence.
5. No political slant. Attribute contested claims to whoever made them.
6. Plain declarative sentences. No hype, no adjectives of scale, no editorialising. Never begin with "The report discusses", "This article covers" or similar.

Respond with a JSON object only, no prose around it, in exactly this shape:
{"summary": "2-3 sentences of concrete detail from the text", "whyItMatters": "1 sentence on the stake, or an empty string"}`;

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
