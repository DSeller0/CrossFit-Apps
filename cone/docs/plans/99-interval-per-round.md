# 99 — #228 · "A cada" + on/off: a time-per-round field on every block type, and a Timer on every block

> 🟡 Shipped: `5d3f728` · 2026-10-17 — see BACKLOG.md · #228. Everything is driven on Chromium; the
> plan stays `> 🟡 Shipped:` until the Android vibration check passes (steps in
> [DEVICE-TESTS.md](../DEVICE-TESTS.md)), and the marker is flipped then.
>
> **Must-haves: 5/6 driven** on the local stack (SPA `:5173`, public `:5174`, two fixture sessions on
> 2026-11-02/03, deleted afterwards), on the final files. (1) Força `3 rounds · A cada 2:00`, saved
> from Detalhado and from Texto: `interval:'02:00'`, `rounds:'3'`, no `duration` both times;
> schedule.html shows `3 RDS · a cada 2'` with a Timer in the right-hand column. (2) Its timer:
> `RD 1/3` → `RD 2/3` at 120.1 s (`[400,100,400]`) → `RD 3/3` at 240.3 s → `FINALIZADO 06:00` at
> 360.1 s; footer `DESCARTAR · FECHAR`, no REGISTRAR. For Time's footer: `DESCARTAR · REGISTRAR`.
> Driven with a `Date.now()` offset, **not** `page.clock`: `runFor` hung the tool twice once the timer
> was running. (3) Core `3 rounds 40" on 20" off`: the whole session text came back identical through
> ¶ Texto → Detalhado → ¶ Texto, and so did the block's own ¶; deleting the line emptied A cada and
> Trabalho, retyping it restored `01:00` / `00:40`. Its timer: `00:39 TRABALHO` → `00:19 DESCANSO` at
> 40.6 s → `RD 2/3` at 60.6 s. (4) LPO CAP 15': `14:59` → `FINALIZADO 15:00`. Força sem tempo:
> `15:05`, `30:05`, still running until FIM. EMOM: `MIN 1/12` → `MIN 2/12` at 60.6 s
> (`[300,100,300]`). EMOM `A cada 1'30"`: 8 rounds, `RD 2/8` at 90.6 s, `FINALIZADO 12:00`. Estações:
> `EST 1/2 · RD 1/2` → `TRANSIÇÃO` at 45 s → `EST 2/2` at 60 s → `RD 2/2` at 120 s → `04:00`. Before
> the change, HEAD renders no Timer on a non-WOD block (`actionsEmpty = !isWod`) and offers REGISTRAR
> on any timer with a session (`canReg = !!cfg.sessionId`). (5) `A cada 2:00` × 5 with Duração empty:
> placeholder `10'`, saved block without `duration`, week-grid card `5× · a cada 2'`. (6) Android
> vibration: pending. Text round-trip audit on 747 prod blocks, before and after: 543 identical, 30
> rewritten, 0 unstable; `interval-approximated` gone, `interval-lost` 0. `/code-review` hit the
> session limit three times, so the diff was reviewed inline: one finding, fixed in the same commit —
> the index rail hand-rolls non-WOD meta and dropped the interval.

*Planned 2026-10-02 (Opus); amended 2026-10-05 (Opus) — the Duração hint and a Timer on every block.
Execution: **Sonnet**, with two approval gates: after the editor fields render (step 3 — the A cada /
Trabalho fields, approved with the 2026-10-05 amendment) and after the Duração hint and the Timer
placement render (step 3b).*

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

**Amended 2026-10-05.** Held at the step-3 gate, the user asked two things. *Does `A cada 2'` × 5
rounds fill Duração?* No — nothing derives it, and step 4 stops the text parser approximating
`duration` from an interval. *Is the timer WOD-only?* Yes: `BlockDetail.jsx` (`actionsEmpty = !isWod`)
renders the Timer only for WOD types, plus Estações' own header button, and the gallery records that
as deliberate. The user wants a timer on **every** block. Decided:

- **Duração:** show the derived total; **don't store it.**
- **Duração but no A cada** (LPO 15', Cardio 40'): the timer **counts up and stops at Duração**, like
  For Time.
- **Neither:** a **stopwatch** — counts up, LAP, runs until FIM.
- **Placement on non-WOD blocks:** the **right-hand actions column**, like WOD blocks — a 65/35 split
  on desktop, a full-width ▶ row under the exercises on a phone.

Found while exploring — none of it was in the first version of this plan:

- **A broken REGISTRAR.** The timer's finished screen offers **REGISTRAR** whenever `cfg.sessionId` is
  set (`Timer.jsx:1064`), and so do its history rows (`:760`). REGISTRAR opens `doOpenLog`, which only
  knows WOD blocks (`Schedule.jsx:658`) — a Força timer would land in the log of some other block.
- **The interval would be hidden.** A non-WOD block with rounds shows its `3 RDS` badge **instead of**
  the meta line (`BlockDetail.jsx:193`), so `a cada 2'` would never show on exactly the blocks this item
  is for.
- **EMOM and A cada would collide.** `Timer.jsx` dispatches on `cfg.blockType` at about 20 run-time
  sites and checks EMOM/AMRAP before Estações, so an **EMOM with an A cada** would take the 60-s
  branches, not the interval cycle. The precedence between modes has to live in one place.

## Acceptance

The user can give any non-Estações block an interval ("A cada", mm:ss) and optionally a work time
("Trabalho", mm:ss), from the detailed editor or from text. Every public surface shows it in the block
meta, **every block has a Timer** — it runs an interval round by round, counts up to a Duração, or is a
stopwatch — and the text form round-trips the interval exactly: no approximation, no note, no warning.
With an interval and Rounds set, the editor shows the total as Duração's placeholder and **stores
nothing**. A block without an interval behaves exactly as before, apart from having a Timer.

## Must-haves

1. Example (a) — a Força block, `3 rounds`, `A cada 2:00`, complex *1 Hang Clean + 1 Push Jerk*
   `50/60/70%` — saved once from **Detalhado** and once from **Texto**, stores `interval:'02:00'`,
   `rounds:'3'` and **no** `duration` both times, **and** schedule.html shows `3 RDS` + `a cada 2'`
   with a Timer in that block's right-hand column.   [SPA Criador · schedule.html · DevTools]
2. That block's timer, driven with `page.clock`, shows round 2 at 2:00 and finishes after round 3 at
   6:00, and its finished screen offers **FECHAR, not REGISTRAR**; a For Time block's timer still
   offers REGISTRAR.                                                               [timer.html]
3. A Core block written `40" on 20" off` with `3 sets` round-trips Texto → Detalhado → Texto with the
   line unchanged — through the session's ¶ Texto **and** the block's own ¶, where deleting the line
   and flipping back also empties A cada — **and** its timer shows the rest phase from 0:40 to 1:00 in
   each round.                                                     [SPA Criador · timer.html]
4. Every block has a Timer:
   - `LPO 15'` counts up and stops at 15:00;
   - a Força block with no time runs past 15:00 until FIM;
   - an EMOM with no A cada still turns over every 60 s, and an EMOM **with** `A cada 1:30` turns over
     every 1:30;
   - a multi-station Estações still times station by station.

   [schedule.html · timer.html]
5. With `A cada 2:00`, 5 rounds and Duração empty: the Duração field shows `10'` as its placeholder,
   the saved block carries no `duration`, and the Criador week-grid card shows `a cada 2'`.
                                                                  [SPA Criador · DevTools]
6. On the user's Android phone, the Força timer vibrates at each new round.           [device]

## Files

- `public/lib/wod.js` (+ `wod.test.js`) — `fmtPrime`, `intervalOf`, `intervalStr`, `intervalTotal`,
  `blkMetaParts`
- `components/tabs/criador/blockModel.js` (+ test) — `normalizeBlockIntervals`, `blockSummary`,
  HIIT's `durationLabel`
- `components/tabs/criador/BlockEditor.jsx` · `useBlockList.js` · `useSessionEditor.js`
- `components/tabs/criador/textFormat.js` (+ `textFormat.test.js`) · `BlockTextEditor.jsx` ·
  `WeekSessionCard.jsx`
- `public/schedule/BlockDetail.jsx` · `Schedule.module.css` · `Schedule.jsx` (`openTimer`) ·
  `scheduleHelpers.js` (+ test) — `timerConfigFor`
- `public/timer/timerMode.js` (new, + test) · `public/timer/Timer.jsx`
- Gallery: `public/gallery/groups/schedule.jsx` · `fixtures.js` → regenerated `cone/design/` cards
- Docs: `docs/arch/criador.md` · `docs/arch/tv.md` · `CLAUDE.md`

## Approach

1. **Data.** Two optional block fields, both mm:ss strings like `restBetweenCycles` — **not**
   `duration`'s bare minutes (#93): `interval` ("A cada") and `work` ("Trabalho"; rest = interval −
   work). `work` counts only when `0 < toSecs(work) < toSecs(interval)`. Store keys only when
   non-empty — an empty one is deleted, never kept as `''` on every block. Estações never gets them
   (its stations carry their own durations). An EMOM without `interval` keeps today's 60 s.

2. **Formatting, helpers in `lib/wod.js` (unit-tested).** `fmtPrime(secs)` → `40"` · `2'` · `1'30"` —
   the notation typed in Texto, ASCII, so display and text share it (unlike `goalStr` vs
   `serializeGoal`, there is no en-dash split to preserve). `intervalOf(bl)` → `{ every, work, rest }`
   in seconds, or null — the one validity rule. `intervalStr(bl)` → `''` · `a cada 2'` ·
   `40" on / 20" off`. `intervalTotal(bl)` → seconds, `every × rounds` — the editor's Duração hint and
   the timer's ready screen share it. `blkMetaParts` (`:126`) adds the string after rounds (`3 rounds ·
   a cada 2' · CAP 14'`), which reaches every surface that already uses it: WodBlockCard, BlockDetail,
   TV slides, rail, Index, WodSummary, the three Publicador renderers, PreviewBlock, BlockLogCard.
   `blockSummary` (`blockModel.js:333`) adds the same string.
   **Sibling sweep (2026-10-04, found while building step 3):** three surfaces build their own
   meta string and bypass `blkMetaParts` — `criador/WeekSessionCard.jsx:49` (the week-grid card:
   **fixed in step 3**, gets `intervalStr`), `criador/BlockTextEditor.jsx:65-71` (the per-block Texto
   preview: step 4) and `timer/Timer.jsx:1008` (the config summary: step 5).

3. **Editor + the first approval gate.** `BlockEditor.jsx:451-483` meta row: a `MaskedTimeInput`
   "A cada" beside Rounds for every type except Estações (`cfg.isStations`), and "Trabalho" once
   A cada has a value; `error` on Trabalho when it is ≥ A cada ("O trabalho precisa ser menor que o
   intervalo"). `useBlockList.js:67` adds `interval` and `work` to the changed-field list. ⚠️ **#139's
   trap:** the editor persists per keystroke, and a never-blurred `2` would store 2 seconds — add
   `normalizeBlockIntervals` (`expandMMSS`, drop empties and an invalid `work`) beside
   `normalizeBlockGoals` in the save pipeline (`useSessionEditor.js:178`). Rename HIIT's
   `durationLabel` `'Intervalo (s)'` → `'Duração (min)'` (`blockModel.js:140`) — the field stores
   minutes, and "Intervalo" now has its own input (0 HIIT blocks in prod).
   **🚦 Gate 1:** BlockEditor is not in the gallery, so once the fields render, screenshot the SPA at
   **1280** and **390** — empty · A cada only · A cada + Trabalho · Trabalho ≥ A cada — and **stop
   for the user's OK**. *Passed 2026-10-05: approved together with the amendment.*

3b. **The Duração hint, a Timer on every block, and the second gate** (Lane A for `BlockDetail`).
   - *Duração hint* (`BlockEditor.jsx`, the Duração input): with Duração empty and an interval and
     Rounds both valid, the placeholder shows the total — `intervalTotal` through `fmtPrime`: `10'`,
     or `7'30"` — and the input's `title` reads `5 × 2' = 10'`. Nothing is stored; a Duração the user
     types still wins; public surfaces keep `5 rounds · a cada 2'`. **No CAP is invented.**
   - *`BlockDetail.jsx`* — the Timer renders for **every** block, in the actions column;
     `actionsEmpty` goes. The Leaderboard link and the athlete section stay WOD-only.
     `.cardInfoFull` and its ≤767px rule (`Schedule.module.css:108,116`) lose their last user and are
     deleted. A round block's `3 RDS` badge stands in for the meta line, so it would hide the
     interval: it gets `intervalStr(bl)` beside it. Estações keeps its own header button (a separate
     branch, untouched).
   - *Gallery* (`gallery/groups/schedule.jsx`): the BlockDetail caption states the new rule ("só
     blocos WOD ganham Timer…" no longer holds); "Não-WOD (largura total, sem ações)" becomes
     "Não-WOD (Timer na coluna)"; a new case, "Rodadas + A cada" (a fixture in `fixtures.js`). The
     SessionDetail case caption that says "sem ações de registro" keeps its meaning — registering is
     still WOD-only — and is reworded only if it now reads wrong.
   - **🚦 Gate 2:** screenshot the SPA editor's Duração hint at **1280** and **390**, and the gallery's
     BlockDetail states — non-WOD with its Timer, rounds + A cada, WOD unchanged — in **all 8 themes**
     at 390 and 1280; **stop for the user's OK** before steps 4–6. In auto mode the run ends here.

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
   - `BlockTextEditor.jsx:40-55` (`merge`) **whitelists** the parsed fields (`duration`, `rounds`,
     `goal`, `notes`, …), so the per-block ¶ toggle would drop `interval`/`work` the moment the
     parser produces them — and a line deleted from the text would leave the old value behind.
     Carry both **explicitly** (`interval: p.interval`, `work: p.work`), and give its preview
     summary (`:65-71`) `intervalStr`.
   - Exercise-level intervals (7 blocks — several per block, or per-rep pacing) stay notes: the
     field is per block. Record that limit in the arch doc.
   - Run `node scripts/audit-text-roundtrip.mjs` **before and after**; record both tables.

5. **Timer — every block, one dispatch, no new engine** (#158's original advice: reuse the
   Estações cycle).
   - **`timerConfigFor(bl)`** (`schedule/scheduleHelpers.js`, tested) takes the block half of
     `openTimer` (`Schedule.jsx:580-637`): the station mapping and the exercise mapping. `openTimer`
     keeps the session and athlete ids and the `localStorage` hand-off.

     | Block | Timer | Config |
     |---|---|---|
     | Estações | stations, as today | unchanged |
     | **any type** with a valid A cada | the interval cycle | `intervalMode: true` · one pseudo-station `{ name: <block label>, exercises: […] }` · `stationTime = work ‖ every` · `transitionTime = rest ‖ 0` · `rounds = Rounds ‖ ⌊Duração ÷ A cada⌋ ‖ null` (null → runs until FIM) |
     | WOD type, no A cada | as today | `blockType` drives it |
     | non-WOD, with Duração | counts up, stops at Duração | the default branch, `timeCap = Duração` |
     | non-WOD, nothing | a stopwatch | the default branch, no cap |

     Every config also carries `loggable: isWodBlock(bl)`.
   - **`public/timer/timerMode.js`** (new — the timer's first tests): `timerMode(cfg)` → `'cycle'`
     (Estações or `intervalMode`) · `'emom'` · `'amrap'` · `'up'`, **in that precedence**, so an EMOM
     with `A cada 1:30` takes the cycle, not the 60-s branches; `cycleEnd(cfg)` → seconds, or null.
     `Timer.jsx`'s run-time `bt === …` reads (about 20) go through `timerMode(cfg)`. The setup form's
     `form.type` checks stay, and so do the clock, the refs and the tick model — that is #191's.
   - **Interval-cycle UI:** the round reads `RD n/rounds`, never `EST 1/1`; the phase label is
     `trabalho`/`descanso` with a rest, `até o próximo` without; the ready screen's summary (`:1010`,
     today `Ns / Ns transição`) shows `intervalStr` and the total instead. The tick's change key
     (`:321`, `` `${idx}-${phase}` ``) gains the round — with one station and no rest it never
     changes, so a round turnover would never vibrate. Harmless for real Estações: their key already
     changes at every station.
   - **REGISTRAR** — the finished screen (`:1064`) and the history rows (`:760`) — shows only when
     `cfg.sessionId && cfg.loggable !== false`; `pushHist` stores `loggable`. A config saved before
     this has no flag and keeps today's behaviour.
   - Out of scope: the TV `TimerSlide` (driven by the unused TvController — memory) and the
     standalone timer's own config form. Never add a `tv_state` field (`push()` is patch-only).

6. **Tests:** `wod.test.js` (`fmtPrime`, `intervalOf`, `intervalStr`, `intervalTotal`, `blkMetaParts`
   with and without interval/work) · `blockModel.test.js` (`normalizeBlockIntervals`: expand, drop
   empties, drop `work ≥ interval`) · `textFormat.test.js` (each prod spelling, on/off, the EMOM
   inference, serialize, round-trip) · `scheduleHelpers.test.js` (`timerConfigFor`, one case per row
   of the table) · `timer/timerMode.test.js` (the precedence, `cycleEnd`). Gallery fixtures with an
   interval and an on/off block in `groups/schedule.jsx` (BlockDetail) and `groups/shared.jsx`
   (WodBlockCard) → `npm run design:cards`.

7. **Docs are part of Done:** `docs/arch/criador.md` — the grammar (new lines, the minutes-then-
   seconds rule, exercise-level intervals stay notes), the Duração hint, and that
   `interval-approximated` is gone; `docs/arch/tv.md` — the timer's modes and their precedence,
   `loggable`, and that `Timer.jsx` is no longer test-free; `CLAUDE.md` — `block.interval` /
   `block.work` beside `block.goal` in the block-shape note, and the new test total.

8. **Drive the must-haves** on the local stack (memory: live-verify recipe), the timer with
   `page.clock`, proving at least the meta-string and timer checks fail on the pre-change files; then
   the Done ritual.

## Verification

The must-haves, driven. `npm test` at the new total · `npm run lint` · `npm run format:check` ·
`npm run build:all` · `npm run design:cards` · `audit-text-roundtrip.mjs` before/after recorded in the
Done marker · `node scripts/audit-backlog-markers.mjs` clean · `/code-review` before the push (an L
item).

Model: Sonnet · Size: L
