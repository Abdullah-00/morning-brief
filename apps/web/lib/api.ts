import { editionSchema, type Edition } from '@morning-brief/shared';
import { MOCK_EDITION } from './mock-edition';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787';

export interface EditionLoad {
  edition: Edition;
  /** True when the API could not be reached and the fixture is being shown. */
  isFallback: boolean;
  error?: string;
}

/**
 * Loads the latest edition.
 *
 * Falling back to a fixture keeps the UI developable with no backend running,
 * but the caller is told which it got — a fixture must never be mistaken for
 * this morning's news, so the masthead labels it.
 */
export async function loadLatestEdition(): Promise<EditionLoad> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/edition/latest`, {
      // The API answers from KV and sets its own Cache-Control; caching again
      // here would only add a second, staler layer in front of it.
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        edition: MOCK_EDITION,
        isFallback: true,
        error: `API responded ${response.status}`,
      };
    }

    const parsed = editionSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { edition: MOCK_EDITION, isFallback: true, error: 'edition failed schema validation' };
    }

    return { edition: parsed.data, isFallback: false };
  } catch (error) {
    return {
      edition: MOCK_EDITION,
      isFallback: true,
      error: error instanceof Error ? error.message : 'network error',
    };
  }
}
