# 94 — #223 · A verify gate that is checkable + ▶ Now grammar

## Context

The 2026-09-20 review's blocker (#207) is a process failure, not a coding one: **#113 shipped a fix
that does not work** — `Publicador.jsx:480` sends a *session* id to `schedule.html?id=`, which
`Schedule.jsx:155` reads as an *athlete* id — and it was marked Done, closed on the board, and never
once opened in a browser. Nothing downstream could tell, because the ritual's verification step was
prose advice (`/verify`, a skill that no longer exists) rather than an artifact anything reads.

The same silence has a second face. WORKFLOW.md:58-61 already records the board running five weeks
on a format its own drift detector could not parse, printing "Zero drift found" the whole time. The
`▶ Now` block — the board's position tracker — was never checked against the columns underneath it
at all.

Both gaps were confirmed by comparing Cone's process against [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core),
whose phase loop makes each of them an explicit artifact (`VERIFICATION.md`, `must_haves`,
`STATE.md`). GSD is not being adopted — Cone already has working equivalents of most of it, and its
generated codebase maps would displace a hand-earned `CLAUDE.md`. These two mechanisms are worth
having on their own terms, built natively, with no dependency. The trial of GSD itself is #225.

## Acceptance

- A plan from `plans/94` on declares `## Must-haves` and cannot be closed out silently without them.
- `▶ Now`'s position claims are parsed and cross-checked against the 🟢/🔵 columns.
- Both checks are **advisory**, printed in the existing audit table — not a CI gate. The script's own
  stated posture holds: a false negative is fine, a false positive would train the next session to
  ignore the table.
- No second state file. `▶ Now` and the `> ✅ Done:` marker already hold this information; adding a
  `STATE.md` beside them would be the duplication this row exists to prevent.

## Must-haves

Each of these was driven against the real board and a throwaway `plans/94` fixture, not reasoned about.

- `must-haves-unverified` fires on a `plans/94+` file that carries a Done marker and no
  `## Must-haves` section.                                   [audit output, fixture]
- It fires on a plan that declares must-haves whose Done marker never reports driving them.
- It stays **silent** when the marker carries evidence, and silent on a live plan (no Done marker) —
  an unshipped plan has not reached the gate yet.
- `now-section-drift` fires when `▶ Now`'s `Ready:` names a `#N` the Ready column does not hold, and
  when `none` and a `#N` appear in the same claim bullet (the board's own pre-#223 wording).
- Against the real board, `node scripts/audit-backlog-markers.mjs` prints **zero drift**.
- `npm run format:check` passes — `scripts/**/*.mjs` is inside the gate.

## Files

- `scripts/audit-backlog-markers.mjs` — `MUST_HAVES_FROM`, must-haves capture in `parsePlans`,
  `sectionName`/`parseNow`, the two finding loops, `SHAPES`.
- `docs/WORKFLOW.md` — ritual steps 3-6 (step 4 is new), the `## Must-haves` plan section and its
  examples, the `▶ Now grammar` block, plan lifecycle, and the stale `/verify` → `/run` fix.
- `docs/BACKLOG.md` — `▶ Now` rewritten into the new grammar; rows #223-#225 filed.

## Approach

1. Extend the audit script. `boardSectionRanges` gains the section title as a third element so a row
   can name its column — `rowLeadMarker` deliberately folds 🟢 and 🔵 into one class and must keep
   doing so, so the distinction lives in `sectionName` instead.
2. `MUST_HAVES_FROM = 94`, because 93 was the highest plan when the gate shipped. Backfilling the 82
   archived plans is explicitly out of scope.
3. Rewrite `▶ Now` into the claim grammar; move its history into `Last refill:`.
4. Prove both shapes fire with throwaway fixtures, then delete them.

## Verification

Drive the six must-haves above. Then `node scripts/audit-backlog-markers.mjs` (zero drift),
`npm run format:check`, `npm run lint`, `npm test`.

Model: Sonnet · Size: S
