/**
 * Dispatching the edition build.
 *
 * The pipeline runs on a GitHub runner because clustering needs ~200ms of CPU
 * and the Workers free plan allows 10ms. But *when* it runs is a separate
 * question from *where*, and GitHub's `schedule:` event answers it badly: our
 * one scheduled run fired 3h06m late, so a 05:30 Riyadh brief landed at 08:36.
 * Manually dispatched runs, by contrast, start with zero queue delay.
 *
 * So Cloudflare keeps the clock — its Cron Triggers are accurate to about a
 * minute — and simply asks GitHub to start the job.
 */

export interface GithubDispatchEnv {
  /** Fine-grained PAT with Actions: read and write on the repository. */
  GITHUB_TOKEN?: string;
  /** "owner/repo". */
  GITHUB_REPO?: string;
  /** Workflow filename, e.g. "edition.yml". */
  GITHUB_WORKFLOW?: string;
  /** Branch to run against. Defaults to main. */
  GITHUB_REF?: string;
}

export interface DispatchResult {
  ok: boolean;
  status: number;
  error?: string;
}

const GITHUB_API = 'https://api.github.com';

/**
 * Triggers the workflow. Returns rather than throws, so a failure to dispatch is
 * logged and visible instead of taking down the scheduled handler.
 */
export async function dispatchEditionWorkflow(
  env: GithubDispatchEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<DispatchResult> {
  const { GITHUB_TOKEN: token, GITHUB_REPO: repo } = env;
  const workflow = env.GITHUB_WORKFLOW ?? 'edition.yml';
  const ref = env.GITHUB_REF ?? 'main';

  if (!token) return { ok: false, status: 0, error: 'GITHUB_TOKEN is not set' };
  if (!repo || !repo.includes('/')) {
    return { ok: false, status: 0, error: 'GITHUB_REPO must be "owner/repo"' };
  }

  const url = `${GITHUB_API}/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;

  let lastError = 'unknown';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          // GitHub rejects API requests that do not identify themselves.
          'User-Agent': 'morning-brief-worker',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref }),
      });

      // A successful dispatch is 204 No Content.
      if (response.status === 204) return { ok: true, status: 204 };

      const body = await response.text().catch(() => '');
      lastError = `http ${response.status}: ${body.slice(0, 200)}`;

      // 401/403/404 are configuration problems; retrying cannot fix them.
      if (response.status < 500) {
        return { ok: false, status: response.status, error: lastError };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { ok: false, status: 0, error: lastError };
}
