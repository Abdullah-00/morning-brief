import { describe, expect, it, vi } from 'vitest';
import { dispatchEditionWorkflow } from './github.js';

const env = {
  GITHUB_TOKEN: 'test-token',
  GITHUB_REPO: 'owner/repo',
  GITHUB_WORKFLOW: 'edition.yml',
  GITHUB_REF: 'main',
};

/** 204 is a null-body status; passing even an empty string throws. */
function response(status: number, body: string | null = null): Response {
  return new Response(status === 204 ? null : (body ?? ''), { status });
}

describe('dispatchEditionWorkflow', () => {
  it('posts to the workflow dispatch endpoint and treats 204 as success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(204));
    const result = await dispatchEditionWorkflow(env, fetchMock as unknown as typeof fetch);

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/owner/repo/actions/workflows/edition.yml/dispatches');
    expect(init.method).toBe('POST');
    // The trigger travels with the dispatch so the edition can record its own
    // provenance, which is what surfaces a failsafe publish on the masthead.
    expect(JSON.parse(String(init.body))).toEqual({
      ref: 'main',
      inputs: { trigger: 'scheduled' },
    });

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
    // GitHub rejects API calls without a User-Agent.
    expect(headers['User-Agent']).toBeTruthy();
  });

  it('reports a missing token instead of calling out', async () => {
    const fetchMock = vi.fn();
    const result = await dispatchEditionWorkflow({ GITHUB_REPO: 'o/r' }, fetchMock as unknown as typeof fetch);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/GITHUB_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed repository', async () => {
    const result = await dispatchEditionWorkflow({ ...env, GITHUB_REPO: 'norepo' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/owner\/repo/);
  });

  it('does not retry a 404, which retrying cannot fix', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(404, 'Not Found'));
    const result = await dispatchEditionWorkflow(env, fetchMock as unknown as typeof fetch);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on a server error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(502))
      .mockResolvedValueOnce(response(204));
    const result = await dispatchEditionWorkflow(env, fetchMock as unknown as typeof fetch);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns an error rather than throwing when the network fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('connection reset'));
    const result = await dispatchEditionWorkflow(env, fetchMock as unknown as typeof fetch);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/connection reset/);
  });
});
