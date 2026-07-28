import { describe, expect, it } from 'vitest';
import { extractJsonObject, parseSummaryResponse, readWorkersAiText } from './provider.js';

describe('readWorkersAiText', () => {
  it('reads a plain string response', () => {
    expect(readWorkersAiText({ response: 'hello' })).toBe('hello');
  });

  /**
   * The regression that made every summary fall back to extraction: when the
   * model returns well-formed JSON, Workers AI parses it and `response` arrives
   * as an object, which a string-only check throws away.
   */
  it('reads a response the platform already parsed into an object', () => {
    const raw = readWorkersAiText({
      response: { summary: 'Two sentences.', whyItMatters: 'One sentence.' },
    });
    expect(parseSummaryResponse(raw)).toEqual({
      summary: 'Two sentences.',
      whyItMatters: 'One sentence.',
    });
  });

  it('reads the OpenAI-compatible choices shape', () => {
    expect(readWorkersAiText({ choices: [{ message: { content: 'text' } }] })).toBe('text');
  });

  it('returns null when there is nothing usable', () => {
    expect(readWorkersAiText(undefined)).toBeNull();
    expect(readWorkersAiText({})).toBeNull();
    expect(readWorkersAiText({ response: 42 })).toBeNull();
  });
});

describe('extractJsonObject', () => {
  it('pulls the object out of surrounding prose', () => {
    expect(extractJsonObject('Sure! {"a":1} Hope that helps.')).toEqual({ a: 1 });
  });

  it('handles fenced code blocks', () => {
    expect(extractJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it('is not fooled by braces inside strings', () => {
    expect(extractJsonObject('{"a":"} not the end {","b":3}')).toEqual({
      a: '} not the end {',
      b: 3,
    });
  });

  it('returns null on malformed output', () => {
    expect(extractJsonObject('no json here')).toBeNull();
    expect(extractJsonObject('{"a": ')).toBeNull();
  });
});

describe('parseSummaryResponse', () => {
  it('rejects output missing a required field', () => {
    expect(parseSummaryResponse('{"summary":"only this"}')).toBeNull();
  });

  it('rejects empty strings', () => {
    expect(parseSummaryResponse('{"summary":"","whyItMatters":"x"}')).toBeNull();
  });
});
