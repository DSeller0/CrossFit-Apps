# Code review — `c4a2007..HEAD` (plans/98, 99, 100, 102)

> WORKFLOW.md's "code review, every three implemented plans" backstop, at the most detailed level
> run locally. Range: everything since plans/97 (#207, the last reviewed item) closed — four
> implemented plans, 59 code files, +7 911 / −535. **No code was changed by this review.** Gates at
> HEAD `8fc6986`: `npm test` 1413/1413 in 40 files · `npm run lint` clean.
>
> **Method.** Part 1 ran as `/code-review max`. Parts 2a, 2b and 3 were reviewed inline, because the
> forked `max` run hit the 5-hour session limit three times and lost its findings each time. Every
> finding marked CONFIRMED was reproduced with a Node probe importing the real modules, unless it
> says "(code)". **Plausible** means read in the code and not reproduced. Reach was measured with
> read-only anon reads of prod (the same read `audit-suggest.mjs` makes); only counts were taken.

## Summary

**36 findings: 1 high · 6 medium · 28 low · 1 cleanup.** Five are plausible, the rest confirmed.

- **The one high (#26):** a block with a Duração **and** a sub-minute work time (`Cap 10' 40" on 20"
  off`) is silently corrupted by any Texto round trip — a blur in ¶ Texto is enough — and the
  suggestion engine can emit that shape. No prod block has it yet, but the user is already writing
  intervals (35 blocks since 11/11).
- **The mediums:** the Timer stops a pre-#228 "A cada" block after one interval (#1, 38 prod
  blocks); interval AMRAP/EMOM lose their round counting and rotation (#2); #209's kg-vs-%RM fix
  stops short of complexes and of `fmtIntensity`, so the same prescription reads as kg on one
  surface and %RM on another (#8, #9); the display form `40" on / 20" off` does not parse (#27);
  ↻ Outra on Força is dead under most pattern focuses (#34).
- **Where it clusters:** plans/99 (#228) carries 28 of the 36. Its own `/code-review` hit the session
  limit and it was only reviewed inline, so this was its first real review. plans/100 and plans/102
  had `/code-review high` before their pushes, and it shows: 5 findings between them.

### Triage → the board

| Row | Tier | Findings |
|---|---|---|
| **#241** ¶ Texto corrupts a block with a Duração and a sub-minute work time | P1 | 26, 27 |
| **#242** The Timer after #228: legacy "A cada" caps, interval AMRAP/EMOM, round overrun | P1 | 1, 2, 4, 5, 11, 12, 22 |
| **#243** `timerConfigFor` + index rail hygiene | P2 | 3, 10, 13, 14, 18, 19, 24, 25 |
| **#244** %RM after #209: complexes, `fmtIntensity`, RM chips | P2 | 8, 9, 15, 16 |
| **#245** schedule.html with a Timer on every block | P2 | 6, 7, 20, 21, 23 |
| **#246** Suggested-session fixes | P2 | 33, 34, 35, 36 |
| **#247** Interval grammar + input batch | P2 | 28, 29, 30, 31 |
| **#248** `session.suggestion` rides the public sessions blob | P3 | 32 |
| — already **#156** (sub-16px public controls lists `.rmUnitSel`) | — | 17 |

## Part 1 — public pages + `exportHelpers.js` (plans/98, plans/99 public half) — 25 findings

Scope: `cone/src/public/**` + `cone/src/components/tabs/publicador/exportHelpers.js`. 22 files,
+1521/−440. 244 tests in the four changed test files pass; eslint clean. Run as `/code-review max`.
**Plausible** = read in the code, not reproduced. Severity: **#1, #2, #8, #9 MEDIUM** · #25 CLEANUP ·
the rest LOW.

1. `scheduleHelpers.js:90` — CONFIRMED. Pre-#228 blocks kept "A cada" only in notes + a rounded whole-minute `duration`; now every block has a Timer, `timerConfigFor` reads that as a cap → timer stops after one interval. 38 prod blocks (Skill 18, LPO 14, Força 2). `{type:'LPO', rounds:'3', duration:'2', notes:"3 rounds A cada 1'30\""}` → timeCap 2, mode 'up' → FINALIZADO at 2:00 of a 4:30 block. `synth.js:256` already treats such durations as the legacy interval notation; the timer does not.
2. `scheduleHelpers.js:118` — CONFIRMED. Any WOD-type block with an interval is folded into one pseudo-station and forced into 'cycle' mode: an interval AMRAP loses LAP + round counting (`showLap = mode==='up'||'amrap'`, `Timer.jsx:1160`; REGISTRAR prefills no rounds); an interval EMOM loses its movement rotation (`Timer.jsx:1208`'s per-minute highlight never runs), though `EMOM 12'` without the interval still rotates.
3. `scheduleHelpers.js:89` — CONFIRMED. `timerConfigFor` treats the `'-'` placeholder label as a real name (`bl.label || bl.type || 'WOD'`) → timer header / ready title / history / pseudo-station read `-`. The test at `scheduleHelpers.test.js:404` is titled *'the placeholder "-" does not'* yet asserts `.toBe('-')` (:409). Every other reader (`blkLabel` `wod.js:115`, `Leaderboard.jsx:57`, Publicador) falls back to the type.
4. `Timer.jsx:444` — CONFIRMED. `doLap` finishes on the last round only when `isTimeBlock(bt)`; non-WOD round blocks reach the timer in 'up' mode with `rounds` set → `RD 4/3`, `RD 5/3`, announcer "Round 4".
5. `Timer.jsx:620` — CONFIRMED. The warn class is keyed on `isTimeBlock(bt) && cap && e >= cap*0.85` — for an interval For Time/MetCon/HIIT/Benchmark (cycle mode) it fires on timeCap, not on the cycle end (a run-time blockType check of the kind tv.md says to replace with the mode). HIIT 10×40"/20" Cap 8' runs 600 s and warns from 408 s; Cap 20 × 8 rounds never warns.
6. `Schedule.jsx:598` — PLAUSIBLE. A Timer on every block now sends athletes away mid-session; `checked` + manual `rmValues` live only in React state (only `sched_rounds` persists) → lost on any non-bfcache return (bfcache expiry ~10 min, or via the Nav).
7. `BlockDetail.jsx:232` — CONFIRMED. The phone Timer button has no accessible name (<767px `.btnLabel{display:none}`, no aria-label, the icon is an empty `<i>`) — now on every block.
8. `ExRow.jsx:173` — CONFIRMED. The complex path merges a mixed kg/% progression to '% RM' via `progressionGroupUnit(ex)` → kg loads labelled '% RM' and RM-computed (#209's failure mode survives on complex rows). `[{2,60,kg},{1,70,% do RM}]`, RM 100 → `60 / 70 % RM`, calc `60/70 kg`.
9. `wod.js:500` — CONFIRMED. `fmtIntensity` takes a progression's unit from `steps[0]` only and does not map `%`→`% RM`, so `progressionGroupUnit`'s rule reaches `ExRow` + `buildProgressionLines` but NOT `ExerciseList` (index, LogPane, review dialog, WodBlockCard, Criador preview, TV) or the Publicador's `fmtIntensity` views. Mixed `[60 kg, 80 % do RM]` → `60/80 kg` in ExerciseList/TV vs ExRow's `60 kg` / `80% RM`.
10. `scheduleHelpers.js:91` — PLAUSIBLE. Estações: the timer takes `rounds: bl.rounds || bl.stationRepeat`, but `BlockDetail` (`stationRepeat || rounds || 1`) and `stationsCapMins` read `stationRepeat` first → a block carrying both runs a different number of cycles than the page shows.
11. `timerMode.js:36` — CONFIRMED. `cycleEnd` returns 0 (not null) for a cycle config with no stations → `isTimeUpRaw` is true on the first tick → FINALIZADO 00:00 (Estações with its exercises in `bl.exercises`, rest-only stations, type `''` labelled 'Estações'). Pre-existing logic carried into the new helper; contradicts its own "never an instant finish" comment.
12. `scheduleHelpers.js:114` — CONFIRMED. The interval round count `fit` is computed from `base.timeCap` (`parseInt(duration)`), so a fractional Duração (prod has 2.3; `RE_CAP` keeps decimals) is truncated → `{EMOM, interval 01:30, duration 7.5}` → 4 rounds, should be 5.
13. `scheduleHelpers.js:81` — CONFIRMED. `timerExs` passes only name/sets/reps → distance (#37 `dist`/`distUnit`) and loads are dropped: '400m Run' shows 'Run', 'Row 500m' shows 'Row'. More visible now that Força/Cardio have a Timer.
14. `scheduleHelpers.js:80` — CONFIRMED. `timerExs` filters `e.name || e.isComplex` without a trim → whitespace-only names reach the timer as blank rows. The test *'empty exercise rows never reach the timer'* (test :413) asserts length 2 for 3 inputs and passes only because the `'  '` row survives; its title is false.
15. `scheduleHelpers.js:34` — CONFIRMED. `usesRm` decides on the raw `g.loads.length > 0`, while `ExRow`/`calcFromRm` use the parseFloat'd numbers → non-numeric loads ('leve'/'moderado') get a lone RM chip with nothing to compute (legacy/imported data only — IntensityInput's load is type=number).
16. `Schedule.jsx:56` — CONFIRMED. `autofillRm` walks only `bl.exercises`, but `ExRow` shows an RM chip on every `usesRm` row, Estações stations included → station rows never get the PR pre-fill, contrary to the new comment.
17. `ExRow.jsx:47` — CONFIRMED. RmInput's unit `<select>` is `.rmUnitSel{font-size:11px}` (13px at ≥768px, `Schedule.module.css:175`) — breaks the ≥16px public-page rule (iOS zoom); the diff makes it reachable on plain % rows. Overlaps #156, which already lists `.rmUnitSel`.
18. `rail.jsx:154` — CONFIRMED. `` block.stationRepeat && `${block.stationRepeat}×` `` shows `1×` on every Estações block (stationRepeat defaults to 1); BlockDetail/blockModel only show a repeat > 1.
19. `rail.jsx:143` — CONFIRMED. The rail's label check does not exclude the `'-'` placeholder → `Força · -`.
20. `Timer.jsx:42` — PLAUSIBLE. `timer_history` keeps 3 entries; unloggable non-WOD timers (new with #228) now push WOD entries — and their deferred REGISTRAR — off the list.
21. `BlockDetail.jsx:202` — PLAUSIBLE. The chip row doesn't wrap and `.detailBlockMeta` is nowrap; `blkMeta` now carries the interval (`8 rounds · 40" on / 20" off · CAP 20'` ≈ 260px) plus a goal chip → spills past a 320–360px card.
22. `Timer.jsx:113` — CONFIRMED. The cfg form is seeded from the last saved config (now often a non-WOD or interval block): `cap: initCfg.timeCap ?? 20` turns a stopwatch into a 20' cap, and `applyCfg` drops `intervalMode`/`loggable` → INICIAR from the form runs a different timer than the block's.
23. `ConfirmReview.module.css:49` — PLAUSIBLE. The bounded dialog makes `.body` the only scroller, but it isn't focusable and isn't in the focus trap → a keyboard-only user can't scroll a tall review (fix: `tabIndex={0}` on the body + the trap's list).
24. `gallery/groups/criador.jsx:354` — CONFIRMED. The ParseWarnings gallery text still says "oito tipos de aviso"; `WARNING_KINDS` has 7 now.
25. `Timer.jsx:1049` — CLEANUP. The ready screen formats seconds → mm:ss only for `intervalStr` to parse them back; a seconds-based formatter exported from `wod.js` removes the round trip.

## Part 2a — Criador grammar + block model (plans/99 Criador half) — 6 findings

Scope: `textFormat.js`, `blockModel.js`, `BlockEditor.jsx`, `BlockTextEditor.jsx`, `ParseWarnings.jsx`,
`PreviewBlock.jsx`, `useBlockList.js`, `useTemplates.js`, `WeekSessionCard.jsx`,
`scripts/audit-text-roundtrip.mjs`. plans/99's own `/code-review` hit the session limit, so this is
the first real review of this half. Reviewed inline, because the forked `max` run hit the limit three
times. Probes: Node scripts importing the real modules. Both test files pass.

26. **HIGH** · `textFormat.js:230` (`DUR_MIN`) + `:240-244` (`ONOFF_TOK`/`RE_ONOFF`) + `:1506-1514`
    (`serializeBlock`'s structure order) — CONFIRMED. **A block with a Duração and a sub-minute work time is corrupted
    by any Texto round trip, mostly with zero warnings.** `serializeBlock` writes the duration
    straight before the on/off pair, and `ONOFF_TOK` reuses `DUR_MIN`, whose spaced-seconds branch
    (`2' 30"` = 2'30") reads the cap and the work time as one token. Driven on both editor paths
    (¶ block: serialize without header → `parseBlock(knownType)` → `applyParsedBlock`; session
    pane: `serializeSession` → `parseSession`):
    - HIIT `{rounds 8, duration 10, interval 01:00, work 00:40}` → `8 rounds Cap 10' 40" on 20" off`
      → the whole structure line becomes an **exercise** `8 × "rounds Cap 10' 40" on 20" off"`;
      rounds, cap, interval and work are all gone. 0 warnings.
    - AMRAP `12'` + 40/20 → `interval 13:00, work 12:40`, duration gone. 0 warnings.
    - Força `5 rounds 12'` + 45/75 → `interval 14:00, work 12:45`. Cardio `20'` + 30/30 → `21:00/20:30`.
    - MetCon `Cap 8'` + 20/10 → `08:30/08:20` and a note `Cap` (1 `unparsed-line`).

    ¶ Texto commits **on blur** (`BlockTextEditor.jsx:78`), so clicking into a block's text and out
    again is enough; the session pane needs Aplicar. Salvar then persists it. The coach's own
    notation (`Cap 12' 40" on 20" off` pasted) breaks the same way. The test matrix "every on/off
    pair re-parses to exactly what was written" (`textFormat.test.js:399`) never sets a `duration`,
    and `audit-text-roundtrip.mjs` could not see it: no prod block had both fields when it ran. Fix
    direction: no spaced-seconds branch inside `ONOFF_TOK` (only a flush `3'30"`), and/or emit the
    interval before the cap; add `duration` to the test matrix.
    **Reach, measured read-only on prod (anon key, 2026-11-22):** 0 of 953 blocks carry the shape yet,
    but the user is already using the fields — 35 blocks have an `interval`, all dated 11/11–19/11.
    The same root cause reaches **the engine** (part 3): `applyParams` keeps a cap ≥ interval ×
    rounds, so a box whose Core/HIIT history holds both a cap and an on/off is suggested blocks
    whose own `suggestion.text` re-parses wrong. Probe on the synthetic box: Core `{3 rounds, 9',
    1:00/0:40}` → text `3 rounds 9' 40" on 20" off` → re-parsed `10:00/9:40`, the 9' gone, **0
    warnings**. Prod has 12 legacy blocks with an on/off note and a duration; 104 suggested blocks
    over 14 days × every scope, 0 affected today. `audit-suggest.mjs`'s `parse: 0 warnings` gate
    counts warnings only, so it cannot see this, and `--edits` would diff the saved blocks against a
    baseline that was mis-parsed.
27. **MEDIUM** · `wod.js:156-161` (`intervalStr`) vs `textFormat.js:241-244` — CONFIRMED. The display form
    `40" on / 20" off` does not parse: `RE_ONOFF`'s separator class `[-–—:]` has no `/`. `wod.js:120-122`
    states the opposite ("display and text share one formatter and a block re-parses to what it
    shows"). Copied from Grade, schedule.html or a block summary into Texto: `8 rounds 40" on / 20" off`
    → rounds 8, the pair kept as a note (`unparsed-line`); `40" on / 20" off` alone → an exercise
    `40"` × "on / 20" off" (an `unknown-exercise` warning, with the registry). One-character fix: `/` in the class.
28. **LOW** · `textFormat.js:232-237` — CONFIRMED. Common digit spellings of an interval are not read,
    while the number-word spelling is: `A cada 2 min`, `a cada 2min`, `A cada 2 minutos`, `A cada 1
    minuto`, `every 90s`, `A cada 90 segundos`, `40 seg on 20 seg off` all come back `consumed:false`.
    The block keeps them as a note (`unparsed-line`), or as an exercise row named after the line
    (`A cada 2 minutos x 5`). Not in plans/99's prod evidence, which is why they were not covered,
    but `dois minutos` is and `2 minutos` is not.
29. **LOW** · `textFormat.js:892-894` (pre-existing rule, newly load-bearing) — CONFIRMED. A header
    that is itself pure structure (`EMOM 12'`, `AMRAP 20'`) switches off the structure probe for the
    next line, so `A cada 2'` / `1' on 1' off` written on their own line under it become exercises
    named `A cada 2'` / `on 1' off` (only an `unknown-exercise` warning, with the registry), not an
    interval. `EMOM\nA cada 2'` and `EMOM 12' A cada 2'` both work. The serializer never emits that
    shape, so only pasted text is hit.
30. **LOW** · `BlockEditor.jsx:509-519` + `blockModel.js:323` — CONFIRMED (probe + code). "Trabalho" is a
    `MaskedTimeInput`, which expands a bare number to **minutes** on blur. The natural way to type a
    40-second work time, `40`, becomes `40:00` and raises "O trabalho precisa ser menor que o
    intervalo". Salvar is not blocked, and `normalizeBlockInterval` then **silently drops** the work
    (`{interval:'2', work:'40'}` → `{interval:'02:00'}`). Minutes-by-default is right for "A cada",
    wrong for a field whose values are almost always under a minute.
31. **LOW** · `BlockEditor.jsx:154-174` (Salvar como benchmark) + `public/lib/benchmarks.js:396-420`
    (`buildBenchmarkBlock`) — CONFIRMED (code). Two more field whitelists, the same trap #228 fixed in
    `BlockTextEditor`'s `merge`: a custom benchmark saved from an interval block keeps
    `duration`/`rounds` but drops `interval`/`work`, and so does applying one. (Both also flatten
    complex exercises, `isComplex:false`, which predates #228.) Not in plans/99's sibling sweep.

Both test files pass (244 tests). ⚠️ Run vitest from `C:\…`, not `c:\…`: with a lower-case drive in
the working directory every suite fails at import with *"Cannot read properties of undefined
(reading 'config')"* — an environment quirk, not a code finding.

Checked and not a finding: `normalizeBlockInterval`'s other cases (empty, zero, invalid, `work ≥
interval`, Estações, `1:90` → `02:30`) all behave as documented · `applyParsedBlock` clears both keys
before re-setting them · `useTemplates.applyTemplate` dropping `suggestion` · `stationsTotalSecs`
is a faithful extraction · the TV `TimerSlide`'s fixed 60-s EMOM (`tv/slides.jsx:44,338`) is an
**explicit** plans/99 deferral (TvController unused live), not a miss.

## Part 2b — the ✦ Sugerido editor mode (plans/102) — 2 findings

Scope: `SessionSuggestPane.jsx` (+ css), `SessionEditor.jsx`, `useSessionEditor.js`, `suggest/paneModel.js`
(+ test), `Criador.jsx`, `criador.module.css`. Already through `/code-review high` before its push (9
found, 8 fixed), and it shows: this pass found little.

32. **LOW** · `useSessionEditor.js` `saveS` (`{...form}`) + the single `sessions` blob — CONFIRMED
    (measured read-only on prod). `form.suggestion` — `text` is the whole suggested session — is saved
    **inside the sessions blob every public page downloads** (#82: all sessions are one anon-readable
    row). It is coach-side provenance that no athlete surface reads. Measured: the blob is 674 KB for
    213 sessions (≈ 3.2 KB each), and one day's record is 623 bytes, so every suggested session adds
    ≈ 19% to its own weight on index/schedule/results/me/leaderboard's first load, forever. One prod
    session carries one already. plans/102 chose "JSON on the session blob, no migration" without weighing that cost.
    Not urgent at today's volume. It belongs in the #82 (normalize `sessions`) and #218 (public
    payload) conversation.
33. **LOW** · `SessionSuggestPane.jsx:86` — CONFIRMED (code). `boxName` falls back to `'Sem box'` whenever
    the session's box id is missing from `boxLocs` (a deleted box, or a non-`box` location), though
    the engine is then reading **that box's** tagged history, not `SEM_BOX`'s. The title and the
    context line name the wrong history. Edge case, wrong label only.

Checked and not a finding: the engine's block types are unique per session (`out` is a `Map` by type),
so `key={b.type}`, `variants[type]` and `openWhy` are sound · `meta.dayTypes` is the **generated**
types, so "↻ Outra sessão" also bumps types the user ticked · `registry`/`boxLocs` are memoised once in
`Criador.jsx`, so the 60 ms `suggestSession` memo does not re-run per render · `form.date` is the
session's `dateKey` on `startEdit` · `parseSession` accepts the index (`resolveExercise` takes either) ·
every CSS token the pane uses exists in `themes.css`, and `.numInp`'s `outline:0` ships its replacement ·
no session-clone path carries a stale `suggestion` (WeekGrid's "copy" copies text; `applyTemplate`
drops it) · engine block/exercise ids are fresh `uid()`s.

## Part 3 — the suggested-session engine + `audit-suggest.mjs` (plans/100) — 3 findings

Scope: `criador/suggest/` (`history`, `patterns`, `stats`, `synth`, `rng`, `estimate`, `index`,
`testFixtures`) + `scripts/audit-suggest.mjs`. Already through `/code-review high` (10 found, 9 fixed).
Probes: the engine on `testFixtures.standardBox` (12 weeks), plus a read-only prod read for reach.

34. **MEDIUM** · `synth.js:514-540` (`alternateLift`) — CONFIRMED (probe). **↻ Outra on Força never changes
    the block under a pattern focus, in 7 of 8 patterns on the fixture box.** `chooseLift` ignores a
    focus no lift matches ("foco ignorado no Força"), but `alternateLift` filters every candidate by
    the focus regardless, empties the list and returns `base`, an identical block. With a focus
    that matches exactly one lift (Dobradiça → Deadlift, Empurrar → Bench Press) there is genuinely
    no alternative. Either way the pane shows "variante 1", "variante 2" over an unchanged block,
    and the why never says so: `index.js` adds "↻ Outra: nenhuma outra opção livre" only when a
    generator returns `null`, and `alternateLift` returns `base`. Fix: filter by the focus only when
    `chooseLift`'s `byFocus` holds, and return `null` when no other lift is allowed.
35. **LOW** · `synth.js:612-624` (`genForca`) — CONFIRMED (probe). Força copies the chosen scheme's
    `duration` verbatim and only the #228 `interval` *field*; it never goes through `applyParams` or
    `blockTiming` the way LPO, Skill and the WODs do. A pre-#228 scheme (`{rounds 5, duration '2',
    notes "5 rounds A cada 2'"}`) is suggested as `Força · 5 rounds 2' · 3 Back Squat 80%`: the
    interval is lost and the rounded interval becomes a 2-minute cap. That is exactly what
    `criador.md` says never happens, and the public timer then stops at it (#1). Prod has 2 such Força
    blocks (plans/99's count). Related, by design but worth a look: a lift lent from an EMOM (since
    19/10) brings the EMOM's `duration` onto a Força block without its every-minute structure.
36. **LOW** · `scripts/audit-suggest.mjs:534,542` (`--edits`) — CONFIRMED (probe: a fixture suggestion
    through `saveS`'s pipeline with one known edit). The field tally decides `structure` by
    comparing each block's first line after the header. A block with no structure line (Força as
    sets × reps, steady Cardio) has its **first exercise row** there, so a note-only edit on
    Força or Cardio is tallied `structure`, and any change to that row's reps or load adds a
    spurious `structure` beside the real field. The rest checks out: untouched → 6 × kept, rounds
    +1 → `structure` only, no false `loads`. This is the instrument the future "Precisão das
    sugestões" view would read, so its structure count runs high.

Checked and not a finding: the history is strictly before the date (plus the later same-week days
only with `lookAhead`), and the backtest passes `lookAhead: false` · `keepSession` dropping `public:
false` sessions costs nothing today, since prod has 7, all from June–July, none with Força · `rng.js` is
deterministic and the draws iterate name-sorted pools · `modal`/`argmax` tie-breaks are chronological
as documented · `pctLoads` reads a kg step as no %RM, so it is stricter than `progressionGroupUnit` and
right where #8 is wrong · `snapIntensity` returns `ins` by reference for gender loads and kg steps, so
suggested blocks share intensity objects with the history, but nothing in `src/` mutates an intensity
in place · `estimate.js`'s one `knownMinutes` reader is shared by the estimate and the box's typical
minutes, as its comment says · `genEstacoes` works on a copy of `take` and reports `used`.
