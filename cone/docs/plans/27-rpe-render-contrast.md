# 27 — RPE number doesn't render once selected (#78)

Backlog: **#78** (Icebox → Ready). Captured from a user report on 2026-07-17. **Not yet root-caused — reproduce live first.**

## Context

User-reported against the results-logging flow: after tapping an RPE value, the picker reflects the selection with a **color change** but the **number itself doesn't show**. This is **not** a missing-value JSX bug — every RPE picker renders the digit as the button's own text (`{n}`) with an `*On` modifier class swapping colors:

- `results/LogForm.jsx:24-28` (`.rpeBtn` / `.rpeBtnOn`, `Results.module.css:278-283`) + the parallel scale buttons `.scaleBtn` / `.scaleBtnOn` (`:285-289`)
- `schedule/LogPane.jsx:97-107` (`.lpRpeBtn` / `.lpRpeBtnOn`, `.lpScaleBtn` / `.lpScaleBtnOn`)
- `schedule/DeskRegPane.jsx:33-37` (its own `On` classes)

**Leading hypothesis (confirm live before touching code):** the selected state paints the digit in `var(--accent-text)` on a bright fill — `.rpeBtnOn` is `background:var(--teal); color:var(--accent-text)` and `.scaleBtnOn` is `background:var(--gold); color:var(--accent-text)`. On the **light** themes `--accent-text` is white/near-white (totk-light `#fff`), so **white-on-bright-teal / white-on-gold** reads as an invisible number while the fill still visibly changes color — matching the report exactly. This is the same bug family as the 2026-07-16 review's dim-7 contrast findings and its dim-2 `--accent-text` note. **Already ruled out:** the SPA's `Resultados.jsx` RPE bar was live-verified rendering correctly during #70's testing on 2026-07-17 — so start on the public pages.

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

## Approach

1. **Reproduce first.** Drive each of the three surfaces at 390 and 1280 across all 4 themes; screenshot the selected state; identify which theme(s)/surface(s) hide the digit and confirm the mechanism via `getComputedStyle` on the selected button (compare `color` to `background-color`).
2. **Choose the minimal correct fix** once the mechanism is confirmed:
   - If it's the `--accent-text`-on-bright-fill collision on light themes, pick one and record the reasoning in this file:
     - **(a) local override** — give the selected `On` state a guaranteed-contrast text color at the button. The teal/gold fills are light-ish in all 4 themes, so a fixed dark digit is safe and touches nothing else. Lowest blast radius.
     - **(b) token correction** — fix the offending `--accent-text` value per theme in `themes.css`. Shared token: audit every other consumer first (incl. #53/#72's planned Timer `color:#000 → var(--accent-text)` change) so this doesn't regress them.
   - Apply the same fix to the parallel **scale** `On` state and to the schedule log panes' `On` classes so all three surfaces stay consistent.
3. Confirm the gallery covers the selected RPE state (LogForm/LogPane have entries under Results/Schedule) so the fix is visible across themes; add a selected-state case if missing.

## Verification

Local stack + Playwright:
- Tap RPE 8 + a scale on results.html and on both schedule log panes; screenshot the selected state in **all 4 themes**; confirm the digit is visible each time.
- `getComputedStyle` contrast check on the selected button (`color` vs `background-color`).
- `npm test` + `npm run build:all` green.

**Complete when:** the RPE number renders visibly, in every theme, on whichever surface(s) reproduced it.

Model: Sonnet · Size: S
