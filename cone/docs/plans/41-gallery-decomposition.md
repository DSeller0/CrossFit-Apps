# 41 — #74 · Gallery decomposition (no behavior change)

> Planned 2026-07-26 from the [full review pass](../reviews/2026-07-26.md).
> Run order: [39 Publicador](./39-publicador-decomposition.md) → [40 index.css triage](./40-index-css-triage.md) → **41 (this)**.
> Last of the three code-debt items held in front of the Serviços (#56) and Agenda (#59)
> design passes.

## Context

`src/public/gallery/Gallery.jsx` is **1790 lines** and grew **+379 since 2026-07-18** — the
fastest-growing file in the repo. That is not incidental: it is *the* file every design session
edits, because WORKFLOW.md makes the gallery the all-states source of truth, so each pass adds
its component's states here.

It is dev-only and never built by CI, so it costs **nothing at runtime**. This is purely about
the file three more design passes are about to edit. Each pass that lands first makes the
eventual split bigger and its diff harder to read.

**Pure move, no behavior change.** Same discipline as #26/#39: if a gallery case renders
differently, it is a bug.

## Acceptance

- `Gallery.jsx` drops to the shell (~120 lines) composing an imported `GROUPS`.
- No new file exceeds ~350 lines.
- **`npm run design:cards` produces no on-disk diff** against the current generated cards.
  That is the proof the move changed nothing.
- `gallery.html` opens on the public dev server with all **8** groups and every case rendering.
- `npm run build:all` clean (the gallery isn't in it, but the shared components it imports are).

## Files

Verified structure of the current file:

| Lines | Extract to | Contents |
|---|---|---|
| 1–216 | `gallery/fixtures.js` | `THEMES`, the `AMBER`/`BLUE`/`RED`/`GREEN` `blkColor` consts, the `ex*` exercise shapes (`exStandard`, `exScheme`, `exProg`, `exProgStepsOnly`, `exComplex`, `exDist`, `exCal`, `exCardio`, `exLong`, `exNoteOnly`, `FULL_LIST`), `NOOP`, `schedBl*`, `demoMap*`, `logPane*`, `deskRegBl*`, `checkinAthletes`, `bd*`, `sd*`, `rl*` |
| 217–643 | `gallery/harness.jsx` | The reusable shells `Case` `:270`, `FixedFrame` `:286`, `Section` `:290`, `ModalBox` `:519`, `TallModalBox` `:627`, plus the per-component demo wrappers `ScaleFilterDemo` `:217`, `AccordionCardDemo` `:221`, `WodSelectColDemo` `:230`, `LbMobileDemo` `:246`, `MeSheetHarness` `:397`, `PrSectionDemo` `:441`, `AthletePickerDemo` `:458`, `MaskedTimeDemo` `:512`, `ConfirmReviewDemo` `:529`, `StubTypePicker` `:632` |
| **644–1727** | `gallery/groups/*.jsx` | **The 1083-line `GROUPS` array — one file per group**, each default-exporting its own group object: `spa.jsx` · `criador.jsx` · `shared.jsx` · `results.jsx` · `leaderboard.jsx` · `me.jsx` · `schedule.jsx` · `index.jsx` |
| 1728–1790 | `Gallery.jsx` (stays) | The shell: theme `<select>`, stage-width toggle, sidebar, and `export const GROUPS = [spa, criador, shared, results, leaderboard, me, schedule, index]` |

If `harness.jsx` lands over ~350 lines, split the generic shells (`Case`/`FixedFrame`/
`Section`/`ModalBox`/`TallModalBox`) from the per-component demo wrappers.

## ⚠️ Hard constraint — `npm run design:cards` consumes this file

`scripts/build-design-cards.mjs` SSRs the gallery's `GROUPS` into the Claude Design component
cards. Two lines pin the contract:

- `:200` — `const { GROUPS } = await import(…'design-cards-entry.js')` → **`GROUPS` must stay a
  named export reachable from the same entry**, with an identical shape.
- `:226` — `file: \`components/${g.group.toLowerCase()}.html\`` → **every `group:` string must
  stay byte-identical.** `'SPA'` → `spa.html`; CLAUDE.md already records that this group name
  must remain a single clean token, not "SPA / UI".

Also preserve **group order**, so the gallery sidebar doesn't reshuffle.

## Approach

1. **`fixtures.js` first.** Pure data, no JSX, no imports from the harness. Re-point
   `Gallery.jsx` at it and open the gallery before touching anything else — this proves the
   import plumbing cheaply.
2. **`harness.jsx` second.** These are the shells every group entry uses, so they must exist
   before the groups move.
3. **Groups one at a time, in `GROUPS` order**, opening the gallery after each. Eight small
   verifiable steps beat one 1083-line move.
4. Keep every fixture object and every `label:`/`group:` string **exactly** as written. This is
   a move; renaming a label changes a card.
5. **Do not** add, remove, or restyle a case. If a component is missing states, that is its own
   item — not this one.

## The trap that makes this worth doing carefully

**The gallery is never built by CI**, so a broken import there is invisible to every automated
gate — `npm test` and `npm run build:all` both pass with a dead gallery. CLAUDE.md records the
exact incident: #51 moved `ScaleFilter.jsx` into `shared/` and left `Gallery.jsx` importing the
old path, making `gallery.html` a hard 500 that nobody noticed **until #52**.

So: **open the page.** Twice — once mid-move, once at the end.

## Verification

1. `npm run design:cards` → **`git status` must show no change** to `cone/design/components/*.html`.
   This is the acceptance test; it exercises every group through a real SSR render.
2. `npm run dev:public`, open `/CrossFit-Apps/gallery.html`:
   - all 8 groups listed in the sidebar, in the original order;
   - every case in every group renders — click through all of them;
   - the theme `<select>` cycles all four themes and the width toggle still works;
   - **zero console errors** (a missing fixture import shows as a render crash, not a warning).
3. `npm run build:all` — clean.
4. `git diff --stat` reads as pure movement.
5. Update `CLAUDE.md`'s gallery bullet to name the new folder layout (it currently describes
   `Gallery.jsx` as the single file holding `GROUPS`).

Model: Sonnet · Size: M
