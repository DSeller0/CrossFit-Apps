# Targeted review — Criador text mode + the public logging chain

**2026-08-03 · dimensions 1 (product/UX walk) and 2 (design consistency) only.** Scoped to the two
surfaces that produced five of the six bugs in the 2026-08-03 user report and that the 2026-07-26
full pass never walked. Not a 9-dimension pass.

**Method.** Local Supabase stack re-seeded from prod (`node scripts/seed-dev.mjs`), both dev servers,
**a stale `cone-v7` service worker was in fact present and was unregistered before anything was
trusted** — the warning in the brief was not hypothetical. Both surfaces driven at 1280 and 390,
dimension 2 measured across all 4 themes via the gallery. Round-trip fidelity was measured by running
the real `serializeBlock`/`parseBlock`/`serializeSession`/`parseSession` over all **339 prod blocks in
71 sessions**, not by reading the parser.

⚠️ **Two numbers in this report were wrong on first measurement and were re-derived before being
written down** — a loose CSS selector inflated the contrast failures (§D3), and a naive `JSON.stringify`
comparison inflated the intensity-loss count by counting key-order differences (§A2/§C1). The figures
below are the corrected ones. Treat any figure here as re-measurable; the scripts were scratch and
were deleted.

Nothing in this report is a code change. #119–#124 are not re-raised.

---

## Blocker

**B-1 · A coach-entered `Meta:` time without a colon is stored as seconds, and it silently inverts
#117's goal badge.** `criador/GoalInput.jsx:36,46` wraps `MaskedTimeInput` **directly**. Every other
WOD-time input in the app goes through `ScoreFields.jsx:107`'s `TimeField`, whose own comment
(`ScoreFields.jsx:106`) states the rule: *"Any surface typing a WOD time uses this, not
MaskedTimeInput directly."* `maskMMSS` fills from the right, so `14` stays `14`; only `expandMMSS`
on blur makes it `14:00`, and `GoalInput` never calls it.

Consequences, all live:

- `toSecs('14')` = **14 seconds**, not 14 minutes (`wod.js`).
- `goalStr` renders `14` instead of `14'` — the coach sees something that looks almost right.
- `goalOutcome(entry, bl)` compares `toSecs(perfTime) <= toSecs('14')`, so an athlete finishing in
  13:45 (825s) resolves to **`'missed'`**. Every athlete who finishes misses.
- The detail editor cannot show or repair it: `GoalInput.jsx:20` is
  `block.goal?.kind === kind ? block.goal : null`, and a colonless value that has round-tripped
  through text mode comes back `kind:'text'` (see A-2) — so the Meta field renders **empty** on a
  For Time block that has a goal, and the first keystroke overwrites it.

**Prod state: 1 of 7 time goals carries a colonless value** (`{"min":"14","kind":"time"}`, block
`msclpzw5gcc3sna588q`). It sits in a session named *"Eagles Monday Test"* which already has 2 logged
results, so the immediate blast radius is one test session — but the input that produced it is the
live Meta field, and any coach typing `14` reproduces it. This is the same bug class as #115
(9 of 16 prod result times had no colon); **#35's remaining-rollout list names `Timer.jsx` and
`PrLogSheet.jsx` and does not name `GoalInput`**, because it uses `MaskedTimeInput` and therefore
looks converted.

---

## High

**A-2 · Goal round-trip changes the goal in 4 of the 6 shapes `GoalInput` can write.**
`serializeGoal`/`parseGoal` (`textFormat.js:354-390`) are not inverses:

| stored | serializes to | parses back as | |
|---|---|---|---|
| `{kind:'time',min:'14'}` | `14` | `{kind:'text',text:'14'}` | ✗ **badge dies** — `goalOutcome` returns `null` for `kind:'text'` (`wod.js:184`) |
| `{kind:'time',min:'11:00',max:'12:00'}` | `11-12'` | identical | ✓ |
| `{kind:'time',max:'20:00'}` | `sub 20'` | identical | ✓ |
| `{kind:'rounds',min:'5'}` | `5 rounds` | `{kind:'rounds',min:5}` | ✗ string → number |
| `{kind:'rounds',min:'5',reps:'10'}` | `5 rounds` | `{kind:'rounds',min:5}` | ✗ **`reps` dropped** |
| `{kind:'text',text:'sub 10'}` | `sub 10` | `{kind:'time',max:'10:00'}` | ✗ text promoted to a time goal |

The first row is the serious one: flipping an existing For Time block to `¶` and back downgrades a
working time goal to a text goal, and #117's badge stops rendering for that block **with nothing on
screen saying so**. #121 records six loss causes; the goal is listed only as *"`goal`/`lettered`
can't be cleared"*, which is a different and much smaller problem than this.

**A-3 · Legacy-cardio exercises lose their volume on any round trip — 49 in prod, 35 lose it
entirely.** `loadStr` (`textFormat.js:854`) returns `''` for `mode:'cardio'` with the comment
*"legacy; distance lives in dist/distUnit (#37)"*, and `volStr` (`:858`) reads only `ex.dist`. That
comment describes the post-migration shape; **prod still holds the pre-migration shape**
(`{mode:'cardio', cardioVal:'5'}` with no `dist`), so the serializer emits the bare name.

Measured over the 333 text-editable prod blocks: **49 legacy-cardio exercises · 35 lose their volume
entirely · 13 lose only the unit · 1 survives.** Visible examples — `5m HSW` → `HSW`,
`15m SLED DRAG` → `SLED DRAG`, `100m Run` → `100 Run`, `40m FARM CARRY` → `40 FARM CARRY`. This is
the single largest visible-loss class in the round trip and #121 does not list it.

**A-4 · The week import creates whole sessions with no preview and two-thirds of the warning kinds
suppressed.** `WeekImportModal.jsx:48-51` counts only `type-unresolved` and
`unparsed-line`/`orphan-load`. `unknown-exercise`, `complex-detected` and `interval-approximated`
are computed by the parser and never read. There is **no per-day preview of any kind** — the coach
commits N sessions on the strength of a row reading `3 blocos · 6 ex ✓`, while `SessionTextPane`,
which commits *one* session, gives a full block-by-block preview. The risk is inverted.

**`preamble` has zero consumers anywhere in the app.** `parseWeek` (`textFormat.js:819,826`) emits it
for every line before the first day header. Verified live: pasting

```
SEMANA 32 — Eagles
Foco: gimnastico

DOMINGO
…
```

silently discards both leading lines and the row renders a **green ✓**.

**B-1(log) · The #116 adaptation note appears in no confirm and no success step.** Logged
`"Knee raise no lugar do T2B"` on results.html; the confirm modal showed Escala / RPE / Resultado and
**not the note**. Same in code for the other two review steps — `LogPane.jsx:87-102` and
`DeskRegPane.jsx:97-116`/`:143-158` render Bloco/Escala/Resultado/RPE and never touch `exerciseRows`.
So the one field that records *what* the athlete changed is invisible in the step whose entire job is
"check what you are about to submit", on all three surfaces that have one. It reads back correctly
afterwards (`LoggedResult`, `DeskRegPane` pre-fill) — it is only the review step that drops it. No
single plan's isolated verification would have caught this; it is a property of the composed chain.

**B-2 · Three confirm frames, three labellings, none of them the canonical one.**

| surface | title | cancel | confirm |
|---|---|---|---|
| `Results.jsx` modal | Confirmar registro | Cancelar | Confirmar |
| `LogPane.jsx:64,107,115` | Revisar registro | ← Editar | Confirmar ✓ |
| `DeskRegPane.jsx:96,120,127` | Revisar registro | ← Editar | Registrar ✓ |
| **`ConfirmReview` (#54/C0, canonical)** | **Revisar registro** | **Editar** | **Confirmar** |

`ConfirmReview` lives in `src/public/shared/` precisely so public pages can use it, and CLAUDE.md
records killing exactly these three forks as a settled C0 decision. None of the three adopted it.
#115 unified the *fields* across the five surfaces and left the *frames* forked, which is why this is
newly visible. Note there is **no queued session that owns this**: the public-page design passes
(#50–#53) shipped, and C1–C5 cover SPA tabs.

---

## Medium

**A-5 · Warning kinds surface inconsistently across the three text entry points.**

| kind | BlockTextEditor | SessionTextPane | WeekImportModal |
|---|---|---|---|
| `type-unresolved` | ✓ message | ✓ count + fix chip | ✓ count |
| `unparsed-line` / `orphan-load` | ✓ message | ✓ count | ✓ count |
| `unknown-exercise` | ✓ count | ✓ count | ✗ |
| `complex-detected` | ✓ message | ✓ count | ✗ |
| `interval-approximated` | ✓ message | ✗ | ✗ |
| `preamble` | n/a | n/a | ✗ (only producer) |

`interval-approximated` is the one that matters: it fires when `a cada 1'20"` is rounded to the
nearest whole-minute EMOM, i.e. when the block's timing has actually been altered, and it is visible
in one surface of three.

**A-6 · `sets`, `duration` and `rounds` are rewritten by the parser without any warning.**
`applyBareLoadList` (`textFormat.js:654`) sets `sets: String(steps.length)`, so the progression's step
count overwrites the coach's own sets — **15 prod exercises change** (`"2" → "3"`, `"2" → "5"`,
`"" → "2"`). Separately, **4 blocks gain a `duration` they never had** (`"" → "50"`, `"" → "20"`,
`"" → "1"`, and `"2.3" → "3"`) and **2 gain a `rounds`** (`"" → "3"`, `"" → "4"`). None of these
produce a warning of any kind.

**A-7 · Both text surfaces show a fraction of the text in a fixed box while the page has room.**
`SessionTextPane`'s textarea measures **676×340 with `scrollHeight` 889** at 1280×900 — the coach sees
**38%** of a 37-line session behind an inner scrollbar, with the area below the box empty.
`WeekImportModal`'s textarea is `minHeight: 130` (`WeekImportModal.jsx:100`) for a paste that is
routinely 40+ lines, inside a modal occupying 585px of a 900px viewport. Same family as #18/#96.

**B-3 · The #116 note toggles are visually text inputs.** `.notesToggle` (`ScoreFields.module.css:190`)
is `align-self: stretch; text-align: left`, transparent background, `1px solid var(--divider)` — in a
form where every other full-width left-aligned bordered rectangle is an `<input>` styled
`1px solid var(--border)`, and **`--border` and `--divider` are the same value in all four themes**
(§D-1). Measured on results.html: toggle 495px wide, same border colour as the time input. Its pressed
state changes only border and text colour (`:209`), so tapping gives almost no feedback until the
input appears. Every exercise in the block gets a row, always — a 9-exercise block renders 9
full-width boxes between the score fields and the submit button.

**B-4 · The `size="sm"` variant is 10/11 dead, and the gallery advertises a state the app never
renders.** The only `size="sm"` outside the gallery is `ClassPanel.jsx:68,116`, both on `ScaleRow`. So
of the 11 `.sm` rules (`ScoreFields.module.css:236-285`) exactly one — `.sm .scaleBtn` — has a
production consumer. `.sm .rpeBtn` is dead (ClassPanel has no RPE) and the nine `ScoreInputs` rules
(`.sm .input`/`.inputSm`/`.timeField`/`.checkpointToggle`/`.notesToggle`/`.notesList`/`.checkpointBody`
/`.numRow`/`.scoreWrap`) are dead because no consumer renders `ScoreInputs` at `sm`. `ClassPanel`'s own
compact time input is styled by `tvController.module.css`'s `editTimeInput` rather than by
`.sm .timeField`, which is the drift itself. `gallery/groups/shared.jsx:77`'s `ScoreInputsSmDemo`
renders the variant anyway.

**B-5 · The success modal labels a DNF result "Tempo".** The same value the confirm modal labels
`Resultado` is labelled `Tempo` on success, and for a DNF the value is `1 rds + 12 (DNF)` — a row
labelled "time" containing no time.

**B-6 · `RegistroView` is the only surface with no "Escala" label.** `RegistroView.jsx:640` passes
`label={null}` to `ScaleRow`; the other four show the 10px uppercase `ESCALA`. Its RPE control also
has no label until a value is set (it renders `RPE —`).

---

## Low

- **A-8 · Three labellings of the same ▤/¶ metaphor:** week grid `▤ Grade / ¶ Texto`, session
  `▤ Detalhado / ¶ Texto`, per-block bare `▤` / `¶` with no text. The per-block pair has a `title` but
  **no `aria-label`**, so its accessible name is the glyph.
- **A-9 · `2a feira` / `2ª feira` are not recognised as day headers.** 13 of 15 tested variants work
  (`SEGUNDA-FEIRA`, `Segunda`, `SEG`, `TERCA-FEIRA` unaccented, `SABADO`, …); only the numeric
  Brazilian form fails. The failure hint that renders is good.
- **A-10 · Session-level type drift, 7 of 71 sessions.** A block's `type` changes on a session round
  trip; in 3 cases `WOD` → `''` with **`typeUnresolved: false`**, so the preview shows no
  "? escolher tipo" chip and nothing warns. One case changes `Cardio` → `For Time`, which changes the
  block's family colour and how it is scored.
- **B-7 · `1 logs` / `0 logs`** in schedule.html's day chips — English plural in a pt-BR UI.

---

## Dimension 2 — design consistency

Both surfaces are **token-clean**, which is worth recording as a positive result:
`ScoreFields.module.css` has **0 hex and 0 `border-radius`** (confirming #123's note);
`textMode.module.css` has **1 `rgba(0,0,0,.8)`**, the modal scrim, which is the documented exception,
and every radius is `var(--radius-sm|md)` plus one `50%` box dot. No #15 violations found in scope.

**D-1 · `--border` and `--divider` are byte-identical in all four themes.**
`themes.css:27,50,62,74,86` — totk-dark/`:root` `#2a231c` · totk-light `#d4cab8` · spirit-blossom
`#221638` · spirit-blossom-light `#e2d4f0`. CLAUDE.md's design section states
*"`var(--border)` = stronger (card outlines); `var(--divider)` = subtle (internal separators)"* — that
distinction **does not exist in the code**. It is a decision (differentiate the two, or drop the
claim), not pure doc drift, and it is the direct cause of B-3.

**D-2 · `--red` warning text fails 4.5:1 on both dark themes.** Measured on `SessionTextPane`'s
`.warnRow`, the only element telling the coach something needs attention:

| theme | `.warnRow` on `--bg` | |
|---|---|---|
| totk-dark | **3.67** | ✗ |
| totk-light | 4.93 | ✓ |
| spirit-blossom | **3.69** | ✗ |
| spirit-blossom-light | 5.24 | ✓ |

#14's contrast table covers `--dim`, `--muted`, `--gold` and `--teal`; **`--red` was never measured.**
(For contrast: the same pane's textarea is 14.8–16.7:1 and `.infoRow`/`ⓘ Formato` are 8.8–10.8:1 —
the *warnings* are the least legible text in the pane.)

**D-3 · The `--accent-text`-on-`--gold`/`--teal` pairing fails in exactly one of twelve cells.**
Pressed-state text-on-background, measured in the gallery:

| theme | `.scaleBtn.on` | `.rpeBtn.on` | `.checkpointToggle[pressed]` |
|---|---|---|---|
| totk-dark | 9.59 | 10.31 | 9.59 |
| totk-light | 4.64 | 6.57 | 4.64 |
| spirit-blossom | 5.57 | 9.51 | 5.57 |
| spirit-blossom-light | 5.11 | **3.80** ✗ | 5.11 |

This **refines** #123's parenthetical ("contrasts in all 4 themes by coincidence, not by design"):
it is coincidence, and the coincidence holds 11 times and fails once — white on `#1490a0` at 11px
bold. Worth folding into plans/57's `--gold-text` decision rather than becoming its own row.

---

## Verified and rejected

Checked and found clean — do not re-derive next pass.

- **#118's unknown-key preservation holds end to end.** Logged a result with `checkpoint` +
  `exerciseRows` on results.html, reopened it from schedule.html's `DeskRegPane`: all fields
  pre-filled correctly, note preserved and shown open. The written row is exactly right —
  `finished:false`, full `checkpoint`, `perfReps:"12"` derived, `exerciseRows` intact.
- **#112's write shape and `repsBefore` derivation** are correct on a real block (`≈ 12 reps no total`
  matched the checkpoint).
- **#116 reads back correctly** on `LoggedResult` and pre-fills `DeskRegPane`. Only the *confirm* step
  drops it (B-1(log)).
- **`goalOutcome === 'missed'` rendering no badge is by design**, not a bug — `RankList.jsx:73` gates
  on `beat || met` only, per #117's two-positive-marks decision. Verified against a real DNF on a
  block with a valid `{min:'10:00'}` goal.
- **Per-gender intensity round-trips with zero visible change** — see C-1.
- **The per-block `¶` guard works**: the Estações block's toggle renders `disabled` with
  `title="Este tipo de bloco não tem forma textual"`. It is the *session-level* pane that bypasses it
  (#121b, confirmed: **6 of 6** prod Estações blocks lose `.stations`).
- **No duplicate DOM ids** on results.html despite the mobile and desktop forms both being mounted
  (`useId` scopes each copy); 8 note toggles in the DOM, 4 visible.
- **Day-header matching is robust** (A-9 is the one gap) and its failure message is helpful.
- **`ScoreFields`/`textMode` CSS carry no #15 debt** (0 hex / 0 radius, and 1 documented scrim).
- **Textarea legibility** in text mode: 14.8–16.7:1 across all 4 themes, `--font-mono` applied.
- **`RegistroView`'s bespoke 10-segment RPE bar** is recorded as deliberate (`RegistroView.jsx:634-636`,
  #122/plans/57) — not raised, but see C-3.

---

## Corrections to existing rows

**C-1 · #121 — "per-gender units flattened" has a blast radius of zero.** The mechanism is real
(`loadStr:841` picks `Masculino_unit || Feminino_unit || 'kg'` for both sides), but over **all 78
gender-intensity exercises in prod, `fmtIntensity` returns a byte-identical string before and after
the round trip** — the coach uses kg on both rails everywhere. Keep the item, drop it to cosmetic;
spend the plan's attention on A-2/A-3 instead.

**C-2 · #117's "only 3 of 294 prod blocks carry a goal" is stale: it is now 10 of 339**, spread over
7 sessions and 3 kinds (7 time, 1 rounds, 2 text). The coach started filling `Meta:` after the badge
shipped, which is what that row hoped for. The same stale figure is repeated in a code comment at
`RankList.jsx:70-72` ("only 3 of 294 prod blocks carry a goal today"), which is load-bearing for the
"trailing, not fixed-width" layout choice recorded there.

**C-3 · #122 understates the RegistroView half.** The row treats it as field order. After #112 and
#116 landed, the bespoke RPE bar sits roughly **530px below** its own scale row on a For Time block —
under the time field, the DNF toggle, the whole checkpoint body and every adaptation-note row — so it
now reads as belonging to the notes list rather than to the block. plans/57's "hoist the bar" fix is
still the right one; the row should say why it is more than cosmetic.

**C-4 · `scripts/seed-dev.mjs` can no longer seed `locations` or `coach_profile`, and says "EMPTY"
instead.** `seed-dev.mjs:49` builds the prod client with `VITE_SUPABASE_ANON_KEY`, and
`0006_lock_business_reads.sql` (#81) revoked anon read on exactly those two tables. The seed prints
`EMPTY locations` / `EMPTY coach_profile`, which is indistinguishable from "prod has none", and leaves
whatever the local stack held from before `0006`. Consequence: box tags, `?box=` scoping, box warnings
and the whole Serviços/billing surface (#104, the only money code) are seeded from stale data or not
at all. This is a partial answer to **#88** ("unknown yet *what* diverged") — at least this much has.
