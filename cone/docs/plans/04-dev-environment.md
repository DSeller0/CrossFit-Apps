# 04 — Dev environment (local Supabase, prod isolation)

## Context
`npm run dev` currently talks to the **production** Supabase project — every local experiment reads and writes live gym data, and schema exists only as prose in CLAUDE.md plus hand-run SQL in the dashboard. Architecture chosen (2026-07-02 review session): **local Supabase in Docker via the Supabase CLI**, matching the pattern already used in the user's other project — one workflow across projects, fully offline, resets cleanly.

## Acceptance
- `supabase start` boots a local stack; `npm run dev` + `npm run dev:public` run against it and **cannot** reach the prod project.
- `npm run build` / CI still target prod. No hardcoded URL/key remains in `src/`.
- A fresh clone + `supabase start` + seed script reproduces a working local DB (all tables, RLS policies, realistic data).
- CLAUDE.md updated: schema source of truth = `supabase/migrations/`.

## Files
- `supabase/` (new — CLI init, `config.toml`, `migrations/0001_init.sql`, optional `seed.sql`)
- `src/utils/supabase.js`, `src/public/supabaseClient.js` — read `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `.env.development` (local values), `.env.production` (prod values; anon key is public by design so committing is acceptable)
- `scripts/seed-dev.mjs` (new — snapshot prod JSONB blobs → local; reuse the `restore-medrado.mjs` pattern)
- `cone/CLAUDE.md` — schema/dev-env notes

## Approach
1. `supabase init` inside `cone/` (or repo root — decide by CLI ergonomics); `supabase start`.
2. Dump prod schema: 11 single-row JSONB blob tables, `results_v2`, `templates`, RLS policies, `is_allowed_user()` → `supabase/migrations/0001_init.sql` (via `supabase db pull` against prod or hand-written from the dashboard SQL).
3. Swap both client files to env vars with the current prod values as `.env.production`; local stack values in `.env.development`. Vite injects by mode automatically (`dev` → development, `build` → production).
4. Write `scripts/seed-dev.mjs`: fetch each blob table + a slice of `results_v2` from prod (anon read is allowed) and upsert into local.
5. Verify: dev server against local stack, full smoke (schedule, results logging, TV push cycle); then `npm run build` and confirm the bundle contains the prod URL.
6. Follow-up unblocked by this item: the deferred security probe — can anon UPDATE another athlete's `results_v2` row? Test against the **local** stack and record the answer in the next review.

## Verification
- Kill network to supabase.co (or watch the network tab): dev app fully works against `localhost`.
- `supabase stop && supabase start` + seed → data returns.
- CI deploy unaffected; prod site works.

Model: Sonnet · Size: L
