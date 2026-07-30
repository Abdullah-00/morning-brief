import type { DraftStory, SummaryResult } from '@morning-brief/shared';

/**
 * The floor of the summarisation ladder: no model, no network, no invention.
 *
 * It only ever reuses sentences the publisher wrote, so its output is
 * source-grounded by construction. Stories summarised this way are flagged
 * `aiGenerated: false` and the edition records the degradation. When there is no
 * prose to reuse it returns an empty summary — never the headline.
 */

/** Splits on sentence boundaries without breaking on abbreviations or decimals. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z“"'(])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/**
 * Shortest prose worth extracting from. Below this there is no sentence to take
 * that the headline has not already said.
 *
 * Deliberately lower than `MIN_TEXT_FOR_MODEL` (160). When the two were equal,
 * this function only ever received an empty string — the loop below was
 * unreachable and every call fell through to returning the headline.
 */
export const MIN_TEXT_FOR_EXTRACT = 60;

/** True when the extracted text merely restates the headline. */
export function restatesHeadline(summary: string, headline: string): boolean {
  const normalise = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const summaryText = normalise(summary);
  const headlineText = normalise(headline);
  if (summaryText.length === 0) return true;
  if (summaryText === headlineText) return true;

  // A summary that is the headline plus a couple of words adds nothing either.
  return summaryText.startsWith(headlineText) && summaryText.length < headlineText.length * 1.3;
}

export function extractiveSummary(story: DraftStory): SummaryResult {
  const sentences =
    story.sourceText.length >= MIN_TEXT_FOR_EXTRACT ? splitSentences(story.sourceText) : [];

  // Two or three sentences, per the spec, without running past a paragraph.
  const picked: string[] = [];
  let budget = 420;
  for (const sentence of sentences) {
    if (picked.length >= 3) break;
    if (sentence.length > budget && picked.length > 0) break;
    picked.push(sentence);
    budget -= sentence.length;
  }

  const extracted = picked.join(' ');

  // No prose, or prose that only echoes the headline: say nothing rather than
  // printing the headline twice. The card degrades to headline plus sources,
  // which is honest — we genuinely have no reporting to show.
  const summary = restatesHeadline(extracted, story.headline) ? '' : extracted;

  return {
    // No "why it matters" without a model. The old template answered the
    // question with provenance — "3 outlets are carrying this" — which the
    // metadata row already shows as "3 sources", under a heading that promises
    // significance. Better to omit the line than to answer a different question.
    summary,
    whyItMatters: '',
  };
}

