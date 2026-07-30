import { describe, expect, it } from 'vitest';
import { bestSourceText, orderedSources, selectDraftClusters } from './generate.js';

const article = (title: string, content = '', source = 'Reuters', url = `https://e.com/${title.slice(0, 8)}`) => ({
  title,
  content,
  source,
  url,
});

describe('bestSourceText', () => {
  it('prefers the lead article own body', () => {
    const lead = article('Oil slides', 'Brent fell 2% on demand worries after OPEC signalled more output.');
    expect(bestSourceText({ lead, articles: [lead, article('Oil slides again', 'x'.repeat(900))] })).toContain('Brent');
  });

  it('borrows a corroborating body when the lead has none', () => {
    const lead = article('Oman presents Iran with Hormuz plan');
    const other = article('Oman presents Iran with a Hormuz plan', 'Oman handed Tehran a Gulf-backed proposal on Tuesday.');
    expect(bestSourceText({ lead, articles: [lead, other] })).toContain('Tehran');
  });

  /**
   * A mis-clustered article once supplied text about "an agentic data control
   * plane" to a story headlined "Battery Startup Raises $550 Million".
   */
  it('refuses to borrow text from an unrelated headline', () => {
    const lead = article('Battery Startup Raises $550 Million Amid Boom in AI Data Centers');
    const unrelated = article(
      'Cyera acquires Oasis Security to manage non-human identities',
      'The company will accelerate investments to expand its agentic data control plane.',
    );
    expect(bestSourceText({ lead, articles: [lead, unrelated] })).toBe('');
  });
});

describe('orderedSources', () => {
  it('puts the lead first so the headline links to its own article', () => {
    const lead = article('Lead story', '', 'Al-Monitor', 'https://e.com/lead');
    const first = article('Other', '', 'Reuters', 'https://e.com/other');
    const sources = orderedSources({ lead, articles: [first, lead] });
    expect(sources[0]).toEqual({ name: 'Al-Monitor', url: 'https://e.com/lead' });
  });

  it('does not list one outlet twice', () => {
    const lead = article('Lead', '', 'Reuters', 'https://e.com/1');
    const dupe = article('Other', '', 'Reuters', 'https://e.com/2');
    expect(orderedSources({ lead, articles: [lead, dupe] })).toHaveLength(1);
  });
});

describe('selectDraftClusters', () => {
  /** Cyber cannot outrank AI by arithmetic, so it needs a reserved quota. */
  it('includes low-ranking sections that the global cutoff would exclude', () => {
    const ranked = [
      ...Array.from({ length: 30 }, (_, i) => ({ id: `ai${i}`, category: 'ai' as const })),
      { id: 'cyber1', category: 'cyber' as const },
      { id: 'markets1', category: 'markets' as const },
    ];
    const ids = selectDraftClusters(ranked, 10, 2).map((c) => c.id);
    expect(ids).toContain('cyber1');
    expect(ids).toContain('markets1');
  });

  it('does not duplicate a cluster that satisfies both the global cut and a quota', () => {
    const ranked = [{ id: 'a', category: 'ai' as const }, { id: 'b', category: 'saudi' as const }];
    expect(selectDraftClusters(ranked, 5, 2)).toHaveLength(2);
  });
});
