# The Morning Brief

A daily morning intelligence briefing. Aggregates ~44 news sources, deduplicates
and clusters them into single story units, ranks by importance, summarises with
Workers AI, and prints the result as a mobile-first newspaper.

Built to the spec in `morning-brief-product-spec.md`.

---

## Layout

```
packages/shared/    Zod schemas + category table — the contract between generator, Worker and UI
apps/api/           Cloudflare Worker (Hono): serving, Workers AI summarisation, markets cron
  scripts/generate.ts   the edition generator (runs in Node, see "Where the pipeline runs")
apps/web/           Next.js 16 newspaper UI, deployed on Cloudflare via OpenNext
.github/workflows/  the 05:30 Riyadh generation job
```

## Running it locally

```bash
npm install

# Terminal 1 — the API Worker (local D1 + KV)
cd apps/api
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply morning-brief --local
npm run dev                      # http://localhost:8787

# Terminal 2 — build and publish an edition
cd apps/api
API_BASE_URL=http://localhost:8787 CRON_SECRET=local-development-secret npm run pipeline:generate

# Terminal 3 — the newspaper
cd apps/web
cp .env.example .env.local
npm run dev                      # http://localhost:3000
```

Use **http://localhost:3000**, not `127.0.0.1` — Next blocks its own dev assets
across origins, and the page renders but never hydrates.

`npm run pipeline:dry` builds an edition and prints it without publishing.
`npm test` runs the pipeline unit tests.

---

## Where the pipeline runs, and why

Clustering a morning's ingest costs **~200ms of CPU**. The Cloudflare Workers
**free plan allows 10ms per invocation** and there is no way to raise it, so the
edition cannot be built inside a Worker on the free tier. The work is therefore
split by what each platform is good at:

| Stage | Runs on | Why |
|---|---|---|
| Ingest, dedupe, cluster, rank, price | GitHub Actions (free) | CPU-heavy, no time limit |
| Summarisation (Workers AI) | Cloudflare Worker | a few subrequests, negligible CPU |
| Storage (D1 + KV), serving, markets cron | Cloudflare Worker | fits 10ms comfortably |
| Frontend | Cloudflare Workers via OpenNext | — |

The generator is plain TypeScript with no Node-only dependencies in the pipeline
itself, so **moving generation in-Worker is a small change** if you ever enable
the $5/month Workers Paid plan (30s CPU, 10,000 subrequests): call
`generateDraft()` from `scheduled()` and drop the workflow.

---

## Deployed

| | |
|---|---|
| Site | https://morning-brief-web.abdullah-alshoshan.workers.dev |
| API | https://morning-brief-api.abdullah-alshoshan.workers.dev |
| Model | `@cf/meta/llama-3.1-8b-instruct-fp8` (Workers AI) |
| Edition job | GitHub Actions, 02:30 UTC = 05:30 Asia/Riyadh |
| Markets refresh | Cloudflare Cron Trigger, every 15 minutes |

To publish an edition on demand rather than waiting for the schedule:

```bash
gh workflow run edition.yml                  # or add -f dry_run=true to build without publishing
```

## Deploying from scratch

You need a Cloudflare account (free) — nothing else. News and market data
require no API keys.

```bash
cd apps/api

# 1. Authenticate (interactive)
npx wrangler login
npx wrangler whoami

# 2. Create the storage, then paste the printed ids into wrangler.jsonc
npx wrangler d1 create morning-brief
npx wrangler kv namespace create EDITION_CACHE

# 3. Schema
npx wrangler d1 migrations apply morning-brief --remote

# 4. Secret guarding the publish endpoint
openssl rand -hex 32 | npx wrangler secret put CRON_SECRET

# 5. Ship the API, then the site
npx wrangler deploy
cd ../web && npm run deploy
```

Then set `ALLOWED_ORIGINS` in `apps/api/wrangler.jsonc` to the deployed site
origin, and `NEXT_PUBLIC_API_BASE` in `apps/web/wrangler.jsonc` to the API URL.

For the daily job, add two repository secrets in GitHub — `API_BASE_URL` (the
deployed API Worker) and `CRON_SECRET` (the value from step 4). The workflow at
`.github/workflows/edition.yml` runs at 02:30 UTC = 05:30 Asia/Riyadh.

### Optional: OpenAI instead of Workers AI

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) as a Worker secret and the
summariser switches over automatically. Nothing else changes.

---

## How the edition is built

1. **Ingest** — ~44 feeds fetched concurrently, each with a timeout; a dead feed
   never fails the run. Items older than 48 hours are dropped, which is what
   caught CNN's RSS feeds still serving 2023 content.
2. **Normalise** — unified schema, canonical URLs, boilerplate and sports/
   entertainment filler removed.
3. **Cluster** — exact URL, then normalised headline, then a two-signal
   similarity rule (character-trigram overlap, or rare-token containment backed
   by a token that actually names something). Single-linkage chains are broken by
   re-checking every member against its cluster lead.
4. **Rank** — category weight, source credibility, corroboration across
   independent outlets, recency decay, and a Saudi/Middle East/AI boost.
5. **Summarise** — Workers AI, given only text a publisher actually served.
   Headline-only items never reach a model; they fall back to extraction and are
   marked as such in the UI.
6. **Compose** — 3–5 front-page stories with no more than two from any one
   category, remaining stories routed to sections, validated against the schema
   before it is stored.

### Degradation

Every external dependency has a fallback, and whichever ones fired are listed in
the edition's `degraded` field and shown in the masthead. The system always
produces an edition; it just tells you what was reduced.

---

## Source notes

`apps/api/src/sources.ts` is the registry, and it records what was rejected as
well as what was kept. Two things worth knowing:

- **Arab News, Al Arabiya, Argaam and SPA** are reached through Google News
  rather than directly. The first two answer every path — robots.txt included —
  with a bot challenge; the latter two render articles client-side. Google News
  supplies a title, publisher and working link but no body text, so these sources
  **corroborate** stories and contribute outbound links, and never supply summary
  text. That is deliberate: summarising a headline is how a model ends up
  inventing the rest.
- **CNN's own RSS endpoints are abandoned** — valid XML, newest items dated 2024,
  2023 and 2018. CNN is proxied through Google News instead.
