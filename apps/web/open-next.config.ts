import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext adapter config. The page is a cached server component with a
 * five-minute revalidate window, so the defaults are what we want — no
 * incremental cache backend is needed for a single route that re-fetches from
 * the API Worker.
 */
export default defineCloudflareConfig();
