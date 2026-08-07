# 74 — #155 · iOS Safari zooms the page when logging a result

*Planned 2026-08-07 alongside plans/72 and plans/73. **Not executed in that session** — its own
session. **Sonnet · S.** Independent of 72 and 73 — no gate either way.*

## Context

User-reported from an iPhone, 2026-08-06: logging a result **zooms the screen**, and the confirm modal
is then off-centre. Not yet reproduced on-device, but the mechanism has an exact match in the code.

**iOS Safari auto-zooms a focused form control whose `font-size` is under 16px**, and
`user-scalable=no` does **not** suppress it (the same rule #152 already recorded, from the other
direction). Measured 2026-08-07:

- `ScoreFields.module.css:133` — `.input` is **13px**. This is *the* score-entry field, shared by
  `results.html`'s `LogForm`, `schedule.html`'s `LogPane`/`DeskRegPane`, the SPA `RegistroView` and
  `TvController`'s `ClassPanel` (the file's own header comment lists them). Six render sites in
  `ScoreFields.jsx` — Rounds (`:412`), Reps (`:425`), the two checkpoint number fields (`:195`,
  `:229`), the checkpoint `<select>` (`:210`) and the #116 adaptation-note text field (`:340`).
- Its sibling **`MaskedTimeInput.module.css:14` is already `16px`** and zoom-safe — the same fix
  CLAUDE.md documents for the SPA's `ui/Input` (*"16px value = sem zoom no iOS"*). The two render **in
  the same `.numRow`** (`ScoreFields.jsx:408`), so `.input` is the one score field that never got it.

**User decision, taken 2026-08-07 when this was planned: ship the font-size fix, then re-test on the
iPhone.** The `ConfirmReview` off-centre symptom is a *separate* known iOS quirk — a `position:fixed`
overlay centres against the **layout** viewport (`ConfirmReview.module.css:2-11`, `inset:0` + flex)
while a zoomed iOS Safari paints into a scaled, offset **visual** viewport. Removing the zoom removes
the trigger. **Do not write `visualViewport` code in this session** for a symptom that may already be
gone; if it survives, it earns its own row.

### 🔴 A second finding, measured while planning — the same defect, inverted

`schedule.html` gives 16px to the **desktop** and 13px to the **phone**, which is exactly backwards
for the platform rule this row is about:

| Rule | Base (phone) | `@media(min-width:768px)` |
|---|---|---|
| `Schedule.module.css:209` `.lpSelect` — LogPane's athlete picker (`LogPane.jsx:133`) | **13px** | 16px (`:222`) |
| `Schedule.module.css:160` `.rmInput` — the RM calculator (`ExRow.jsx:159,308`) | **13px** | 16px (`:166`) |

Both are on the reported flow, both are the same one-line shape, and the inversion is a defect on its
face — **fix them here** (see step 2). *(`.lpInput` in that same media query is dead — its consumers
moved to `ScoreFields` in #115. Delete it while there.)*

Four more sub-16px focusable controls exist and are **deliberately out of scope** — they are
navigation/search, not result entry, and changing them is a type-scale decision this row shouldn't
make blind: `Results.module.css:24` `.athleteSel` (13), `:101` `.athSearchInput` (13),
`Schedule.module.css:49` `.athleteSel` (12→14 at ≥768, also inverted), `:360` `.ckInput` (14).
**File them as a new row** rather than fixing or forgetting them.

## Scope

**Changed:** `src/public/shared/ScoreFields.module.css` · `src/public/schedule/Schedule.module.css`.
**Regenerated:** the design cards touching `ScoreFields` via `npm run design:cards`.
**New backlog row:** the four out-of-scope controls above.

## Approach

**1 — `.input` 13px → 16px.** One declaration (`ScoreFields.module.css:133`).

**2 — Un-invert the two Schedule rules.** Move `16px` to the base rule for `.lpSelect` (`:209`) and
`.rmInput` (`:160`) and drop them from the `≥768px` overrides (`:222`, `:166`), keeping whatever the
desktop needs for the *other* selectors in those media queries. Delete the dead `.lpInput` from `:222`.

**3 — Check the blast radius, because a 3px type bump moves rows.** `.input` carries `padding:6px 10px`
against `MaskedTimeInput`'s `9px 11px`, so the two already differ in height; raising the font narrows
that gap rather than widening it. Verify — do not assume:
- `.inputSm` (`:143`, `width:100px`) still fits a 3-digit value without clipping;
- the `.numRow` baseline/height relationship beside `.timeField` at 390px;
- the checkpoint `<select>` (`ScoreFields.jsx:210`) and the note field (`:340`), both full-width;
- `ClassPanel`'s `size="sm"` path is **not** affected — plans/66 deleted the dead `.sm` `ScoreInputs`
  rules, so `sm` reaches `ScaleRow` only and no `.input` renders at `sm` anywhere.

**4 — File the follow-up row** for the four navigation/search controls, with the lines above, so the
next session doesn't re-derive the audit.

## Acceptance

- Every focusable control rendered by `ScoreFields` computes to `font-size: 16px`.
- `.lpSelect` and `.rmInput` are 16px on a phone; no rule in the repo gives a form control ≥16px
  *only* above 768px.
- No visual regression at 390px on `results.html` and `schedule.html`: nothing clips, the `.numRow`
  still reads as one row, and the note field still fits its placeholder.
- The four out-of-scope controls are captured as a new `BACKLOG.md` row with their file:line.
- **On-device:** the user opens `results.html` on the iPhone, focuses a score field, and reports
  whether (a) the page still zooms and (b) the confirm modal is still off-centre. **(b) is the open
  question this session deliberately does not answer** — if it survives, file it.

## Verification

1. **Gallery** (`npm run dev:public` → `gallery.html`, the Shared group's `ScoreFields`/`ScoreInputs`
   cases) at **390 and 1280 × all 4 themes** — this is where every state is reachable at once,
   including the checkpoint body and the notes list.
   ⚠️ Clear any `cone-v*` service worker first (CLAUDE.md's standing warning).
2. **Real `results.html` at 390** against the local stack — log a result end to end: score fields →
   `ConfirmReview` → success. Then the same on **`schedule.html`**'s `LogPane`, which is where
   `.lpSelect` lives.
3. **Desktop 1280** — confirm step 2's un-inversion didn't shrink anything that was intentionally
   larger on desktop.
4. `npm run design:cards` → commit real diffs. ✅ #114 made the cards idempotent, so an unrelated card
   diff is a #114 regression to report, not noise to revert.
5. **On-device, by the user** — the acceptance line above. This is the only way to verify the actual
   reported symptom; say so plainly in the hand-off rather than claiming the row closed.

`npm test` · `npm run lint` (`--max-warnings 0`) · `npm run format:check` · `npm run build:all`.

## Docs (part of Done)

`BACKLOG.md` — row → Done **only after the on-device re-test**; until then it is shipped-pending-
verification, and the plan should say which. Add the new row for the four navigation controls. This
file gets its `> ✅ Done: <commit> · <date>` marker. Add the 16px floor to CLAUDE.md's design-system
section as a **rule** (*"any focusable form control on a public page is ≥16px — iOS Safari auto-zooms
below that and `user-scalable=no` does not suppress it"*), since this is now the third time it has been
rediscovered (`ui/Input`, `MaskedTimeInput`, here).

Model: **Sonnet** · Size: **S**
