import { describe, expect, it } from 'vitest';
import type { Article } from '@morning-brief/shared';
import { clusterArticles, containment, jaccard, normalizeTitle, trigrams } from './dedupe.js';

/**
 * The URL is derived from the full title and the source, not a prefix of the
 * title: two rewordings of one event share their opening words, and a prefix
 * would collide in the exact-URL pass before the similarity rules were reached.
 */
function article(overrides: Partial<Article> & { title: string; source: string }): Article {
  const url =
    overrides.url ?? `https://example.com/${encodeURIComponent(`${overrides.source}-${overrides.title}`)}`;
  return {
    content: 'x'.repeat(300),
    sourceCredibility: 0.8,
    publishedAt: '2026-07-28T06:00:00.000Z',
    category: 'global',
    region: 'global',
    ...overrides,
    url,
    id: url,
  } as Article;
}

describe('normalizeTitle', () => {
  it('drops stopwords and punctuation', () => {
    expect(normalizeTitle('The Fed is set to CUT rates, again!')).toBe('fed set cut rates again');
  });
});

describe('jaccard / containment', () => {
  it('scores identical text as 1 and disjoint text as 0', () => {
    expect(jaccard(trigrams('hello world'), trigrams('hello world'))).toBe(1);
    expect(jaccard(trigrams('abc'), trigrams('xyz'))).toBe(0);
  });

  it('measures overlap against the smaller set', () => {
    expect(containment(3, new Set(['a', 'b', 'c', 'd']), new Set(['a', 'b', 'c']))).toBe(1);
  });
});

describe('clusterArticles', () => {
  it('collapses the same URL reported twice', () => {
    const clusters = clusterArticles([
      article({ title: 'Oil prices slide on demand worries', source: 'Reuters', url: 'https://x.com/a' }),
      article({ title: 'Oil prices slide on demand worries', source: 'AP', url: 'https://x.com/a' }),
    ]);
    expect(clusters).toHaveLength(1);
  });

  it('merges rewordings of one event across outlets', () => {
    const clusters = clusterArticles([
      article({ title: 'Oman presented regional mechanism for Hormuz to Iran, source says', source: 'Reuters' }),
      article({ title: 'Oman presents Iran with Gulf-backed plan for voluntary fees to use Hormuz', source: 'Al-Monitor' }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.independentSources).toBe(2);
  });

  it('keeps unrelated stories apart', () => {
    const clusters = clusterArticles([
      article({ title: 'Chad says it will withdraw from the International Criminal Court', source: 'AFP' }),
      article({ title: 'Saudi foreign minister holds talks with Qatar and Kuwait', source: 'SPA' }),
    ]);
    expect(clusters).toHaveLength(2);
  });

  /**
   * Guards the two failures that made the containment rule usable: template
   * headlines sharing only newsroom vocabulary must never merge.
   */
  it('does not merge different funding rounds that share only generic words', () => {
    const clusters = clusterArticles([
      article({ title: 'OT Security Startup Frenos Raises $1.52 Million', source: 'SecurityWeek' }),
      article({ title: 'AI Startup Dwelly Raises $170 Million for Real Estate Rollup', source: 'Bloomberg' }),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it('does not merge separate diplomatic phone calls', () => {
    const clusters = clusterArticles([
      article({ title: 'Foreign Minister Receives Phone Call from Qatari Counterpart', source: 'SPA' }),
      article({ title: 'Foreign Minister Holds Phone Call with UK Foreign Secretary', source: 'SPA' }),
      article({ title: 'Crown Prince and Iranian President Discuss Regional Developments', source: 'SPA' }),
    ]);
    expect(clusters).toHaveLength(3);
  });

  it('leads with an article that has body text over a bodyless wire', () => {
    const clusters = clusterArticles([
      article({
        title: 'Nvidia employee detained in Taiwan over chip smuggling',
        source: 'Reuters',
        sourceCredibility: 0.95,
        content: '',
      }),
      article({
        title: 'Nvidia employee detained in Taiwan in chip smuggling probe',
        source: "Tom's Hardware",
        sourceCredibility: 0.7,
        content: 'Taiwan prosecutors said on Tuesday they had detained an employee. '.repeat(6),
      }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.lead.source).toBe("Tom's Hardware");
  });

  it('files a cluster by plurality rather than the highest-priority member', () => {
    const clusters = clusterArticles([
      article({ title: 'Powerful earthquake strikes southern Japan', source: 'AP', category: 'global' }),
      article({ title: 'Strong earthquake hits southern Japan, tsunami warning', source: 'Reuters', category: 'global' }),
      article({ title: 'Earthquake rocks southern Japan prefecture', source: 'The National', category: 'middleEast' }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.category).toBe('global');
  });
});
