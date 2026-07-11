# 13 — Component extraction for the gallery + sidebar picker (#17)

> **Rewritten 2026-07-11.** #17's scope changed twice; both prior decisions stay recorded below rather than erased, per WORKFLOW.md's plan-lifecycle intent (a plan's rationale should survive its own pivots).
>
> - **2026-07-05:** shipped via Path B, not Path A (see "History" below) — the two concrete consolidations landed, the markup-slot adoption (Path A) stayed open.
> - **2026-07-10:** the design-process reform ([plans/19](./19-component-gallery-cdd.md)) redefined what "open" means. #17 is no longer about making `ExRow` render *through* `ExerciseList`'s markup (Path A) — that stays deliberately deferred, see CLAUDE.md "Shared rendering". #17 is now the **extraction vehicle for the component gallery**: pull `Schedule.jsx`'s inline interactive functions into standalone, importable components so they can enter `gallery.html` and be design-reviewed in every state. This is a mechanical refactor (move code, preserve behavior), not a markup-unification rewrite.

## Context

`gallery.html` ([plans/19](./19-component-gallery-cdd.md)) is the all-states source of truth for design review — but it can only show components that exist as standalone importable functions. Today it holds `ExerciseList` and `Nav`, both already exported from their own files. Everything interactive on the schedule page — `RdCounter`, `DemoPanel`, `LogPane`, `DeskRegPane`, `ExRow`, `BlockDetail`, `SessionDetail`, and the check-in bottom sheet — is defined as inline `function` declarations inside `Schedule.jsx` (current lines: `onKey` 78, `RdCounter` 83, `DemoPanel` 115, `LogPane` 159, `DeskRegPane` 265, `ExRow` 364, `BlockDetail` 500, `SessionDetail` 619, check-in sheet JSX inline at 1235+). Nothing outside that file can import them, so none of it can be gallery-reviewed — which is exactly the gap the user hit trying to compare the gallery against a live screenshot of the schedule page.

This plan also folds in a second, related decision from the same conversation: the gallery is currently one flat growing page. That's fine for 2 components; it will not be fine once this extraction lands ~7 more, each with several states, and it gets worse as #51–#59 add their own pages' components on top. Restructuring after the fact wastes the states already written, so the picker goes in **first**, as prep, before the schedule extraction populates it.

## Acceptance

1. **Gallery picker in place before extraction lands:** `Gallery.jsx` restructured from one flat scrolling page into a picker (left sidebar list, grouped by source page/file) + a main pane that renders only the selected entry's states. `ExerciseList` and `Nav`'s existing states move into the new structure with no loss of coverage.
2. **Extracted, not rewritten:** `RdCounter`, `DemoPanel`, `LogPane`, `DeskRegPane`, `ExRow`, `BlockDetail`, `SessionDetail`, and the check-in sheet become their own files under `src/public/schedule/` (e.g. `RdCounter.jsx`, `LogPane.jsx`, …), each importing what it needs from `wod.js`/its own CSS module slice, exported for both `Schedule.jsx` and the gallery to import. `Schedule.jsx` imports them back — **zero behavior change**: every affordance (check-off, round counter, RM chip + calc, Demo, progression-step expansion, confirm steps, check-in modes) works identically to today.
3. **Each extracted component gets a gallery entry** under the schedule group, covering the state-coverage standard's applicable axes (WORKFLOW.md "Design work"): e.g. `BlockDetail` — WOD-with-athlete / WOD-idle-hint / non-WOD-full-width / Estações; `ExRow` — standard / progression / complex; `RdCounter` — idle/active/done; `LogPane` — form/confirm/success; check-in sheet — athlete-mode/anon-mode/done.
4. **CSS stays put.** `Schedule.module.css` is not split apart in this pass — extracted components keep importing from it (or from small new per-component `.module.css` files only where that's cheap) — splitting the stylesheet is a separate concern, not required for gallery entry.
5. **The dist-formatter / Estações decisions already shipped** (2026-07-05, see History) are unaffected — not in scope to redo.

## Files

- `cone/src/public/schedule/Schedule.jsx` — source of every extraction target (see line numbers above; re-check before starting, they will have shifted again).
- New: `cone/src/public/schedule/RdCounter.jsx`, `DemoPanel.jsx`, `LogPane.jsx`, `DeskRegPane.jsx`, `ExRow.jsx`, `BlockDetail.jsx`, `SessionDetail.jsx`, and a check-in sheet component (name TBD at implementation time, e.g. `CheckinSheet.jsx`).
- `cone/src/public/gallery/Gallery.jsx` + `Gallery.module.css` — restructure into picker + stage; new fixture data per extracted component.
- `cone/src/public/lib/wod.js` — no changes expected; extracted components continue importing `exVolStr`/`fmtIntensity`/`groupProgressionSteps`/etc. from here (already canonical).

## Approach

1. **Picker first.** Change `Gallery.jsx`'s top-level structure: a `GROUPS` array (`{ group: 'Shared', items: [...] } / { group: 'Schedule', items: [...] }`), a left `<nav>` listing groups/items, `useState` for the selected item, main pane renders only that item's `<Case>` blocks. Keep the existing theme `<select>` + width toggle in the top bar (unchanged). Move `ExerciseList`'s and `Nav`'s existing fixtures into this structure verbatim — this step should be visually a no-op (same content, new navigation) and is the checkpoint to verify nothing regressed before touching `Schedule.jsx`.
2. **Extract one component at a time**, simplest first: `RdCounter` → `DemoPanel` → `ExRow` → `BlockDetail` → `SessionDetail` → `LogPane` → `DeskRegPane` → check-in sheet. For each: move the `function` into its own file with an explicit export, import it back into `Schedule.jsx`, run `npm test` + a quick live click-through of that one affordance before moving to the next. Small commits over one big-bang rewrite — a mechanical move is exactly where introducing a subtle prop-drilling bug is easiest to catch early and hardest to catch in a 500-line diff.
3. **Add the gallery entry** for each component immediately after extracting it (not batched at the end) — mock fixtures following the state-coverage standard, using `blkColor`/family colors like `Gallery.jsx` already does for `ExerciseList`.
4. Leave `Schedule.module.css` as the shared stylesheet; extracted files import `styles` from it via a relative path, same as today's inline functions do.

## Verification

- After step 1 (picker): `npm run dev:public` → `/CrossFit-Apps/gallery.html`, confirm `ExerciseList` and `Nav` still show every prior state, now behind the picker, across all 4 themes + both widths, 0 console errors.
- After each extraction in step 2: `npm test` green; live click-through on the local stack of that component's affordance on the real `schedule.html` (e.g. after extracting `LogPane`, actually open the log sheet, fill it, confirm, submit, and DB-check + revert the row — same rigor as #50's verification, not just a visual glance).
- End state: full re-drive of `schedule.html` at 1280×800 + 390×844 across all 4 themes (repeat #50's verification pass) to confirm the extraction as a whole introduced no regression, plus the new gallery entries reviewed for coverage against the state-coverage standard.
- `npm run build:all` succeeds; confirm `gallery.html` still does not appear in `public-dist/` (dev-only property preserved).
- `/code-review` before pushing (M item, mechanical refactor — correctness risk is prop-drilling/behavior drift, not novel logic).

## History (preserved from the original plan)

**2026-07-05 session note:** the *first* version of this plan proposed Path A — extending `ExerciseList` with optional slots (`leading`/`trailing`/inline-RM-editor) so `Schedule.jsx`'s `ExRow` would render through the shared component instead of duplicating its markup. Investigating it found a bigger structural mismatch than expected: `ExerciseList` is a **read-only**, big-font (22–42px) wall-display renderer for TV; `ExRow` is a dense **interactive** control (checkbox/round-counter leading slot, small 11–14px pills, RM chip + inline editor, Demo button). True slot-based adoption meant building a parallel CSS variant inside `ExerciseList` for a *zero visible change* outcome, on a page used live at the gym — not worth the regression risk that session. Shipped instead via **Path B**: killed the duplicated dist formatter (now sourced from canonical `exVolStr`) and settled the Estações decision (TV stays flattened by design, Schedule keeps structured stations — recorded, not drift). The markup-slot idea (Path A) is **not** part of this plan anymore — CLAUDE.md's "Shared rendering" section records it as deliberately deferred, and the 2026-07-10 gallery decision replaced "unify the markup" with "make the existing markup importable" as #17's actual goal.

Model: Sonnet · Size: M
