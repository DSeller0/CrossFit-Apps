# 35 — #26 · Criador decomposition (no behavior change)

> First of three sessions in the Criador overhaul (planning session 2026-07-21).
> Run order: **35 (this)** → [36 text mode](./36-criador-text-mode.md) → [37 design C4](./37-design-c4-criador.md).
> 36 and 37 both rewrite large parts of the same file, so this one lands first — it is
> what makes their diffs reviewable.

## Context

`src/components/tabs/Criador.jsx` is **2063 lines** with **zero tests**, and still
growing (1829 → 1950 → 2049 → 2063 across the last four measurements). It is the
tab the coach uses most and the one with the least safety net.

The next two sessions add a text parser/serializer, a new landing layout, a session
modal, and the C0 primitive adoption — all inside this file. Splitting it first is
not cosmetic: it is the difference between two reviewable diffs and two 1000-line
rewrites of a file nobody has tests for.

**Nothing but the split ships here.** No visual change, no behavior change, no new
props. If a screenshot differs, it is a bug.

## Acceptance

- `src/components/tabs/Criador.jsx` drops to the container only (~350 lines); no
  single new file exceeds ~320 lines.
- `npm test` green with the new `blockModel.test.js` (Criador's first tests ever).
- `npm run build:all` (SPA + public) clean.
- Driven live at 1280×800 and 390×844: create · edit · save · delete · duplicate
  block · drag-reorder block · drag-reorder exercise · drag session across days ·
  template save/apply/update · recurring sessions · box filter · box warnings ·
  TV preview · mobile exercise sheet — all identical to before.
- Zero remaining references to the deleted local `maskMMSS`.

## Files

New folder `src/components/tabs/criador/`:

| File | Moved from `Criador.jsx` |
|---|---|
| `blockModel.js` | `emptyEx`/`emptyMovement`/`emptyStation`/`emptyBlock`/`emptyS` (`:22-39`), `TYPE_CONFIG`/`DEFAULT_TYPE_CFG`/`getTypeCfg` (`:74-97`), `normalizeCardioEx`/`normalizeLegacyCardio` (`:43-48`), `materializeEx`/`materializeBlocks` (`:53-71`), `stationsCapStr` (`:100`), `blockSummary` (`:113`), `loadBadgeStr` (`:348`), `isCardioRegistered`/`getRegistryDefaults` (`:334-346`), `cloneBlocks` (`:1211`) |
| `blockModel.test.js` | **new** |
| `ExerciseCombobox.jsx` | `:137-228` |
| `ExerciseRow.jsx` | `:367-670` (row + mobile bottom sheet) |
| `StationEditor.jsx` | `:673-803` |
| `BlockEditor.jsx` | `:806-1105` |
| `TypePicker.jsx` | `CriadorTypePicker` `:231-331` |
| `WeekGrid.jsx` | week grid + collapsed day strip + box selector `:1859-2036` |
| `BoxWarnings.jsx` | `:1894-1933` |
| `TemplatesModal.jsx` | `:1488-1540` |
| `RecurringModal.jsx` | `:1542-1600` |
| `Criador.jsx` (stays) | container: state, `saveS`/`del`/`confirmDelete`, preload effect, block CRUD, confirm overlays, undo toast, athlete picker, TV preview pane |

`blockModel.js` is **pure** — no React, no Supabase client. `isCardioRegistered` and
`getRegistryDefaults` call `loadRegistry()` (localStorage via `src/utils/storage.js`),
which is fine there but means the tests inject a registry rather than relying on it;
keep those two thin and pass the registry in where the call sites already can.

## Approach

1. Create `criador/blockModel.js` first and re-point `Criador.jsx` at it. Verify
   build + live before moving any JSX.
2. Move the leaf components in dependency order: `ExerciseCombobox` → `ExerciseRow`
   → `StationEditor` → `TypePicker` → `BlockEditor`. `ExerciseRow` and `BlockEditor`
   keep their exact prop signatures — this is a move, not a redesign.
3. Move `WeekGrid` / `BoxWarnings` / `TemplatesModal` / `RecurringModal`. These read a
   lot of container state; pass it as props rather than lifting anything into context.
   Prop drilling is the right call at this size and keeps the diff mechanical.
4. Mechanical fold-ins while moving:
   - **Delete the local `maskMMSS` (`:131-134`) and import the canonical one** from
     `src/public/lib/wod.js:148`. They are **not** equivalent: the local copy fills
     seconds from the **left** (`'123'` → `'12:3'`), canonical fills from the **right**
     (`'123'` → `'1:23'`, which is what the coach expects and what
     `MaskedTimeInput` uses). Same fork class as #83.
   - Drop the `WEEK_DAYS = DAY_PT` alias (`:1421`) — use `DAY_PT` directly (#83
     already collapsed the other two forks of this).
   - Drop the unused `bcfg` binding (`:2008`), part of the #32 lint debt.
5. **Do not** touch styling, tokens, radius, a11y, or the `.b`/`.bp` classes here —
   that is 37's slice. Mixing them makes this diff unreviewable.

## Reuse (already canonical — do not reimplement)

- `uid`/`toISO`/`todayISO`/`getTargets` — `src/utils/storage.js` (re-exported from `lib/`)
- `maskMMSS`, `blkMeta`, `WOD_TYPES`, `isWodBlock` — `src/public/lib/wod.js`
- `DAY_PT` — `src/public/lib/week.js`
- `sessName` — `src/public/lib/sessions.js`
- `sessionBoxIds` — `src/public/lib/boxScope.js`
- `resolveExercise` — `src/public/lib/registry.js`

## Tests — `criador/blockModel.test.js`

Criador has never had a test. Cover the pure helpers, prioritising the two **#23**
names explicitly:

- `materializeEx` — fills `sets`/`reps` from registry defaults only when empty;
  `dist` and `reps` are mutually exclusive; `intensityDefaultDismissed` suppresses the
  intensity default and is stripped from the saved shape; a complex exercise never
  takes registry defaults.
- `normalizeCardioEx` / `normalizeLegacyCardio` — legacy `{mode:'cardio', cardioVal,
  cardioUnit}` → `dist`/`distUnit` with `intensity: null`; non-cardio untouched;
  the Estações branch walks `stations[].exercises[]`.
- `blockSummary` — Estações (groups/rests/repeat/cap) vs standard (duration/rounds/
  movement count); `benchmarkRef` short-circuits.
- `stationsCapStr` — `mm:ss` and bare-minute station durations, `stationRepeat`,
  `restBetweenCycles`; returns `null` when nothing is set.
- `loadBadgeStr` — all four intensity modes plus the `↗` stepless-progression case.

## Verification

1. `npm test` — green, new file included.
2. `npm run build:all` — SPA + public, clean.
3. `npm run dev` and walk the full acceptance list above at 1280×800 and 390×844.
   The mobile exercise bottom sheet and the drag interactions are the two things a
   move most easily breaks — drive both.
4. `git diff --stat` should read as pure movement: line counts move between files,
   the total barely changes (minus the three deletions in step 4).
5. Update `CLAUDE.md`'s Criador reference to name the new folder.

Model: Sonnet · Size: M
