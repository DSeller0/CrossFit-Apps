# 27 — RPE number doesn't render once selected (#78)

> ✅ Done: `8ce6da1`

Backlog: **#78** (Icebox → Ready → Done). Captured from a user report on 2026-07-17.

## Context

User-reported against the results-logging flow: after tapping an RPE value, the picker reflects the selection with a **color change** but the **number itself doesn't show**. This is **not** a missing-value JSX bug — every RPE picker renders the digit as the button's own text (`{n}`) with an `*On` modifier class swapping colors:

- `results/LogForm.jsx:24-28` (`.rpeBtn` / `.rpeBtnOn`, `Results.module.css:278-283`) + the parallel scale buttons `.scaleBtn` / `.scaleBtnOn` (`:285-289`)
- `schedule/LogPane.jsx:97-107` (`.lpRpeBtn` / `.lpRpeBtnOn`, `.lpScaleBtn` / `.lpScaleBtnOn`)
- `schedule/DeskRegPane.jsx:33-37` (its own `On` classes)

**Leading hypothesis — ruled out live (2026-07-17).** The `--accent-text`-on-bright-fill theory predicted low contrast on light themes specifically. Computed WCAG ratios for every theme (`.rpeBtnOn`/`.scaleBtnOn` fill vs `--accent-text`) actually ranged 3.80–10.31 — low in spots but never below ~3.5, and screenshotting `LogForm`'s gallery fixture (RPE 8 + RX pre-selected) in all 4 themes showed the digit clearly legible everywhere. Not the bug.

**Actual root cause (confirmed live via `getComputedStyle` on `results.html`, real Bruna/For-Time flow, local stack):** a CSS specificity collision, not a token/contrast problem.
- `Results.module.css:280` — `.rpeBtn:hover:not(:disabled) { border-color:var(--teal); color:var(--teal); }` (specificity 0,3,0)
- `Results.module.css:282` — `.rpeBtnOn { background:var(--teal); border-color:var(--teal); color:var(--accent-text); }` (specificity 0,1,0)

The hover rule outranks the selected-state rule regardless of source order. So a button that is both **hovered and selected** renders with `color:var(--teal)` (from the hover rule) on `background:var(--teal)` (from `.rpeBtnOn`) — text and fill are the *exact same value*, not just low-contrast. Verified via `getComputedStyle`: `color` and `backgroundColor` were byte-identical (`rgb(20,144,160)` on both, spirit-blossom-light) while hovering a selected RPE button. Same mechanism for `.scaleBtn:hover:not(:disabled)` vs `.scaleBtnOn` (gold-on-gold). This reproduces in **every theme** (the hover rule always repaints to the same color as the On fill, independent of which theme's hex values are in play) whenever the pointer rests on the button after selecting it — a real mouse hovering post-click, or a touch device with "sticky hover" (iOS/some Android WebKit keep `:hover` active after `touchend` until the user taps elsewhere), which is consistent with the original tap-to-select report.

**`LogPane`/`DeskRegPane` confirmed NOT affected:** `Schedule.module.css` defines no `:hover` rule at all for `.lpRpeBtn`/`.lpScaleBtn`/`.deskRegRpeBtn`/`.deskRegScaleBtn` — grepped the whole file, only 18 unrelated `:hover` rules exist, none touching these classes. So there was never a competing selector there; those two surfaces render correctly as-is.

(SPA's `Resultados.jsx` RPE bar was separately live-verified rendering correctly during #70's testing on 2026-07-17.)

## Acceptance

- The selected RPE digit (and the selected scale label) is legibly visible in **all 4 themes** on every surface where it reproduces.
- Contrast of the selected digit against its fill meets the UI threshold.
- Unselected / hover / focus-visible / disabled states unchanged.

## Files

Reproduce across all three public RPE surfaces (fix wherever it reproduces, keep them in sync):
- `src/public/results/LogForm.jsx:22-39` + `Results.module.css:278-289`
- `src/public/schedule/LogPane.jsx:97-107` + `Schedule.module.css` (`.lpRpeBtnOn` / `.lpScaleBtnOn`)
- `src/public/schedule/DeskRegPane.jsx:33-37` + its `On` classes in `Schedule.module.css`
- Possibly `themes.css` (if the fix is a per-theme `--accent-text` correction — check every consumer first).

## Approach (as executed)

1. **Reproduced first.** Drove `results.html` live on the local stack (real Bruna/For-Time flow), selected RPE 8 + RX, then hovered the selected buttons and diffed `getComputedStyle().color` vs `.backgroundColor` — found them byte-identical, confirming the specificity collision above (not the `--accent-text` hypothesis).
2. **Chosen fix — selector exclusion, lowest blast radius.** Added `:not(.rpeBtnOn)` / `:not(.scaleBtnOn)` to the two hover selectors in `Results.module.css` so the hover-color rule simply doesn't match an already-selected button:
   - `.rpeBtn:hover:not(:disabled):not(.rpeBtnOn) { border-color:var(--teal); color:var(--teal); }`
   - `.scaleBtn:hover:not(:disabled):not(.scaleBtnOn) { border-color:var(--gold); color:var(--gold); }`
   - No `themes.css` token change needed — the bug wasn't token-shaped. `LogPane`/`DeskRegPane` needed no change (confirmed they never had a competing hover rule); "keep in sync" is satisfied because all three surfaces now correctly show the selected digit under hover, not because the same lines were touched.
3. **Gallery coverage added** (`Gallery.jsx`): `LogPane` had no selected-state case at all (`logPaneBlockForm` fixture always used `rpe:null,scale:null`) — added "Formulário · RPE + Escala selecionados (#78)" reusing the existing `logPaneBlockDone` fixture with `confirming=false` so the interactive (not read-only-confirm) button row renders selected. `DeskRegPane` likewise had no `step="form"` case with a selection — added "Formulário · RPE + Escala selecionados (#78)". `LogForm` already had one (the AMRAP case, fixture-driven `rpe:8,scale:'RX'`).

## Verification

Local stack + Playwright:
- Tap RPE 8 + a scale on results.html and on both schedule log panes; screenshot the selected state in **all 4 themes**; confirm the digit is visible each time.
- `getComputedStyle` contrast check on the selected button (`color` vs `background-color`).
- `npm test` + `npm run build:all` green.

**Complete when:** the RPE number renders visibly, in every theme, on whichever surface(s) reproduced it.

Model: Sonnet · Size: S
