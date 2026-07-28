import { describe, expect, it } from 'vitest';
import type { Category, MarketsBlock, StoryCluster } from '@morning-brief/shared';
import { composeEdition, selectFrontPage, selectSections } from './compose.js';
import { directionOf } from './markets.js';

function story(id: string, category: Category, score: number, summary = 'A summary.'): StoryCluster {
  return {
    id,
    headline: `Headline ${id}`,
    summary,
    whyItMatters: 'It matters.',
    category,
    region: 'global',
    sources: [{ name: 'Reuters', url: `https://example.com/${id}` }],
    articleCount: 2,
    publishedAt: '2026-07-28T06:00:00.000Z',
    score,
    aiGenerated: true,
  };
}

const markets: MarketsBlock = {
  quotes: [],
  aiSummary: 'Quiet session.',
  asOf: '2026-07-28T06:00:00.000Z',
  stale: false,
};

describe('selectFrontPage', () => {
  it('caps any one category at two of the five slots', () => {
    const stories = [
      story('a', 'ai', 0.9),
      story('b', 'ai', 0.89),
      story('c', 'ai', 0.88),
      story('d', 'saudi', 0.7),
      story('e', 'middleEast', 0.6),
      story('f', 'global', 0.5),
    ];
    const front = selectFrontPage(stories);
    expect(front.filter((s) => s.category === 'ai')).toHaveLength(2);
    expect(front).toHaveLength(5);
  });

  it('excludes stories with no summary from the front page', () => {
    const front = selectFrontPage([story('a', 'ai', 0.9, ''), story('b', 'saudi', 0.5)]);
    expect(front.map((s) => s.id)).toEqual(['b']);
  });
});

describe('selectSections', () => {
  it('routes by category and skips anything already on the front page', () => {
    const front = [story('a', 'ai', 0.9)];
    const sections = selectSections([...front, story('b', 'saudi', 0.5), story('c', 'global', 0.4)], front);
    expect(sections.ai).toHaveLength(0);
    expect(sections.saudi.map((s) => s.id)).toEqual(['b']);
    // `global` prints under US & World.
    expect(sections.usWorld.map((s) => s.id)).toEqual(['c']);
  });

  it('omits radar entirely when it has fewer than two stories', () => {
    const sections = selectSections([story('a', 'cyber', 0.5)], []);
    expect(sections.radar).toBeUndefined();
  });

  it('includes radar once two stories qualify', () => {
    const sections = selectSections([story('a', 'cyber', 0.5), story('b', 'saudiTech', 0.4)], []);
    expect(sections.radar).toHaveLength(2);
  });
});

describe('composeEdition', () => {
  it('produces a schema-valid edition and records degradation', () => {
    const edition = composeEdition({
      date: '2026-07-28',
      generatedAt: '2026-07-28T02:30:00.000Z',
      stories: [story('a', 'ai', 0.9), story('b', 'saudi', 0.8), story('c', 'global', 0.7)],
      markets: { ...markets, stale: true },
      watchToday: [],
      degraded: ['summaries:extractive'],
    });

    expect(edition.frontPage).toHaveLength(3);
    expect(edition.degraded).toContain('markets:stale snapshot');
    expect(edition.status).toBe('live');
  });

  it('rejects an edition that does not satisfy the shared schema', () => {
    expect(() =>
      composeEdition({
        date: '28-07-2026', // wrong format
        generatedAt: '2026-07-28T02:30:00.000Z',
        stories: [],
        markets,
        watchToday: [],
        degraded: [],
      }),
    ).toThrow();
  });
});

describe('directionOf', () => {
  it('reports unknown when the change was withheld', () => {
    expect(directionOf(null)).toBe('unknown');
  });

  it('treats sub-threshold moves as flat', () => {
    expect(directionOf(0.01)).toBe('flat');
    expect(directionOf(1.2)).toBe('up');
    expect(directionOf(-1.2)).toBe('down');
  });
});
