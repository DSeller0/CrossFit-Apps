# 17 — schedule.html log-sheet athlete select: empty options + invisible-athlete submit (#49)

## Context
Found live in the 2026-07-09 benchmark walk (see the report's schedule.html section). The "Registrar Resultado" sheet's Atleta `<select>` options come only from `sess.mainTraining` (`Schedule.jsx:874-875` in `doOpenLog`: `assignedAth = athletes.filter(a => targets.includes(a.name))`). Group sessions have empty `mainTraining`, so:
1. **No page filter set:** the select contains only "— Selecione —" — a dead end; the athlete cannot pick themselves.
2. **Page filter set (e.g. Bruna):** `logAthId` state holds her id (passed via `onLog={() => doOpenLog(sess, dk, athletes, selAth)}`, `Schedule.jsx:1026`), but her `<option>` doesn't exist, so the select **displays "— Selecione —" while submitting as Bruna** — confirmed live (submit succeeded, DB row written for Bruna while the UI showed the placeholder).

`lockedAthName` (`:947`) only engages for the TV-QR `lockedId` flow — the normal path always renders the (broken) select.

## Acceptance
- Group session (empty `mainTraining`), no filter: sheet lists all athletes; picking one and submitting writes that athlete's row.
- Group session, filter set: the sheet select **shows** the filter athlete as selected (option present), submit unchanged.
- Assigned session (`mainTraining` non-empty): list still restricted to assigned athletes; if the page-filter athlete isn't assigned, the select must not silently submit them — value falls back to "" and submit shows the existing "Selecione seu nome" error.
- `npm test` green; live-verify both flows on the local stack (drive the real sheet, confirm rows in Studio/psql, revert test rows).

## Files
- `src/public/schedule/Schedule.jsx` — `doOpenLog` (:873) and/or `LogPane` (:154).

## Approach
In `doOpenLog`: `const candidates = assignedAth.length ? assignedAth : (aths || athletes)` and pass as `pane.assignedAth`. Then guard the invisible-submit case: after computing `resolvedAthId`, if it's not in `candidates`, reset it to `''` (surfaces the select honestly instead of submitting a hidden athlete). Two-line change; no CSS.

## Verification
Local stack: group session → sheet without filter (all athletes listed), with filter (athlete visibly selected); assigned session (create a temp `mainTraining` session) → restricted list + non-assigned filter athlete blocked with the error message. Revert temp data.

Model: Sonnet · Size: S
