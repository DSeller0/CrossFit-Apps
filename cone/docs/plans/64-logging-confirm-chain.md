# 64 — #132 + #133 · The logging chain's review step

> ✅ Done: `e47dec8` · 2026-08-04 — see BACKLOG.md
>
> Planned 2026-08-04 alongside plans/63/65/66; executed in its own session the same day, per
> WORKFLOW.md "one item per session for S/M".
>
> **Shipped as planned** — all three surfaces (`Results.jsx` · `LogPane.jsx` · `DeskRegPane.jsx`) now
> render `ConfirmReview` for their confirm step with the canonical labels, and the #116 note renders
> in every confirm **and** success step via `ReadBox`/`ReadRow`. `Results.jsx` kept its real
> "Confirmar alteração" distinction via a `title` override. The dead `deskConfirmBox` family +
> `deskCancelBtn`/`deskConfirmBtn` (`Schedule.module.css`) and `confirm*` family (`Results.module.css`)
> were deleted — `grep`-verified zero remaining consumers in both files first.
>
> **Two things found at execution, both recorded in code, neither in the plan:**
> - 🔴 **`.logPane` carries a CSS `transform` even at rest** (`translateX(100%)` / `(0)` — a `transform`
>   value, never `none`), which makes it a containing block for `position:fixed` descendants. A naive
>   nested `<ConfirmReview>` would silently behave like `position:absolute` relative to the pane instead
>   of the viewport. Both `LogPane` and `DeskRegPane` now render `<ConfirmReview>` as a **sibling
>   outside** the pane/panel element, never nested inside — the plan's "two things to handle" flagged the
>   overlay-above-a-pane risk but not this specific cause.
> - **The plan's "keep the pane behind the dialog" intent required restructuring, not just a markup
>   swap:** the `confirm`/`confirming` step used to *replace* the form's DOM (a ternary), which would
>   have discarded scroll position and field state the instant `ConfirmReview` opened — same class of
>   bug the plan exists to prevent, one level up. Both files now render the **form unconditionally**
>   (gated only on `success`, not on `confirming`/`step==='confirm'`) and layer `ConfirmReview` as an
>   always-present sibling controlled by `open`. Verified live: `scrollTop` on the pane was identical
>   (263) before opening the confirm dialog and after pressing Escape — the form was never unmounted.
>
> **Two scope calls made explicitly, not silently:**
> - **Results.jsx's confirm-modal scale/opacity transition was recorded as a deliberate loss**, not
>   ported into `ConfirmReview.module.css` — the plan offered both options; porting would have changed
>   the shared dialog's mount lifecycle (`open ? render : null` → always-mounted + CSS transition) for
>   every future consumer to save one surface's animation. A comment at the CSS site says so. The
>   success modal's own transition is untouched (it stays a bespoke shell, not `ConfirmReview`).
> - **`LogPane`'s success step had no read-back at all before this** (just an icon/title/sub/link) —
>   extending it with the same `ReadBox`/`ReadRow` score + note detail the other two surfaces show was
>   necessary for the note to have anywhere to render there, and is what the acceptance criterion
>   ("every confirm **and** success step, on all three") requires.
>
> `ConfirmReview.module.css`'s `.body` became `display:flex;flex-direction:column;gap:var(--sp-3)`
> (was `margin-bottom` only) so multiple `ReadBox` pairs — score + notes, or several blocks in
> `LogPane`'s multi-block confirm — space evenly without a per-consumer wrapper div.
>
> **Live-verified** against the local stack with real prod-shaped data (Playwright, 1280 and 390): all
> three surfaces' confirm + success steps against a real SC-scale result carrying a genuine #116 note
> ("Fiz com banda auxiliar" on Toes to Bar) — the note rendered in confirm and success on all three;
> Escape returned to the still-scrolled, still-filled form rather than closing the pane, on both
> `LogPane` (mobile, 390) and `DeskRegPane` (desktop); `Results.jsx`'s edit path showed "Confirmar
> alteração" and the note; `LogPane`'s multi-block confirm (For Time + EMOM) showed two independent
> `ReadBox`/note pairs with even spacing. Gallery (`ConfirmReview`, `ScoreFields`, `LogPane`,
> `DeskRegPane` cases, including their pre-built "erro no envio" states) rendered with zero console
> errors — no `design:cards` run, since no gallery-rendered component's markup shape changed (only
> `ConfirmReview.module.css`'s `.body` layout and the consuming pages). 704 tests / lint 0 (`--max-warnings 0`)
> / `build:all` clean / `format` clean.

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

Model: Sonnet · Size: **S** (#132) + **M** (#133) — one session, #133 absorbs #132
