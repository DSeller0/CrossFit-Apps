# 66 — #134 + #135 + #136 · ScoreFields polish, round two

*Planned 2026-08-04 alongside plans/63/64/65. **Not executed in that session** — its own session.*
🔴 **Runs after [plans/65](./65-border-divider-tokens.md)**: #134's fix is a function of the
`--border`/`--divider` value that plan sets. Running it first means guessing, then redoing.

## Context

Three rows from the 2026-08-03 targeted review, all in the score-logging surface that plans/52–57
rebuilt. Each is small; batching them is right because they touch one component and one stylesheet
and share a single live verification walk.

---

## #134 — the note toggles are visually indistinguishable from text inputs

`.notesToggle` (`ScoreFields.module.css:209-222`) is `align-self: stretch; text-align: left`,
transparent background, `1px solid var(--divider)` — inside a form where every other full-width
left-aligned bordered rectangle is an `<input>` at `1px solid var(--border)`, and **those two tokens
are identical in all four themes** (#137). Measured on `results.html`: the toggle is 495px wide with
the same computed border colour as the time input. Its pressed state (`:228`) changes only border and
text colour, so tapping gives almost no feedback until the input appears below it.

**Takes plans/65's answer** for the border half. Whatever remains after the tokens differ is a
control-affordance question: a toggle should not read as a field even when the border is right.

**Second half:** every exercise in the block gets a row **always** — a 9-exercise block renders 9
full-width boxes between the score fields and the submit button. #116's own comment argues against
"N always-open boxes"; this is N always-*visible* toggles, the same wall of rectangles one step
removed. Decide the collapse (a single "adaptei um movimento" affordance that reveals the list?) with
the real 9-exercise block on screen, not from the row.

---

## #135 — the `size="sm"` variant is 10/11 dead

Of the 11 `.sm` rules (`ScoreFields.module.css:255-302`), exactly **one** — `.sm .scaleBtn` — has a
production consumer. The only non-gallery `size="sm"` on a `ScoreFields` component is
`ClassPanel.jsx:68,116`, both on `ScaleRow` (re-verified 2026-08-04). `.sm .rpeBtn` is dead
(ClassPanel renders no RPE) and the nine `ScoreInputs` rules (`.input`/`.inputSm`/`.timeField`/
`.checkpointToggle`/`.notesToggle`/`.notesList`/`.checkpointBody`/`.numRow`/`.scoreWrap`) are dead
because **no consumer renders `ScoreInputs` at `sm`**.

Meanwhile `gallery/groups/shared.jsx:77`'s `ScoreInputsSmDemo` renders the variant anyway — the
gallery is showing a state the product does not have, which **inverts the "gallery is the truth"
rule**.

**Decision taken (user, 2026-08-04): delete the 10 dead rules and the gallery case.** Keep
`.sm .scaleBtn`. ⚠️ **Record in the commit that `ClassPanel`'s compact time input therefore stays
styled by `tvController.module.css`'s `editTimeInput`** — that was the drift this row noticed, and
after this it is a *stated* choice rather than an accident. Re-grep each rule at execution time
before deleting; this census is from 2026-08-04.

---

## #136 — four wording and labelling drifts

All four re-verified 2026-08-04.

**(a) The success modal labels a DNF "Tempo".** `Results.jsx:580` computes
`isTimeBlock(btype) ? 'Tempo' : 'Resultado'` and drops the `perfTime` guard that the confirm modal
has at `:456` (`isTimeBlock(btype) ? (inp.perfTime ? 'Tempo' : 'Resultado') : 'Resultado'`). So a
capped athlete sees **"Tempo: 1 rds + 12 (DNF)"** — a row labelled *time* containing no time. Reuse
the confirm's expression; do not write a third.

**(b) `RegistroView.jsx:641` passes `label={null}` to `ScaleRow`**, so it is the only one of the five
surfaces with no `ESCALA` label. Its RPE control likewise has no label until a value is set (renders
`RPE —`).

**(c) Three labellings of the same ▤/¶ metaphor** — `WeekGrid.jsx:225,234` *▤ Grade / ¶ Texto* ·
`SessionEditor.jsx:217,225` *▤ Detalhado / ¶ Texto* · `BlockEditor.jsx:244,258` **bare glyphs with a
`title` but no `aria-label`**, so the button's accessible name is the glyph itself. Give the block
pair real accessible names; decide whether Grade/Detalhado stay distinct (they describe different
things — a week vs. a session — so they may legitimately differ; say so either way).

**(d) `Schedule.jsx:1115` renders `{logCount} logs`** — an English plural in a pt-BR UI, against
CLAUDE.md's "All UI strings: pt-BR". Needs a singular/plural form (`1 registro` / `N registros`).

---

## Acceptance

- The note toggle reads as a control, not a field, in all four themes.
- `.sm` holds only rules with a consumer; the gallery shows only states the app renders.
- No English plural, no unlabelled `ScaleRow`, no glyph-only accessible name, no DNF labelled "Tempo".
- `npm test` · `npm run lint` clean at `--max-warnings 0` · `npm run build:all` clean · `npm run format`.

## Verification

**Live, at 1280 and 390**, against the local stack:

1. `results.html` — log a DNF on a For Time block and read the success modal's label (a). Log a
   non-RX scale on a block with **9 exercises** and judge the toggle wall (#134's second half) with
   it on screen.
2. The SPA's Resultados → Registro view — confirm `ESCALA` is labelled (b).
3. Criador — the three ▤/¶ pairs, and their accessible names via the a11y tree (c).
4. `schedule.html` — the day chips' log count (d).
5. TV controller's class roster — the one real `sm` consumer; confirm nothing changed for it.

**Gallery:** `ScoreFields` has 7+ cases including the notes states. Open `gallery.html` (dev-only,
never built, **no CI gate catches a broken import there**) and confirm the `ScoreInputsSmDemo`
removal left no dangling reference. Regenerate `npm run design:cards`.

## Ritual

BACKLOG: Done entry; close #134, #135, #136. Done marker on this plan. Commit + push.
