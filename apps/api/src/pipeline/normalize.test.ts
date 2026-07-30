import { describe, expect, it } from 'vitest';
import { canonicalizeUrl, cleanBody, cleanPublisherName, isNoise, splitGoogleNewsTitle } from './normalize.js';

describe('canonicalizeUrl', () => {
  it('strips tracking parameters and normalises the host', () => {
    expect(canonicalizeUrl('http://www.Example.com/story?utm_source=x&id=7#top')).toBe(
      'https://example.com/story?id=7',
    );
  });

  it('makes the same article with different tails identical', () => {
    expect(canonicalizeUrl('https://a.com/s/?ref=twitter')).toBe(canonicalizeUrl('https://a.com/s'));
  });

  it('returns the input unchanged when it is not a URL', () => {
    expect(canonicalizeUrl('not a url')).toBe('not a url');
  });
});

describe('splitGoogleNewsTitle', () => {
  it('separates the publisher suffix Google News appends', () => {
    expect(splitGoogleNewsTitle('Netanyahu arrives in the US - Arab News')).toEqual({
      title: 'Netanyahu arrives in the US',
      publisher: 'Arab News',
    });
  });

  it('leaves a title without a suffix alone', () => {
    expect(splitGoogleNewsTitle('Markets fall sharply').publisher).toBeNull();
  });
});

describe('cleanBody', () => {
  it('removes trailing syndication footers', () => {
    expect(cleanBody('Microsoft shipped a model. The post Microsoft Ships appeared first on SecurityWeek.')).toBe(
      'Microsoft shipped a model.',
    );
  });

  it('removes leading newsletter promos', () => {
    const input =
      'This story originally appeared in The Algorithm, our weekly newsletter on AI. Reading the account was alarming.';
    expect(cleanBody(input)).toBe('Reading the account was alarming.');
  });
});

describe('cleanPublisherName', () => {
  it('drops the domain suffix', () => {
    expect(cleanPublisherName('Bloomberg.com', 'Bloomberg')).toBe('Bloomberg');
  });

  it('falls back when the name has no latin characters', () => {
    expect(cleanPublisherName('وكالة الأنباء السعودية', 'Saudi Press Agency')).toBe(
      'Saudi Press Agency',
    );
  });
});

describe('isNoise', () => {
  it('drops sports and entertainment filler', () => {
    expect(isNoise('France turn to Zidane as coach in long-awaited homecoming')).toBe(true);
    expect(isNoise('Box office: sequel tops the weekend chart')).toBe(true);
  });

  it('keeps a story that also carries a signal term', () => {
    expect(isNoise('PIF completes acquisition of a Premier League football club')).toBe(false);
  });

  it('keeps ordinary news', () => {
    expect(isNoise('Oil prices slide after OPEC+ signals higher output')).toBe(false);
  });
});

describe('cleanBody — aggregator metadata', () => {
  /** One story was summarised as "discussed in 101 comments on a post with 145 points". */
  it('strips Hacker News link and score metadata, leaving no prose', () => {
    const hn =
      'Article URL: https://example.com/post Comments URL: https://news.ycombinator.com/item?id=1 Points: 145 # Comments: 101';
    expect(cleanBody(hn)).toBe('');
  });

  it('keeps real prose that happens to mention points', () => {
    expect(cleanBody('The index gained 45 points on Thursday.')).toContain('gained 45 points');
  });
});
