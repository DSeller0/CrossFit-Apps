# 2026-10-04 · Suggested session — what the history can write for a day

Read-only analysis of live prod — `sessions` and `exercise_registry` through the anon read the
`scripts/audit-*.mjs` family already uses; **nothing was written anywhere** — run to plan the user's
"Suggested session" request. It produced **#233** ([plans/100](../plans/100-suggested-session-engine.md),
Ready) and **#234–#237** (Icebox). The prototype engines and the throwaway analysis scripts lived in the
session scratchpad and are not committed; Phase 1 rebuilds the statistical engine as
`scripts/audit-suggest.mjs`, which reproduces the numbers below (§8).

---

## 1 · The request

A third way to fill a session in Criador, next to **▤ Detalhado** (the builder) and **¶ Texto**:
**✦ Sugerido**, a session generated from the box's own history — per box, and for the untagged
"Sem box" sessions — that can also take a focus (an LPO lift, a movement pattern).

The user asked for the idea, its feasibility and its implementation to be analysed, and for examples
for the **main box** (the untagged "Sem box"; it will be named soon):

- **Monday 05/10/2026.** The user wrote 04/10, which is a Sunday; Monday 05/10 was confirmed.
- **Friday 09/10/2026**, this week's Friday on a Sunday-start week.

Each example is produced by **every** generation approach (§3), with an explanation of how. The user
leans towards **statistical synthesis** for the app.

**While the plan was held**, the user wrote the real sessions for Mon 05/10 → Thu 08/10 (untagged;
Friday 09/10 is still unwritten). The Monday examples predate that session and are checked against it
in §4c. The Friday examples **see** Monday–Thursday — the chosen whole-week look-ahead.

## 2 · What prod holds

| Finding | Number | Consequence |
|---|---|---|
| History volume | 164 sessions, 06/06 → 02/10 (17 weeks); untagged **97** (90 after the filters in §8), Eagles 64, strays 3 | Enough for structure and rotations; thin for content |
| Block presence | Mon: Acessórios 100 · Cardio 100 · LPO 94 · Força 88 · Core 76 · For Time 71%. Fri: Cardio 94 · Acessórios 88 · Força 82 · LPO 76 · For Time 71 · Core 65 · EMOM 47% | A weekday includes the types present on ≥ 50% of its sessions |
| **Block order** | Near-unanimous on strength days: opener first 62–0 · Força < LPO 47–6 · LPO < WOD 55–0 · Acessórios < WOD 50–12 · WOD < Cardio 63–0. Only Acessórios moved: **before LPO 20/21 until 21/08, after LPO 17/18 since 24/08** (05/10 is the exception) | One canonical structure (§7a) |
| LPO rotation | Tue = jerk; **Mon/Wed split clean/snatch**, which held again in the real week | A pair rule; *which* lift lands on Monday is a coin flip |
| Main lift | Repeated within a week in **1 of 18 weeks**. Weekday runs: Mon Back Squat blocks of 1–3 weeks → a Front Squat week · Tue Bench 3–4 weeks → a press week · Wed Deadlift always · Fri weekly rotation | Once per week, plus the run-length rule (§7c) |
| WOD theme | **60%** of days with an LPO block and a WOD (33/55) put that day's lift family in the WOD | A theme rule |
| The user's progressions | 148 %RM ramps: only **4%** off the 0/5 grid (87/91/92); bigger jumps are common and fine (41% have one, mostly below 70%) | Snap to the grid; keep the ramp shape (§7b) |
| Registry match | **71%** of 1,684 movement occurrences resolve | Unresolved names are invisible, including to recency |
| Muscles field | 240 of 260 entries, free-text prose | Movement patterns instead |
| Results | `results_v2`: 94 rows, 8 athletes, WOD blocks only | Learn from programming, not performance |
| Data noise | test session 27/09 (untagged) · orphan location id `mserdetyu9xan6rl7gl` (2 sessions) · names that don't resolve ("Ru", "Defict Deadlift", "tempo Bench press") | A name filter; #211 |

**Verdict: feasible.** Statistics reliably give **structure, rotations and vocabulary**. Coherent WODs
need explicit rules (§6). Whether the engine is actually good is *measured*, not guessed (§7d).

---

## 3 · Four ways to generate a session

- **A · Reuse past blocks (retrieval).** Every slot is a real block of the same weekday, copied with new
  ids: the best *typicality × staleness* among blocks older than 4 weeks. Força is an analog forecast.
  No new content, no infrastructure.
- **B · Statistical synthesis** (the user's lean). Nothing is copied. What a weekday contains, the box's
  block order, per-type parameters, and every movement, rotation and load come from the history as a
  statistic or a seeded weighted draw. Pure code, no infrastructure, a number behind every choice.
- **C · AI-written.** A model writes the whole session from a prompt holding the structure and its
  parameters, the last 3 weeks in Texto notation, the rotation and progression facts, the variety rule,
  the registry vocabulary, `FORMAT_REFERENCE` and the grid rule. Needs a Supabase Edge Function holding
  the key — the app has no server functions today.
- **D · Hybrid.** A's non-WOD blocks, plus an AI-written WOD conditioned on them.

**Prototype note.** A and B were produced by read-only prototype engines run against prod; C and D were
written by Claude playing the in-app model. Every text was parsed by the real `parseSession`. Prototype
seeds: one stream per day plus one for LPO (the app seeds per block). Any rule change reshuffles the
draws, which is why the engine version goes into provenance.

## 4 · The examples

### 4a · Monday 05/10/2026

Shared by every approach:

- **Structure:** Core → Força → LPO → Acessórios → For Time → Cardio.
- **LPO family** = weekday frequency × family recency (1 − e^(−days/7)): **Snatch 8 × 0.86 = 6.9** vs
  Clean 9 × 0.35 = 3.1.

#### A · Reuse past blocks

```
Core
3 rounds 9'
15 GHD
30M Farm carry
20 Heavy V-ups

Força
2x2 Front Squat 85/90%

LPO
15'
5 drop snatch  5x30% / 5x40% / 5x45%
2x3 Muscle Snatch + 2 Snatch Balance 2x50% / 2x55% / 2x60% / 2x65% / 2x70%
1x1 Hang Squat Snatch + 1 Squat Snatch 80/85/80%
Zona: Zona 02

Acessórios
3 rounds
12/12 KB Lunges Unilateral
8 Strict Pull Up supinada
8/8 Box Step Down 3" descida
8/8 Ring Row unilateral

For Time
3 rounds Cap 12'
21 T2B
7 Power Snatch Unbrk 40/25kg
7 Hang Snatch Unbrk 40/25kg
7 Squat Snatch Unbrk 40/25kg
Meta: 10'

Cardio
40'
Bike
Zona: Zona 03
Obs: Z1
```

**How:** each slot is a real Monday block, copied with new ids.

- Default: the best typicality × staleness among Monday blocks older than 4 weeks. Core ← 29/06,
  Acessórios ← 10/08, For Time ← 03/08, Cardio ← 29/06; LPO (snatch blocks only) ← 20/07.
- Força is an **analog forecast**. The closest earlier match to last Monday (Back Squat, 90%) is 31/08;
  the engine reuses the Monday after it, 07/09: Front Squat 2×2, with 87 snapped to **85**.
- Loads snapped to the 0/5 grid. **6 parse warnings** (old names).

#### B · Statistical synthesis

```
Core
3 rounds 9'
10 Abs Infra
15 Plate Sit-up
20 KB Oblíquo

Força
4x2 Back Squat 80/85/90/90%

LPO – Snatch
3 rounds 15'
A 5 Drop Snatch 30/35/40%
B 2 Power Snatch 65/70/75%
C 2 Squat Snatch 65/70/75%
Obs: A cada 1'30'' executar um set.

Acessórios
3 rounds 15'
8 KB Cossack Squat
8 Strict Pull-up
8 Russian Row

For Time – WOD tc 15'
3 rounds Cap 15'
10 DB Snatch 22/17kg
15 Double Under
5 Ring Muscle-up
15 Toes to Bar
Meta: 12'

Cardio
40' Bike Z1
```

**How:** nothing is copied; every value is a statistic or a seeded weighted draw.

- **Força:**
  - Lift: after a Back Squat Monday, Back Squat followed 4 of 7 times, so **Back Squat**. With the
    run-length rule it would be Front Squat (§7c).
  - Top %: after a 90% Monday the next tops were 95/90/90/75, median **90**.
  - Scheme **and loads** from 31/08 (4×2 at 80/85/90/92), snapped to the grid → 80/85/90/90.
- **LPO:**
  - Draws per slot: A Drop Snatch (p 14%), B Squat Snatch (11%), C Power Snatch (25%). The complexity
    order puts power before squat.
  - Each drill starts at its median observed %RM (Drop 30 · Power 65 · Squat 60, raised to 65 so loads
    never drop) and defaults to +5 per round.
  - Interval = the most common Monday "A cada" (1'30'').
- **Core / Acessórios:** the modal pattern composition, drawn by (same-weekday uses + ¼ other-day
  uses) × recency.
- **For Time:**
  - Stats from For Time blocks only: 3 rounds, cap 15' (median of 10), 4 movements.
  - Patterns by Monday frequency. Reps: a median per round, or a chipper total ÷ rounds (DB Snatch
    30 → 10, DU 50 → 15), rounded to the user's usual numbers.
  - Theme satisfied (DB Snatch). Meta = 0.80 × cap (the median goal/cap ratio) = 12'.
- **Cardio:** Bike (17 Monday uses), Z1.
- 0 warnings; round-trips unchanged.

#### C · AI-written

```
Core
3 rounds
30" Side Plank
20m Farmer's Carry 32/24kg
15 Hollow Rock

Força – Back Squat
1x5 Back Squat 70%
1x3 Back Squat 75%
2x2 Back Squat 80/85%
2x1 Back Squat 90/95%
Obs: Semana 4 da onda (75, 80, 90%). Se o 90% subir lento, pare ali.

LPO – Snatch
6 rounds 12'
1x1 Snatch High Pull + 1 Hang Squat Snatch + 1 Squat Snatch 50/55/60/65/70/75%
Obs: A cada 2' executar um set.

Acessórios
3 rounds
8/8 Bulgarian Split Squat
6 Strict Pull-up
10 GHD Back Extension

For Time – WOD tc 14'
3 rounds Cap 14'
400m Run
12 Burpee Box Jump Over
9 Power Snatch 50/35kg
6 Strict HSPU
Meta: 11'

Cardio
30' Bike Z1
```

**How:** the prompt holds the structure and its parameters, the last 3 weeks in Texto notation, the
rotation and progression facts, the variety rule, the registry vocabulary, `FORMAT_REFERENCE` and the
grid rule (loads end in 0 or 5). Reasoning:

- **Força:** week 4 of a rising wave gets one heavier exposure (95%) before the user's reset.
- **WOD:** adds the missing upper push; keeps the snatch theme light.
- **Core:** anti-extension, anti-lateral-flexion and a carry.

0 warnings.

#### D · Hybrid

A's five non-WOD blocks, plus an AI WOD conditioned on them (no upper push in the day):

```
For Time – WOD tc 14'
3 rounds Cap 14'
500m Row
30 Double Under
12 Burpee Over the Bar
8 Strict HSPU
Meta: 11'
```

### 4b · Friday 09/10/2026 (Monday–Thursday already written)

**The real week so far:**

- **Mon:** clean LPO · Front Squat 6/4/2 → 90% · WOD Clean/T2B/Jerk/C&J · Bike intervals.
- **Tue:** tempo Bench 5×3 @70% · dips/raises · WOD Legless/BJO/Wall Ball/C2B/BMU · Row intervals.
- **Wed:** Deficit Deadlift 70–80% · Power Snatch from blocks · WOD Power Snatch/BOB/DU · Run.
- **Thu:** Hyrox 8 × (600m Run + station).

Shared by every approach:

- **Structure:** Core → Força → LPO → Acessórios → For Time → Cardio.
- **LPO family:** Snatch 5 × 0.25 (Wed) = 1.24 · Clean 5 × 0.44 (Mon) = 2.18 · **Jerk 3 × 0.76 = 2.28**,
  so **Jerk**, completing the week's three lifts.
- **Main lift:** Front Squat **excluded** (done Monday).

#### A · Reuse

```
Core
3 rounds 9'
8 S T2B
12 DRAGON FLY
20 TOUCH HEEL

Força
6 rounds
4 Back Squat 4x50% / 4x60% / 4x70% / 2x80% / 2x85% / 2x90%

LPO
3 rounds
A 3 Jerk balance 50/55/60%
B 3 Drop Split Jerk 55/60/65%
C 2 Split Jerk 3" 65/70/75%

Acessórios
4 rounds
10 DB Bench Press
8/8 KB OH Lunge Unilateral
6 DB Strict Press

For Time – Wod
Cap 12'
15 T2B
9 Thrusters 60/40kg – 50/35kg
15 T2B
15 Thrusters 50/35kg – 40/30kg
15 T2B
21 Thrusters 40/30 30/25
Meta 7'

Cardio
5 rounds
500m Run
10 GDH
```

**How:**

- Sources: Core ← 26/06 · LPO ← 21/08 · Acessórios ← 07/08 · For Time ← 14/08 · Cardio ← 31/07.
- Força ← 19/06: there is no analog for last Friday's Bench Press; Front Squat is excluded. Its loads
  are all on the grid.

**Seen:**

- **T2B twice:** no cross-block check.
- **No jerk theme.**
- **No movement recency:** Monday's T2B is ignored.
- **5 warnings,** including the user's own "Meta 7'" (no colon).

#### B · Statistical synthesis

```
Core
3 rounds 9'
15 Plate Sit-up
40 Plank
20 Russian Twist

Força
5x3 Back Squat 50/60/70/80/90%

LPO – Jerk
3 rounds 12'
A 3 Jerk Balance 50/55/60%
B 2 Split Jerk 65/70/75%
Obs: A cada 2' executar um set.

Acessórios
3 rounds 15'
8 Bench Press
6 Dip Russo
10 Barbell Row

For Time – WOD tc 15'
4 rounds Cap 15'
1 Rope Climb
8 Overhead Squat 50/35kg
6 Clean & Jerk 60/45kg
200m Run
Meta: 12'

Cardio
40' Row Z2
```

**How:**

- **Força:** Bench Press has no Friday history, so the engine uses Friday lift frequency minus this
  week's Front Squat → **Back Squat**. Top = the median of its Friday tops (90/90/80) = 90. Scheme and
  loads from 17/07 (5×3 at 50/60/70/80/90, already on the grid).
- **LPO:**
  - Only 3 Friday jerk blocks exist, so the slot tables come from all 18 jerk blocks (2 slots).
  - Jerk Balance (p 16%) starts at 50; Split Jerk (p 41%) at its median 65.
  - 3 rounds, 12', "A cada 2'".
- **Core:** Plank was done Monday (× 0.44: lowered, not forbidden). "40" is a hold recorded without a
  unit.
- **Acessórios:** the Friday composition empurrar · empurrar · puxar; the duplicate-root rule blocked DB
  Bench after Bench Press.
- **For Time:**
  - 4 rounds, cap 15'.
  - Rope Climb 1 (5 ÷ 4) · OHS 8 · **theme rule** DB Hang Snatch → **Clean & Jerk** 6 · Run 200m (median
    per round).
- **Cardio:** Row Z2.
- **0 warnings.**

**Seen — recency blind spots.** Unresolved names hide real uses: "tempo Bench press" (so Bench Press
reappears), "Ru", and the Hyrox compound station names.

#### C · AI-written

```
Core
3 rounds
10/10 Dead Bug
10/10 Pallof Press
30" Side Plank

Força – Overhead Squat
5x3 Overhead Squat 60/65/70/75/80%
Obs: Agachamento técnico no dia do jerk; pernas ainda pesadas do Hyrox de quinta.

LPO – Jerk
5 rounds 10'
1x2 Jerk Balance + 1 Split Jerk 55/60/65/70/75%
Obs: A cada 2' executar um set.

Acessórios
3 rounds
12 Reverse Fly
8/8 Single Leg RDL
10 Dumbbell Row

For Time – WOD tc 14'
3 rounds Cap 14'
15cal Bike
12 Shoulder to Overhead (S2OH) 50/35kg
9 Pull-up
15 American KB Swing 24/16kg
Meta: 11'

Cardio
30' Bike Z1
```

**How:** it reads the real Monday–Thursday.

- **LPO:** jerk completes the three lifts.
- **Força:** Overhead Squat, not a heavy squat. Front Squat was Monday, the legs carry Thursday's Hyrox,
  and OHS supports the jerk receive.
- **Acessórios:** rear shoulder + single-leg hinge + row, after a press-heavy week.
- **Core:** none of Monday's or Wednesday's moves.
- **WOD:** none of this week's WOD movements; S2OH for the theme; pulling and hinge; Bike as low-impact
  mono.

0 warnings.

#### D · Hybrid

A's Friday blocks, plus an AI WOD. The day lacks pulling and hinge:

```
For Time – WOD tc 12'
4 rounds Cap 12'
15cal Bike
12 Pull-up
15 American KB Swing 24/16kg
Meta: 10'
```

0 warnings; it shares 3 of 4 movements with C (same week, same reasoning).

### 4c · Check: Monday's predictions vs the real 05/10

The real session was written after the examples were generated: clean LPO · **Front Squat** 6/4/2 →
90% · WOD Clean/T2B/Jerk/C&J · accessories moved to second place, which the user says was
unintentional. **This is the audit trail of §7d, done by hand for one day.**

| | A Reuse | B Synthesis | C AI | D Hybrid |
|---|---|---|---|---|
| Same 6 block types | ✓ | ✓ | ✓ | ✓ |
| Block order vs the intended structure | ✓ | ✓ | ✓ | ✓ |
| LPO family (clean) | ✗ snatch | ✗ | ✗ | ✗ |
| Main lift (Front Squat, top 90) | **✓ ✓** | ✗ BS (top 90 ✓) — ✓ with §7c | ✗ BS (top 95) | **✓ ✓** |
| WOD themed to the day's lift | ✓ | ✓ | ✓ | ✗ |
| Same movements | V-up, Strict Pull-up, T2B, Bike | Strict Pull-up, Russian Row, T2B, Bike | Strict Pull-up, Bike | V-up, Strict Pull-up, Bike |

**Lessons:**

- **LPO:** the Mon/Wed **pair** held (snatch landed Wednesday), but Monday's assignment is a coin flip,
  so the pair rule + the LPO-focus control decide it.
- **Força:** the switch to Front Squat follows the user's **run-length** pattern. A captured it via its
  analog; B needs the §7c rule.

### 4d · Comparison

| | A Reuse | B Synthesis | C AI | D Hybrid |
|---|---|---|---|---|
| Coherence | high per block, none across blocks | good with the §6 rules | high | high |
| Novelty | none | new combinations of the box's movements | new | new WOD |
| Explainable | "from 21/08" | a number behind every choice | prose | mixed |
| Stable per day | yes | yes (seeded) | no | partly |
| Week-aware | lifts only | lifts, families, movement recency | fully | WOD only |
| Measurable by backtest (§7d) | yes | yes | costly (one API call per replayed day) | partly |
| Infra / cost | none | none | Edge Function + key, ≈ US$0.10–0.16 per call | same, smaller calls |
| Parse warnings Mon / Fri | 6 / 5 | 0 / 0 | 0 / 0 | 0 / 0 |

**AI cost and infra** (pricing cached 2026-09-25):

- **Cost:** `claude-opus-5-5` ($4 / $20 per MTok), ≈ 10k input + 3–6k output per call; thinking can't be
  disabled on Opus 5.5, so effort is the lever. Sonnet 5.5 halves the cost (the user's call).
- **Infra:** a Supabase Edge Function holding the key, gated by `is_allowed_user()`, outside the Pages
  pipeline. Athlete names stay out of the prompt. The output goes through `parseSession`.

---

## 5 · Decisions (user, 2026-10-04)

- **Scope:** the main box = untagged sessions. When it gets a name, **link, don't retag**:
  `location.historyFromUntagged = { until: 'YYYY-MM-DD' }`.
- **Learn from:** public sessions only, minus names containing "teste"/"apagar". All history weighted
  equally for content and for block presence. The block **order** follows the canonical structure (§7a).
- **Structure:** "the overall structure should hold; blocks moving around are not intentional". One
  canonical order per box; which blocks a day has is still learned per weekday.
- **Engine for the app:** statistical synthesis. Approaches A, C and D stay in this report as the
  comparison; an AI-written WOD (D) is a possible Phase 6, decided later from the audit trail (§7d).
- **Loads:** every %RM value ends in 0 or 5. Jumps can be any size — 30/40/50/55 is fine, 31/34/43 is
  not. Off-grid values are snapped (87 → 85, 92 → 90).
- **Placement:** a third editor mode (▤ Detalhado · ¶ Texto · ✦ Sugerido), preview → Aplicar.
- **Controls:** LPO lift focus · movement-pattern focus · time budget · pick the blocks.
- **Taxonomy:** 8 patterns — **Agachamento · Dobradiça · Empurrar · Puxar · Olímpico · Core ·
  Monoestrutural · Carregar** — plus a modality tag derived from the category. Patterns are editable in
  Exercícios.
- **Granularity:** the whole session + a per-block "↻ Outra". **Variety:** a soft recency penalty.
  **Repeatability:** stable per day.
- **Provenance:** a tag + a snapshot on the session (JSON, no migration). **Class length:** varies, no
  default. **Over budget:** warn only.
- **Look-ahead:** the whole week. **Thin data:** say so and offer fallbacks. **Sequencing:** #228 first.
- **Examples:** in this report, in Texto notation.
- **Approved with the plan:** the run-length lift rule (§7c, gated by the backtest) and the audit trail
  (§7d).

## 6 · The recommended engine — statistical synthesis, and its rules

Build **B** with these rules:

0. **Canonical structure:** one block order per box, from the last 6 weeks of strength days (§7a).
1. **%RM on the 0/5 grid** (snap; jumps of any size). Força keeps the user's own ramp shape from the
   chosen scheme. LPO drills start at their median observed %RM, never drop across slots, and default
   to +5 per round.
2. **Main lift once per week** (17 of 18 weeks), plus the **run-length switch rule** (§7c).
3. **LPO family** = weekday frequency × family recency, plus a **Mon/Wed pair** rule. The focus control
   overrides both.
4. **WOD themed** to the day's LPO family (60%).
5. LPO drill **complexity order**.
6. **Recency per movement across all blocks**, ignoring warm-up and mobility.
7. **Block parameters from the exact block type** (no EMOM leakage into For Time).
8. **Rep sanity:** the median per round (≥ 2 observations), else a chipper total ÷ rounds, rounded to
   the usual numbers (including distances). Integer caps.
9. **No duplicate root** in a block (`rootGroup`); no duplicate movement in a session.
10. Flagged fallbacks for missing reps and units. Cap fit is an estimate.
11. **Every rule change is judged by the backtest scorecard** (§7d), never by one day.

---

## 7 · Open decisions, explained

### 7a · Canonical structure

**The comment:** "the overall structure should hold; blocks moving around are not intentional".

**The data agrees, with one wrinkle.** Five orderings are near-unanimous on strength days:

- opener (Core/Aquecimento) first: 62–0;
- Força before LPO: 47–6;
- LPO before WOD: 55–0;
- Acessórios before WOD: 50–12;
- WOD before Cardio: 63–0.

Only Acessórios moved, and not at random. Until 21/08 it came **before** LPO on 20 of 21 strength days;
since 24/08 it comes **after** LPO on 17 of 18. Monday 05/10 is the one exception.

**Applied:**

- **One canonical structure per box**, used for every weekday: **Core/Aquecimento → Força → LPO →
  Acessórios → WOD → Cardio**.
- It is derived from the **majority order of the last 6 weeks of strength days, pooled across
  weekdays**. A one-off move like 05/10 can't change it; a durable change like 24/08's is picked up
  within about two weeks.
- Which blocks a day contains is still learned per weekday.

**Alternative:** a fixed "Estrutura" setting per box that the user edits. **Decided with the plan:**
derived, and shown in the pane ("Estrutura: …"); an override can come later if wanted.

### 7b · The 0/5 grid

**The user clarified:** the rule is a **grid**, not a step size. Every %RM value must end in 0 or 5, and
jumps between sets can be any size (30/40/50/55 ✓, 31/34/43 ✗). An earlier draft of this analysis read
it as "increments of 5%" and proposed re-stepping; that was wrong.

**Applied everywhere:**

- Off-grid values are **snapped** (87 → 85, 92 → 90). That touches only 4% of the user's past
  progressions.
- **No re-stepping.** A keeps the blocks as written.
- B copies **the user's own ramp shape** from the scheme it picks:
  - Monday: 31/08's 80/85/90/92 → **80/85/90/90**;
  - Friday: 17/07's 50/60/70/80/90 stays as is.
- C's prompt states the grid rule. LPO drills keep a +5-per-round default, which is on the grid.

### 7c · Lift switching: a run-length rule instead of "peak → switch"

**What B did in the prototype.** It picked the main lift by *what usually follows this lift on this
weekday* (a first-order Markov chain). After a Back Squat Monday, Back Squat followed 4 of 7 times. So B
predicts Back Squat every week and can't tell a block that is ending from one that is continuing. That is
why B said Back Squat for 05/10 when the user programmed Front Squat.

**What the data shows** — consecutive weeks of the same main lift, per weekday:

| Weekday | Pattern | Evidence |
|---|---|---|
| Mon | Back Squat blocks of 1 or 3 weeks, each followed by a single Front Squat week | at week 2: continued 2/2 · **at week 3: switched 2/2, both to Front Squat** · after a BS block → FS 3/4 · after FS → back to BS 4/4 |
| Tue | Bench Press for 3–4 weeks, then one Strict/Shoulder Press week | at week 3: switched 1/3 · at week 4: switched 2/2 · always to a press (3/3) |
| Wed | Deadlift every week (15 in a row; the variant changes: sumo, banded, deficit) | never switched |
| Fri | a weekly rotation of squat variants | after 1 week: switched 9/11 · after 2: 2/2 |

**Why "peak" was the wrong word.** Monday's blocks did end at 90–92% tops, but Tuesday's ended at 95%
and at 80%. **Length** is what predicts the switch, not intensity.

**The rule (approved with the plan, gated by the backtest).** Count how many weeks in a row the
weekday's current main lift has run (k). Then look at that weekday's completed runs of that lift:

- **If at least 2 of them ended at week k, and most did → switch.** The new lift is the one that most
  often followed that lift's blocks on this weekday (Mon: Back Squat → Front Squat). Its top % and
  scheme come from that lift's own history.
- **If most continued → keep the lift and progress it.**
- **With fewer than 2 runs of evidence → fall back to the Markov rule.**

"Por quê" says it plainly, e.g. *"3ª segunda seguida de Back Squat — nas 2 vezes anteriores você trocou
para Front Squat."*

**What it would have produced:**

- **Mon 05/10 → Front Squat**, top 90 (the median of Monday FS tops), scheme and loads from 07/09
  (87/90, snapped) → **"2x2 Front Squat 85/90%"** (parses clean). That matches the lift and top the user
  actually chose.
- **Fri 09/10 → unchanged** (Back Squat). Bench Press has no Friday history, so Friday's general pattern
  applies (switch after 1 week, 9 of 11), and Front Squat is excluded.
- **Wednesday** stays Deadlift; **Tuesday** would switch to a press after a 4th Bench week.

**Risks:**

- **Tiny samples:** two 3-week Monday blocks; three Tuesday blocks.
- **A deliberately longer block would be cut short.**

Mitigations: the ≥ 2-runs threshold; "↻ Outra" offers the other choice, and the lift focus overrides;
**the backtest (§7d) shows whether the rule raises the main-lift hit rate across all history, not just
on 05/10**, before it ships.

### 7d · The audit trail: comparing each suggestion with the real session

**Yes, it helps.** It is the only way to know whether the engine is any good, and which rule to fix
next. The hand check in §4c was one such comparison, and it immediately surfaced the lift-switch rule
(§7c). Three layers; only one of them saves anything.

**1 · Backtest scorecard, computed and never saved.** This is the core of it.

- **What it does:** `audit-suggest.mjs --backtest` replays history. For every past strength day D, it
  runs the engine with only sessions dated **before** D, then compares the suggestion with what was
  actually programmed on D.
- **The scorecard,** per dimension and per weekday: block set · order · main lift · top % (±5) · LPO
  family · WOD theme · movement overlap per block · cap and Meta · parse warnings.
- **Coverage:** every strength day since 06/06, not one anecdote.
- **Rule changes:** re-run before and after each one. The delta is the guard against "fixing" one day
  and breaking ten.
- **No storage, no writes:** a load path never writes. Nothing to keep in sync, and it can be re-run on
  demand.
- ⚠️ **Leakage guard:** the backtest can't know when same-week sessions were typed, so it uses strictly
  earlier dates only. Its look-ahead is weaker than the live engine's, so scores are slightly
  pessimistic.

**2 · Live trail, saved only when ✦ Sugerido is used.** This is the tag + snapshot already decided.

- `session.suggestion.text` holds what was suggested; the saved session holds what the user kept.
- `audit-suggest.mjs --edits` diffs them per block (kept · edited · replaced · removed) and per field
  (lift, loads, movements, reps).
- It answers "how much does the user change suggestions, and where?". That is the evidence that decides
  Phase 6 (an AI-written WOD). Nothing new to store.

**3 · No daily "shadow" log.** Saving a suggestion for days the user programs alone would need a write
path just for logging. The backtest recomputes those comparisons from history whenever needed.

**Where the trail lives:** dated reports in `docs/reviews/` (e.g. `…-suggest-backtest.md`), regenerated
by the script — the history in git, like the #94 registry audit. An in-app view ("Precisão das
sugestões") is possible later and isn't needed for v1.

**What it does to the risks below:** small samples → measured accuracy on every day; registry blind
spots → misses cluster on unresolved names, and the miss list names them; cap fit → the predicted Meta
against the user's Meta; a regression from a rule change → the before/after delta.

**C (AI) is the exception:** backtesting it costs one API call per replayed day, so it would be sampled,
not exhaustive.

### 7e · Risks

- **Small samples:** about 8 LPO blocks per family per weekday.
- **Recency blind spots:** registry misses hide real uses (#211 + the audit's miss list).
- **No pace model:** cap fit is an estimate; the backtest compares Meta.
- **Hold units missing:** "40 Plank" means 40" (#138).
- **Test session and orphan id:** test session 27/09; orphan location id `mserdetyu9xan6rl7gl`.
- **Snapshot size:** ~1 KB per suggested session in the public `sessions` blob.

---

## 8 · Reproducing

The prototype scripts lived in the session scratchpad and are not committed. The definitions below are
what they computed; Phase 1's `scripts/audit-suggest.mjs` is the committed version.

- **Read:** `sessions` and `exercise_registry` with the anon key from `.env.production` (read-only, as
  `scripts/audit-session-registry.mjs` does). `sessions.value` is dateKey → sessions; walk `blocks[]`.
- **Scope — the main box:** a session with no `locationIds` and no `locationId` (`SEM_BOX`).
- **Filters:** `public !== false`, and a session name not containing "teste" or "apagar" — 97 untagged
  sessions → 90.
- **Weeks:** Sunday-start. **Strength day:** a session with a Força block.
- **Block presence:** per weekday, the share of that weekday's sessions holding each block type.
- **Order:** pairwise counts over strength days — how often type X comes before type Y.
- **Main-lift runs:** per weekday, consecutive weeks whose Força block's main lift is the same.
- **Registry match:** `resolveExercise` over every movement occurrence in the blocks — 1,684
  occurrences, 71% resolved. `scripts/audit-session-registry.mjs` is the committed tool for the list of
  names that don't.
- **%RM grid:** every `intensity` progression of mode `pct` — 148 ramps; off-grid = a value not
  divisible by 5.
- **Examples A and B:** the prototype engines; C and D: written by Claude and validated through
  `parseSession`/`serializeSession` (0 warnings and an identical round-trip for B, C and D).
