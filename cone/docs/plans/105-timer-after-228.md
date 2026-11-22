# 105 — #242 · The Timer after #228: legacy caps, interval AMRAP/EMOM, round overrun

*Planned 2026-11-22 (Opus) from the [2026-11-22 code review](../reviews/2026-11-22-code-review.md).
It absorbs #243's timer half: findings #3, #10, #13, #14 and #25. #243 keeps the index rail and the
gallery (#18, #19, #24). Execution: **Sonnet**. There is no approval gate: no new layout, and every
change is to timer behaviour that an existing screen already shows.*

## Context

#228 (plans/99) put a Timer on **every** block, and gave any block type an interval
(`interval`/`work`). The Timer's run-time logic was written when only WOD types reached it, so seven
findings now show on real sessions:

| # | Where | What the athlete sees |
|---|---|---|
| 1 | `scheduleHelpers.js:90` | A pre-#228 block kept "A cada" only in its notes, plus a **rounded** whole-minute `duration`. The timer reads that as a cap and stops after one interval. Example: `{LPO, rounds 3, duration 2, "3 rounds A cada 1'30\""}` → FINALIZADO at 2:00 of a 4:30 block. |
| 2 | `scheduleHelpers.js:118` | Any interval block is folded into one pseudo-station and forced into `'cycle'`. An interval **AMRAP** loses LAP and round counting (`Timer.jsx:1160`). An interval **EMOM** loses its movement rotation (`:1208`), though `EMOM 12'` without an interval still rotates. |
| 4 | `Timer.jsx:444` | `doLap` finishes on the last round only when `isTimeBlock(bt)`. A non-WOD round block reaches the timer in `'up'` mode with `rounds` set, so it shows `RD 4/3`, `RD 5/3` and the announcer says "Round 4". |
| 5 | `Timer.jsx:620` | The warn class depends on `isTimeBlock(bt) && cap && e >= cap*0.85`: an interval HIIT warns on the cap, not on the cycle end. This is a run-time `blockType` check of the kind tv.md says to replace with the mode. |
| 11 | `timerMode.js:36` | `cycleEnd` returns `0`, not `null`, for a cycle with no stations, so the timer shows FINALIZADO at 00:00. That contradicts the helper's own "never an instant finish" comment. |
| 12 | `scheduleHelpers.js:114` | `timeCap` is `parseInt(duration)`, so a fractional Duração (prod has 2.3) is truncated: EMOM `01:30` × Duração 7.5 → 4 rounds, not 5. |
| 22 | `Timer.jsx:113`, `:522` | The cfg form is seeded from the last saved config. `cap: initCfg.timeCap ?? 20` turns a stopwatch into a 20' cap, and `applyCfg` drops `intervalMode`/`loggable`. So INICIAR runs a different timer than the block's own. |

These come from #243:

| # | Where | What goes wrong |
|---|---|---|
| 3 | `scheduleHelpers.js:89` | The `'-'` placeholder label reaches the timer header, ready title and history. Its own test (`scheduleHelpers.test.js:404-409`) is titled "does not" and asserts `.toBe('-')`. |
| 10 | `scheduleHelpers.js:91` | Estações reads `rounds` before `stationRepeat`, the opposite of `BlockDetail` and `stationsCapMins`. |
| 13 | `scheduleHelpers.js:81` | `timerExs` drops `dist`/`distUnit`, so `400m Run` shows as `Run`. |
| 14 | `scheduleHelpers.js:80` | `timerExs` doesn't trim the name, so a `'  '` row reaches the timer. The test at `:413` passes only because of that row. |
| 25 | `Timer.jsx:1049` | The ready screen formats seconds to mm:ss only so that `intervalStr` can parse them back. |

**Exposure, measured on prod on 2026-11-22.** Of the 35 interval blocks written between 11/11 and
19/11, **15 are EMOMs**, so their rotation is lost (#2). 34 non-WOD round blocks since 10/17 can show
`RD 4/3` (#4).

**The legacy shape (#1) needs reconciling.** The review counted 38 by its rule. A draft detector (an
`A cada`/`E\dMOM` note plus a Duração, no `interval`) finds 28: Skill 12 · LPO 9 · EMOM 5 · MetCon 1
· Estações 1. ⚠️ **An `E2MOM` note with Duração 12 is not legacy:** there the 12 is the real total,
not a rounded interval. The rule has to tell the two apart (step 2).

**Read [docs/arch/tv.md](../arch/tv.md) before touching anything.** It sets these rules:
- the mode comes from `timerMode(cfg)` alone, never from a run-time `blockType ===`;
- REGISTRAR needs `cfg.loggable`;
- the clock is never `aria-live`;
- the running screen has no exit control **on purpose**;
- three block-render paths must stay in sync.

The TV `TimerSlide`'s fixed 60-s EMOM (`tv/slides.jsx:44,338`) was an explicit plans/99 deferral
(TvController isn't used live), and it stays out of scope.

## Acceptance

1. `timerConfigFor` carries the block's intent as **config flags**, decided in that one place. The
   Timer branches on `timerMode(cfg)` and these flags only. No new `blockType ===` appears in
   `Timer.jsx`, and the two `isTimeBlock(bt)` run-time checks (`:444`, `:620`) are gone.
   - `rotate`: an EMOM whose movements rotate per interval.
   - `laps`: an AMRAP that counts rounds.
2. A legacy block, whose Duração is its rounded interval, runs with **no cap**. A real total, such
   as an `E2MOM` note with Duração 12, keeps its cap.
3. `timeCap` keeps decimals. The interval round count `fit` uses them.
4. `cycleEnd` returns `null` whenever the product is 0.
5. `formFromCfg(cfg)` / `cfgFromForm(form, base)` are pure and unit-tested in `timerMode.js`.
   - **Round trip:** an untouched form returns the original config, including `timeCap: null`,
     `intervalMode`, `stationTime`/`transitionTime`, `loggable`, `rotate` and `laps`.
6. #243's #3 #10 #13 #14 #25 are fixed, and the two tests that encoded the bugs are corrected
   (`scheduleHelpers.test.js:404-409`, `:413`).
7. `npm test`, `npm run lint` and `npm run format:check` pass. `docs/arch/tv.md`'s timer section is
   corrected wherever it describes the old behaviour; the new mode/flag table goes there.

## Must-haves

Drive each one on the local stack, with fixture sessions inserted for the dates and deleted
afterwards (the plans/99 harness), opening the Timer from schedule.html. Move the clock with a
`Date.now()` offset, **not** `page.clock`: plans/99 found that `runFor` hangs the tool once the timer
is running.

- **EMOM rotation.** [timer.html] An EMOM block with A cada `2:00`, 6 rounds and 3 movements:
  - the highlighted movement is #1 during 0:00–2:00, #2 during 2:00–4:00 and #3 during 4:00–6:00;
  - #1 again from 6:00 (the rotation wraps).
- **No round overrun.** [timer.html] A Força block with `3 rounds`, no interval, no Duração and the
  label `-`:
  - the header reads `Força`, not `-`;
  - three LAPs end it at FINALIZADO;
  - the screen never shows `RD 4/3`.
- **The legacy cap is gone.** [timer.html] The block `{type:'Skill', rounds:'3', duration:'2',
  notes:"3 rounds A cada 1'30\""}`:
  - is still running at 2:30, with no FINALIZADO at 2:00, and the ready screen shows no 2' cap;
  - an EMOM `{duration:'12', notes:'E2MOM'}` still finishes at 12:00.
- **Warn on the cycle end.** [timer.html] HIIT `10 rounds · 40" on 20" off`, Duração 8:
  - the clock takes the warn class from **510 s** (85% of the 600-s cycle end);
  - it is **not** warning at 408 s.
- **INICIAR runs the block's own timer.** [timer.html, standalone]
  1. Run a capless Força timer from schedule.html.
  2. Open timer.html directly and press INICIAR without editing.
  3. It counts up past 20:00, so no cap was invented.
  4. Repeat with an interval block: the form → INICIAR still runs in cycle mode with the block's
     work/rest.
- **An empty cycle doesn't finish at once.** [timer.html] An Estações block whose movements sit in
  `bl.exercises`, with no `stations`, is still running at 0:05 and only FIM ends it.

## Files

- `src/public/schedule/scheduleHelpers.js`:
  - `timerConfigFor`: the flags, the legacy rule, the decimal cap, the label, Estações' rounds;
  - `timerExs`: `dist`/`distUnit`, the trim.
- `src/public/timer/timerMode.js`:
  - `cycleEnd` returns null at 0;
  - **new** `formFromCfg`/`cfgFromForm`.
- `src/public/timer/Timer.jsx`:
  - `doLap` (`:444`), the warn (`:620`), `showLap` (`:1160`);
  - the rotation highlight (`:1208`);
  - the form seed (`:112-120`), `selectBenchmark` (`:514`) and `applyCfg` (`:522`), through the two
    pure helpers;
  - the ready screen (`:1049`).
- `src/public/lib/wod.js`: a seconds-based interval formatter for #25. Check
  [shared-utils.md](../arch/shared-utils.md) before writing it; `fmtSecs`/`fmtPrime` may already
  cover it.
- `src/public/schedule/scheduleHelpers.test.js` · `src/public/timer/timerMode.test.js`.
- `docs/arch/tv.md`: the timer section's mode/flag table.

## Approach

1. **Tests first, red.** In `scheduleHelpers.test.js` and `timerMode.test.js`, encode each finding
   as a failing case:
   - the legacy shape → `timeCap: null`, while the E2MOM+12 total keeps 12;
   - Duração `7.5` with `01:30` → 5 rounds;
   - `rotate`/`laps`;
   - label `'-'` → the type;
   - Estações with both `rounds` and `stationRepeat` → `stationRepeat`;
   - `dist` passes through, and `'  '` is dropped;
   - `cycleEnd` of `{intervalMode:false, exercises:[]}` → `null`;
   - the form round trip.

   Fix the two tests that encoded bugs (`:404-409`, `:413`).
2. **The legacy rule (#1).** Write a small pure helper in `public/lib/wod.js`, say
   `noteEverySecs(text)`. It reads `A cada 2'`, `A cada 1'30"`, `a cada dois minutos`, `every 90"`
   and `E2MOM` from a block's notes or label.
   - ⚠️ **Don't import `textFormat.js`.** It is an SPA module, and the timer is a public page.
     Mirror the few patterns and point to `textFormat.js:231-238` in a comment.

   **Legacy** = no `interval` field ∧ a Duração ∧ a note interval ∧ not Estações ∧ **the Duração
   equals the note interval rounded to whole minutes**. The pre-#228 parser wrote it that way, so
   check whether it rounded up or to nearest against the prod blocks before choosing.
   - Then `timeCap: null`, and `rounds` stays for LAP.
   - **Reconcile on prod, read-only:** run this rule, the review's 38 and the draft's 28. List
     every block they disagree on and why in the Done marker. Running the legacy note as a real
     interval timer is **out of scope**: it would change 28-odd old blocks' behaviour, and none of
     them is current.
3. **The flags (#2).** In `timerConfigFor`'s interval branch:
   - `rotate: bl.type === 'EMOM' && exercises.length > 1`;
   - `laps: bl.type === 'AMRAP'`.

   This is the one place the type is read, and `tv.md` is updated to say so. The Timer reads only
   the flags:
   - `showLap` is `mode === 'up' || mode === 'amrap' || cfg.laps`;
   - in cycle mode with `cfg.rotate`, the pseudo-station's sub-exercise `(round - 1) % n` gets
     `exActive`. `stInfoRaw` already returns `round`.

   An AMRAP with `laps` that REGISTERs must prefill its rounds from the LAPs, as the `'amrap'` mode
   does.
4. **`doLap` and the warn (#4, #5):**
   - `doLap` finishes at the last round whenever `cfg.rounds` is set and the mode is `'up'`, or
     `laps` is set;
   - the warn uses `cycleEnd(cfg)` in cycle mode when it isn't null, and the cap otherwise
     (`mode === 'up'`);
   - both `isTimeBlock(bt)` checks go.
5. **`cycleEnd` (#11):** `const end = …; return end > 0 ? end : null`.
6. **The decimal cap (#12):** `parseFloat(String(bl.duration).replace(',', '.'))`. Check every
   reader of `cfg.timeCap` for an integer assumption, such as the cap display and the history
   entry.
7. **The form (#22).** Move the seeding into `formFromCfg` and the build into `cfgFromForm(form,
   base)`.
   - The cap field is `''` for a capless config, and `''` builds `timeCap: null`.
   - Fields the form doesn't show (`intervalMode`, `loggable`, `rotate`, `laps`, `blockId`,
     `sessionId`…) carry over from `base` **unless the user changed the type or the movements**, in
     which case the form's own config wins and `loggable` is recomputed. Use the same rule as
     `timerConfigFor`; don't fork it.
   - `selectBenchmark` keeps its `bm.duration || 20`: a benchmark has a real cap.
8. **#3 #10 #13 #14 #25:**
   - `blockLabel` excludes `'-'` and falls back to the type;
   - Estações takes `rounds: bl.stationRepeat || bl.rounds`;
   - `timerExs` passes `dist`/`distUnit` and trims. The timer's `exLabel` renders through the
     shared volume formatter (`exVolStr`, `wod.js:285`, which renders distance first);
   - the ready screen formats seconds directly.
9. **Run the full suite**, then drive the Must-haves.

## Verification

- `npm test` · `npm run lint` · `npm run format:check`. ⚠️ Run vitest from `C:\…`, not `c:\…`.
- Run the prod reconciliation for the legacy rule (read-only) and record it in the Done marker.
- Drive the Must-haves on the local stack. Android vibration isn't affected. If the warn timing
  changes a buzzer cue, add a line to `DEVICE-TESTS.md` instead of claiming a device check.
- `/code-review` before pushing (M).

Model: Sonnet · Size: M
