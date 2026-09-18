# 93 — A global `:focus-visible` ring, the outline strippers, and Criador's focus borders (#182)

> Promoted from Icebox P2 on 2026-09-18 with [plans/91](./91-untargeted-session-audience.md) and
> [plans/92](./92-publicador-settings-debounce.md). A full `/app-review` pass runs once all three
> ship. Every selector below was re-verified against the tree that day. The line numbers are
> today's, not the review's.

## Context

From the [2026-09-05 review](../reviews/2026-09-05.md) §7, **H1** and **H2**. The review listed 12
selectors that remove the outline and put nothing in its place. [plans/86](./86-tv-timer-surface-pass.md)
cleared `tv/tvController.module.css` (now 0 `outline:none`, with the canonical ring on every
interactive class) and Timer's `.typeBtn`. That leaves **10 stripped selectors with no `:focus` or
`:focus-visible` rule anywhere in their file**:

| File | Selector | What it is |
|---|---|---|
| `public/schedule/Schedule.module.css:49` | `.athleteSel` | athlete `<select>`, bordered |
| `public/schedule/Schedule.module.css:162` | `.rmUnitSel` | RM calc unit `<select>`, bordered |
| `public/schedule/Schedule.module.css:272` | `.deskAthSearchInput` | desktop athlete search, **borderless**, inside `.deskAthSearchWrap` |
| `public/me/Me.module.css:310` | `.lsDate` | log-sheet date control, **borderless**, teal text |
| `public/me/Me.module.css:311` | `.lsGoalInp` | goal input, bottom border only |
| `public/me/Me.module.css:312` | `.lsNote` | note `<textarea>`, bordered |
| `index.css:365` | `.ex-unit-sel` | Criador exercise unit `<select>`, bordered |
| `index.css:399` | `.st-name-input` | Estações station name, **borderless** |
| `index.css:401` | `.st-dur-input` | Estações station duration, bordered |
| `public/gallery/Gallery.module.css:25` | `.select` | gallery theme picker (dev-only) |

Two more cases:
- **Focus looks the same as hover.** `components/shared/ExerciseCombobox.module.css:25` styles
  `.comboItem:hover, .comboItem:focus-visible` identically and re-adds `outline:none`. Real DOM
  focus moves between the items (`ExerciseCombobox.jsx:138-147`), so while the mouse rests on one
  item and the keyboard is on another, two items look selected.
- **H2: Criador's focus borders miss 3:1.** `index.css:322,330,339,359,381` (`.blk-name-input`,
  `.blk-meta-field input`, `.blk-notes-quick`, `.ex-qty-input`, `.ex-complex-name`) use
  `border-color: var(--dim)` as the focus state. The review measured `--dim` vs `--divider`, the
  unfocused border, at 1.79 / 1.88 / **1.48** / 2.91. `:422` (`.sheet-qty-input:focus`) does the
  right job with a frozen literal `#4ac8c0`, totk-dark's `--teal`.

**And there is no global `:focus-visible` at all.** A control with no focus rule shows the UA's
ring, which differs by browser and ignores the theme.

`themes.css` (repo root) is where the global rule goes:
- It is loaded by every public page's `<link>` and by the SPA (`src/main.jsx:2`).
- `build-design-cards.mjs` inlines it into every card.
- It already carries global non-token rules (the scrollbar block and the `*` rule, `:213-218`), so
  one more global rule is precedented.
- `parseThemes` only reads the `html.theme-*` blocks, so the palette card is unaffected.

## Acceptance

- **One global rule in `themes.css`:** `:focus-visible { outline: 2px solid var(--accent);
  outline-offset: 2px }`. It is the canonical ring CLAUDE.md records from plans/86 (9.65 / 5.37 /
  9.51 / 4.95 on `--bg`, across the original 4 themes), **re-measured across all 8 themes**.
- **Its comment states the cascade fact.** The rule has `(0,1,0)` specificity and loads *before*
  every module and `index.css`, so any component's own `outline:none` still wins. The global rule
  is the floor for controls with no rule; it does **not** fix a stripper. That is why the fixes
  below are each explicit.
- **None of the 10 selectors strips the outline without a replacement.** Each gets its own file's
  idiom:
  - **Bordered input or select** (`.athleteSel`, `.rmUnitSel`, `.lsNote`, `.ex-unit-sel`,
    `.st-dur-input`): a `:focus` border-colour swap to `var(--accent)`. Sibling precedents:
    `.lpSelect:focus`, `.ckInput:focus`, `.lsInp:focus`, `.pickerInput:focus`.
  - **`.lsGoalInp`:** `border-bottom-color: var(--accent)` on `:focus`. Sibling precedent:
    `.prog-table input:focus`.
  - **`.deskAthSearchInput`:** a `:focus-within` ring on `.deskAthSearchWrap`. The input itself
    has no box to colour.
  - **`.lsDate`, `.st-name-input`, and the dev-only gallery `.select`:** an outline on
    `:focus-visible`.
- **Criador:** the five `--dim` focus borders and `:422`'s `#4ac8c0` all become `var(--accent)`.
  Their `TAB-OWNED → Criador #58` tags stay; editing a rule in place doesn't change who owns it.
- **`.comboItem:focus-visible`** is distinguishable from `:hover`, e.g. an inset
  `outline: 2px solid var(--accent); outline-offset: -2px`.
- **Contrast, measured, not assumed.** Every new focus indicator reaches **≥ 3:1** (WCAG 1.4.11)
  in **all 8 themes**, against:
  - the unfocused state it replaces (`--divider`/`--border`), and
  - the fill it sits on (`--bg`/`--stone`/`--stone2`).

  The table goes in the Done marker, beside #14's standing table. If a cell fails in some theme,
  that is a finding for #14, not a reason to pick a different token per theme.
- A mouse click on a button does **not** show the new ring. `:focus-visible` guarantees this; the
  check is that nothing forces `:focus` styling onto buttons.
- `npm run design:cards` is regenerated and committed: `themes.css` is inlined into every card
  (WORKFLOW: build artifacts are part of Done).
- The four CI gates are clean.

## Files

- `themes.css` (repo root)
- `src/public/schedule/Schedule.module.css` · `src/public/me/Me.module.css`
- `src/index.css` (the Criador rules, :322-422)
- `src/components/shared/ExerciseCombobox.module.css` · `src/public/gallery/Gallery.module.css`
- `design/**` (regenerated)
- `CLAUDE.md`: the Design-system section gains the global ring and the cascade rule, beside the
  existing "Any focusable form control on a public page is ≥16px" bullet

## Approach

1. **Measure first.** Write a scratchpad node script, not committed: the #14 method, like
   plans/65, 86 and 87. It parses `themes.css`'s 8 `html.theme-*` blocks and prints WCAG contrast
   for `--accent` vs `--divider` / `--border` / `--bg` / `--stone` / `--stone2`, and `--dim` vs the
   same (to record the H2 before-state).
2. Add the global rule to `themes.css` below the scrollbar block, with the cascade comment.
3. Fix the 10 selectors and the combobox item, one file at a time.
4. Fix Criador's `--dim` × 5 and `:422`.
5. **Sweep for rings that shouldn't appear.** The global rule is new behaviour everywhere, so tab
   through each surface once. Risk: an element focused programmatically with `tabIndex={-1}`.
   `Modal` and `ConfirmReview` already carry `outline:none` on their dialog box; grep `tabIndex`
   for any other.
6. `npm run design:cards` → commit the regenerated cards.

⚠️ **Out of scope:**
- `.st-dur-input`'s `color: #c8a030` and similar literals are a tokenization question, not focus.
- **#14** (landmarks, headings, live regions) is its own row.
- **H5's** live regions were handled per surface by plans/86 where they applied.

## Verification

1. `npm test`, `npm run lint`, `npm run format:check`, `npm run build:all`.
2. `npm run dev:public` → **keyboard only** (Tab / Shift+Tab), in one dark theme and one light
   theme. Screenshot each ring.
   - `schedule.html`: athlete select, RM unit select, desktop athlete search
   - `me.html`: the log sheet's date, goal and note
3. `npm run dev` → Criador, same two themes: block name, meta fields, quick notes, qty, unit select,
   complex name, an Estações block's station name and duration, and on a 390px viewport the mobile
   sheet's qty. Then an exercise combobox: arrow down the list with the mouse parked on another
   item.
4. Click (don't tab) a button on each page: no ring.
5. Open `gallery.html` once. It is never built, so no CI gate sees it.
6. `git diff --stat design/` after `design:cards`: every card moves (themes.css is inlined), and
   nothing else changes.

Model: Sonnet   ·   Size: S
