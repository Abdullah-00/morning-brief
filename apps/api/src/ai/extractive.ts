import type { DraftStory, SummaryResult } from '@morning-brief/shared';
import { CATEGORIES } from '@morning-brief/shared';

/**
 * The floor of the summarisation ladder: no model, no network, no invention.
 *
 * It only ever reuses sentences the publisher wrote, so its output is
 * source-grounded by construction. Stories summarised this way are flagged
 * `aiGenerated: false` and the edition records the degradation.
 */

/** Splits on sentence boundaries without breaking on abbreviations or decimals. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z“"'(])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function extractiveSummary(story: DraftStory): SummaryResult {
  const sentences = splitSentences(story.sourceText);

  // Two or three sentences, per the spec, without running past a paragraph.
  const picked: string[] = [];
  let budget = 420;
  for (const sentence of sentences) {
    if (picked.length >= 3) break;
    if (sentence.length > budget && picked.length > 0) break;
    picked.push(sentence);
    budget -= sentence.length;
  }

  const summary = picked.length > 0 ? picked.join(' ') : story.headline;

  return {
    summary,
    whyItMatters: whyItMattersTemplate(story),
  };
}

/**
 * A stated reason for inclusion rather than an invented consequence. It says why
 * this story is in the brief — corroboration and beat — which is true by
 * construction, instead of guessing at an implication the sources never drew.
 */
function whyItMattersTemplate(story: DraftStory): string {
  const beat = CATEGORIES[story.category].label;
  if (story.articleCount >= 4) {
    return `${story.articleCount} independent outlets are carrying this, among the most widely corroborated ${beat} stories of the morning.`;
  }
  if (story.articleCount > 1) {
    const outlets = story.articleCount === 2 ? 'Two outlets' : `${story.articleCount} outlets`;
    return `${outlets} are carrying this ${beat} story so far.`;
  }
  return `Filed under ${beat}; only one outlet has reported it so far.`;
}
