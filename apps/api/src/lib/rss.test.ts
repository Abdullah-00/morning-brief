import { describe, expect, it } from 'vitest';
import { decodeEntities, parseFeed, parseFeedDate, stripHtml } from './rss.js';

describe('parseFeedDate', () => {
  it('parses RFC 822 dates', () => {
    expect(parseFeedDate('Tue, 28 Jul 2026 12:22:06 GMT')).toBe('2026-07-28T12:22:06.000Z');
  });

  /** Wamda stamps its feed EEST; every item was being dropped for want of a date. */
  it('handles timezone abbreviations Date() rejects', () => {
    expect(parseFeedDate('Tue, 28 Jul 2026 12:22:06 EEST')).toBe('2026-07-28T09:22:06.000Z');
  });

  it('rejects unparseable and out-of-range dates', () => {
    expect(parseFeedDate('not a date')).toBeNull();
    expect(parseFeedDate('Tue, 28 Jul 1899 12:00:00 GMT')).toBeNull();
    expect(parseFeedDate(null)).toBeNull();
  });
});

describe('stripHtml', () => {
  it('removes markup and collapses whitespace', () => {
    expect(stripHtml('<p>Hello   <b>world</b></p>')).toBe('Hello world');
  });

  it('decodes doubly-encoded markup', () => {
    expect(stripHtml('&amp;lt;p&amp;gt;Text&amp;lt;/p&amp;gt;')).toBe('Text');
  });

  it('strips zero-width characters that break word matching', () => {
    expect(stripHtml('An​earth‍quake')).toBe('Anearthquake');
  });
});

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('AT&amp;T &#8212; &#x2019;s')).toBe('AT&T — ’s');
  });
});

describe('parseFeed', () => {
  const rss = `<?xml version="1.0"?><rss><channel>
    <item>
      <title><![CDATA[Oil slides on demand worries]]></title>
      <link>https://example.com/oil</link>
      <description><![CDATA[<p>Brent fell 2%.</p>]]></description>
      <pubDate>Tue, 28 Jul 2026 06:00:00 GMT</pubDate>
      <source url="https://reuters.com">Reuters</source>
    </item>
    <item>
      <title>No link here</title>
    </item>
  </channel></rss>`;

  it('parses items and skips malformed ones', () => {
    const items = parseFeed(rss);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Oil slides on demand worries',
      link: 'https://example.com/oil',
      description: 'Brent fell 2%.',
      publisher: 'Reuters',
    });
  });

  it('reads Atom entries with href links', () => {
    const atom = `<feed><entry>
      <title>Model released</title>
      <link rel="alternate" href="https://example.com/model"/>
      <summary>Details here.</summary>
      <published>2026-07-28T05:00:00Z</published>
    </entry></feed>`;
    expect(parseFeed(atom)[0]?.link).toBe('https://example.com/model');
  });

  it('caps how many items it will parse', () => {
    const many = `<rss><channel>${'<item><title>A headline long enough</title><link>https://e.com/x</link></item>'.repeat(200)}</channel></rss>`;
    expect(parseFeed(many, 10)).toHaveLength(10);
  });
});
