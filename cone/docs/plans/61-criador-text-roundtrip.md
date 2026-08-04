# 61 — Criador text mode: round-trip fidelity, the grammar's blind spots, and one reference

> **Planning session, 2026-08-03 (Opus).** Covers #121 · #120 · #126 · #127 · #128 · #129 · #130.
> Ships as **three ordered execution sessions** — 61·A, 61·B, 61·C — see below. Also files **#138**.

## Context

Criador's text mode (#92, shipped 2026-07-21) exists so the coach stops re-typing the week he
writes in a phone notepad. It was never UX-reviewed, and the 2026-08-03 targeted review
([reviews/2026-08-03-criador-text-logging.md](../reviews/2026-08-03-criador-text-logging.md))
measured the real `serializeBlock`/`parseBlock`/`serializeSession`/`parseSession` over **all 339
prod blocks in 71 sessions**. Text is supposed to be a *projection* of the canonical block model —
today it is a lossy one, silently.

This plan settles the grammar first and documents it second, which is why #120 (the help text) is
in the same plan as #121 (what the grammar actually does): writing the reference before the grammar
settles means writing it twice.

**Re-grounded 2026-08-03 while planning** — every claim below was re-run against the live
parser/serializer and against live prod, not read from the report. Two new root causes and four
corrections:

- 🆕 **The `type:''` drift is legacy `WOD` residue, and the blast radius is exactly 3 blocks.**
  **`WOD` is not a block type — it is a section marker for the day's training, always followed by the
  real format** (`5 Rounds For Time`, `AMRAP 15'`) — user's model, and the parser already implements
  it that way (`TYPE_ALIASES: wod → WOD_PENDING`, resolved from the structure line). It was already
  retired as a creatable type: `TypePicker.jsx:17` builds from `Object.keys(TYPE_CONFIG)` and
  `TYPE_CONFIG` has **no `WOD` key**, so nothing in the app can make a new one. What remains is
  residue: prod holds **3** blocks at `type:'WOD'` (2026-06-06 / 06-09 / 06-10, all `label:'-'`) out
  of 339, and **those 3 are precisely** #121(d)'s "3 sessions drift to `type:''` with no chip and no
  warning" — a bare `WOD` header reparses as pending, nothing resolves it, and it lands on `type:''`
  with `typeUnresolved:false`. Prod separately already carries **6** blocks at `type:''`.
  ⚠️ `WOD_TYPES` (`wod.js:11`) keeps its `WOD` entry — that is `isWodBlock`, the rankable-block
  predicate; removing it would drop those 3 blocks' logged results out of every ranking.
- 🆕 **An exercise on a block's FIRST line is swallowed into `block.label` and disappears.** Found
  while checking the time-metric case below. `parseHeaderLine:419-424` claims any unrecognised first
  line as the block label, so pasting `40" Prancha / 30" Hollow Hold / 20 Sit Up` yields **two**
  exercises — `Prancha` is gone, and the only warning is `type-unresolved`, which says nothing about
  it. Same for `2' Bike`, `1' Prancha`. It never fires in `BlockTextEditor` (a `knownType` is passed,
  so headers are off) — it fires exactly on the coach's paste path, `SessionTextPane` and
  `WeekImportModal`. Bigger than anything #130 recorded.
- 🆕 **Mixed progression units are corrupted, not "flattened."** `[{load:'60',unit:'kg'},
  {load:'70',unit:'% do RM'}]` serializes to `60/70kg` — **70% silently becomes 70 kg.** The review
  filed this under #121(a)'s cosmetic list; it is a wrong-number bug.
- ⚠️ **#127's live blast radius is narrower than "any round trip", and worse where it lands.**
  `Criador.jsx:179`'s `startEdit` already runs `normalizeLegacyCardio(s.blocks)`, so the *editor's*
  panes see normalized blocks. The unprotected surface is **`WeekSessionCard`'s Texto mode**
  (`WeekSessionCard.jsx:22` serializes **raw storage blocks**) — which is the *copyable* one, and
  the entire point of the feature. `5m HSW` → `HSW` in the text the coach copies out.
- ⚠️ **#126's headline row is already closed.** `{kind:'time',min:'14:00'}` round-trips clean today;
  the `min:'14'` shape that broke was **plans/60**'s bug, whose input is closed and whose one prod
  row was repaired. The goal shapes still broken are `rounds` (`reps` dropped, `min` string→number)
  and `text`-promoted-to-`time`.
- ⚠️ **#126's "a note containing `Meta:` is eaten" does NOT reproduce.** `RE_META` is anchored at
  `^`; `Obs: Ou 1600m. Meta: 8 minutos.` round-trips with the note intact and `goal: undefined`.
  Verified directly. Do not spend plan time on it; re-file only if a real repro appears.
- ✅ Confirmed exactly as reported: Estações **6 of 6** lose `.stations` with zero warnings ·
  `sets` rewritten by progression step count · `duration` invented (`"2.3"→"3"` is a second sighting
  of **#93**) · named complexes dropped · per-step reps dropped · `ladderMode` silently off ·
  per-gender unit flattening has **blast radius zero** (C-1 stands).

**Decisions taken with the user, 2026-08-03** (do not re-litigate in an execution session):

1. **Estações gets real notation** (already recorded on #121(c)); **Benchmark stays locked** and
   becomes a *passthrough*: excluded from the editable text, preserved byte-identical, warned about.
2. **Per-step reps and mixed units get one new notation** — `3x60kg / 2x70%` — rather than a warning
   or a blocked toggle.
3. **#131 is folded in** (both textareas), since 61·C rewrites both files anyway.
4. **`WOD` stays a section marker, never a resolved type** — a bare `WOD` with no format becomes an
   explicit "? escolher tipo", not a silent `''` and not a revived `type:'WOD'` (see A3).
5. **Time-metric exercises keep their current `reps` representation**; 61·A fixes the two parse
   positions that break them, and the `reps|distância|tempo` model change is spun out as **#138**.

## Ships as THREE ordered execution sessions, not one

One plan file, three sessions, strictly in order. A and B settle what the grammar means; C documents
and surfaces it. Running C first would produce a reference that is wrong by the end of the week.

| | Scope | Rows | Model · Size |
|---|---|---|---|
| **61·A** | Round-trip fidelity — parser/serializer only, no UI | #127, #126, #130, #121(a), #121(d) | **Opus · L** |
| **61·B** | Blocks the grammar can't express | #121(b), #121(c) | **Opus · M** |
| **61·C** | The three surfaces | #120, #129, #128, #131 | **Sonnet · M** |

---

# 61·A — Round-trip fidelity

> ## ✅ DONE — shipped 2026-08-03
> Every loss class reads **0 outside Estações**; the five still non-zero are all inside Estações
> blocks and belong to 61·B. Baseline → after (same script both sides, `scripts/audit-text-roundtrip.mjs`):
> cardio-volume **41 → 2**, progression-reps **57 → 0**, sets-rewrite **10 → 0**, first-line-eaten
> **18 → 1**, duration-invented **5 → 1**, silent type-drift **3 → 0**, ladder-off **3 → 0**,
> goal-kind **1 → 0**; blocks identical after a round trip **129/339 → 190/339**.
> **A10 was dropped** (measured blast radius zero on prod) and **A7 landed with zero prod effect**
> (all 6 prod complex "names" are free text the serializer must not emit) — both recorded in the
> BACKLOG Done entry, which also lists the seven extra fixes the new audit turned up.
> ⚠️ **61·B inherits the instrument**: `node scripts/audit-text-roundtrip.mjs` already reports B's
> rows, and its "em Estações" column is what separates them from A's.

## Acceptance

- `node scripts/audit-text-roundtrip.mjs` (new, A12) reports **0** in every loss class against live
  prod, except the two recorded-and-accepted ones: per-gender unit flattening (#121a/C-1, blast
  radius zero) and `A cada 1'20"` interval approximation (plans/36's deliberate v1 limitation).
- Named prod figures go to zero: legacy-cardio volume **35 → 0**, per-step reps **57 → 0**, named
  complexes **5 → 0**, `ladderMode` off **5 → 0**, `sets` rewritten **15 → 0**, `duration` invented
  **4 → 0**, `rounds` invented **2 → 0**, silent block-type drift **7 → 0** (the 3 legacy-`WOD` ones
  become a visible "? escolher tipo" chip, not a silent `''`).
- A block whose first line is an exercise keeps that exercise: `40" Prancha / 30" Hollow Hold /
  20 Sit Up` parses to **3** exercises, and a time-metric movement round-trips in every position.
- `textFormat.test.js`'s existing `CORPUS` round-trip suite gains one block per loss class and
  stays green; `npm test` / `npm run lint` clean.
- No behavior change downstream — TV, `schedule.html`, `results.html`, Publicador read the same
  block objects.

## Files

- `src/components/tabs/criador/textFormat.js` (all of it)
- `src/components/tabs/criador/textFormat.test.js` (extend `CORPUS`, ~line 600-692)
- `src/components/tabs/criador/BlockTextEditor.jsx` (A9 only — 2 lines in `merge`)
- **new** `scripts/audit-text-roundtrip.mjs`

## Approach

**A1 · Legacy cardio (#127).** `serializeExercise` runs its argument through **`normalizeCardioEx`**
— already exported by `blockModel.js`, already an imported module, already the canonical lazy
normalizer. One line; do **not** hand-roll a `cardioVal` fallback in `volStr`. Leave `loadStr`'s
`mode:'cardio' → ''` as a defensive return and correct its comment (it currently describes the
post-migration shape as if prod held it).

**A2 · Goal shapes (#126).** Three changes, in `parseGoal`/`serializeGoal`/`buildBlock`:
- `serializeGoal` emits `reps` for the rounds kind — `5 rounds + 10 reps`; `parseGoal` learns the
  `+ N reps` tail and keeps `min` a **string** (`GoalInput` writes strings; `goalOutcome:206` already
  coerces with `Number()`, so this is a consistency fix in #110's type-mismatch family, not a
  behavior change).
- **`block.goal.kind` becomes a function of `block.type`.** After type resolution in `buildBlock`,
  coerce the parsed goal through **`goalKindFor(block.type)`** (import from `blockModel.js` —
  `textFormat.js` already imports `TYPE_CONFIG` from there, so it stays pure/client-free). Keep the
  raw `Meta:` text alongside the parse so the coercion has a faithful fallback. This is the one rule
  that kills the `{kind:'text',text:'sub 10'}` → `{kind:'time',max:'10:00'}` promotion on a block
  whose type has no time axis — **and it fixes `GoalInput.jsx:20` rendering an empty Meta field on a
  block that has a goal, without touching `GoalInput.jsx`.**
- Pin the pre-plans/60 `{kind:'time',min:'14'}` shape in a test with a comment pointing at
  [plans/60](./60-goal-time-input.md): input closed, prod row repaired, kept as a regression guard.

**A3 · The `WOD` section marker (#121d).** ⚠️ **Do NOT resolve a bare `WOD` back to `type:'WOD'`** —
WOD is a section marker, not a format, and the app already can't create one. Instead: in
`buildBlock`, when the header resolved to `WOD_PENDING` and no structure line supplies a type, set
**`typeUnresolved: true`** and emit the existing `type-unresolved` warning, so the preview shows its
"? escolher tipo" chip and the coach fixes it in one tap. `typeUnresolved` then means exactly "this
block has no format yet", whether the header was unrecognised or was a bare section marker — and the
silent-`''`-with-no-warning class disappears.
- **No repair script and no data migration.** The 3 residual blocks keep `type:'WOD'` in storage and
  keep rendering as they do today; they only surface the chip when the coach opens one in text mode,
  and one tap fixes it for good. A script to touch 3 legacy blocks costs more than it returns.
- Leave `WOD_TYPES`/`isWodBlock` (`wod.js:11`) alone — see the Context note.

**A4 · Lines the parser eats (#130, and the first-line bug above).** Two halves, both about a line
being claimed by something that isn't what it is. Together they are what makes **time-metric
exercises** (`40" Prancha`, `1' Hollow Hold`, `2' Bike`) parse correctly in *every* position —
`RE_Q_HOLD:163` already stores a hold as a literal in `reps` and `exVolStr` already renders it, so
**no "keep it as a comment" fallback is needed; the representation works, only these two parse
positions break it.**
- **(a) The structure probe.** `buildBlock:496-519` consumes a line whenever `st.consumed`, even with
  a leftover `st.rest`. Tighten to **`st.consumed && !st.rest`** — the same "pure structure" rule
  `parseHeaderLine:420` already applies to header segments. Removes `2.3'` → `duration:'3'` (#93 from
  a new direction), the `""→"50"/"20"/"1"` durations and the `""→"3"/"4"` rounds, **and** stops
  `1' Prancha` being shredded into a duration plus an orphan note. The now-unreachable
  `st.rest → noteLines + 'unparsed-line'` branch goes with it.
- **(b) The header probe.** `parseHeaderLine:419-424` must not claim a line as an unresolved header
  when it is plainly an exercise — i.e. when it has **a leading quantity AND a non-empty name
  remainder**. The block then starts label-less and `typeUnresolved` (the chip still appears) and the
  exercise survives. ⚠️ Verified against the recorded must-stay-a-label case: `Quem já faz tc 15'`
  has no leading quantity, so it is untouched; `5 Rounds For Time` and `21-15-9` still hit the
  `pureStructure` branch first.

**A5 · `sets` overwritten by step count (#130).** `applyBareLoadList:654`'s
`sets: String(steps.length)` is right for a *newly synthesized* complex and wrong on a round trip,
because `serializeExercise:882`'s two-line progression branch drops `ex.sets` entirely. Fix at the
**serializer**: when a complex carries a `sets` that isn't `steps.length`, emit the inline `+` form
(`3x1 Hang Squat Snatch + 1 Squat Snatch 60/70/80kg`), which does carry sets via
`${ex.sets}x${movs[0]}`. Leave `applyBareLoadList` alone.

**A6 · Per-step reps + mixed units (#121a) — the pair notation.** `loadStr` emits
`3x60kg / 2x70%` whenever step reps differ **or** units are mixed; `takeLoad` learns the
slash-separated `N x LOAD unit` list. Falls back to today's `60/70/80kg` when reps are uniform and
units match, so nothing the coach already writes changes shape. Fixes both the 57 dropped-reps
exercises and the `70% → 70kg` corruption with one rule. ⚠️ Order it in `takeLoad` **before**
`RE_LOAD_LIST`/`RE_PROG_PCT_*`, and keep the existing "`%` forms first" guard intact.

**A7 · Named complex (#121a, 5 exercises).** `serializeExercise:877-884` ignores `ex.name` for
`isComplex`, but `ExerciseRow.jsx:344,506` is a real "Nome do complexo" input. Emit
`Complexo A: 3x1 Hang Squat Snatch + 1 Squat Snatch 60/70/80kg` — a leading `<name>:` on an
**exercise** line, and only when the remainder parses as a complex (per-side quantities on both
sides of `+`). Decidable, can't collide with `Obs:`/`Meta:`/`Zona:` (matched first on the line) and
can't fire on a plain exercise. ⚠️ If the corpus shows the rule firing on real free text, fall back
to a `complex-name-dropped` warning kind and record why.

**A8 · `ladderMode` silently off (#121a, 5 blocks).** `serializeBlock:917-920` emits the ladder line
only when **every** exercise shares `exs[0].reps`, so a mixed ladder loses `ladderMode` on the way
back through `BlockTextEditor.jsx:27-36`'s `merge`. Emit the line whenever `block.ladderMode &&
exs[0]?.reps`, and strip reps only from the exercises whose reps equal `exs[0].reps`. The parser's
fill (`buildBlock:608-613`) already only touches exercises with no reps, so mixed ladders survive.

**A9 · `goal`/`lettered` can't be cleared (#121a).** `BlockTextEditor.jsx:34-35`'s `merge` applies
both only when truthy, so deleting the `Meta:` line leaves the old goal in place. The text is
authoritative for both fields (`label`/`zone`/benchmark link are the ones the block bar owns and
`merge` correctly preserves). Apply them unconditionally.

**A10 · Names ending in parentheses (#121a) — explicitly droppable.** `RE_NOTE_PAREN:150` turns
`Remo (Ergômetro)` into name `Remo` + note `Ergômetro`. Pass the registry into `parseExerciseLine`
and keep the parenthetical when `resolveExercise(full, reg)` matches and `resolveExercise(stripped,
reg)` does not — match-only, per `registry.js`'s standing rule, never rewriting what the coach typed.
If the plumbing turns noisy, **drop this step and say so in the Done entry**; it is the smallest of
the ten.

**A11 · Per-gender units — record, do not fix.** Measured blast radius **zero** across all 78
gender-intensity prod exercises (C-1). Add a pinning test plus a comment at `loadStr:841` carrying
the measurement, so a future session doesn't "fix" it blind and destabilize `fmtIntensity`'s
deliberate axis divergence.

**A12 · `scripts/audit-text-roundtrip.mjs` — the acceptance instrument.** Mirrors
`scripts/audit-session-registry.mjs` (same prod-client shape, dry-run only, never writes). Pulls
`sessions`, runs serialize→parse at both block and session level, and prints a per-class table with
counts and three examples each: `cardio-volume · goal-kind · goal-reps · type-drift ·
first-line-eaten · sets-rewrite · duration-invented · rounds-invented · progression-reps ·
progression-units · ladder-off · complex-name · stations-lost · benchmark-lost`. It must also run a
**coach-paste pass** (parse-then-serialize on raw text, not just serialize-then-parse) — the
first-line bug only exists on that side. **The review's own scripts were scratch and were
deleted**, so none of its numbers is re-derivable today — this makes the acceptance measurable
rather than asserted, and gives 61·B a before/after too.

## Verification

1. `node scripts/audit-text-roundtrip.mjs` against **prod** before any edit → record the baseline
   table in the commit message; re-run after → every class 0 except the two accepted.
2. `npm test` (the extended `CORPUS` suite is the unit-level proof) · `npm run lint` ·
   `npm run build:all`.
3. Live, on the re-seeded local stack (⚠️ clear any `cone-v*` service worker first — a stale one was
   in fact present during the review): open a legacy-cardio session in Criador, flip the week grid to
   **¶ Texto**, confirm `5m HSW` now reads `5m HSW`; flip a For Time block to `¶` and back and
   confirm #117's goal badge still renders on the leaderboard.
4. Paste, into `SessionTextPane`, a block starting with `40" Prancha` and a block whose header is a
   bare `WOD` — the first must keep all its exercises, the second must show the "? escolher tipo"
   chip rather than silently rendering `sem tipo`.

## Spun out of this plan — new Icebox row filed with it

**#138 · An exercise's volume metric should be `reps | distância | tempo`, not a unit-bearing string
in `reps`** · S–M · **raised by the user while reviewing this plan.** A hold is stored today as
`reps: '40"'` — a numeric-looking field carrying a unit, the same debt class as **#93**
(`block.duration` bare minutes). **Measured: 7 of 1059 prod exercises carry a time in `reps`, and 5
of those are `Rest`** — so only 2 real movements (`30" LSit argola`, `40" flutter kicks`), and
`exVolStr` renders all of them correctly. It is modelling debt, not a live bug, which is why 61·A
fixes the *parse positions* (A4) and leaves the *shape* alone. A real fix touches `ExerciseRow`'s
four layouts, `ExerciseList`'s four sizes, `exVolStr`, registry `defaults{}`, TV, schedule, results
and `textFormat` — plan it with #93, not here.

---

# 61·B — Blocks the grammar can't express

> ## ✅ DONE — shipped 2026-08-04
> `stations-lost` **9 → 0** and `benchmark-lost` **0 → 0** (`scripts/audit-text-roundtrip.mjs`, same
> script both sides). Estações also took `cardio-volume` **2 → 0**, `first-line-eaten` **1 → 0**,
> `duration-invented` **1 → 0** and the session-level block-count change **1 → 0**; blocks identical
> after a round trip **196/352 → 198/352**. **Every loss class now reads 0 except `goal-kind` (1)** —
> see the ⚠️ below, it is not B's and it was already non-zero in B's baseline.
> **Three things the plan didn't cover, decided here and recorded on #121(c):**
> - **`Ciclos: N` + `Entre ciclos: mm:ss` keyword lines, NOT `×2` on the header.** `parseHeaderLine`
>   splits the header into type + label segments (`HEADER_SPLIT`) and a `×2` segment has no grammar
>   there; the plan's alternative spelling `2 ciclos` is **already claimed by `RE_ROUNDS`** as
>   `block.rounds`, which prod Estações blocks really carry. Keyword lines collide with neither.
> - **Which side wins when a block carries BOTH `stations` and `exercises`** (prod has 5, not the 3
>   first measured — the type was switched after the fact and the editor left the old side behind).
>   **The TYPE decides**, which is the fork every consumer already makes (`blockExercises` in
>   `wod.js`, `normalizeLegacyCardio`, `materializeBlocks`, `blockSummary`, `BlockDetail`,
>   `rail.jsx`): for Estações `stations` is live and `exercises` is unreachable residue, and vice
>   versa. Text projects the live side only. The audit **counts** the residue as
>   `vestigial-exercises` (38) / `vestigial-stations` (1) rather than hiding it in `projection-shift`.
> - **A station's exercise is an exercise.** The audit was routing every `stations…` path to
>   `stations-lost` before its per-exercise rules ran, so two ordinary projection shifts inside a
>   station (`"5 C&J ubrok"` → reps + name, `"Remo (Ergômetro)"` → name + note) were counted as lost
>   stations. `classify` now applies the same per-field rules to both path shapes; only a STATION's
>   own structure (which stations exist · name · duration · isRest) is `stations-lost`.
>
> **0 prod blocks carry a `benchmarkRef`**, so `benchmark-lost` read 0 before this session and will
> read 0 whatever B does — the locked passthrough is proved by unit test (`mergeLockedBlocks` returns
> the *same object*, asserted with `toBe`) and live in the gallery, not by prod movement. Same shape
> as A7. **`BlockTextEditor.jsx` was in scope after all** (B's Files list omits it): making
> `isTextEditable` true for Estações enables the per-block `¶` toggle, and its `merge` would have
> dropped `stations` on commit.
> ⚠️ **`goal-kind` reads 1 and is NOT B's row — it was already 1 in B's baseline, before any edit.**
> `2026-08-03 #2 For Time` holds `{kind:'time', min:'14'}`, which serializes to a bare `Meta: 14` and
> parses back as `{kind:'text', text:'14'}`. 61·A pinned this shape as a regression guard on the
> stated basis that its *input* was closed by plans/60 — **it is not**: `MaskedTimeInput` writes
> through on every keystroke, so typing `14` and moving on still stores `min:'14'`. Filed as **#139**.

## Acceptance

- An Estações block round-trips through `serializeSession`/`parseSession` with `stations`,
  `stationRepeat` and `restBetweenCycles` intact — **6 of 6 prod blocks, 100% → 0% loss.**
- `isTextEditable` returns **true** for Estações and stays **false** for `benchmarkRef` blocks.
- The session-level `¶ Texto` pane no longer bypasses the guard: a Benchmark block in the middle of
  a session survives `Aplicar` **byte-identical**, at its original index, and the coach is told it
  was preserved rather than edited.
- `audit-text-roundtrip.mjs`'s `stations-lost` and `benchmark-lost` classes both read 0.

## Files

- `src/components/tabs/criador/textFormat.js` (station grammar; `TEXT_UNSUPPORTED_TYPES`;
  new pure `splitLockedBlocks`/`mergeLockedBlocks`)
- `src/components/tabs/criador/textFormat.test.js`
- `src/components/tabs/criador/SessionTextPane.jsx`
- `src/components/tabs/Criador.jsx` (`:1039-1064`, the pane's props)

## Approach

**B1 · Station notation.** The serializer already emits *almost* the right thing
(`serializeStations:892-899`); what's missing is anything the parser can key on, plus the two
block-level fields.

```
Estações ×2
Entre ciclos: 1:00
Grupo A 3:00
15 Wall Ball
Grupo B 3:00
12 Box Jump
Descanso 1:00
```

- Inside a block whose resolved type is `Estações`, a line that is **a name followed by a trailing
  duration with no leading quantity** opens a station; the exercise lines under it attach to it.
  That is the discriminator against `3 Wall Ball` (leading quantity) — decidable, one rule.
- ⚠️ **`Descanso 1:00` currently parses as a `Rest` *exercise* via `RE_REST:149`, which would shadow
  the rest *station*.** Inside an Estações block, `Rest`/`Descanso` + duration is a rest station
  (`isRest:true`). Record the fork at the regex.
- `×2` / `2 ciclos` on the header → `stationRepeat`. `Entre ciclos: <mm:ss>` → `restBetweenCycles`,
  a new line-level keyword in the existing `Obs:`/`Meta:`/`Zona:` family (`RE_*` group at :151-153).
- Then drop `'Estações'` from `TEXT_UNSUPPORTED_TYPES:82`.

**B2 · The session pane enforces the guard.** `Criador.jsx:1039-1064` hands **all** blocks to
`SessionTextPane`, which seeds from `serializeSession({blocks})` and whose `onApply` does a wholesale
`setBlocks(normalizeLegacyCardio(parsed))`. Replace that with a locked-passthrough layout:

- Two pure helpers in `textFormat.js`, so the logic is unit-testable and the pane stays thin:
  `splitLockedBlocks(blocks)` → `{ text, layout }` where `layout` is
  `[{kind:'text'} | {kind:'locked', block}]`, and `mergeLockedBlocks(parsedBlocks, layout)` → the
  rebuilt array. Parsed blocks fill the `text` slots in order; a locked block anchors after the
  preceding text block, so adding or removing blocks in the textarea keeps it in place.
- The pane renders each locked block as a **read-only card at its real index** (reuse
  `PreviewBlock`, which 61·C extracts anyway) with `🔒 não editável em texto — preservado`.
- New warning kind **`block-locked`** so it lands in 61·C's shared summary rather than being invented
  twice.
- `onApply` keeps `normalizeLegacyCardio` on the parsed half only — the locked half is passed through
  untouched, which is the whole point.

**B3 ·** `serializeBlock` keeps rendering Benchmark and Estações for the read-only week Texto view —
unchanged, that surface is display-only.

## Verification

1. `npm test` — new `CORPUS` entries for a full Estações block (2 groups + a rest station + repeat +
   inter-cycle rest) and for `splitLockedBlocks`/`mergeLockedBlocks` round-tripping a
   `[text, locked, text]` layout.
2. `node scripts/audit-text-roundtrip.mjs` → `stations-lost` and `benchmark-lost` at 0.
3. Live: build a session with `[Aquecimento, Benchmark "Fran", Estações, For Time]`, flip to
   **¶ Texto**, edit only the Aquecimento's text, `Aplicar` — Fran comes back untouched and still
   locked, the Estações block keeps its groups and durations, order is unchanged.

---

# 61·C — The three surfaces

## Acceptance

- **One** grammar reference and **one** canonical example, exported from `textFormat.js` and
  consumed by all three surfaces; the `ⓘ Formato` disclosure is reachable from all three (today it
  exists only on `SessionTextPane`, collapsed). The reference documents everything 61·A and 61·B
  settled — measured against the parser, not against the old placeholders.
- **One** warning-summary component; every warning kind reaches every surface that can produce it.
  `interval-approximated` in particular is visible on all three (it fires exactly when the block's
  *timing* was altered) and `preamble` has a consumer for the first time.
- The week import shows a **per-day preview** before creating N sessions.
- Neither textarea shows a fraction of its content while the page has room (#131).

## Files

- `src/components/tabs/criador/textFormat.js` (`FORMAT_REFERENCE`, `FORMAT_EXAMPLE`,
  `WARNING_KINDS`, `DAY_MAP`)
- **new** `src/components/tabs/criador/ParseWarnings.jsx`
- **new** `src/components/tabs/criador/PreviewBlock.jsx` (extracted from `SessionTextPane.jsx:19-58`)
- `SessionTextPane.jsx` · `BlockTextEditor.jsx` · `WeekImportModal.jsx` · `textMode.module.css`
- `src/public/gallery/groups/criador.jsx` · `docs/plans/36-criador-text-mode.md` (lines 49-182)

## Approach

**C1 · One canonical reference (#120).** Export `FORMAT_REFERENCE` (grouped: day header · block
header + type aliases · structure · exercise line · loads · complex · stations · Rest · Meta ·
Obs/Zona/Entre ciclos) and `FORMAT_EXAMPLE` (the one placeholder, used by all three) from
`textFormat.js` — it is already pure and client-free, and it must stay that way (all three consumers
render in the client-free gallery). Today there are **four** strings, no two alike
(`SessionTextPane.jsx:9-14` and `:133`, `BlockTextEditor.jsx:61-63`, `WeekImportModal.jsx:102`), and
all four omit most of the grammar. Generate the type-alias list from `TYPE_ALIASES` so it cannot
drift. `BlockTextEditor` gains an `ⓘ Formato` control (it has none).
⚠️ **[plans/36](./36-criador-text-mode.md) lines 49-182 is the grammar of record and must be updated**
for stations, the `3x60kg / 2x70%` pair form, `5 rounds + 10 reps`, `WOD`, `Entre ciclos:` and the
tightened structure-line rule. Docs are part of Done.

**C2 · One warning summary (#129).** A `WARNING_KINDS` table in `textFormat.js` (order · severity ·
pt-BR label with plural) covering all eight kinds — `type-unresolved`, `unknown-exercise`,
`complex-detected`, `interval-approximated`, `unparsed-line`, `orphan-load`, `preamble`,
`block-locked` — and a `ParseWarnings.jsx` that renders them. Consumed by `BlockTextEditor` (inline
status row), `SessionTextPane` (footer, replacing its four hand-counted rows at `:160-189`) and
`WeekImportModal` (per-day cell + a total, replacing `:48-51`'s two-kind count). Kills the 6×3 matrix
in the review's §A-5.

**C3 · Per-day import preview + `preamble` (#128).** Extract `PreviewBlock` from `SessionTextPane`
into its own file; `WeekImportModal` renders a per-day expandable row using it, collapsed by default.
The risk is currently inverted — the modal that commits *N* sessions shows `3 blocos · 6 ex ✓` while
the pane that commits *one* gives a full block-by-block preview. `preamble` gets its first consumer
via C2. Fold in the day-header gap: add `2a feira`/`2ª feira` … `7a`/`7ª` to `DAY_MAP:747-773` (the
only 2 of 15 tested spellings that fail; the no-match hint that renders is already good).

**C4 · #131, folded in per the user.** `SessionTextPane`'s textarea (676×340 with `scrollHeight` 889
at 1280×900 — 38% of a 37-line session) and `WeekImportModal`'s `minHeight:130` (`:100`, for a
routinely 40+ line paste) both grow to fill the available height. Same family as #18/#96.

**C5 · Gallery + cards.** Update the four Criador group cases, add a `ParseWarnings` entry covering
every kind and both severities, then `npm run design:cards` and commit the regenerated cards
(build artifacts are part of Done). ⚠️ Two fixtures read the wall clock (#114), so expect and revert
date-drift-only diffs — same precedent as #24 and plans/60.

*(Out of scope, and named so it isn't quietly absorbed: **#136(c)**'s three ▤/¶ labellings and the
per-block toggle's missing `aria-label` belong to #136's batch, not here.)*

## Verification

1. `npm test` · `npm run lint` · `npm run build:all`.
2. Gallery at both widths × all 4 themes — every warning kind and both severities render, and
   `--red`'s known 3.67:1 on the dark themes is **#137**'s call, not this plan's (record, don't fix).
3. Live: paste a real 40+ line week with a leading `SEMANA 32 — Eagles` / `Foco: gimnastico`
   preamble — both lines must now be reported, not silently discarded behind a green ✓; expand a day
   and confirm the preview matches what `Criador` then creates. Paste a block with `a cada 1'20"` and
   confirm the interval-approximation warning appears on **all three** surfaces.

---

Model: **Opus** (61·A, 61·B) · **Sonnet** (61·C) · Size: **L** (A), **M** (B), **M** (C)
