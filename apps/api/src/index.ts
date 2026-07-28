import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  draftEditionSchema,
  type Edition,
  type EditionStatus,
  type MarketsBlock,
} from '@morning-brief/shared';
import { selectSummarizer, type AiEnv } from './ai/provider.js';
import { composeEdition } from './pipeline/compose.js';
import { describeMarkets, fetchMarkets } from './pipeline/markets.js';
import { summarizeMarkets, summarizeStories } from './pipeline/summarize.js';
import {
  allowRefresh,
  getEditionByDate,
  getLatestEdition,
  getLatestMarkets,
  putEdition,
  putMarkets,
  STALE_AFTER_HOURS,
  type Env as StorageEnv,
} from './storage/index.js';
import { hoursBetween, riyadhDate } from './lib/time.js';

export interface Env extends StorageEnv, AiEnv {
  CRON_SECRET?: string;
  /** Comma-separated origins allowed to call the API. */
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (context, next) => {
  const configured = context.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim());
  const handler = cors({
    origin: (origin) => {
      if (!configured || configured.length === 0) return origin ?? '*';
      return configured.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Cron-Secret'],
    maxAge: 86_400,
  });
  return handler(context, next);
});

/** Marks an edition stale once it has aged past a day, whatever it was stored as. */
function withFreshness(edition: Edition): Edition {
  const age = hoursBetween(edition.generatedAt);
  const status: EditionStatus = age > STALE_AFTER_HOURS ? 'stale' : edition.status;
  return status === edition.status ? edition : { ...edition, status };
}

app.get('/api/edition/latest', async (context) => {
  const edition = await getLatestEdition(context.env);
  if (!edition) {
    return context.json({ error: 'no edition has been generated yet' }, 404);
  }
  return context.json(withFreshness(edition), 200, {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  });
});

app.get('/api/edition/:date', async (context) => {
  const date = context.req.param('date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return context.json({ error: 'date must be YYYY-MM-DD' }, 400);
  }
  const edition = await getEditionByDate(context.env, date);
  if (!edition) return context.json({ error: 'not found' }, 404);
  return context.json(withFreshness(edition));
});

app.get('/api/markets/latest', async (context) => {
  const markets = await getLatestMarkets(context.env);
  if (!markets) return context.json({ error: 'no market snapshot yet' }, 404);
  return context.json(markets);
});

/**
 * Manual refresh from the masthead button. It re-prices markets only — rebuilding
 * the edition is the generator's job — and is rate limited per client.
 */
app.post('/api/refresh', async (context) => {
  const clientKey =
    context.req.header('CF-Connecting-IP') ?? context.req.header('X-Forwarded-For') ?? 'anonymous';

  if (!(await allowRefresh(context.env, clientKey))) {
    return context.json({ error: 'rate limited, try again in a minute' }, 429);
  }

  const markets = await refreshMarkets(context.env);
  if (!markets) return context.json({ error: 'market providers unavailable' }, 502);
  return context.json({ ok: true, markets });
});

/**
 * Publishes a draft edition produced by the generator.
 *
 * The generator does the CPU-heavy ingest, clustering and ranking; this endpoint
 * does the part that has to live on Cloudflare — Workers AI summarisation — then
 * composes and stores. Summarisation is a handful of subrequests and almost no
 * CPU, which is what keeps it inside the free plan.
 */
app.post('/api/admin/edition', async (context) => {
  const secret = context.env.CRON_SECRET;
  if (!secret || context.req.header('X-Cron-Secret') !== secret) {
    return context.json({ error: 'unauthorized' }, 401);
  }

  const parsed = draftEditionSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) {
    return context.json({ error: 'invalid draft', issues: parsed.error.issues.slice(0, 5) }, 400);
  }
  const draft = parsed.data;

  const summarizer = selectSummarizer(context.env);
  const { stories, degraded } = await summarizeStories(draft.stories, { summarizer });

  const marketSummary = await summarizeMarkets(
    draft.markets.quotes,
    draft.markets.factualSummary,
    summarizer,
  );

  const markets: MarketsBlock = {
    quotes: draft.markets.quotes,
    aiSummary: marketSummary.summary,
    asOf: draft.markets.asOf,
    stale: draft.markets.stale,
  };

  const allDegraded = [...draft.degraded, ...degraded];
  if (!summarizer) allDegraded.push('ai:no provider bound');
  if (!marketSummary.aiGenerated && summarizer) {
    allDegraded.push('markets:computed summary');
  }

  try {
    const edition = composeEdition({
      date: draft.date,
      generatedAt: draft.generatedAt,
      stories,
      markets,
      watchToday: draft.watchToday,
      degraded: [...new Set(allDegraded)],
    });

    await putEdition(context.env, edition);
    await putMarkets(context.env, markets);

    return context.json({
      ok: true,
      date: edition.date,
      frontPage: edition.frontPage.length,
      aiSummaries: edition.frontPage.filter((story) => story.aiGenerated).length,
      provider: summarizer?.name ?? 'extractive',
      degraded: edition.degraded,
    });
  } catch (error) {
    return context.json(
      { error: 'edition failed validation', detail: error instanceof Error ? error.message : String(error) },
      422,
    );
  }
});

app.get('/health', (context) =>
  context.json({
    ok: true,
    environment: context.env.ENVIRONMENT ?? 'development',
    bindings: {
      d1: Boolean(context.env.DB),
      kv: Boolean(context.env.EDITION_CACHE),
      ai: Boolean(context.env.AI),
    },
  }),
);

app.notFound((context) => context.json({ error: 'not found' }, 404));

/** Re-prices markets and stores the snapshot. Nine subrequests, trivial CPU. */
async function refreshMarkets(env: Env): Promise<MarketsBlock | null> {
  const { quotes, failed } = await fetchMarkets();

  if (quotes.length === 0) {
    // Serve the last good snapshot rather than an empty dashboard.
    const previous = await getLatestMarkets(env);
    if (previous) {
      const stale: MarketsBlock = { ...previous, stale: true };
      await putMarkets(env, stale);
      return stale;
    }
    return null;
  }

  const markets: MarketsBlock = {
    quotes,
    aiSummary: describeMarkets(quotes),
    asOf: new Date().toISOString(),
    stale: failed.length > 0,
  };

  await putMarkets(env, markets);
  return markets;
}

export default {
  fetch: app.fetch,

  /**
   * Cron. Only the market refresh runs in the Worker; generating the edition
   * needs ~200ms of CPU against a 10ms free-plan ceiling, so it runs in the
   * generator and arrives via POST /api/admin/edition.
   */
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      refreshMarkets(env)
        .then(async (markets) => {
          if (!markets) return;
          // Keep the stored edition's market block in step with the dashboard.
          const edition = await getLatestEdition(env);
          if (edition && edition.date === riyadhDate()) {
            await putEdition(env, { ...edition, markets });
          }
        })
        .catch((error: unknown) => {
          console.error('scheduled market refresh failed', error);
        }),
    );
  },
};
