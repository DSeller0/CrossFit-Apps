# 64 — #132 + #133 · The logging chain's review step

*Planned 2026-08-04 alongside plans/63/65/66. **Not executed in that session** — its own session, per
WORKFLOW.md "one item per session for S/M".*

## Context

The review step is the one screen whose entire job is *"check what you are about to submit"*, and on
all three surfaces it is the weakest link in a chain that was otherwise rebuilt five times across
plans/52–56.

**#132 — the #116 adaptation note appears in no confirm and no success step, on any surface.** The
field that records **what** the athlete changed is invisible at exactly the moment they would catch a
mistake. Reproduced live: logged `"Knee raise no lugar do T2B"` on `results.html` and the confirm
modal showed Escala / RPE / Resultado and not the note. ✅ It reads back correctly everywhere else
(`LoggedResult`, and `DeskRegPane` pre-fills it on a re-log) — **only the review step drops it**, so
this is a rendering addition in three files, not a data problem.

**This is a pure composed-chain bug** — no single plan's isolated verification could have caught it,
because each of plans/52–56 verified its own step and #116 verified the *input*. That is the lesson
worth carrying, not just the fix.

**#133 — three confirm frames, three labellings, none canonical.** `Results.jsx:459-485` is
*"Confirmar registro / Cancelar / Confirmar"*; `LogPane.jsx:64,107,115` is *"Revisar registro /
← Editar / Confirmar ✓"*; `DeskRegPane.jsx:96,120,127` is *"Revisar registro / ← Editar /
Registrar ✓"*. #115 unified the *fields* across five surfaces and left the *frames* forked, which is
what makes this newly visible.

⚠️ **No queued session owns either row** — the public-page design passes (#50–#53) shipped and C1–C5
cover SPA tabs only. They stay unpicked unless scheduled, which is why they are here.

## Decision taken (user, 2026-08-04): full `ConfirmReview` adopt in all three

`ConfirmReview`'s own docstring (`src/public/shared/ConfirmReview.jsx:23-29`) names these exact three
forks as what it was built to collapse, it lives in `public/shared/` **precisely so public pages can
use it**, and CLAUDE.md records killing these three forks as settled C0. None of the three adopted it.

**The real prize is accessibility, not tidiness.** `LogPane` and `DeskRegPane` render their confirm
as an inline pane step (`LogPane.jsx:60` on `confirming`, `DeskRegPane.jsx:93` on `step === 'confirm'`),
so today they have **no focus trap, no Escape→Editar, and no focus restore**. `ConfirmReview` has all
three plus a real `role="dialog"`/`aria-modal`/`aria-labelledby` contract.

## Scope

Three files: `src/public/results/Results.jsx` · `src/public/schedule/LogPane.jsx` ·
`src/public/schedule/DeskRegPane.jsx`. Both rows touch the same markup, so #133 **absorbs** #132 —
add the note rows while replacing the frame, not in a second pass.

**Canonical labelling everywhere:** title *"Revisar registro"*, secondary *"Editar"*, primary
*"Confirmar"* (`ConfirmReview`'s defaults — pass no overrides unless a surface genuinely differs).
⚠️ `Results.jsx:460` currently switches its title to *"Confirmar alteração"* when editing an existing
log; that distinction is real and worth keeping via the `title` prop — decide explicitly rather than
losing it to the default.

**Compose the bodies from the existing `ReadBox`/`ReadRow` exports.** Do not hand-roll rows; the
three `deskConfirmRow`/`confirmRow` sets are what this plan deletes.

**The note rows (#132):** render `exerciseRows` in each confirm **and** each success step, keyed by
`exId`, showing `name` and `note`. Reuse whatever `LoggedResult` already does to read them back
rather than inventing a second shape.

### Two things to handle rather than discover

1. **Two of the three are not modals.** Adopting the shell puts an overlay above a pane on
   `schedule.html`. Verify at 390 that the pane's own scroll position survives, that the mobile
   bottom-sheet interaction still works, and that dismissing the dialog returns to the *form* rather
   than closing the pane.
2. **`Results.jsx` has a slide transition** `ConfirmReview` does not — `styles.modalOverlay` +
   `modalOverlayOpen` (`:555`), and the same pattern on the success modal (`:568`). Either port the
   transition into `ConfirmReview.module.css` (it benefits all consumers) or record the loss
   deliberately. Do not let it disappear silently.

**Bespoke CSS deleted with the frames:** `Results.module.css`'s `confirm*` rules and
`Schedule.module.css`'s `deskConfirm*`/`deskCancelBtn`/`deskConfirmBtn` rules — grep each for other
consumers first (`deskConfirmBox` is used by both `LogPane` and `DeskRegPane`, so it only goes when
both are converted).

## Acceptance

- All three surfaces render the same shell, same three labels, same read-back vocabulary.
- The #116 note renders in **every confirm and every success step** on all three.
- Escape returns to the form (not "discard"); focus enters the dialog on open and returns to the
  trigger on close, on all three.
- `npm test` · `npm run lint` clean at `--max-warnings 0` · `npm run build:all` clean · `npm run format`.

## Verification

Drive all three flows live against the local stack at **1280 and 390** — `results.html`'s log form,
`schedule.html`'s `LogPane` (athlete self-log) and `DeskRegPane` (desk registration). For each:
log a non-RX scale with a per-exercise note, confirm the note appears in the review step, submit,
confirm it appears in the success step, then re-open and confirm it still reads back (#118's
unknown-key guarantee must not regress).

Keyboard, on each of the three: Tab cycles inside the dialog only; Escape → Editar; focus lands back
on the button that opened it.

**Gallery:** the `ConfirmReview` case (SPA group) and the `ScoreFields` notes cases already exist.
Open `gallery.html` — dev-only, never built, **no CI gate catches a broken import there**. Regenerate
`npm run design:cards` if any gallery-rendered markup changed.
