# 25 — #75 · Retire the fabricated rpe/scale data

## Context

Until #61(a) (2026-07-16, `6a9a103`) every log form pre-selected `scale:'RX'` and `rpe:7`, so an untouched form silently recorded a fake RX @ RPE 7. #61(a) stopped new corruption but **never marked or cleaned what was already written**. Measured on the prod snapshot: **5/11 blocks** carry the signature (`rpe:7` + `RX` + no perf at all), **10/11 blocks** are `rpe=7`, **5/5 rows** are `energy_level=3`.

**This is a wrong number on screen today, not just a landmine for plans/22.** The aggregation lives in `Me.jsx` (un-extracted, untested — `meHelpers.js` does *not* touch these fields):

| Site | Renders as | Harm |
|---|---|---|
| `Me.jsx:305-309` → `KpiStrip.jsx:29` | **"Taxa RX"** | a % over fabricated RX |
| `Me.jsx:310-315`, `:360` → `KpiStrip.jsx:32` | **"↑ N% vs mês ant."** | a *trend* from two fabricated percentages |
| `resultsHelpers.js:54-55,69,72` → `KpiGrid.jsx:16,23` | **"% RX"** | same |
| `resultsHelpers.js:52-53` → `KpiGrid.jsx:14,22` | **"RPE médio"** | mean of a near-constant 7 |
| `Resultados.jsx:53-54`, `:74-77`, `:617` | **"Taxa RX"** + thresholds | — |
| `Resultados.jsx:51-52`, `:72-73`, `:614` | **"RPE médio"** + colour thresholds | **a fabricated `7` scores "good"** |
| `Resultados.jsx:65` → `:615` | RPE **SparkLine** trend | a trend line through fabricated data |

✅ **Ranking is clean** — `rankResults`/`perfStr` (`wod.js:104-124`) sort only on `perfTime`/`perfRounds`/`perfReps`. Neither `scale` nor `rpe` affects order.

**Three facts that shaped this plan:**

1. **Date-gating is impossible** (the option this replaces). There is **no `created_at`**, and `updated_at` is burned: `SyncContext.jsx:15-20` (on *every* SPA startup) → `storage.js:151,165` (`syncFromSupabase` reads all rows then immediately `saveResults(results)`) → `supabase.js:60-66` (whole-array upsert) → `resultMappers.js:28` (`updated_at: new Date().toISOString()` **unconditionally, on every row**). **Every coach page load rewrites every row.** → captured separately as **#76**; #75 must not depend on `updated_at` meaning anything.
2. **The blast radius is tiny and hand-auditable** — 5 rows / 11 blocks. **plans/22's "Results: 2 rows — effectively zero real results" (`:31`, and its §4 runway argument at `:110`) counts the WRONG TABLE**: `backup-supabase.mjs:24-36` only dumps the 11 single-row blobs via `.eq('id',1)` and **never dumps `results_v2`** — the "2" is the retired v1 `results` blob.
3. **#61(a) left a back door open** — `slides.jsx:314,325,380,392` and `ClassPanel.jsx:76` render a null scale as `'RX'` (`{r.scale || 'RX'}`), so **the gym wall re-fabricates RX at render time**. And `ClassPanel.jsx:36` *persists* `scale: m.entry.scale || 'Rx'` — the literal **`'Rx'`**, which matches **no** entry in `SCALES` (`wod.js:23`) and will fail every `=== 'RX'` and every filter. **Nulling the data without fixing these accomplishes nothing.**

Found by the 2026-07-16 full pass ([reviews/2026-07-16-full-pass.md](../reviews/2026-07-16-full-pass.md)). Approach chosen by the user: **null by explicit id list** (over "delete all" / "provenance flag").

## Acceptance

1. No fabricated `scale`/`rpe` survives in `results_v2`, and none can be re-introduced at render time.
2. Every aggregate above either counts only real values or shows `—` + a quest — never a confident percentage over fabricated input ([plans/22](./22-athlete-character-stats.md) rules 1 & 3).
3. plans/22's audit line and runway argument are corrected.
4. plans/22 gains a **5th non-negotiable rule** covering fabricated (not merely missing) data.

## Files

- **Fix the leaks first:** `src/public/tv/slides.jsx:314,325,380,392` · `src/components/tabs/tv/ClassPanel.jsx:36,76`
- **Aggregates:** `src/public/me/Me.jsx:305-315,322-332,360` · `src/public/results/resultsHelpers.js:52-55,69,72` · `src/components/tabs/Resultados.jsx:51-54,65,72-77`
- **Docs:** `docs/plans/22-athlete-character-stats.md:31,110` (+ the rules block at `:98-102`)
- **Data:** a one-time hand-run SQL statement — **no new migration file**

## Approach

**Order matters — do 1 before 3, or the wall re-fabricates what the data fix removed.**

1. **Close the `|| 'RX'` leaks.** `slides.jsx` ×4 and `ClassPanel.jsx:76` → render `—` (or `scaleLabel(null)`) for a null scale, never `'RX'`. **`ClassPanel.jsx:36` is the real bug**: it *writes* `|| 'Rx'`. Drop the fallback entirely — a null scale must stay null through an edit. While there, note that `'Rx'` vs `'RX'` means any row already saved through that path is invalid; check for it in step 3's audit.

2. **Teach the aggregates to count only real values** (plans/22 rules 1 & 3, applied to shipped UI):
   - `Me.jsx:305-315` — exclude nulls from **both** numerator and denominator; if no real scales remain → **`—` + a quest**, not `0%`. Same for `:310-315`/`:360`'s month-delta: a delta between two `—` is `—`, not `0`.
   - `Resultados.jsx:53-54,74-77` and `resultsHelpers.js:54-55` — same treatment for `rxPct`/`scaleDist`.
   - RPE: `resultsHelpers.js:52-53` already filters `Number(b.rpe) > 0`, and `Number(null) === 0`, so it is **already null-safe** — verify rather than change. `Resultados.jsx:51-52,72-73` need the same guard.
   - `Resultados.jsx:614,617`'s colour thresholds must not score `—` as "good".
   - Follow rule 3: captions should say what they counted (`"RX em 3 de 7 WODs"`), which also makes a thin denominator visible instead of flattering.

3. **Null by explicit id list — the audit is already done and the hypothesis confirmed exactly.**

   Run against the local stack on 2026-07-16 (an unfiltered prod copy — `seed-dev.mjs:61` does `.from('results_v2').select('*')` with no filter; `results_v2` is anon-readable). **Every prediction hit:**

   | Row id | Owner | Blocks | Fabricated | Action |
   |---|---|---|---|---|
   | `mqb73ow31pcwv385b94` | **orphan** — `mqb6azdgww0wh7z9i9a`, not in roster | 1 | 0 | **DELETE** |
   | `mqbdk6d52hq0r3sccog` | **orphan** — `mqb7dlbnpw793qmmp1`, not in roster | 3 | 0 | **DELETE** |
   | `mqvmfv124l9sv7nmmg9` | Arthur (`mqfji84mz7ki68fz38`) | 4 | **3** | **NULL those 3** |
   | `mrgv88frwixglwrsv7` | Arthur | 2 | **2** | **NULL those 2** |
   | `mqtpr4veqcvcg7t965` | Arthur | 1 | 0 | **LEAVE — real** |

   Both orphans carry exactly the two ids `migrate-phase4.mjs:64-70` upserts (preserving ids), both have a perf value on every block, and both contribute **0** fabricated blocks — so the arithmetic reconciles perfectly: 5/5 fabricated blocks live in 2 of Arthur's rows.

   **The entire real dataset is 3 rows, all belonging to Arthur.** `mqtpr4veqcvcg7t965` is `rpe:1` + perf `4` — someone plainly interacted with that form, so its `RX` is real. **This is the case for the id list over a `WHERE rpe=7 AND scale='RX'` predicate**: a predicate is a guess that would also null genuine RX @ 7 results, and #75 would be doing the very thing it exists to stop — destroying real data on a heuristic. Keep `perfTime`/`perfRounds`/`perfReps`/`presence` **intact**; only the fabricated fields go.

   ⚠️ **Re-run this audit against prod (read-only) immediately before executing** — the table above is the *local snapshot* as of the last `seed-dev.mjs` run, and `seed-dev` never deletes, so a local row could be stale. The ids are the contract; confirm they still match before any write.

   🔎 **Also surfaced:** the roster is **14 athletes**, not the 9 plans/22 assumes (9 real `mqfj*` + `Atleta00-03` test accounts + Paulo). Correct that alongside the "2 rows" line in step 4.

   **Delivery: a one-time SQL statement run by hand in the Supabase dashboard SQL editor — not a migration, not a script.** Rationale: (i) **no migration has ever backfilled data** — all 5 are DDL; (ii) a numbered migration would be **untestable locally**, since `supabase db reset` empties `results_v2` *before* `seed-dev.mjs` repopulates it, so the `UPDATE` would run against an empty table and be a guaranteed no-op; (iii) the house data-migration precedent (`scripts/migrate-phase4.mjs`) is a hand-run Node script, but it used the **anon key**, which `0003` has since revoked for `results_v2` writes — so a script now needs a service-role key that prod does not have available here (recorded in #7's notes). For ~3 rows, one audited statement in the dashboard is the honest tool. **Dry-run it against the local stack first**, confirm the exact affected row count, then hand it over **with a short title** and the expected row count so the result can be checked.

4. **Correct the docs.** `plans/22:31` ("Results | 2 rows") and `:110` ("2 test rows in prod") → the real figure and its source; the 9-athlete roster → 14. Add the **5th non-negotiable rule**, the durable output of this item:
   > **5. Never count a fabricated value.** Rules 1–4 assume *missing = null*. A pre-#61 `RX @ 7` is not null — it is a value, so it sails through rule 1 and lands in rule 3's caption as a counted fact. A bar must count only values a human actually chose.

   Rule 3 is the one that breaks without this: `"RX em 7 de 9 WODs"` would be a lie stated confidently.

5. **Capture #76** (the load-time write-back loop) as its own Icebox row. Do not fix it here.

**Out of scope:** `energy_level` — it has **zero readers** (every reference is a write or a round-trip map; athletes.html was its last consumer and it retired in #52). So it cannot produce a wrong number, and **#66's "drop the column" needs no read-site migration** — far cheaper than its row suggests. Note that on #66; don't do it here. Also out of scope: the v1 `results` blob (live data, replicated into every dev stack, **read by nothing in `src/`**) — a #60-shaped fold-in, and retiring it would kill the "2 rows" folklore at its source.

## Verification

1. **Re-run the audit against prod (read-only) and diff it against the table in step 3.** It matched exactly on the local snapshot; if prod has drifted, **stop and re-plan** — the id list is the contract and is only trustworthy while it matches.
2. Dry-run the SQL against the local stack: assert exactly **2 rows deleted** and **5 blocks nulled across 2 rows**, that `mqtpr4veqcvcg7t965` is **untouched**, and that `perfTime`/`perfRounds`/`perfReps`/`presence` are byte-unchanged everywhere.
3. Drive **me.html** and **results.html** on the nulled local data: "Taxa RX" and "% RX" must show **`—` + a quest**, not `0%`; the month-delta must not render `↓ 0%`.
4. Drive **tv.html** with a null-scale result: the wall must **not** print "RX" (the step-1 regression test). Drive the **ClassPanel roster editor** on that row, save, and confirm no `'Rx'` is persisted.
5. Confirm ranking is unaffected — same order before and after, since `rankResults` never reads scale.
6. `npm test` green · `npm run build:all` clean.

Model: Opus · Size: M — the code is small; the judgment is not.
