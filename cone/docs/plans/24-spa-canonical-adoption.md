# 24 — #70 · SPA canonical adoption

> ✅ Done: `068d3a0` `19f35d7` · 2026-07-17 — see BACKLOG.md

## Context

Five sessions (#16/#37/#48/#51/#52) canonicalized the **public** side into `src/public/lib/**`. The **SPA never adopted any of it**. Most of the forks are tidiness — but one is a live functional bug, and it is bigger than the backlog row says.

**🔴 The coach cannot log or review Benchmark or Estações results in the SPA.**

`Resultados.jsx:18` declares `WOD_BLOCK_TYPES = ['WOD','For Time','AMRAP','EMOM','MetCon','HIIT']` — **6 entries**. Canonical `WOD_TYPES` (`wod.js:3`) has **8**, adding `'Benchmark'` and `'Estações'`. It gates four call sites:

| Site | What it gates | Impact of the omission |
|---|---|---|
| `:203` | `wodBlocks` → `setBlockLogs` (`:209`/`:215`) → `saveLog` (`:232`) → `results_v2.blocks` | **THE bug — a Benchmark/Estações block produces no log row at all; the coach physically cannot record scale/perf/RPE for Fran or a stations WOD** |
| `:406` | P3 render; used only at `:511` for the empty state | "Nenhum bloco WOD nesta sessão." shows on sessions whose only WOD block is Benchmark/Estações |
| `:743` | `wodList` — LeaderboardView | Benchmark/Estações never selectable |
| `:300` | session-card type badges (`.slice(0,2)`) | Cosmetic |

`Benchmark` carries the built-in Girls/Heroes WODs (Fran, Murph, Helen, Daniel, Badger). **Same bug class #6 fixed on 2026-07-02** in Index/Me/Results/Athletes/Leaderboard — the SPA was missed. Same class as #61(d)'s `isTimeBlock`.

`Resultados.jsx` is the **last SPA holdout**: `TvController.jsx:92,185` and `useGroupRotation.js:71,132,177,191` already use canonical `isWodBlock`.

**Three consequences the backlog row does not capture** (all verified against source):

1. **`:743` is near-inert; `:203` is the one that changes the product.** `:743` gates on `hasRes` (`:744`) — a result row already carrying perf for that `blockId`. Since `:203` never logged them, **no such rows exist**. Chicken-and-egg: historical Benchmark blocks stay invisible in the leaderboard regardless; the fix only pays off for newly-logged sessions. (Blocks logged via the *public* results.html path already work — `Results.jsx:21` uses `isWodBlock`.)
2. **`isTimeBlock`'s Benchmark branch is currently dead code in the SPA.** `Resultados.jsx:9` imports it, but `:480` (`isTimeBlock(bl.blockType) ? Tempo : Rounds`) can never see a Benchmark because `:203` filters it out first. After the fix, Benchmark correctly renders the mm:ss `Tempo` input — **#61(d) finally landing on the SPA.**
3. **⚠️ The fix tightens the Salvar gate — the biggest risk in the item.** `:538` is `disabled={presence==='Presente' && blockLogs.some(b => !b.scale || !b.rpe)}`. Adding blocks to `blockLogs` means a session containing a Benchmark now requires the coach to fill **two more fields** before Salvar enables. Combined with #61(a) (which removed the `RX`/`7` pre-fill), this is *correct* — but it is a real change in what the coach must do, and it should be a deliberate decision, not a surprise found in testing.

Found by the 2026-07-16 full pass ([reviews/2026-07-16-full-pass.md](../reviews/2026-07-16-full-pass.md)).

## Acceptance

1. The coach can log and review a **Benchmark** and an **Estações** block in the SPA Resultados tab — verified live, not by reading.
2. Zero forks remain of: `WOD_BLOCK_TYPES`, `deriveScale`, `SCALES`, `PT_MONTHS`/`DAY_NAMES`, `TIMER_TYPES`, `rowToResult`, `getTargets`/`matchesAthlete`, `prBest`.
3. `npm test` green; no behaviour change beyond the intended Benchmark/Estações inclusion.

## Files

- `src/components/tabs/Resultados.jsx` — the bulk (forks at `:14`, `:18`, `:19`, `:20`, `:761-769`, `:774`; call sites `:139`, `:203`, `:300`, `:406`, `:743`). Already imports from `wod.js:9` and `week.js:10`.
- `src/utils/resultMappers.js` · `src/components/tabs/TvController.jsx:23` · `src/hooks/useTimer.js:3`
- `src/public/schedule/Schedule.jsx:17-20,207` · `src/utils/storage.js:69,73` · `src/public/me/meHelpers.js:21,26`
- New: `src/public/lib/sessions.js` (home for `getTargets`/`matchesAthlete`)

**Dual-client constraint checked:** every module in `src/public/lib/**` is client-free (`wod.js`/`week.js`/`blobTables.js` import **nothing**; `goals.js`/`benchmarks.js` import only `wod.js`). The SPA importing from `lib/` cannot breach the rule, and the precedent already exists at `Resultados.jsx:9-10`, `TvController.jsx:4-5`, `storage.js:2-3`.

## Approach

Land as **one commit per fork family**, riskiest first while attention is fresh.

1. **`WOD_BLOCK_TYPES` → canonical (the bug — the only risky step).** Import `WOD_TYPES`/`isWodBlock` from `wod.js` (`:9` already imports `isTimeBlock` from it). Delete `:18` and `:139`'s `WOD_SET` (which also re-allocates a Set every render). Replace `:743`'s hand-rolled body — it is `isWodBlock`'s exact body — with `.filter(isWodBlock)`.
   - ⚠️ **This is two behaviour changes, not one. Do not swap blindly.** `:203`/`:300`/`:406` match **`.type` only** (`WOD_SET.has(b.type)`); `isWodBlock` matches **`.type` OR `.label`**. So swapping adds Benchmark/Estações (intended) *and* broadens to label-matching (separate — a `{type:'Força', label:'AMRAP'}` block would newly get a form). **`:743` is the only clean 6→8 swap**, because it already checks both. The file is internally inconsistent today; canonical is type-or-label and consistency argues for it — but decide it explicitly and verify against real session data. If it changes what renders, that deserves its own line in the commit message.
   - Handle the **Salvar-gate tightening** (`:538`) deliberately — see Context #3.

2. **`rowToResult` → alias the canonical.** ⚠️ **`resultMappers.js` cannot be deleted:** it also exports **`resultToRow`** (the *write* direction: `String()` coercion, `|| null` defaults, `updated_at`), which has **no canonical counterpart** — `blobTables.js` is read-only because public pages never write `results_v2` directly (anon goes through the `log_result` RPC). Its only consumer is `supabase.js:62` (`dbSaveResults`).
   Use **the house pattern CLAUDE.md documents for `storage.js` (#16)** — `storage.js:2-3,14`:
   ```js
   import { mapResultRow } from '../public/lib/blobTables.js';
   export { mapResultRow as rowToResult };
   export function resultToRow(…) { /* stays — no canonical equivalent */ }
   ```
   `rowToResult` has exactly **one** production call site (`supabase.js:57`), and the alias keeps it and **all 12 tests in `resultMappers.test.js` passing byte-unchanged** — including the round-trip test (`:100-115`), which keeps importing both names from the same module. That transparency is the point: an unchanged test file is the proof the swap is inert. (Optional follow-up, not required here: `mapResultRow` has no direct test — a `blobTables.test.js` could be added, but don't let it grow this item.)

3. **`deriveScale`** (`:761-769`) — `const scale = deriveScale(blk);`, delete the in-`useMemo` re-declaration of `SCALE_RANK`/`SCALE_NAMES`. Canonical is `wod.js:41-47` (consts at `:39-40`). **Provably inert today**: `exerciseRows` is a dead write path (CLAUDE.md), so both fork and canonical always fall through to `blk.scale`. Zero risk. Precedent: `Leaderboard.jsx:12` already imports it.

4. **`SCALES` family — smaller than it looks; only 2 real forks.**
   - `SCALES:14` → import from `wod.js`. One call site (`:475`, the scale-pill row). Identical list.
   - `:774`'s `['Todos','RX',…]` — **a dead binding.** Declared but never mapped over (`scaleFilter` defaults to `'Todos'` at `:736`; `:775`/`:784` only compare/format). **Just delete it.** Do *not* "fix" it into `FILTER_SCALES` — `ScaleFilter.jsx:4` is already `['Todos', ...SCALES]`, i.e. **already canonical-derived and not a fork**. The 5-item filter list vs the 4-item input list is an intentional distinction, not drift.
   - `LOG_SCALES` (`scheduleHelpers.js:6`) — a *renamed*, not diverged, copy. Prefer `export const LOG_SCALES = SCALES` (re-export): zero churn at its 4 call sites and it preserves the log-vs-filter intent the name carries.

5. **`PT_MONTHS`/`DAY_NAMES`** → extend the existing `week.js` import at `:10`. One call site each (`:268`, `:282`). ⚠️ **`DAY_NAMES` maps to `DAY_PT_TITLE`, NOT `DAY_PT`** — CLAUDE.md's casing hazard exactly: `DAY_PT` is UPPERCASE *and* accent-stripped (`'SAB'` vs `'Sáb'`), so importing it would silently render `SEG 05` for `Seg 05` across the whole P1 week column. Precedent: `TvController.jsx:5` already imports `DAY_PT_TITLE`.

6. **`TIMER_TYPES` → `src/public/lib/wod.js`.** Both copies are byte-identical and neither is exported. `wod.js` is where the block-type vocabulary already lives and it keeps the list reachable from `timer.html`/`TV.jsx`. **Export it as its own constant — do not derive it from `WOD_TYPES`**: `TIMER_TYPES ⊂ WOD_TYPES` is a *semantic subset* ("the WOD types a timer can drive"), and deriving it would invent a coupling that isn't real.
   - ⚠️ **Adjacent, deliberately out of scope:** `TvController.jsx:188-190` re-implements `useTimer.js:31-34` — but with a **different cap fallback** (`|| 20` hardcoded vs `|| timerCap`). Collapsing them is **not** a free dedup; leave it, or handle it as an explicit decision with its own note.

7. **`getTargets`/`matchesAthlete` ×3 → new `src/public/lib/sessions.js`.** No existing `lib/` module fits (session-domain, not WOD- or date-domain; jamming it into `wod.js` would be the drift-by-convenience this item exists to fight). **All three copies are exactly equivalent** — `!s || !s.mainTraining` and `!s?.mainTraining` behave identically for every input; the "most defensive copy" framing in the backlog row is wrong. Promote `meHelpers.js:21-26` because it is **the copy with tests** (`meHelpers.test.js:23-35`), not because it is safer. Then re-export from `storage.js` and `meHelpers.js` (pattern from step 2) so **all 7 existing call sites need zero edits** and the tests keep passing in place; only `Schedule.jsx:207-210` takes a real edit.
   - 🚩 **Trap — `Schedule.jsx:216` is NOT a `matchesAthlete` call site.** It inlines *different* semantics: `t.length===0 || t.includes(athName)` — **an untargeted session matches every athlete**. `matchesAthlete` returns `false` there. "Fixing" it into `matchesAthlete` would **hide every gym-wide session from schedule.html's athlete filter**. Only `getTargets` is dedupable at that site. (Same idiom at `Publicador.jsx:1118` — the "gym session" concept is real, just unnamed.)

8. **`prBest` 4th copy** (`Schedule.jsx:17-20`) — delete, import from `goals.js` (`:7` already imports from `../lib/wod.js`). **A guaranteed no-op**: `autofillRm:38` hard-filters `p.type==='load'` and `:39` bails otherwise, so the fork's missing `'time'` branch is provably unreachable. Latent trap only — widen `:38` and it would silently pick the *slowest* time as "best". Covered by `goals.test.js`.

**Out of scope (name, don't do):** `Resultados.jsx:300`'s inline hex (`#4ac8c0`/`#161210`/`#554a3a`/`#2a231c`) belongs to **#57** (design pass C3). `Resultados.jsx` being 928 lines belongs to **#74**. Do not let this become a rewrite.

## Verification

1. **The bug, live** (the acceptance test — steps 3–8 are refactor and lean on tests): on the local stack, build a session in Criador containing a **Benchmark** block and an **Estações** block, open it in the SPA Resultados tab, confirm **both now render a result form**; confirm the Benchmark renders the **mm:ss `Tempo`** input (consequence 2 — `isTimeBlock`'s dead branch waking up) and Estações renders Rounds/Reps; log a result to each and confirm the rows in `results_v2` via REST. Revert the test data.
2. **Exercise the Salvar gate** on that same session — confirm Salvar stays disabled until the new Benchmark/Estações blocks have scale+rpe, and that this is acceptable rather than annoying. This is the one change a coach will *feel*.
3. **Decide the label axis** — find (or construct) a block with a WOD-type `label` but a non-WOD `type` and confirm the new type-or-label matching does what you want at `:203`/`:300`/`:406`. If no such block exists in real data, say so in the commit message and move on.
4. Re-drive one **ordinary** (non-Benchmark) session end-to-end to prove no regression in the common path.
5. `npm test` — **`resultMappers.test.js` must stay green byte-unchanged** (that is the proof the alias is transparent); `meHelpers.test.js` likewise if the re-export route is taken.
6. `npm run build:all` clean. Grep to prove zero forks remain.
7. `/code-review` before pushing (M-size, per WORKFLOW's ritual).

Model: Sonnet · Size: M
