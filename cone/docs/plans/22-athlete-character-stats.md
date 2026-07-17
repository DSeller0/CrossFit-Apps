# 22 — "Desenvolvimento": grounding athlete character stats

> **Not a port.** athletes.html (retired in #52 / [plans/21](./21-design-b3-me-athletes.md)) had five RPG-style character-stat bars. The idea is good and the user wants it. The code is not salvageable, and — more importantly — the **data audit says the category of stat it attempts is not currently computable**.
>
> **Decision (2026-07-12):** do the **capture work first**, then build true attribute bars. #52 reserves the layout slot and ships without the card.

## Context

me.html is the athlete's page. It has hearts, HP-style goal bars and milestone ticks — it already reads as a character sheet. A "Desenvolvimento" card of attribute bars (Força / Motor / Habilidade / Potência / Consistência) is the natural centrepiece.

The blocker is not design. It is that **Cone does not currently record what those bars would measure.**

## 1. Why the old five cannot be ported

| Bar | Defect (`Athletes.jsx`, pre-retirement) |
|---|---|
| Força | Sound. Only hand-rolled a `reduce` (`:48`) when `prBest`/`prPct` were **already imported on line 7**. |
| Condicionamento | Attendance windowed to 28d but **completion computed over all time** (`:57-59`) while the caption said "4 sem". "Completed" = the *first* WOD block has a `perfTime` (`:58`) — **an AMRAP stores rounds, not a time, so every AMRAP read as unfinished.** |
| Habilidade | 🔴 `rxCount / r30.length` (`:69`) divided by **every present session, including ones with no WOD block at all** — a strength week silently tanked the score. |
| Progressão | 🔴 `min(100, recentPRs × 20)` (`:87`) — an arbitrary "5 PRs = 100%". Its RPE-trend arrow (`:82-85`) split results into "older/newer halves" that **were not sorted by date**. |
| Consistência | 🔴 The loop (`:90-92`) **never checked day-adjacency** — it incremented once per training date, gaps included. Train once a month for a year and it reported a streak of **12**, divided by 12, and captioned it **"12 semanas consecutivas"**. Not a streak; not weeks. |

## 2. The audit — what Cone actually records

Evidence: the migrations, every write path in `src/`, and the **real production snapshot** at `cone/backups/2026-06-24_13-17-42/`.

| | Real prod |
|---|---|
| Athletes | **14** as of 2026-07-16 — 9 real `mqfj*` + `Atleta00–03` test accounts + Paulo (the 2026-06-24 snapshot had 9). All `level: Competidor`; all `since` = 2026-06-15, the install date — so neither field discriminates. (re-counted by #75) |
| Sessions | 15 · **79 blocks · 214 prescribed exercises** (37% carry an `intensity`) |
| **Results** | `results_v2` holds **5 rows / 11 blocks**: **3 real** (all Arthur) + **2 orphan test rows** (owners not in the roster). **5 of the 11 blocks were fabricated** `RX @ RPE 7` with no perf — retired by #75. The old "2 rows" figure **counted the wrong table**: `backup-supabase.mjs` dumps only the single-row blobs (`.eq('id',1)`) and never `results_v2`, so the "2" was the retired v1 `results` blob. Re-audited live 2026-07-16. |
| PRs | 3, across 2 athletes (one real). All 3 have a target. |
| Goals / milestones | 1 empty goal · **0 milestones** |
| Registry | 146 entries · **`muscles` 144/144 = 100%** · `description` 100% · `defaults` **0%** |

> ⚠️ `state.json` at the repo root looks rich (400 results, 39 PRs) — **it is demo data**; its athletes are named **Jinx, Thresh, Yasuo, Lux**. Do not size anything off it.

**Field-by-field:**

| Field | Reality |
|---|---|
| a `results_v2` row | **Missing means "unknown", not "absent."** Attendance is only ever inferred from a log. |
| `blocks[]` | **Only ever contains WOD-type blocks.** Força / LPO / Core / Skill / Cardio / Mobilidade are prescribed but **never logged, by any path.** |
| `blocks[].scale` | Always written — but **pre-selected `'RX'`** (`resultsHelpers.js:8`, `Schedule.jsx:328`, `Resultados.jsx:215`). Untouched picker ⇒ recorded RX. **Strong, invisible RX bias.** |
| `blocks[].rpe` | Always written — but **pre-selected `7`**. Not skippable. |
| `blocks[].perfTime` / `perfRounds` / `perfReps` | Real. One is filled per block type; the others are `''`. |
| **`blocks[].exerciseRows`** | **Written by NOTHING in `cone/src`.** Read in 4 places. Only the retired `schedule_builder_pt.html` ever wrote it (`{name, scale, load}` — and even there `load` was `""`). |
| **Load actually lifted** | **Does not exist anywhere.** The only load numbers in the app are `goals_data.prs`. |
| `energy_level` | **Constant `3`** from every athlete path; `NULL` from the TV. **Dead field.** |
| `presence != 'Presente'` | Coach-SPA only, rare — **and probably not persisting at all** (§4, the `saveLog` uid bug). |
| `goals_data.prs` | The only strength signal. **Capped at 5 results server-side** (`0002_rpcs.sql:64-72`) ⇒ no long-run load curve. `prPct` (`goals.js:23`) is already a working 0–100 bar; returns `null` with no target. |
| `athletes` | Has `level`, `since`. **No `gender`. No bodyweight.** |
| `exercise_registry.muscles` | **100% populated**, free-text pt-BR, highly regular (`"Quadríceps, glúteos, isquiotibiais."`). Mineable. |
| **registry join** | 🔴 **12.4%.** Only 28 of 225 real session-exercise names match a registry name after case/accent normalization. The coach free-types shorthand (`"BMU"`, `"T2B"`, `"HSPU "`, `"FLEXÃO NÓRDICA "`) while the registry is English long-form. **57% of names carry stray whitespace.** |

**What that rules out today:** any strength bar driven by training (no loads recorded; strength blocks never logged) · any muscle/movement-pattern bar (12.4% join) · anything using energy, RPE, or absences · anything resolving a `mode:'gender'` prescription (no gender field — `fmtIntensity` renders both M/F rails and the athlete self-selects).

## 3. The capture chain (execution order)

Each step is its own backlog item. Steps 1–2 stop active data corruption and are cheap; **step 4 is the keystone**.

### Step 1 — Stop the bleeding · S–M
Four cheap fixes, each **corrupting data every day it stays**:
- **Kill the defaults.** `scale` pre-selected `'RX'` and `rpe` pre-selected `7` mean neither carries information. Make both explicit (or record "não informado"). Costs one tap when logging — that is the price of an honest Intensidade/Habilidade bar.
- 🔴 **`useLiveRegistration.js:28` hardcodes `blockType: 'For Time'`** for every TV-registered result, whatever the block was. Corrupts leaderboard ranking (`rankResults` branches on it) *and* any format-based stat.
- 🔴 **`Resultados.jsx:224` — coach edits silently fail to persist.** `saveLog` mints a **new `uid()` on every save, including edits**, then upserts `onConflict:'id'` without deleting the old row ⇒ the second save for an athlete+session violates `unique (athlete_id, session_id)` (`0001_init.sql:162`), the batch upsert fails, and it's swallowed by a `console.warn` (`supabase.js:65`) while the UI flashes "Salvo".
- 🔴 **Benchmark logs two different shapes.** `LogPane`/`DeskRegPane` treat it as a time WOD (`perfTime`); `LogForm.jsx:43` shows it rounds/reps. `wod.js:97/112` branch only on `'For Time'`, so a Benchmark row is ranked by `perfRounds` (all 0) and `perfStr` returns `'—'`. (🟡 same family: `LogPane` offers no DNF-rounds input, so a capped For Time on mobile is unrecordable.)

### Step 2 — Registry alias / normalization layer · M · *independently valuable*
Trim + casefold + accent-strip + an alias map (`BMU→Bar Muscle-up`, `T2B→Toes to Bar`, `DU→Double Under`, `HSPU→Strict HSPU`, `C&J→Clean and Jerk`…). Today's join is **12.4%**, which silently degrades **already-shipped** features: demo videos don't resolve, #38's ghost defaults never fire, PR category tagging falls into "Sem categoria". **Do this whether or not the stats card ever ships.**

Unlocks the movement axis — registry `muscles` is 100% populated, and the categories give the coarse classification for free: **LPO ≈ olympic · Skill ≈ gymnastics · Cardio ≈ monostructural · Força ≈ barbell strength**.

### Step 3 — Complete the athlete record · S–M
- **`gender`** on the athlete — 13 prescribed exercises use `mode:'gender'` with M/F rails and **nothing can resolve which rail applies to whom**. Prerequisite for "did you lift as prescribed" and for any strength standard.
- **Bodyweight (#19)** — the me.html sheet already exists; only the save is a no-op. Needs a `body_metrics` table. Unlocks **relative strength** (`Back Squat / BW`), the standard CrossFit metric.
- **Lift the 5-result PR cap** (`0002_rpcs.sql:64-72`) so progression *rate* is computable. Trivial; fold in here.

### Step 4 — 🔑 Log strength blocks with the real load · L · **Lane B (needs a mockup)**
**The keystone, and a genuine product expansion.** Today Cone logs *WOD scores*; this makes it log *training*. Força/LPO/Core/Skill blocks are prescribed (79 blocks / 214 exercises in prod) and **never recorded**.

- Revive **`exerciseRows`** — `{name, scale, load, reps}` — a schema slot **4 read-sites already understand**, so no migration and no new column.
- Prefill from the block's `intensity` (`pct` → % of the athlete's PR; `progression` → the step ladder; `gender` → the athlete's rail, now that Step 3 exists) and the registry `defaults`, so logging a 5×5 is ~2 taps, not 10 fields.
- **Auto-PR detection**: a logged load above the athlete's current best on that movement → offer to submit it as a PR (`submit_pr` already exists and is athlete-callable). This is the moment the app starts feeling alive.
- New surface ⇒ **Lane B**: ideation mockup in `cone/design/` → user approval → build → it enters the gallery.

### Step 5 — The Desenvolvimento card · M
Only now do the bars mean something.

| Bar | Definition | Unlocked by |
|---|---|---|
| **Força** | mean of (best load ÷ bodyweight) vs. the **coach's target** — *not* an invented universal standard. Reuse `prPct`'s shape: progress toward a coach-set meta is honest; a hardcoded "1.5×BW = intermediate" table is a product decision nobody has made, and all 9 athletes are `level: Competidor` so `level` can't discriminate. | Step 4 + bodyweight (+gender) |
| **Motor** | percentile on long / monostructural WODs, via canonical `rankResults` | Step 1 (clean `blockType`) + Step 2 |
| **Habilidade** | gymnastics (Skill-category) movements performed at RX | Step 1 (real scale) + Step 2 |
| **Potência** | PR progression *rate* on LPO lifts | PR cap + Step 2 |
| **Consistência** | % of the last 8 calendar weeks (Sunday-start, `week.js`) with ≥1 session — the one bar computable today | — |

**Non-negotiable design rules** (the old card violated all four):
1. `null` → `—` **plus a one-line quest** ("Registre um WOD para começar"), never a misleading `0%`. The old card printed "Sem dados suficientes" five times and taught nothing.
2. Bounded 0–100 **by its own definition** — a ratio of things we counted, never a magic constant like `×20`.
3. The caption says **what it counted** (`"RX em 7 de 9 WODs"`), not just a percentage.
4. **The bar must move when the athlete trains.** A bar only a coach can move is a report card, not a character sheet.
5. **Never count a fabricated value.** Rules 1–4 assume *missing = null*. A pre-#61 `RX @ 7` is **not** null — it is a value, so it sails through rule 1 and lands in rule 3's caption as a counted fact. A bar must count only values a human actually chose. (#75 nulled the pre-#61 defaults in `results_v2` and closed the render-time `|| 'RX'` re-fabrication in `slides.jsx`/`ClassPanel.jsx` — without which rule 3's `"RX em 7 de 9 WODs"` would be a lie stated confidently.)

Renders on the **shared segmented-bar component** #52 extracts (today the same 10-segment bar idea exists in three copies: `Athletes.jsx`'s `BlockBar`/`StatRow`, `Atletas.jsx`'s `HpBar`, and me.html's goal bars).

## 4. The runway (be honest about it)

Steps 1–4 are **~4 sessions** before a single bar renders. Two things make that acceptable:
- **Every step pays for itself independently.** Step 1 fixes a live leaderboard corruption and a silent coach-data-loss bug. Step 2 fixes demo videos, ghost defaults and PR tagging. Step 3 delivers #19, already on the board. Step 4 is a feature the gym wants on its own merits.
- **The gym logs almost nothing today** — `results_v2` has just **3 real rows, all Arthur's** (#75's live audit; the "2 test rows" folklore counted the retired v1 `results` blob, which `backup-supabase.mjs` dumps instead of `results_v2`). Shipping bars now would render five dashes for all 14 athletes. **The capture work *is* the feature.**

## Acceptance (of the card, at the end of the chain)

- Every bar is bounded 0–100 by its own definition, has a caption stating what it counted, renders `—` + a quest when it has no data, and **moves when the athlete logs a session**.
- Unit-tested against the four failure shapes the old code got wrong: AMRAP-only athlete · strength-heavy month · one-session-a-month athlete · athlete with no coach-set target.
- Verified against **seeded fixtures** (prod has ~zero results).

Model: Opus · Size: chain of items (S–M · M · S–M · L · M)
