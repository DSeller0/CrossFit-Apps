# 39 — #25 · Publicador decomposition (no behavior change)

> Planned 2026-07-26 from the [full review pass](../reviews/2026-07-26.md).
> Run order: **39 (this)** → [40 index.css triage](./40-index-css-triage.md) → [41 gallery decomposition](./41-gallery-decomposition.md).
> The Serviços (#56 / C2) and Agenda (#59 / C5) **design passes are deliberately held**
> until these three land. This one is the hard prerequisite for the Agenda pass.

## Context

`src/components/tabs/Publicador.jsx` is **2125 lines** — the largest file in the repo — with
**zero tests**, and it is built with `React.createElement`, not JSX.

The coach wants a design pass on **Agenda**. Agenda is not a file: it is `AgendaView` at
`:1077-1477` (401 lines) plus the `EventFormInner`/`ReportModal` it depends on at `:640-1076`
(437 lines) — **838 lines buried inside 2125**. Design-passing it in place means editing a
third of a file nobody has tests for, then decomposing afterwards and reviewing the same
markup twice.

**Nothing but the split ships here.** No visual change, no behavior change, no new props, no
JSX conversion, no token work. If a screenshot differs, it is a bug.

## Acceptance

- `Publicador.jsx` drops to the `SchedulePublisher` shell (~600 lines); no new file exceeds
  ~440 lines.
- `AgendaView` lives in its own file, ready for #59 to own.
- `npm test` green (**530/530** baseline).
- `npm run build:all` clean, **and the chunk split still holds** — `jspdf` (399 kB),
  `html2canvas` (199 kB) and `index.es` (151 kB) remain separate chunks fetched only with
  Publicador. Agenda must not drag them into the main bundle.
- Driven live: every export view (daily · weekly · weekly-calendar · calendar · both mobile
  variants · mobile-weekly), the event form, the report modal, and the Agenda month grid —
  all identical to before, zero console errors.
- `git diff --stat` reads as pure movement: lines move between files, the total barely changes.

## Files

New folder `src/components/tabs/publicador/`:

| File | Moved from `Publicador.jsx` | ~lines |
|---|---|---|
| `exportHelpers.js` | `buildProgressionLines` `:18`, `exLine` `:39`, `complexLine` `:43`, `getWeeksOfMonth` `:51`, `buildMobileSession` `:55`, `useSpeech` `:71`, plus the `SpeechRecognition`/`pixClean` consts `:15-16` | ~95 |
| `MicButton.jsx` | `:96-107` | ~15 |
| `exportViews.jsx` | `DailyExportView` `:109`, `WeeklyExportView` `:232`, `WeeklyCalendarExportView` `:276`, `CalendarExportView` `:351` | ~300 |
| `mobileExportViews.jsx` | `MobileBlockA` `:407`, `MobileEaglesExportView` `:459`, `MobileBlockB` `:486`, `MobileMegaManExportView` `:537`, `MobileWeeklySingleDay` `:564`, `MobileWeeklyExportView` `:608` | ~235 |
| `events.jsx` | `EventFormInner` `:640`, `ReportModal` `:782` | ~437 |
| `AgendaView.jsx` | `AgendaView` `:1077-1477` — **the file #59's Agenda pass will own** | ~401 |
| `Publicador.jsx` (stays) | `SchedulePublisher` `:1478-2123` + the two export statements | ~600 |

## Approach

1. **`exportHelpers.js` first** — pure functions plus one hook. Re-point `Publicador.jsx` at
   it, build, verify live. This proves the import plumbing before any markup moves.
2. Move the leaf components in dependency order: `MicButton` → `exportViews` →
   `mobileExportViews` → `events` → `AgendaView`. Keep every prop signature **exactly** as it
   is; this is a move, not a redesign. These components read a lot of shell state — pass it as
   props, don't lift anything into context. Prop drilling is correct at this size and keeps
   the diff mechanical.
3. **Keep `React.createElement`. Do not convert to JSX.** The entire value of a pure move is
   that the diff is reviewable *as* a move; converting every line destroys that. Conversion
   belongs to #59, which rewrites the markup anyway.
   *(Recorded so it isn't second-guessed: the `createElement` form is exactly why every prior
   JSX-only a11y census silently missed this file — a real cost, but not one to pay here.)*
4. **Fix the `App.jsx` lazy boundary.** `App.jsx:28` currently reaches into Publicador for a
   named export:
   ```js
   const AgendaView = lazy(() => import('./components/tabs/Publicador').then(m => ({ default: m.AgendaView })))
   ```
   Point it at `./components/tabs/publicador/AgendaView` instead. That is cleaner *and* lets
   the Agenda chunk split from the Publicador chunk — opening Agenda stops pulling in the
   whole export/PDF graph. Keep `export { AgendaView }` in `Publicador.jsx` as a re-export
   only if something else still needs it (check first; likely nothing does).
5. **Do not** touch styling, tokens, radius, a11y, or the `.b`/`.tb-btn` classes — that is
   #59's slice, and `Publicador.jsx`'s 305 hex lines are overwhelmingly **jsPDF-exempt**
   (PDF has no CSS vars). Mixing them in makes this diff unreviewable.

## Explicit non-goals

- **Do not fold `buildProgressionLines` into `groupProgressionSteps`.** The file already
  imports the canonical `groupProgressionSteps` (`:10`) *and* keeps this local fork — but they
  are **not equivalent**: the fork keys on `reps`+`unit`, canonical keys on `reps` alone. That
  is a semantics change hiding inside a move. Leave it, add a pointer comment, and let **#45**
  own it.
- No tests are added here. Publicador's first tests belong with #59, when the extracted
  components have stable boundaries worth pinning.

## Reuse (already canonical — do not reimplement)

- `exVolStr`, `fmtIntensity`, `groupProgressionSteps`, `blkMeta` — `src/public/lib/wod.js`
- `MONTH_PT`, `DAY_PT`, `DAY_PT_TITLE`, `monthGridCells` — `src/public/lib/week.js`
- `sessName` — `src/public/lib/sessions.js`
- `matchesAthlete`, `getTargets`, `toISO` — `src/utils/storage.js`
- `buildPixPayload` — `src/utils/pix.js`

## Verification

1. `npm test` — 530/530 green.
2. `npm run build:all` — clean, and **check the chunk list**: `jspdf.es.min`, `html2canvas`
   and `index.es` still emit as their own chunks and are not in the main entry.
3. `npm run dev`, then walk **every** surface at 1280×800 and 390×844:
   - Publicador: all four desktop export views + both mobile export variants + mobile-weekly.
     These render to PDF/canvas, so a broken import shows as a blank export, not an error.
   - Agenda: month grid, event create/edit/delete, the report modal, the mic button.
4. `git diff --stat` should read as pure movement.
5. Update `CLAUDE.md` to name the new folder (it currently describes Publicador as one file).
6. ⚠️ If a change doesn't appear: unregister the service worker and clear the `cone-v*`
   caches first — `sw.js`'s `/CrossFit-Apps/` scope covers the SPA dev server on localhost and
   serves precached production assets with **no console error**.

Model: Sonnet · Size: M
