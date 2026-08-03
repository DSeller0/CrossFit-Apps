# 57 — #122 + #123 · Score-fields polish (field order + the invisible DNF toggle)

> ✅ Done: 0e812ac · 2026-08-03 — see BACKLOG.md

> **Two backlog rows, one plan, deliberately.** Both live in `src/public/shared/ScoreFields.jsx`
> and its `.module.css`, both are S, and both need the same live verification across the same five
> logging surfaces plus four themes. Shipping them separately pays that verification twice for no
> extra safety. Precedent: [plans/52](./52-result-fidelity-chain.md) absorbed the result-form half
> of #35 on the same reasoning.

## Context

Both bugs came from the user's 2026-08-03 report, found by *using* the app.

**#122 — the field order is inherited, not chosen.** `ScoreFields.jsx:438` composes
**RPE → Escala → score**, and the comment on that very line records why: *"The order the three form
surfaces already used."* When [plans/52](./52-result-fidelity-chain.md) collapsed five bespoke forms
into one component it preserved whatever the forms happened to do — nobody ever decided the order.
The user reviewed it in use and wants **Escala → RPE → Tempo**, which is the order the athlete
actually answers in: *what did I scale → how hard was it → what was my time.*

**#123 — the "Não terminei" toggle goes invisible the moment you press it.** Shipped with
[plans/54](./54-dnf-checkpoint.md). Its hover rule is missing the pressed-state guard that both of
its siblings in the same file already have, so hovering a pressed toggle paints gold text on a gold
background. On touch this is not a hover nuisance but a permanent state: mobile browsers keep
`:hover` matched on the last-tapped element, so tapping the toggle makes its own label disappear and
leaves it that way. `ScoreFields` is the one score surface for all five logging forms, so this ships
to every athlete on every phone.

Neither is a token violation — `ScoreFields.module.css` is 100% `var(--…)`, zero hex. #123 is a
selector-guard bug.

## Acceptance

- Every surface that composes RPE renders **Escala above RPE above the score inputs**.
- A **pressed** "Não terminei" / "Onde parou" label stays legible: on hover at 1280, and after tap
  at 390 (the sticky-`:hover` case — this is the actual failure, verify it explicitly).
- Verified in **all four themes**. The fix is token-only, so a theme where it still fails means the
  token *pairing* is wrong, not the selector — see the `--accent-text` note below.
- `.notesToggle`'s identical latent omission is closed in the same pass.
- 645 tests still pass · `npm run lint` clean at `--max-warnings 0` · `npm run build:all` clean.
- `npm run design:cards` re-run and the regenerated cards committed.

## Files

| File | Change |
|---|---|
| `src/public/shared/ScoreFields.jsx` | Swap the `RpeRow` (`:442-447`) and `ScaleRow` (`:448-453`) blocks in the default export. Update the `:438` comment — it currently states the old order as a fact. |
| `src/public/shared/ScoreFields.module.css` | Add `:not([aria-pressed='true'])` to `.checkpointToggle:hover` (`:149`) and `.notesToggle:hover` (`:204`). Settle the `--accent-text` pairing (below). |
| `src/components/tabs/resultados/RegistroView.jsx` | Hoist the bespoke RPE bar (`:651-663`) to sit between `ScaleRow` (`:637`) and `ScoreInputs` (`:642`). |

**Nothing else changes.** `LogForm.jsx:41`, `LogPane.jsx:176` and `DeskRegPane.jsx:77` all render
`<ScoreFields>` wholesale and inherit the new order for free — that is precisely what #115 built the
component for. `tv/ClassPanel.jsx:66,73,114` renders Escala → Tempo with **no RPE at all** and needs
nothing.

## Approach

### 1 · Field order (#122)

Swap the two JSX blocks. `ScoreInputs`' own internals are already correct and are not touched:
time blocks render `TimeField` → `CheckpointFields` → `ExerciseNotesRows` (`:361-377`), non-time
render the Rounds+Reps `.numRow` → checkpoint → notes (`:390-427`).

**No CSS blocks the reorder.** Every container is a plain flex column — `ScoreFields.module.css:10-14`
(`.group`), `:90-94` (`.scoreWrap`), `Results.module.css:286` (`.form`),
`Schedule.module.css:198-200,308`. `ScoreFields.module.css` contains **zero** positional selectors
(no `:first-child`, `:last-child`, `+` or `~`), so nothing keys off row position.

### 2 · `RegistroView`'s bespoke RPE (#122, second half)

`RegistroView` is the one consumer that composes the pieces itself rather than using the default
export, because its RPE is a 10-segment colour bar from #57 rather than `RpeRow` — deliberately kept,
with the reason written at `:634-636`. **Keep the bar; move it.** Do not swap it for `RpeRow`: that
is a design change this plan has no mandate for.

### 3 · The hover guard (#123)

Copy the pattern the same file already uses twice:

```css
.rpeBtn:hover:not(:disabled):not(.on)        /* :46  — guarded */
.scaleBtn:hover:not(:disabled):not(.on)      /* :77  — guarded */
.checkpointToggle:hover:not(:disabled)       /* :149 — the bug */
.notesToggle:hover:not(:disabled)            /* :204 — same omission */
```

The two toggles use `aria-pressed` rather than an `.on` class, so the guard is
`:not([aria-pressed='true'])`. Specificity is why source order can't save it today: `:149` is
(0,3,0) against `:154`'s (0,2,0), so hover wins regardless of where the rules sit.

`.notesToggle` is **harmless today** — its pressed state (`:209`) only sets `border-color`/`color`
and leaves the background transparent, so hover-on-pressed is a no-op. Fix it anyway: it is one
filled-background change away from reproducing #123 verbatim, and the guard costs nothing.

⚠️ **Do not reach for `@media (hover: hover)`.** There are currently **zero** such queries in `src/`;
introducing one here would set a site-wide precedent from a two-line bug fix. The `:not()` guard
fixes both the desktop and the sticky-touch case on its own.

### 4 · The `--accent-text` pairing — decide and record

`.checkpointToggle[aria-pressed='true']` (`:154`), `.rpeBtn.on` (`:51-55`) and `.scaleBtn.on`
(`:82-86`) all set `color: var(--accent-text)` over a `--gold` or `--teal` background.
`--accent-text` is defined as the readable text colour for **`--accent`** (`themes.css:27,62,74,86`),
so over `--teal` it is correct by construction and over `--gold` it is coincidence — it happens to
contrast in all four themes, but nothing guarantees that if `--gold` is ever retuned (and #43 adds
four more themes).

Pick one and write the reason at the site:
- **(a)** add a `--gold-text` token to all four themes — correct, but takes the per-theme token count
  29 → 30, which CLAUDE.md tracks deliberately;
- **(b)** record the pairing as verified-and-intentional in a comment.

**Recommend (b)** for this S-sized fix, with the contrast figures measured and written down, and
`--gold-text` left as a note for #43 where new themes make it load-bearing. Do not silently leave it
undocumented — that is how it stays a coincidence.

## Verification

Drive it, don't just build it. Local stack: `supabase start` then `node scripts/seed-dev.mjs`.
⚠️ **Check for a stale service worker first** — `sw.js` scopes over the dev server and silently
serves precached prod assets with *no console error* (CLAUDE.md); if edits don't appear, that is why.

**Order (#122)** — confirm Escala sits above RPE above the score inputs on all five surfaces:
`results.html` LogForm · `schedule.html` LogPane · `schedule.html` DeskRegPane · SPA Resultados →
Registro (the bespoke bar, in its new slot) · TV ClassPanel (unchanged, no RPE — confirm it did not
regress).

**Toggle (#123)** — on a For Time block, press "Não terminei" and hover it at 1280: the label stays
readable. Then at 390, **tap** it and take your finger off: the label must still be readable, which is
the case that actually broke. Repeat on an AMRAP block, where the same element reads "Onde parou"
(`ScoreFields.jsx:191-199` — same class, so one fix covers both, but confirm it). Repeat the whole
check in **totk-dark, totk-light, spirit-blossom, spirit-blossom-light**.

**Gallery** — `src/public/gallery/groups/shared.jsx:401-454` holds 13 ScoreFields cases (mask,
chipper vs real N, checkpoint aberto, AMRAP, "Onde parou", the six notes cases, disabled). All of them
flip visually with the reorder. Walk them at both widths and all four themes — they are the
state-coverage surface for this change, not collateral damage. `:454` (`ScoreInputsSmDemo`) has no RPE
and should be unaffected; confirm that.

**Gates:** `npm test` · `npm run lint` · `npm run build:all` · `npm run design:cards` (a
gallery-rendered component changed, so the regenerated cards are part of Done) · commit + push.

Model: Sonnet · Size: S
