# 2026-10-02 · Block structures the Criador can't express — prod evidence

Read-only analysis of the **`2026-09-18_16-05-25` prod backup** (`cone/backups/…/sessions.json`:
152 sessions, 672 blocks), run offline to plan the user's "Estações update" request. It decided
the split into **#228** ([plans/99](../plans/99-interval-per-round.md)), **#229**, **#230** and the
re-scope of **#158**.

---

## 1 · The request

Two workouts the user can't enter cleanly today:

- **(a)** a Força block on a clock — *1 Hang Clean + 1 Push Jerk every 2:00, 50/60/70%*. The load
  per round can be entered; the 2:00 can only go into a note.
- **(b)** one For Time made of round-groups — *For Time 20' · buy-in 500m run · 3 rounds of 50
  double-unders + 25 toes-to-bar · 2 rounds of 15 power cleans + 10 burpees over the bar · buy-out
  500m row*. Today: an Estações block plus notes and workarounds.

The user's proposal: let Estações groups take a WOD type, and add a "time per round" input to
every block type. They asked for the analysis against existing data, and for alternatives.

## 2 · What prod holds

| Pattern | Blocks | Written today as | Goes to |
|---|---|---|---|
| Interval per round ("a cada 2' × 7") | **38** non-Estações **+ 12** Estações | text in notes — or an Estações block used only for its clock | #228 |
| Work/rest per round ("40'' on 20'' off") | **16** | notes | #228 |
| Round-groups typed as exercise rows | **21 blocks / 37 rows** | `3 Rounds`, `Buy in`, `Then`, `AMRAP 10'` entered as exercises | #229 |
| Multi-part, each part its own clock + score | **9** Estações | the type and the clock live in the station **name** | #158(b) |
| Estações placeholders | 4 | empty or half-built | — |

⚠️ **A first pass reported 51 interval blocks and 13 multi-part Estações — both wrong.** "a cada"
also matches *par**a cada*** ("for each": "10 para cada lado") and the For Time add-ons "a cada
round +35 DU" / "a cada minuto 5 burpees", none of which is a clock. The counts above require "a
cada"/"every" as a word followed by a time, and split the Estações by hand.

### 2a · Interval per round — 38 + 12

**By type:** Skill 18 · LPO 14 · EMOM 3 · Força 2 · MetCon 1. In **31** the interval is on the
block (label or notes); in **7** it is inside one exercise's name or note — sometimes a different
interval per exercise (2026-08-24: 1', 1', 1'30'') or per-rep pacing (2026-06-29 "1 rep a cada
10""). A per-block field covers the 31; the 7 stay notes.

**Spellings seen** — the parser's test cases for plans/99:
`A cada 2'` · `A cada 2' 7 Sets` · `A cada 2'30"` · `A cada 1'10''` · `A cada 1'30''` · `(A cada
3'30` · `A cada 3''30"` · `a cada 01:20` · `A cada 3’` · `Every 2' x 5 sets` · `a cada dois
minutos` (×2) · `A cada 3' — 5 sets` · `Um set a cada 3'.`

**The 12 Estações that exist only for the clock** — one non-rest station, repeated:

| Date | Label | Station × cycles |
|---|---|---|
| 2026-06-19 | Estações | AMRAP 3:30 + rest 2:00 × 4 |
| 2026-06-29 | Estações | 10:00 × 3 ("finished early? rest to the end of the round") |
| 2026-08-04 | Estações | 4:00 × 4 |
| 2026-08-12 | Estações | 4:00 × 4 ("do the block in 3', rest the remainder") |
| 2026-08-13 | Pliometria | 2:20 × 5 |
| 2026-08-17 | Estações | 2:00 × 7 (complex PC + FS + SJ, 50% → progression) — example (a)'s twin |
| 2026-08-17 | Skill Complex | 1:30 × 6 |
| 2026-08-18 | Força | 3:00 × 1 (deadlift progression) |
| 2026-08-20 | Pliometria | 2:20 × 5 |
| 2026-09-08 | Ginástica | 2:00 × 5 |
| 2026-09-14 | Skill LPO | 1:30 × 16 |
| 2026-09-14 | Skill LPO | 1:30 × 4 |

Using Estações for these repaints a strength block amber, makes it a WOD block (`isWodBlock`) and
logs it as rounds/reps.

### 2b · Work/rest — 16

Core 14 · Aquecimento 2. Spellings: `40 on 20 off 3 Sets` · `40'' on - 20'' off` · `40” on 20”
Off` · `40on 20off 3 sets` · `1' On 30" off 3 round` · `(1' on 20''off)` · `30" On 30" Off`. A
unit-less value is seconds.

### 2c · Round-groups typed as exercise rows — 21 blocks, 37 rows, three kinds

- **Round-group chippers (6)** — example (b)'s shape: 2026-06-22 LPO (`5 Rounds`, `4 Rounds`) ·
  2026-07-23 For Time ×2 (`Buy in`, `Then`, `3 Rounds`, `Buy out`) · 2026-07-31 Ginástico
  (`4 Sets`, `2 Rounds`, `Then`) · 2026-08-18 For Time "Wod Tc 20'" (`1 Round`, `2 Rounds`) ·
  2026-09-16 For Time (`3 Rounds`, `2 Rounds`, `1 Rounds`, an 800m run between each).
- **Block rounds typed as the first row (10)** — 2026-07-24 Cardio `2 sets` · Core 2026-07-27,
  08-12, 09-07 · LPO 2026-08-25 · Aquecimento 2026-09-09, 09-10, 09-11 · For Time 2026-09-19
  `4 rounds` and 2026-09-22 `5 Rounds`.
- **Part headers typed as rows (5)** — 2026-07-27 `Amrap` (after a `Buy- in`) · 2026-07-28 Skill
  `Emom 15'` · 2026-08-28 AMRAP `AMRAP 10'` · 2026-08-29 AMRAP (`AMRAP 10'` ×2, `For Time` — a
  45-minute three-part workout in one block) · 2026-09-04 EMOM `Set 1`–`Set 5` (every 2' × 5, a
  different set each round — #228 and #229 together).

What these rows cost today: athletes see `3 Rounds` as a movement (with a checkbox on
schedule.html's non-WOD blocks); #211's audit counts them as unresolved names; and #112's DNF total
counts a numbered one as reps — `repsBefore` (`lib/wod.js:420`) reads `3 Rounds` as 3.

### 2d · Multi-part Estações — 9, plus 4 placeholders

| Date | Session | Parts |
|---|---|---|
| 2026-07-30 | HYROX Eagles Test | 8 × 3:00 "200m Run + Max X", 1:00 rest between |
| 2026-08-01 | Eagles Test Saturday | 8 × 4:00 "400m Run + Max X", 1:00 rest between |
| 2026-08-06 | Eagles Test Thursday Hyrox ×2 | 4 stations, 1:00 on / 0:30 off, × 2 |
| 2026-08-15 | Diversao Matinal, RX + SC ×2 | 4 × 4:00 × 3 ("3' on 1' off") |
| 2026-09-09 | — | `Set 01 - AMRAP` … `Set 05 - AMRAP`, 2:00 each + 2:00 rest, rising % |
| 2026-09-10 | Quinta-Hyrox | `0-10' - AMRAP` · `12'-22' - AMRAP` · `24'-34' - AMRAP` · `34'-36' - RUN!` |
| 2026-09-12 | Hyrox | windows `0' - 9'` · `11'-19'` · `21' - 28'` · `30' - 36'` |

Each part has its own clock and its own score, but the block logs one. Placeholders: 2026-07-06
(`Grupo A` 5 C&J × 6 — really an interval; `Grupo B` empty) · 2026-08-22 (two empty groups) ·
2026-09-12 "Sábado" and 2026-09-17 "Rest" (no stations).

## 3 · The two examples, mapped

- **(a)** → #228: a **Força** block, `3 rounds`, `a cada 2:00`, the complex at 50/60/70% — stays
  blue, stays a strength block, the schedule timer runs it round by round.
- **(b)** → #229: a **For Time · TC 20'** block whose exercise list has group headers `Buy-in` ·
  `3 rounds` · `2 rounds` · `Buy-out` — one time score, cap and ranking unchanged.

**Why (b) is not an Estações block:** Estações scores rounds + reps (`isTimeBlock`,
`lib/wod.js:110`), hides the cap field (`showDuration:false`, `blockModel.js:179`), and WOD-typed
groups would invite one score per group for what is one result.

## 4 · Decision (user, 2026-10-02)

Split by pattern rather than putting everything inside Estações:

- **#228 · "A cada" + on/off** on every block type except Estações — plans/99. Absorbs #158(a)
  (EMOM's 60 s is hardcoded in `timer/Timer.jsx` and `tv/slides.jsx`). The user added the optional
  work time.
- **#229 · round-groups inside a normal block** — mocked up in Claude Design first (Lane B): the
  Criador inputs and what athletes see, approved before any build.
- **#158(b) · Estações groups with their own type, goal and score** — the user's proposal, for the
  9 blocks of §2d. After #228/#229; unblocked since #157's per-block shape shipped (plans/80).

**Forward-only, no backfill.** The 12 interval-Estações blocks have results logged under type
`Estações`; retyping them would re-label or orphan those rows. Old notes keep rendering.

## 5 · Defects found on the way → #230

- **The Estações timer is uniform.** `Schedule.jsx:601-602` sends the first non-rest station's
  duration as `stationTime` and the first rest station's as `transitionTime`; `Timer.jsx:195-224`
  applies both to every station, and `restBetweenCycles` never reaches the timer. Wrong for the
  2026-09-12 windows (9', 8', 7').
- **Two cap calculators disagree.** `stationsCapMins` (`schedule/scheduleHelpers.js:34`) subtracts a
  trailing rest station; `stationsCapStr` (`criador/blockModel.js:315`) doesn't.
- **`cloneBlocks` (`blockModel.js:372`, used by templates) never re-ids stations** — it re-ids
  blocks and exercises only, and adds an empty `exercises: []` to an Estações block. It matters once
  #158(b) keys anything by station id.

## 6 · Reproducing

The scripts lived in the session scratchpad and are not committed (this review changes no code).
Read `sessions.json` → `.value` (dateKey → sessions) and walk `blocks[]`:

- **Interval:** "a cada"/"every" as a **word** followed by a time token (`2'`, `1'30"`, `1'10''`,
  `1:30`), or `E[2-9]MOM`, or "a cada dois/três/quatro minutos". Estações are counted separately.
- **On/off:** `N[unit] on … M[unit] off`.
- **Typed rows:** an exercise whose `reps + name` is wholly a structure token — `N rounds/sets/voltas`,
  `buy in/out`, `then`, `set N`, `amrap …`, `for time`, `emom …`, `round`.
- **Estações:** one non-rest station repeated = interval; the rest classified by hand (§2d).
