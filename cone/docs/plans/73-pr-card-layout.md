# 73 — #145 + #146 · PR cards on a phone

> ✅ Done: `47972da` · 2026-08-07 — see BACKLOG.md

*Planned 2026-08-07 alongside plans/72 and plans/74. **Not executed in that session** — its own
session. **Sonnet · XS + XS.** Independent of 72 and 74 — no gate either way.*

## Context

Two rows from the user's 2026-08-05 mobile report, both on `me.html`'s PR board, both in the same two
files. **They are one plan because they only pay for themselves together**: #145 moves the "PR broken"
delta onto its own row, and that extra row is only affordable once #146 has made the card full-width.

**#146 — PR cards are two-up at every width, including a 390px phone.**
`Me.module.css:185` — `.tileGrid { grid-template-columns: repeat(2, minmax(0, 1fr)) }`, and it appears
**exactly once** in the file with nothing overriding it. A movement card therefore gets ~180px on a
phone, which truncates long movement names and is what makes #145's squeeze visible at all. The user's
call is **one card per row**.

**#145 — the delta squeezes the bar instead of taking its own row.**
`PrSection.jsx:100-108` puts `<Delta>` inside `.barRow` as a **sibling of `TallyBar`**. `.delta` is
`white-space:nowrap; flex-shrink:0` (`Me.module.css:206`) while `.barGrow` is `flex:1; min-width:0`
(`:203`) — so the arrow-and-load label always wins the space fight and **the progress bar is what
compresses**.

⚠️ **Two corrections carried on the rows, both re-verified 2026-08-07 — read them before touching
`BenchTile`:**

- **This is a `MovTile`-only change in practice.** `.benchTile { grid-column: 1 / -1 }`
  (`Me.module.css:222`) already forces benchmark tiles full-width, so #146 changes nothing for them.
- **`BenchTile` (`PrSection.jsx:114-159`) has no `.barRow` and no `TallyBar`.** Its `<Delta>` sits
  inline in `.benchBottom` (`:141-147`) beside the time and the `meta` label — a baseline-aligned run
  of text with no bar to squeeze. **A `.barRow`-scoped change cannot reach it, and should not.**
  Recommendation: **leave `BenchTile` alone** and record the reason in the code, rather than matching
  the two for symmetry — there is no bar there to protect, and lifting its delta out would break the
  baseline run it belongs to. If the user wants them matched, that is a separate call.

**Lane A, gallery-first** (WORKFLOW.md "Design work") — the component shipped, so the real component
is the truth and there is **no static mockup**. It is already covered at `gallery/groups/me.jsx:509`
(item `prsection`, 3 cases) and the fixtures already reach a regressed PR and a target-less one.

## Scope

**Changed:** `src/public/me/Me.module.css` · `src/public/me/PrSection.jsx`.
**Regenerated:** `cone/design/components/me.html` via `npm run design:cards` (build artifact — never
hand-edited).

## Approach

**1 — `.tileGrid` one-up on a phone.** Make the base rule a single column and restore two columns
inside the file's **existing** `@media (min-width: 768px)` layout fork at `:6` — do not add a third
media query. The file has two (`:6` layout, `:321` typography); the row's *"no media query anywhere in
the file"* is false as written, and its defensible form is *"nothing overrides `.tileGrid`"*.

🔴 **Correction found live, executed differently than planned:** putting the override in the `:6`
fork doesn't work. That fork's rules sit *earlier* in the file than `.tileGrid`'s own base rule
(`:185`), so at ≥768px both rules match with equal specificity and the later one — `.tileGrid`'s own
single-column base — wins the cascade, silently cancelling the two-column override; verified via
`document.styleSheets` rule order in the actual served CSS, not by inspection. Shipped instead as a
small `@media (min-width: 768px)` block declared immediately after `.tileGrid`'s base rule at `:185`
(same breakpoint value, just not textually merged into the `:6` fork), with a comment recording why.

**2 — lift `<Delta>` out of `.barRow`.** In `MovTile`, render the delta as its own row between the bar
and the `tileMeta` goal line (`PrSection.jsx:109`). The `{(pct !== null || delta) && …}` guard
currently covers both children — split it so a tile with a delta but no bar, and a tile with a bar but
no delta, each still render correctly. `.barRow` then holds only `.barGrow`, so `TallyBar` gets the
full card width by construction rather than by winning a flex negotiation.

`.delta`'s own rules (`nowrap`, `flex-shrink:0`) can stay — they are harmless on a row of its own and
still serve `BenchTile`, which keeps using the class inline.

**3 — gallery first, page second.** Adjust the component, review all 3 `prsection` cases across **all
4 themes × both widths** in `gallery.html` (`npm run dev:public`), and only then look at real
`me.html`. Finish with `npm run design:cards` and commit the regenerated card.

## Acceptance

- At 390px, one PR movement card per row; at ≥768px, two — unchanged from today.
- On a `MovTile` carrying a delta, `TallyBar` spans the full card width and the delta sits on its own
  line below it; the `meta` goal line still follows.
- A tile with a bar and no delta, and a tile with a delta and no bar, both still render (the split
  guard).
- Benchmark tiles are visually unchanged.
- The 3 gallery cases render correctly in all 4 themes at both widths.
- `design/components/me.html` regenerated and committed.

## Verification

`npm run dev:public` → `gallery.html`, item `prsection`.
⚠️ **Clear any `cone-v*` service worker first** (CLAUDE.md's standing warning).

1. **Gallery, 3 cases × 4 themes × {390, 1280}** — this is the state-coverage bar, and the fixtures
   already cover the axes that matter here (a regressed PR, a target-less PR, an empty tile).
2. **Real `me.html` at 390** against the local stack, on an athlete with a **long movement name** and a
   PR carrying a **negative** delta — the two conditions that produced the report. Assert the bar's
   rendered width equals the card's inner width, and that the name no longer truncates.
3. **1280** — confirm the two-up grid is unchanged and the benchmark tiles still span both columns.
4. `npm run design:cards` → commit only real diffs. ✅ #114 (plans/68) made the cards idempotent, so
   **date-drift noise is no longer expected** — if a card diffs in a way unrelated to `PrSection`,
   that is a #114 regression worth reporting, not noise to revert.

`npm test` · `npm run lint` (`--max-warnings 0`) · `npm run format:check` · `npm run build:all`.

## Docs (part of Done)

`BACKLOG.md` — both rows → Done. This file gets its `> ✅ Done: <commit> · <date>` marker. Record the
`BenchTile`-left-alone decision **in the code** (a comment at the `.barRow` split), not only on the
board — it is the kind of "why aren't these two the same?" question a future design pass will ask.

Model: **Sonnet** · Size: **XS + XS**
