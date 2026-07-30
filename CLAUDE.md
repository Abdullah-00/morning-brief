# Working in this repo

## Non-obvious constraints

- **The Workers free plan gives 10ms CPU per invocation.** Clustering costs
  ~200ms. That is why edition generation lives in `apps/api/scripts/generate.ts`
  and runs from GitHub Actions rather than a Cron Trigger. Anything CPU-heavy you
  add belongs in the generator, not the Worker. The Worker's budget is for
  serving, Workers AI calls, and the markets refresh.
- **Free plan also caps subrequests at 50 per invocation.** The markets refresh
  uses 9 and summarisation is capped at 20 model calls; keep the total under 50.
- **Cloudflare owns the schedule; GitHub only owns the CPU.** These are separate
  decisions and were once conflated: the workflow used GitHub's `schedule:`
  event, which created our run 3h06m late and delivered a 05:30 brief at 08:36.
  The Worker's 02:30 UTC cron now dispatches the workflow over the GitHub API
  (`lib/github.ts`), because dispatched runs start with no queue delay. Do not
  reintroduce a primary `schedule:` trigger. The one that remains is a failsafe
  at 06:00 UTC and passes `--skip-if-fresh`, so it costs nothing on a normal day.
- **Workers AI does not run under `wrangler dev --local`.** Summaries fall back
  to extraction locally, which is expected — the edition still builds. Use
  `npm run dev:remote` to exercise the real model.
- **Use `localhost:3000`, not `127.0.0.1:3000`.** Next treats the latter as a
  cross-origin dev host and blocks `/_next/*`; the page renders but nothing
  hydrates and every control is silently dead.
- **Never create `apps/web/.env.local`.** It overrides `.env.production`, so a
  production build silently points at localhost, the server fetch fails, and the
  offline fixture ships to production looking like a real edition. Dev overrides
  belong in `.env.development.local`.
- **Always `rm -rf .next .open-next` before an OpenNext build.** Building over a
  previous output emits an asset manifest referencing chunks that were not
  written; the page server-renders fine and then dies on hydration with
  `ChunkLoadError`. `npm run deploy` does this for you.
- **Workers AI model IDs expire.** `@cf/meta/llama-3.1-8b-instruct` was retired
  on 2026-05-30 and the binding answers error 5028, which the summariser degrades
  past silently. Verify against
  `GET /accounts/{id}/ai/models/search?per_page=200` before changing the default.
- **`env.AI.run()` returns `response` as a string *or* an already-parsed object**,
  depending on the model. `readWorkersAiText` handles both; a string-only check
  discards exactly the well-formed answers.

## Conventions

- `packages/shared` is the single source of truth for the data contract and for
  the category → section → weight table. Add a category there, not in a switch.
- The pipeline is pure functions taking `now: Date` explicitly so it can be
  tested in plain Node with no Workers runtime and no network.
- The shared package uses **extensionless relative imports**. Turbopack will not
  resolve `./foo.js` to `foo.ts`.
- Anything that can fail externally returns `null` rather than throwing, and the
  caller records a string in the edition's `degraded` array.

## Editorial rules that are load-bearing

- **A model is never given a headline alone.** `MIN_TEXT_FOR_MODEL` in
  `summarize.ts` gates this, and `pickLead` in `dedupe.ts` deliberately ranks
  having body text above source credibility so a bodyless wire item cannot
  become the text a summary is written from.
- **A summary must never be the headline again.** `extractiveSummary` returns an
  empty string when there is no prose, and `restatesHeadline` rejects both
  extracted text and model output that merely echoes the headline. The card then
  renders headline plus sources, which is honest. This was the single worst
  defect the product has had: for three days every non-AI story printed its own
  headline as its description, because `MIN_TEXT_FOR_MODEL` and `MIN_BODY_CHARS`
  were both 160, which made the extraction branch unreachable. Keep them
  different.
- **Summary text must belong to the headline.** `bestSourceText` prefers the
  lead's own body and only borrows a corroborating article's when the two
  headlines are similar. Borrowing unconditionally described a battery-startup
  funding round as expanding "its agentic data control plane".
- **Sections get a reserved quota; ranking alone cannot reach them.**
  `selectDraftClusters` exists because category weights put cyber (max 0.7475)
  and markets (max 0.7650) permanently below the ~0.772 publication cutoff, so
  "On My Radar" had never once printed. Do not replace it with a single global
  sort.
- **Model calls are capped by subrequests, not cost.** `DEFAULT_MAX_MODEL_CALLS`
  is 36 because the free plan allows 50 subrequests per invocation and each
  `env.AI.run()` is one.
- **Market changes are validated before they are printed.** Each instrument has a
  `maxDailyMovePercent`; beyond it the change is withheld (`null`, rendered "—")
  rather than shown. Yahoo's history for the pegged riyal is wrong, and this is
  what stops the page reporting a peg break.
- **Clustering needs both signals.** Trigram overlap alone misses rewordings;
  containment alone merges template headlines ("X Raises $Y Million"). See the
  comment above `SIMILARITY_THRESHOLD` before changing thresholds, and run the
  dedupe tests — they encode the specific false merges that motivated the rules.

## Before changing the source registry

Check the feed is *fresh*, not just that it returns 200. Several publishers serve
valid XML from feeds they stopped updating years ago. `EXCLUDED_SOURCES` records
what was tested and rejected, with reasons — read it before re-adding anything.
