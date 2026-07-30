import { describe, expect, it } from 'vitest';
import type { DraftStory } from '@morning-brief/shared';
import { extractiveSummary, restatesHeadline, splitSentences } from './extractive.js';

function draft(overrides: Partial<DraftStory> & { headline: string }): DraftStory {
  return {
    id: 'x',
    category: 'global',
    region: 'global',
    sources: [{ name: 'Reuters', url: 'https://example.com/a' }],
    articleCount: 2,
    publishedAt: '2026-07-30T06:00:00.000Z',
    score: 0.8,
    sourceText: '',
    ...overrides,
  };
}

describe('restatesHeadline', () => {
  it('catches an exact repeat regardless of punctuation and case', () => {
    expect(restatesHeadline('Oil prices slide on demand worries', 'Oil prices slide on demand worries!')).toBe(true);
  });

  it('catches the headline plus a couple of filler words', () => {
    expect(restatesHeadline('Oil prices slide on demand worries today', 'Oil prices slide on demand worries')).toBe(true);
  });

  it('treats an empty summary as a restatement', () => {
    expect(restatesHeadline('', 'Anything')).toBe(true);
  });

  it('accepts a summary that adds detail', () => {
    expect(
      restatesHeadline(
        'Brent fell 2.1% to $86.57 after OPEC+ signalled higher output from September.',
        'Oil prices slide on demand worries',
      ),
    ).toBe(false);
  });
});

describe('extractiveSummary', () => {
  /**
   * The defect this whole change exists for: with no prose, the fallback used to
   * return the headline, so the card printed the same sentence twice.
   */
  it('returns an empty summary rather than the headline when there is no prose', () => {
    const result = extractiveSummary(draft({ headline: 'Samsung sees robust AI demand', sourceText: '' }));
    expect(result.summary).toBe('');
    expect(result.summary).not.toBe('Samsung sees robust AI demand');
  });

  it('returns empty when the only prose merely repeats the headline', () => {
    const headline = 'US issues new Iran-related sanctions targeting insurers and tankers';
    expect(extractiveSummary(draft({ headline, sourceText: headline })).summary).toBe('');
  });

  it('extracts short prose that the old 160-char floor discarded', () => {
    const result = extractiveSummary(
      draft({
        headline: 'Oil prices slide',
        sourceText: 'Brent fell 2.1% to $86.57 a barrel after OPEC+ signalled higher output.',
      }),
    );
    expect(result.summary).toContain('86.57');
  });

  it('ignores prose too short to say anything', () => {
    expect(extractiveSummary(draft({ headline: 'Oil prices slide', sourceText: 'Brent fell.' })).summary).toBe('');
  });

  it('takes at most three sentences', () => {
    const sourceText = 'One happened here. Two happened there. Three followed after. Four is extra detail.';
    const result = extractiveSummary(draft({ headline: 'Several things happened', sourceText }));
    expect(splitSentences(result.summary)).toHaveLength(3);
  });

  /** The old template answered a different question than the heading asked. */
  it('never emits a templated "why it matters"', () => {
    const result = extractiveSummary(
      draft({
        headline: 'Oil prices slide',
        sourceText: 'Brent fell 2.1% to $86.57 a barrel after OPEC+ signalled higher output.',
      }),
    );
    expect(result.whyItMatters).toBe('');
  });
});
