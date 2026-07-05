# 10 — TV loadResults missing date filter (#42)

> ✅ Done: 746b77e · 2026-07-04 — see BACKLOG.md

## Context
Found in the [2026-07-04 full pass](../reviews/2026-07-04-full-pass.md) (dim 4). `TvController.jsx:100` (`loadResults`) queries `results_v2` with `.eq('session_id', selSessId)` but **no** `.eq('date', selDate)`; `ClassPanel.jsx:18` (`scoreMembers`) then `results.find(r => r.athleteId === m.id)` — the *first* match, date-agnostic. Session ids are per-creation uids today, so this is benign in practice, but if a `session_id` ever recurs across dates (e.g. a duplicated/templated session), the roster would surface the wrong day's score. Cheap latent-bug guard on freshly-shipped code.

Model: Sonnet · Size: S

## Acceptance
- `loadResults` only returns rows for the selected date.
- `scoreMembers` matches within the day-scoped result set.
- Registering/reading a result under a session whose id is shared across two dates surfaces the correct day's score.

## Files
- [src/components/tabs/TvController.jsx](../../src/components/tabs/TvController.jsx) — `loadResults` (`:100`).
- [src/components/tabs/tv/ClassPanel.jsx](../../src/components/tabs/tv/ClassPanel.jsx) — `scoreMembers` (`:18`) if any further scoping is needed once the query is date-filtered.

## Approach
1. Add `.eq('date', selDate)` to the `loadResults` query (confirm the column name is `date` in `results_v2` — cross-check against `0001_init.sql` / the `log_result` RPC's `p_date` param, which writes it).
2. Verify `selDate` is in scope / matches the `date` column format (the `date_key`/`selDate` string used elsewhere in TvController).
3. Once the fetch is day-scoped, `scoreMembers`'s `.find` is safe as-is; only adjust if a second date's rows could still enter via another path.

## Verification
- Against the local Supabase stack (`supabase start` + reseed): insert two `results_v2` rows for the **same** `session_id` on **two different dates** with different scores; open TvController on each date and confirm the roster shows that day's score, not the other's.
- Regression: normal single-date flow (register a result live, it appears in the roster) still works.
- `npm test` green.
