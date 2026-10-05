# 100 — #233 · Suggested session, Phase 1: the statistical engine + a backtest audit

*Planned 2026-10-04 (Opus). Execution: **Opus** — it defines a new statistical standard. Starts after
#228 (plans/99) ships.*

## Context

The user wants a third way to fill a session in Criador: **✦ Sugerido**, a session generated from the
box's own history — per box, and for the untagged "Sem box" sessions — with an optional focus (an LPO
lift, a movement pattern). The whole analysis — what prod holds, four generation approaches, eight
worked examples, the check against the real Monday 05/10 — is in the
[2026-10-04 review](../reviews/2026-10-04-suggested-session.md). **Read its §6 (the rules) and §7 (the
open decisions, explained) before building.**

This plan is **Phase 1 of 5**: the pure engine and the script that judges it. No UI.

| Phase | Item | Model · size | Gate |
|---|---|---|---|
| 1 · engine + backtest audit | **#233** (this plan) | Opus · L | after #228 |
| 2 · Lane-B mockup of ✦ Sugerido | #234 | Sonnet · S | **the user's approval** |
| 3 · the third editor mode | #235 | Sonnet · M | after #233 and the #234 approval |
| 4 · box-history link | #236 | Sonnet · S | before the main box is named |
| 5 · "Padrão" field in Exercícios | #237 | Sonnet · S–M | after #233 |

Phase 6 — an AI-written WOD (the review's approach D) — is not on the board. It is decided later from
the audit trail: how much the user edits synthesized WODs.

**Why statistical synthesis** (the user's lean): no infrastructure (the app has no server functions),
stable per day, explainable (a number behind every choice), and measurable by replaying history. An
AI-written session costs ≈ US$0.10–0.16 per call on `claude-opus-5-5` and needs a Supabase Edge
Function.

**Decided by the user, 2026-10-04 — don't re-litigate** (the full list is in the review's §5):

- **Scope:** the main box = untagged sessions. When it gets a name: **link, don't retag** —
  `location.historyFromUntagged = { until: 'YYYY-MM-DD' }`. Phase 4 builds the editor for it; the
  engine reads it from the start.
- **Learn from** public sessions only, minus names containing "teste"/"apagar". All history weighted
  equally, for content and for block presence.
- **The structure holds:** one canonical block order per box (review §7a). Which blocks a day contains
  is learned per weekday.
- **Every %RM value ends in 0 or 5**; jumps of any size are fine; off-grid values are snapped, never
  re-stepped (review §7b).
- **Controls:** LPO lift focus · movement-pattern focus · time budget (**warn only, never trim**) ·
  pick the blocks. **Granularity:** the whole session + a per-block "↻ Outra". **Stable per day.**
- **Taxonomy:** 8 patterns — Agachamento · Dobradiça · Empurrar · Puxar · Olímpico · Core ·
  Monoestrutural · Carregar — plus a modality tag derived from the category.
- **Look-ahead:** the whole week, including already-written later days. **Thin data:** say so and offer
  fallbacks. **Class length:** varies, no default.
- **No migrations** — every shape below is JSONB.

**Model swaps.** The user swaps models by hand. Before starting this plan, **stop and say "Switch to
Opus now (`/model opus`), then tell me to continue"**, and do nothing until they reply. After Phase 1
is committed, say the same for **Sonnet** (Phases 2–5).

## Acceptance

`suggestSession({ sessions, registry, locations, scope, date, options, variants })` — pure, React-free,
the registry passed in — returns `{ blocks, why, meta }` for any box and date from that box's history
alone: blocks in the box's canonical order, parameters and movements from per-weekday statistics, loads
on the 0/5 grid, and a `why` per block that names its numbers. It is deterministic per
`scope|date|blockType|variant`. `node scripts/audit-suggest.mjs` runs it read-only against prod in
three modes (default · `--backtest` · `--edits`), and the **backtest scorecard** is the yardstick every
later rule change is judged by.

## Must-haves

- `node scripts/audit-suggest.mjs` against prod prints the main box's next Monday and Friday as Texto:
  every block re-parses through `parseSession` with **0 warnings**, every block is followed by a `why`
  naming the numbers it used (counts, probabilities, medians), and the run ends with the
  **registry-miss list** — each unresolved movement name in the box's history with its count.
                                                                 [terminal, prod read-only]
- Run twice, the output is **byte-identical**; `--variant LPO=1` changes **only** the LPO block — every
  other block's text is byte-identical to the run without it.                            [terminal]
- Across the suggested sessions for every weekday, all list their blocks in the **same canonical
  order**; no %RM in any of them ends in anything but 0 or 5; and for Fri 09/10 (a week whose Monday
  holds Front Squat) the main lift is **not** Front Squat.                  [terminal, the audit output]
- A box with no sessions (Garra had 0 at the 2026-09-18 backup) returns **no blocks**,
  `historyCount: 0` and `thin: true` with a reason — not an empty-looking session.      [terminal]
- `--backtest` prints a scorecard row for **every strength day since 06/06**; its 05/10 row reproduces
  the review's §4c (same 6 block types, the intended order, Back Squat with a top of 90 under the
  Markov rule); and a fixture with a **poisoned session dated D** changes nothing in day D's
  suggestion.                                                                    [terminal, unit test]
- With the run-length rule (review §7c) the backtest's **Monday main-lift hit rate is higher than
  with the Markov rule alone** — both printed — and the 05/10 row proposes **Front Squat**.  [terminal]

## Files

New, all under `src/components/tabs/criador/suggest/`, each with a `*.test.js` on **synthetic
fixtures** (backups are personal data and gitignored):

- `history.js` · `patterns.js` · `stats.js` · `synth.js` · `rng.js` · `estimate.js` · `index.js`
- `scripts/audit-suggest.mjs` (new; the committed home of the review's §8 definitions)

Reused, not copied:

- `public/lib/registry.js` — `buildRegistryIndex`, `resolveExercise`
- `public/lib/exerciseGroups.js` — `rootGroup`, `FAMILY_GROUPS`, `familyOf`
- `public/lib/boxScope.js` — `sessionBoxIds`, `inBoxScope` · `public/lib/sessions.js` — `SEM_BOX`
- `criador/blockModel.js` — `emptyBlock`, `emptyEx`, `goalKindFor`
- `criador/textFormat.js` — `serializeSession`, `parseSession`

Docs: `docs/arch/criador.md` (the engine's module map and traps) · `CLAUDE.md` (the test count) · a
dated `docs/reviews/…-suggest-backtest.md` written by the script.

## Approach

1. **Shapes (no migrations).** `session.suggestion = { engine: 'synth', version, at, seedKey,
   variants, options, text }` — Phase 3 writes it; this phase defines the shape and exports
   `ENGINE_VERSION`. `exercise_registry` entry `.pattern` — an override `patternOf` honours from the
   start; Phase 5 edits it. `location.historyFromUntagged` — `history.js` honours it from the start;
   Phase 4 edits it.

2. **`history.js`.**
   - *Scope:* a box id or `SEM_BOX`, through `sessionBoxIds`/`inBoxScope`; a location carrying
     `historyFromUntagged` also takes the untagged sessions dated up to its `until`.
   - *Keep:* `public !== false`, and a name not matching `/teste|apagar/i`.
   - *Time:* **strictly before the target date**. In live mode, also the other days of the target's
     week that are already written (the look-ahead). The backtest never gets the same-week days — see
     the leakage trap below.
   - *Strength day:* a session with a Força block. Weeks start on Sunday.

3. **`patterns.js`.** The 8 patterns + a modality tag. `derivePattern(entry)` from the entry's category
   (`familyOf`), its `rootGroup` and a small keyword table kept beside it — **not** from `muscles`
   (free text on 240 of 260 entries). `patternOf(entry)` returns `entry.pattern` when set. An
   unresolved name stays unresolved and is listed, never guessed.

4. **`stats.js`** — all from `history.js`'s sessions:
   - *Presence:* a block type is included on a weekday when it is on ≥ 50% of that weekday's sessions.
   - *Canonical order:* the majority order of the last 6 weeks of strength days, **pooled across
     weekdays**; shown in `meta.structure`. A one-off move can't change it; a durable one is picked up
     within about two weeks (review §7a).
   - *Block parameters:* rounds, cap, movement count and interval from the **exact block type** — an
     EMOM's minutes must not leak into For Time. The interval comes from `block.interval` when #228's
     field is set, otherwise from the note via the parser's spellings.
   - *Pools:* weight `W = (sameWeekdayUses + 0.25 × otherUses) × recency`, with `recency = 1 −
     e^(−days/7)` from the movement's **global** last use — any block, any day, warm-up and mobility
     blocks excluded. Soft, never a ban.
   - *Reps:* the median per round when ≥ 2 observations, else a chipper total ÷ rounds, rounded to the
     user's numbers (1 2 3 4 5 6 8 9 10 12 15 20 21 24 25 30 40 50 60 100; distances to their usual
     set). Integer caps.
   - *Loads:* the scheme and ramp of the chosen past block, snapped to the 0/5 grid.
   - *Main-lift runs, per weekday:* consecutive weeks of the same lift, the runs that have ended, and
     what followed each — the input of the run-length rule — plus the top-% transitions and the
     within-week exclusion (a lift already used this week is out).
   - *LPO:* family score = weekday frequency × family recency; per-slot (A/B/C) drill frequencies and
     median start %RM; the drill complexity rank.
   - *WOD:* the median goal/cap ratio, which puts Meta at ≈ 0.80 × cap.

5. **`synth.js`.** One generator per block type, building **fresh** blocks (`emptyBlock`/`emptyEx`) in
   the canonical order, each with a `why` (pt-BR UI copy) naming its numbers. All of the review's §6
   rules, in particular:
   - *Main lift once per week, plus the run-length rule:* count k, the weeks the weekday's lift has run.
     If ≥ 2 of that weekday's completed runs ended at k, and most did → **switch** to the lift that most
     often followed it (its top % and scheme from its own history). If most continued → keep and
     progress. With < 2 runs of evidence → the Markov rule.
   - *LPO:* the family by score + the Mon/Wed pair rule; drills drawn per slot by frequency × recency,
     then ordered by complexity; each starts at its median %RM, never drops across slots, defaults to
     +5 per round. The interval is the weekday's most common one — emitted as `block.interval` (#228).
   - *WOD:* the theme rule (60% of prod days put the day's LPO family in the WOD); no duplicate root in a
     block, no duplicate movement in the session; Meta from the ratio above.
   - *Focus:* `options.lpoLift` overrides the family score and the pair rule. `options.pattern`
     restricts the Força and Acessórios pools to that pattern (saying so in `why` when the pool is
     thin) and weights it up in Core and the WOD; the weight is a named constant, shown to the user in
     the Phase 2 mockup. `options.blockTypes` picks the blocks. `options.budgetMin` only feeds
     `meta.estimateMin` and `meta.overBudget` — it never trims.
   - *Missing data:* a movement with no rep history gets a flagged fallback (`why` says so); a hold
     recorded without a unit stays as the user recorded it (#138).

6. **`rng.js` · `estimate.js` · `index.js`.**
   - `rng.js`: FNV-1a over `scope|date|blockType|variant` → mulberry32, **one stream per block**, so a
     "↻ Outra" bumps only that block's variant and nothing else redraws.
   - `estimate.js`: a class-length estimate, a warning figure only.
   - `index.js`: `suggestSession`, `ENGINE_VERSION`, and `meta = { historyCount, weekdayCount, thin,
     estimateMin, overBudget, structure }`. `thin` is a **named constant threshold chosen from the
     backtest** (where accuracy falls off as history shrinks) and recorded in the Done marker; its
     fallbacks — widen to all boxes' history, or to the box's other weekdays — are offered by the UI
     in Phase 3.

7. **`scripts/audit-suggest.mjs`** — read-only, anon key from `.env.production`, run from `cone/` like
   `audit-session-registry.mjs`. Flag names beyond the three the must-haves use are the executor's
   call.
   - *default:* the next week per box — Texto, each `why`, the estimate, the structure used, parse
     warnings, and the registry-miss list.
   - *`--backtest`:* for every strength day D since 06/06, run the engine on the sessions dated
     **before D** and compare with the real session. Per dimension and per weekday: block set · order ·
     main lift · top % (±5) · LPO family · WOD theme · movement overlap per block · cap and Meta · parse
     warnings. Days below the thin threshold are listed but marked and left out of the averages. A flag
     writes `docs/reviews/<date>-suggest-backtest.md`. **Run it before and after every rule change and
     record both tables** — the delta is the guard against fixing one day and breaking ten.
   - *`--edits`:* diffs `session.suggestion.text` against the saved session per block (kept · edited ·
     replaced · removed) and per field. Before Phase 3 stores snapshots it prints "no suggested
     sessions yet".

8. **Tests** (synthetic fixtures): determinism · variant isolation · canonical order from a fixture
   whose Acessórios moved · grid snap (87 → 85, 92 → 90) · main lift once per week · the run-length rule
   (switch / keep / fallback to Markov) · no duplicate root · soft recency (a recent movement is
   *lowered*, not removed) · thin data · each focus option · the **poison test** (a session dated D
   changes nothing in day D) · every generated session round-trips `serializeSession` → `parseSession`
   with 0 warnings.

9. **Docs are part of Done:** `docs/arch/criador.md` — the module map, the rules in one paragraph, the
   traps below; `CLAUDE.md` — the new test total and the new file count.

10. **Drive the must-haves** against prod, read-only, proving the run-length one fails on the Markov
    rule alone; `/code-review` (an L item); commit + push; the Done ritual; then the **⇄ 3** model-swap
    prompt.

**Traps**

- ⚠️ `cloneBlocks` (`blockModel.js:372`) never re-ids stations — build fresh blocks instead.
- ⚠️ The engine must not import `utils/storage`: it pulls the SPA Supabase client, which breaks the
  script and the client-free gallery. The registry is a parameter, the same reason `blockModel` takes
  `reg` and `SessionTextPane` takes `typePicker`.
- ⚠️ A load path never writes (CLAUDE.md). The engine and the script are read-only; the only write path
  is Phase 3's Aplicar → Salvar.
- ⚠️ Only 71% of movement occurrences resolve in the registry, and an unresolved name is invisible to
  recency — print the miss list; never treat "unresolved" as "not used". #211 narrows the gap.
- ⚠️ Every rule change reshuffles the seeded draws. Bump `ENGINE_VERSION` — it goes into provenance.
- ⚠️ The backtest uses strictly earlier dates because it can't know when a same-week session was typed.
  Its look-ahead is weaker than the live engine's, so its scores are **pessimistic by design**.
- ⚠️ Prod holds a test session (2026-09-27, untagged) and an orphan location id
  (`mserdetyu9xan6rl7gl`, 2 sessions): the name filter drops the first, the scope rules leave out the
  second.

**Out of scope:** any UI (Phase 3) · the AI-written WOD (Phase 6) · a per-box "Estrutura" override · an
in-app "Precisão das sugestões" view.

## Verification

The must-haves, driven. `npm test` at the new total · `npm run lint` · `npm run format:check` ·
`node scripts/audit-suggest.mjs` in all three modes · the backtest's before/after tables recorded in the
Done marker · `node scripts/audit-backlog-markers.mjs` clean · `/code-review` before the push.

Model: Opus · Size: L
