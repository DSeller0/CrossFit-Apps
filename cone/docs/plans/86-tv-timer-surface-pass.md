# 86 — TvController + Timer surface pass (#174 · carries #182's worst half)

> The two surfaces the C0–C5 design program never reached. [plans/16](./16-design-pass-program.md)'s
> table has **no C-session for `TvController`**, and B4 covered `tv.html`/`timer.html` before the C0
> primitives existed. **Runs before [plans/87](./87-new-themes.md)** — user decision 2026-09-05.

## Context

This started as token-and-a11y cleanup and the [2026-09-05 pass](../reviews/2026-09-05.md) turned it
into a correctness fix: **`Quadro ao Vivo` is illegible on both light themes** (#174). On a light
theme `--cream` is the near-black *text* colour (`#1c1508` totk-light, `#1a0828` sb-light), and
`tvController.module.css` paints it onto a hardcoded `background: #111` — measured **1.04:1** and
**1.00:1**. The Configurações theme picker offers all four themes, so this is one click from a
coach's normal state, on the tab used to run a live class.

Everything else here is the debt that produced it:

| | Measured 2026-09-05 |
|---|---|
| Tokens | `tv/tvController.module.css`: 39 hex, **~22 genuinely bare** — `#48b860` (a green in **no** theme), `#c84038` (**3.97:1** at 11px on `#0d0b09`), `#0d0b09` used as a *foreground* |
| a11y | 21 buttons / **0** `aria-label` / **0** `onKeyDown` — the worst ratio in the app. `ClassPanel.jsx:159` is the app's only genuine click-`<div>` (accordion, no role/tabIndex/keyboard/`aria-expanded`). Unnamed icon-only: `TvController.jsx:62,83` (week arrows) and `ClassPanel.jsx:81` — a **destructive delete** |
| Focus | `tvController.module.css:8,12` strip the outline and that file has **zero** `:focus` rules |
| Dead CSS | `public/timer/Timer.module.css` **13/107** dead (`:137-165`, the whole `bm*` picker that moved to `BlockTypePicker.jsx`); `public/tv/TV.module.css` **24/100** dead (the pre-`ExerciseList` rows) |
| Popups | `Timer.jsx:456` — the app's **last** `confirm()`, gating "Pausar e sair?" mid-class |
| Overlays | `timer/BlockTypePicker.jsx:55` — `position:fixed`, no `role="dialog"`, no Escape, no focus trap |
| Live regions | the timer clock (`Timer.jsx:672`, 250 ms), round counters (`:644,654,664`), the 3-2-1 countdown (`:732`) and the ClassPanel roster (`ClassPanel.jsx:184,195`, 20 s) have **no** `aria-live` |
| Persisted bug | `Timer.jsx:350` stamps history with `new Date().toISOString().slice(0,10)` — **fixed by [plans/84](./84-blockers-batch.md) (#178), not here** |

## Lane — decide first, don't assume

[plans/16](./16-design-pass-program.md) rule 1's corrected test: *"Lane A when the surface is used
and only its execution is wrong; Lane B when the surface's own existence or structure is in
question."* TV and Timer are used at the gym **every day**, so → **Lane A, gallery-first, no static
mockup.**

🔴 **But split the scope, and do not smuggle the rewrite in.** `Timer.jsx:148-152` documents its own
architectural defect — *"The real fix is to pick ONE source of truth for the clock … Filed, not
done."* — and `Timer.jsx` is **1129 lines with 11 eslint disables (the file max) and zero tests**.
That is a state-model rewrite, not a design pass. **This plan takes tokens + a11y + the `confirm()`
+ the dead CSS. The clock rewrite and the decomposition belong to [#191](../BACKLOG.md).**

⚠️ **`#171` (TV as a customisable display) is unblocked and targets the same files.** Settle the
interaction before either starts — this pass must not repaint markup #171 would replace. Its scope
is `tv/tvController.module.css` + `TvController.jsx` + `ClassPanel.jsx` + `timer/`; #171's is
`public/tv/TV.jsx`'s wall layout.

## Acceptance

- 🔴 **`Quadro ao Vivo` and `timer.html` are legible and correct in all four themes**, verified by
  measuring — not eyeballing — the pairs that failed: `--cream`/`--sub`/`--teal` on their real
  surfaces, and `#c84038`'s replacement at its real 11px size. Bare hex in
  `tv/tvController.module.css` → **0** (data colours excepted and commented).
- Zero unnamed icon-only buttons in `tv/`; `ClassPanel.jsx:159` is a real `<button>` (or has
  role + tabIndex + `onKeyDown` + `aria-expanded`); every control keyboard-reachable with a visible
  focus state that clears 3:1.
- `Timer.jsx:456`'s `confirm()` is a `ConfirmReview`. **`window.confirm` repo-wide → 0.**
- `timer/BlockTypePicker.jsx` uses `ui/Modal` or meets its contract (`role="dialog"`, `aria-modal`,
  Escape, focus trap).
- The timer announces on **state transitions** via `role="timer"` — start / pause / round advance /
  finish — **not** a per-second live region. The ClassPanel roster gets `aria-live="polite"`.
- The 37 dead classes in `Timer.module.css` + `TV.module.css` are gone.
- Both surfaces render every state in the gallery across **4 themes × 390/1280**.
- `npm test` · `npm run lint` · `npm run build:all` green; `npm run design:cards` re-run + committed.

## Files

- `src/components/tabs/tv/tvController.module.css` · `tv/ClassPanel.jsx` · `tv/GroupsPanel.jsx` ·
  `src/components/tabs/TvController.jsx`
- `src/public/timer/Timer.jsx` (tokens · `confirm()` · `role="timer"` only) ·
  `timer/Timer.module.css` · `timer/BlockTypePicker.jsx`
- `src/public/tv/TV.module.css` (dead-class deletion only — the layout is #171's)
- `src/public/shared/ConfirmReview.jsx` (consumer, no change expected)
- `src/public/gallery/groups/` — a new group or additions for both surfaces

## Approach

1. **Settle the #171 boundary** (one paragraph in this plan's Done marker), then work gallery-first.
2. **Tokens.** Replace the ~22 bare literals with theme tokens. `#48b860` has no token — decide
   whether it becomes `--green` (a data colour, then document it as one) or goes. `#c84038` → `--red`
   (5.05–5.40:1, passes). 🔴 **The panels are the actual bug**: a hardcoded dark `background` under a
   themed `color` is what produces 1.00:1, so fix the *pair*, not just the foreground.
3. **a11y**, four edits closing the app's whole click-div/unnamed-button gap: `aria-label` on
   `TvController.jsx:62`, `:83`, `ClassPanel.jsx:81`; role/tabIndex/keyboard/`aria-expanded` on
   `ClassPanel.jsx:159`. Then the focus states (`tvController.module.css:8,12`) — reuse the
   `ui/` primitives' 2px ring rather than inventing one.
4. **`Timer.jsx:456` → `ConfirmReview`.** It gates a destructive mid-class action, so the copy must
   say what is lost. This is the app's last `confirm()`.
5. **`role="timer"` + transition announcements.** Reuse the pattern `shared/RankList.jsx:38,45`
   already establishes for a polite region; the clock itself must **not** be one.
6. **Delete the 37 dead classes.** Verified against the components in the pass; re-verify before
   deleting (a template-literal class name would not have shown up).

## Verification

- 🔴 **Drive the wall display live against the local stack** — start a class, run the timer through
  a full cycle including a rotation and a rest, end the class. This surface is used at the gym daily,
  so a regression is visible immediately and a screenshot is not enough.
- **Keyboard-only walk** of TvController and Timer: every control reachable, named and visibly
  focused. Check the accordion with Enter *and* Space.
- Re-measure the failing pairs in DevTools under all four themes.
- `grep -rn "window.confirm\|[^.]confirm(" src/` → 0.
- Gallery: every state, 4 themes × 390/1280. `/verify` live, `/code-review` before pushing.

Model: **Opus** (the lane call, the token decisions and the `role="timer"` contract are judgement;
the edits themselves are Sonnet work) · Size: **M–L**
