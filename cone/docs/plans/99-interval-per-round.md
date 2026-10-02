# 99 — #228 · "A cada" + on/off: a time-per-round field on every block type

*Planned 2026-10-02 (Opus). Execution: **Sonnet**, with one approval gate after the editor fields
render (step 3).*

## Context

The user programs most strength, LPO and skill work on a clock — *1 Hang Clean + 1 Push Jerk a cada
2:00, 50/60/70%* — and the block model has no field for it. Measured on the 2026-09-18 prod backup
([evidence](../reviews/2026-10-02-block-structures.md)):

- **38 blocks** carry a real interval only as text — Skill 18 · LPO 14 · EMOM 3 · Força 2 ·
  MetCon 1. In 31 it sits on the block (label or notes); in 7 it is inside one exercise's name or
  note, sometimes a different interval per exercise or per-rep pacing ("1 rep a cada 10"") — those
  stay notes.
- **12 Estações blocks exist only to get the interval** — one `02:00` station × `stationRepeat`,
  labelled "Força", "Skill LPO", "Pliometria". That repaints a strength block amber, makes it a WOD
  block (`isWodBlock`) and logs it as rounds/reps.
- **16 blocks** write a work/rest split in notes — `40'' on 20'' off` (Core 14, Aquecimento 2).
- The text grammar already *parses* `A cada 2'` (`textFormat.js:257-259`, `everySecs`) but has
  nowhere to put it: it approximates a whole-minute `duration`, keeps the line as a note and warns
  `interval-approximated` (`:825-858`, `:211`).
- EMOM's interval is hardcoded to 60 s in the timer (`timer/Timer.jsx:233,312-316,596,640`) and the
  TV slide (`tv/slides.jsx:44,338,390`). This item absorbs **#158(a)**, "variable-interval EMOM".

**User decisions, 2026-10-02:** the field goes on **every** block type (the user's own proposal),
**with** an optional work time for on/off; this is F1 of a three-way split — round-groups are #229,
typed Estações groups #158(b). **Forward-only:** no backfill. Old notes keep rendering, and the 12
interval-Estações blocks stay Estações because results are already logged under that type.

## Acceptance

A coach can give any non-Estações block an interval ("A cada", mm:ss) and optionally a work time
("Trabalho", mm:ss), from the detailed editor or from text. Every public surface shows it in the
block meta, the schedule timer runs it round by round, and the text form round-trips it exactly —
no approximation, no note, no warning. Blocks without an interval behave exactly as before.

## Must-haves

- Example (a) — a Força block, `3 rounds`, `A cada 2:00`, complex *1 Hang Clean + 1 Push Jerk*
  `50/60/70%` — saved once from **Detalhado** and once from **Texto**, stores `interval:'02:00'`,
  `rounds:'3'` both times **and** schedule.html shows `3 rounds · a cada 2'` with a Timer button on
  that Força block.                                   [SPA Criador · schedule.html · DevTools]
- That block's timer, driven with `page.clock`, shows round 2 at 2:00 and finishes after round 3
  at 6:00.                                                                       [timer.html]
- A Core block written `40" on 20" off` with `3 sets` round-trips Texto → Detalhado → Texto with
  the line unchanged **and** its timer shows the rest phase from 0:40 to 1:00 in each round.
                                                                  [SPA Criador · timer.html]
- An EMOM with no interval still turns over every 60 s, and a multi-station Estações still times
  station by station.                                                            [timer.html]
- On the user's Android phone, the Força timer vibrates at each new round.           [device]

## Files

- `public/lib/wod.js` (+ `wod.test.js`) — `fmtPrime`, `intervalStr`, `blkMetaParts`
- `components/tabs/criador/blockModel.js` (+ test) — `normalizeBlockIntervals`, `blockSummary`,
  HIIT's `durationLabel`
- `components/tabs/criador/BlockEditor.jsx` · `useBlockList.js` · `useSessionEditor.js`
- `components/tabs/criador/textFormat.js` (+ `textFormat.test.js`)
- `public/schedule/Schedule.jsx` (`openTimer`) · `public/schedule/BlockDetail.jsx` ·
  `public/timer/Timer.jsx`
- Gallery: `public/gallery/groups/schedule.jsx`, `shared.jsx` (fixtures) → regenerated `cone/design/` cards
- Docs: `docs/arch/criador.md`, `CLAUDE.md`

## Approach

1. **Data.** Two optional block fields, both mm:ss strings like `restBetweenCycles` — **not**
   `duration`'s bare minutes (#93): `interval` ("A cada") and `work` ("Trabalho"; rest = interval −
   work). `work` counts only when `0 < toSecs(work) < toSecs(interval)`. Store keys only when
   non-empty — an empty one is deleted, never kept as `''` on every block. Estações never gets them
   (its stations carry their own durations). An EMOM without `interval` keeps today's 60 s.

2. **Formatting, one helper (`lib/wod.js`, unit-tested).** `fmtPrime(secs)` → `40"` · `2'` ·
   `1'30"` — the notation typed in Texto, ASCII, so display and text share it (unlike `goalStr` vs
   `serializeGoal`, there is no en-dash split to preserve). `intervalStr(bl)` → `''` · `a cada 2'` ·
   `40" on / 20" off`. `blkMetaParts` (`:126`) adds it after rounds (`3 rounds · a cada 2' · CAP
   14'`), which reaches every surface that already uses it: WodBlockCard, BlockDetail, TV slides,
   rail, Index, WodSummary, the three Publicador renderers, PreviewBlock, BlockLogCard.
   `blockSummary` (`blockModel.js:333`) adds the same string.

3. **Editor + the approval gate.** `BlockEditor.jsx:451-483` meta row: a `MaskedTimeInput` "A cada"
   beside Rounds for every type except Estações (`cfg.isStations`), and "Trabalho" once A cada has a
   value; `error` on Trabalho when it is ≥ A cada ("O trabalho precisa ser menor que o intervalo").
   `useBlockList.js:67` adds `interval` and `work` to the changed-field list. ⚠️ **#139's trap:**
   the editor persists per keystroke, and a never-blurred `2` would store 2 seconds — add
   `normalizeBlockIntervals` (`expandMMSS`, drop empties and an invalid `work`) beside
   `normalizeBlockGoals` in the save pipeline (`useSessionEditor.js:178`). Rename HIIT's
   `durationLabel` `'Intervalo (s)'` → `'Duração (min)'` (`blockModel.js:140`) — the field stores
   minutes, and "Intervalo" now has its own input (0 HIIT blocks in prod).
   **🚦 Gate:** BlockEditor is not in the gallery, so once the fields render, screenshot the SPA at
   **1280** and **390** — empty · A cada only · A cada + Trabalho · Trabalho ≥ A cada — and **stop
   for the user's OK** before steps 4–6. In auto mode the run ends here.

4. **Text** (`textFormat.js`).
   - `parseStructure` (`:245`): `everySecs` from every spelling the evidence lists — `A cada 2'`,
     `A cada 2'30"`, `A cada 1'10''`, `(A cada 3'30` (no seconds mark), `A cada 3''30"` (typo),
     `a cada 01:20`, `Every 2'`, and `E2MOM`/`E3MOM` (→ N minutes, type EMOM). One rule covers the
     two-number forms: `N<marks>M<marks>` is minutes then seconds, whatever the marks
     (`normLine` already folds curly quotes, `:22-29`). Number words (`a cada dois minutos`, 2
     blocks) are cheap to add — include them if the regex stays readable. New on/off probe:
     `40'' on 20'' off`, `40" on - 20" off`, `1' On 30" off`, `40on 20off` → `onSecs`/`offSecs`
     (`'` = minutes, `"`/`''` = seconds, unit-less = seconds — pin it with a test). `mergeStruct`
     carries the new keys.
   - `buildBlock` (`:825-858`): `interval = fmtSecs(everySecs)`; on/off → `interval =
     fmtSecs(on + off)`, `work = fmtSecs(on)`. Stop deriving `duration` from the interval, stop
     pushing the line into notes, keep "no type + interval → EMOM". Delete the
     `interval-approximated` kind (`:211`) and its tests.
   - `serializeBlock`: the structure line emits `A cada 2'` / `A cada 1'30"` or `40" on 20" off`
     via `fmtPrime`, beside rounds/cap.
   - `FORMAT_REFERENCE` (`:136`, pt-BR UI copy): replace the "aproximado; guardado na nota" line
     with `A cada 2' · A cada 1'30"   intervalo por round` and add `40" on 20" off   trabalho /
     descanso por round`.
   - Exercise-level intervals (7 blocks — several per block, or per-rep pacing) stay notes: the
     field is per block. Record that limit in the arch doc.
   - Run `node scripts/audit-text-roundtrip.mjs` **before and after**; record both tables.

5. **Timer — reuse the Estações cycle, don't add an engine** (#158's original advice).
   - `Schedule.jsx:577` `openTimer`: a block with a valid `interval` (any type but Estações) sends
     `intervalMode: true`, one pseudo-station `exercises: [{ name: <block label>, exercises: […] }]`,
     `stationTime = work || interval`, `transitionTime = interval − work` (else 0), and `rounds`.
     `stCycleRaw`/`stPhaseRaw`/`isTimeUpRaw` (`Timer.jsx:195-227`) then time it as-is.
   - In `Timer.jsx`, the `bt === 'Estações'` tests that drive timing and the station list read a
     single `isCycle(cfg)` (Estações **or** `intervalMode`).
   - The tick's change key (`:321`, `` `${idx}-${phase}` ``) gains the round — with one station and
     no rest it never changes, so the round turnover would never vibrate. Harmless for real
     Estações: their key already changes at every station.
   - Labels: the mode label and the config summary (`:1010`, `Ns / Ns transição`) show
     `intervalStr` instead of `ESTAÇÕES`.
   - EMOM's 60 s paths stay untouched for EMOMs without an interval; an EMOM *with* one goes
     through `intervalMode` like any other block.
   - `BlockDetail.jsx`: the Timer button (`:216`) and its actions column (`:214`, today WOD-only via
     `actionsEmpty`) render for any block with an interval — a Força E2MOM needs the button.
   - Out of scope: the TV `TimerSlide` (driven by the unused TvController — memory) and the
     standalone timer's own config form. Never add a `tv_state` field (`push()` is patch-only).

6. **Tests:** `wod.test.js` (`fmtPrime`, `intervalStr`, `blkMetaParts` with and without
   interval/work) · `blockModel.test.js` (`normalizeBlockIntervals`: expand, drop empties, drop
   `work ≥ interval`) · `textFormat.test.js` (each prod spelling, on/off, the EMOM inference,
   serialize, round-trip). Gallery fixtures with an interval and an on/off block in
   `groups/schedule.jsx` (BlockDetail) and `groups/shared.jsx` (WodBlockCard) → `npm run design:cards`.

7. **Docs are part of Done:** `docs/arch/criador.md` — the grammar (new lines, the minutes-then-
   seconds rule, exercise-level intervals stay notes) and that `interval-approximated` is gone;
   `CLAUDE.md` — `block.interval`/`block.work` beside `block.goal` in the block-shape note; the new
   test total.

8. **Drive the must-haves** on the local stack (memory: live-verify recipe), proving at least the
   meta-string and timer checks fail on the pre-change files; then the Done ritual.

## Verification

The must-haves, driven. `npm test` at the new total · `npm run lint` · `npm run format:check` ·
`npm run build:all` · `audit-text-roundtrip.mjs` before/after recorded in the Done marker ·
`node scripts/audit-backlog-markers.mjs` clean.

Model: Sonnet · Size: M
