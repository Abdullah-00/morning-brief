import { summaryResultSchema, type SummaryResult } from '@morning-brief/shared';

/**
 * Text-generation providers behind one interface, so the pipeline never knows or
 * cares which tier answered. Selection order: OpenAI when a key is present,
 * otherwise Workers AI when the binding is bound, otherwise nothing — and the
 * caller falls back to the extractive summariser.
 */

export interface Summarizer {
  readonly name: string;
  /** Returns null on any failure; the caller degrades rather than retries here. */
  complete(systemPrompt: string, userPrompt: string): Promise<string | null>;
}

export interface AiEnv {
  AI?: Ai;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  WORKERS_AI_MODEL?: string;
}

/**
 * Default Workers AI model. An 8B instruct model costs roughly 50–200 neurons
 * per call against a 10,000/day free allocation, so a morning's worth of
 * summaries fits comfortably; a 70B model at 500–2,000 each would not.
 * Override with WORKERS_AI_MODEL.
 *
 * Verified against the live model catalogue, not recalled: the obvious
 * `@cf/meta/llama-3.1-8b-instruct` was retired on 2026-05-30 and the binding
 * answers every call with error 5028. Check
 * `/accounts/{id}/ai/models/search` before changing this.
 */
export const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

interface WorkersAiResponse {
  response?: unknown;
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Reads the generated text out of a Workers AI reply.
 *
 * Three shapes have to be handled. `response` is usually a string, but when the
 * model returns well-formed JSON the platform parses it first and hands back an
 * object — so a naive `typeof === 'string'` check silently discards exactly the
 * responses that were correct, and every story falls back to extraction. Newer
 * OpenAI-compatible models answer with `choices[].message.content` instead.
 */
export function readWorkersAiText(result: WorkersAiResponse | undefined): string | null {
  if (!result) return null;

  if (typeof result.response === 'string') return result.response;

  if (result.response !== null && typeof result.response === 'object') {
    return JSON.stringify(result.response);
  }

  const content = result.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : null;
}

class WorkersAiSummarizer implements Summarizer {
  readonly name: string;

  constructor(
    private readonly ai: Ai,
    private readonly model: string,
  ) {
    this.name = `workers-ai:${model}`;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string | null> {
    try {
      const result = (await this.ai.run(this.model as Parameters<Ai['run']>[0], {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        // Deterministic: a briefing should not reword itself between reruns.
        temperature: 0,
        max_tokens: 400,
      } as never)) as WorkersAiResponse | undefined;

      const text = readWorkersAiText(result);
      if (text === null) {
        // Observability matters more than tidiness here: a summariser that fails
        // silently degrades the whole edition to extraction with no way to tell
        // a broken binding from a model that simply had nothing to say.
        console.error('workers-ai: unusable response shape', JSON.stringify(result)?.slice(0, 300));
      }
      return text;
    } catch (error) {
      console.error('workers-ai: call failed', error instanceof Error ? error.message : error);
      return null;
    }
  }
}

class OpenAiSummarizer implements Summarizer {
  readonly name: string;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {
    this.name = `openai:${model}`;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          max_tokens: 400,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) return null;
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return payload.choices?.[0]?.message?.content ?? null;
    } catch {
      return null;
    }
  }
}

export function selectSummarizer(env: AiEnv): Summarizer | null {
  if (env.OPENAI_API_KEY) {
    return new OpenAiSummarizer(env.OPENAI_API_KEY, env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL);
  }
  if (env.AI) {
    return new WorkersAiSummarizer(env.AI, env.WORKERS_AI_MODEL ?? DEFAULT_WORKERS_AI_MODEL);
  }
  return null;
}

/**
 * Pulls a JSON object out of a model response.
 *
 * Smaller instruct models wrap JSON in prose or fences however firmly you ask
 * them not to, so the first balanced object in the text is extracted rather than
 * trusting the whole response to parse.
 */
export function extractJsonObject(raw: string): unknown | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const text = fenced?.[1] ?? raw;

  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

/** Parses and validates a story summary, returning null if it doesn't conform. */
export function parseSummaryResponse(raw: string | null): SummaryResult | null {
  if (!raw) return null;
  const parsed = extractJsonObject(raw);
  if (!parsed) return null;
  const result = summaryResultSchema.safeParse(parsed);
  return result.success ? result.data : null;
}
