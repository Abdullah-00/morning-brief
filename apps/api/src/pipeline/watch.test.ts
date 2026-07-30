import { describe, expect, it } from 'vitest';
import type { Article } from '@morning-brief/shared';
import { buildWatchList } from './watch.js';

function article(title: string, extras: Partial<Article> = {}): Article {
  return {
    id: title.slice(0, 8),
    title,
    content: 'Some supporting body text that will be scanned for timing words.',
    source: 'Reuters',
    sourceCredibility: 0.9,
    url: `https://example.com/${encodeURIComponent(title.slice(0, 24))}`,
    publishedAt: '2026-07-30T06:00:00.000Z',
    category: 'markets',
    region: 'global',
    ...extras,
  };
}

describe('buildWatchList', () => {
  it('keeps a genuinely forward-looking event', () => {
    const items = buildWatchList([article('Amazon due to report earnings after the bell')]);
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe('earnings');
  });

  /** Four of six items in one edition were things that had already happened. */
  it('rejects an event that has already happened', () => {
    expect(buildWatchList([article('A divided Fed votes to hold rates steady')])).toHaveLength(0);
    expect(
      buildWatchList([article('Bitcoin prices today: prices rise after Fed leaves rates unchanged')]),
    ).toHaveLength(0);
  });

  /**
   * The kind patterns used to match the article body, so a passing mention of
   * the Fed filed a crypto price page as a central bank decision.
   */
  it('requires the calendar signal in the headline, not the body', () => {
    const items = buildWatchList([
      article('Everything you need to know about our new app', {
        content: 'The Federal Reserve will announce its rate decision and CPI data is expected.',
      }),
    ]);
    expect(items).toHaveLength(0);
  });

  it('drops items already published as stories', () => {
    const duplicate = article('Amazon due to report earnings after the bell');
    const items = buildWatchList([duplicate], { excludeUrls: new Set([duplicate.url]) });
    expect(items).toHaveLength(0);
  });

  it('does not list the same event twice under near-identical headlines', () => {
    const items = buildWatchList([
      article('Apple due to report earnings after the bell today'),
      article('Apple is due to report its earnings after the bell today'),
    ]);
    expect(items).toHaveLength(1);
  });

  it('caps how many items of one kind it will print', () => {
    const items = buildWatchList([
      article('Apple due to report earnings on Monday'),
      article('Amazon expected to report earnings on Tuesday'),
      article('Meta scheduled to report earnings on Wednesday'),
      article('Microsoft set to report earnings on Thursday'),
    ]);
    expect(items.length).toBeLessThanOrEqual(2);
  });
});
