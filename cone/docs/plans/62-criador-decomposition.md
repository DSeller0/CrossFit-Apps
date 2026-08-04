# 62 — #74-C · `Criador.jsx` decomposition (pure move)

> Planned + executed 2026-08-04 in one session (M). Tier 2's last row.

## Context

`Criador.jsx` is Tier 2's last open row and the last file on the #74 over-800 watch. plans/35 took it
2063 → 840; #58 (plans/37) and #92/#61 grew it back. **It is 1198 raw lines today** — the board's "840"
predates plans/58 and plans/61, both of which have now shipped, which is what unblocked this row.

Its bulk is container/orchestration logic, not views — which is why #74-B (plans/44) deferred it out of
the Resultados split rather than folding it in, and why the seam analysis was done separately on
2026-07-27 and **recorded by name rather than by line** so it would survive the reformat (plans/49) and
the two Criador bug-fix sessions that landed on top of it. It did: every seam it names is still in the
file, intact. This plan executes that recorded split and does not re-derive it.

**Intended outcome:** the same page, byte-for-byte in behaviour, with the orchestration in four named
hooks and the four biggest JSX slabs in four components — so the next Criador session (design or bug)
opens a ~350-line container instead of a 1198-line one.

### Baseline, measured 2026-08-04 before touching anything

| | |
|---|---|
| `Criador.jsx` | **1198 raw lines** |
| `npm test` | **698 passed / 19 files** |
| `npm run lint` | **clean** at `--max-warnings 0` |

## The split

All four hooks are **co-located in `criador/`**, not `src/hooks/` — the precedent is
`publicador/exportHelpers.js`'s `useSpeech` (a tab-specific hook lives with its tab); `src/hooks/` holds
the cross-surface TV/timer hooks.

### Hooks

| New file | Moves (pre-split lines) | API |
|---|---|---|
| `criador/useBoxWarnings.js` | `:91-94`, `:128-141` | `useBoxWarnings()` → `{ boxWarnings, addWarning, patchWarning, removeWarning }`. Already self-contained; `addWarning` keeps returning the new id (mobile's "+ Adicionar" opens the sheet onto it). |
| `criador/useSessionEditor.js` | `:55-62`, `:79-81`, `:95`, `:100-102`(partial), `:105`, `:169-259`, `:350-399` | `useSessionEditor({ setSessions, defaultBoxIds, onOpened, onSaved })` → state `form/blocks/editing/editorOpen/isDirty/changedBlockFields/activeTemplateId/metaModal/pendingDate/pendingClose/sessionMode` + `startEdit · openNewSession · closeEditor · requestClose · cancelClose · commitMeta · keepMetaDate · confirmMetaDate · saveS · markDirty · trackBlockChange`. |
| `criador/useBlockList.js` | `:63-64`, `:442-526` | `useBlockList({ blocks, setBlocks, markDirty, trackBlockChange, fireUndo })` → `collapsedBlocks · showBlockPicker · insertAtIdx · dragBlkIdxRef · dragOverBlkIdx` + `addBlock · copyBlock · updBlock · delBlock · reorderBlocks`. |
| `criador/useTemplates.js` | `:65-76`, `:102`, `:274-298`, `:313-347`, `:428-439` | `useTemplates({ editor, setSessions, defaultBoxIds })` → the template list, `templateFlash`, `showTemplateModal`, `showUpdateTemplateModal`, the whole recurring generator (`recurDays/Start/End/Done`, `recurPreviewDates`, `applyRecurring`) + `saveAsTemplate · applyTemplate · deleteTemplate · updateTemplate`. |

Three couplings the seam analysis implies and the build must honour:

- **`scrollToEditor` is injected, never moved** — `useSessionEditor` takes `onOpened`, which the container
  supplies as `() => setTimeout(scrollToEditor, 60)` (pre-split `:187` and `:258`).
- **`saveS` writes the session; the container reveals it.** The hook keeps the `setSessions` write and the
  target-week arithmetic and calls `onSaved({ savedId, weekOffset })`; the container does
  `setWeekOffset` + `setHighlightedSessionId` + the two `setTimeout`s (`:391-397`), because those are
  week-view state. `closeEditor()` still runs last, same order, same handler, so batching is unchanged.
- **`openNewSession` keeps its 1-arg signature** (`WeekGrid` calls `onNewSession(dateKey)`), so the box
  default arrives as the hook's `defaultBoxIds` — computed in the container from `selBox`, identical value
  at call time.

### Components

| New file | Moves | Notes |
|---|---|---|
| `criador/SessionEditor.jsx` | `:821-1147` (~325 lines) | The editor `Card`: both header layouts, blocks bar + mode segment, text pane, block list + insert buttons, add-block, save row. **One file** (user's call, 2026-08-04) — still under `BlockEditor.jsx` (563) and `ExerciseRow.jsx` (532). The `<div ref={editorRef}>` wrapper **stays in the container**. |
| `criador/CriadorConfirms.jsx` | `:558-655` | The 4 `ConfirmReview` dialogs (move-date · delete · discard-on-close · update-template), presentational — the two `pendingDate` handlers become `keepMetaDate`/`confirmMetaDate` in `useSessionEditor`. |
| `criador/CriadorToolbar.jsx` | `:757-780` | Explicit props: `onImport · onTemplates · onGoToPublish · onNewSession`. |
| `criador/TvPreviewPane.jsx` | `:111-119`, `:300-310`, `:1150-1173` | Owns `previewPaneRef`, `prevScale`, the `ResizeObserver` effect, the three `tvPreview*` memos and `gymName`. Props: `form`, `blocks`. **Keep it standalone and portable** — `Publicador.jsx:121,258` already carries this shape by hand and is the eventual consumer. |

**Prop style:** `SessionEditor` and `CriadorConfirms` receive the cohesive hook objects (`editor`,
`blockList`, `templates`) plus a handful of explicit props. These are container-private view slices, not
gallery components — grouping keeps the plumbing honest and the diff a genuine move rather than a
30-prop re-write. `CriadorToolbar` and `TvPreviewPane` get fully explicit props (they are small and
genuinely reusable).

### What stays in the container

Week state (`weekOffset · weekGridCollapsed · selBox · gridMode · showImport` + `weekDates` /
`boxFilter` / `weekLabel`) · `registry` / `boxLocs` / `athletes` · the undo toast + `fireUndo` ·
`pickDay` · `del` / `pendingDelete` / `confirmDelete` · `highlightedSessionId` · `tvPreviewOpen` ·
`editorDateStr` / `editorBoxes` (both `SessionEditor` and `CriadorConfirms` render them) · the preload
effect · the five modals' JSX · `WeekGrid` · and the composition order.

**`pickDay` stays in the container deliberately** — it composes the week's `boxFilter` with the editor's
`startEdit`/`openNewSession`, which is exactly a container's job. plans/58's comment forbidding a
re-unification of the three day-click paths moves with it, verbatim.

**Expected container size: ~330–360 lines.** The seam analysis said 200–250, measured against the
840-line file; scaled to today's 1198 that is ~357. If it lands above ~400, the next cut is the five
modals (`:672-752`) into a `CriadorModals.jsx` — not planned, only if needed.

## 🔴 What must NOT move

1. **`scrollToEditor` (`:153-166`) stays in the container.** It measures `--spa-sticky-top` plus the
   pinned block's *live* height and needs both `editorRef` and `weekGridRef`. Not a CSS
   `scroll-margin` — the pinned height isn't constant (week bar + box tabs, plus the strip when
   collapsed). Its comment block moves with it, unedited.
2. **The week-grid/editor composition order is frozen.** `WeekGrid` renders directly inside
   `cr.splitMain`, `SessionEditor` immediately after inside `<div ref={editorRef}>`. CLAUDE.md records
   this ordering as the site of **two rejected redesigns** (auto-collapse on open; forcing the strip
   whenever `editorOpen`) and **two live-caught sticky/z-order bugs**. A decomposition that "tidies" it
   re-opens both.
3. **Do not wrap `<WeekGrid>` in a new element.** It returns a **fragment** on purpose — `position: sticky`
   is clipped by its parent's box, and the div it used to own is what made `cr.stickyHead` scroll away.
4. **`(!editorOpen || !isMobile)` on the grid and `!editorOpen` on the toolbar** are load-bearing gates,
   not layout noise. Move the conditions, don't restate them.

## Other traps, all live in this repo

- **Unused `eslint-disable` directives fail the build.** ESLint 9 flat config reports them as warnings by
  default and `lint` runs `--max-warnings 0`. The preload effect's `react-hooks/set-state-in-effect`
  disable (`:267`) probably goes unused once `openNewSession` crosses a module boundary — delete it
  **only if lint reports it unused**; the `exhaustive-deps` one on `:271` stays (the deps array is still
  deliberately `[preload]`, and its comment explains why).
- **Ref names keep their `*Ref` suffix through the hook boundary** — `dragBlkIdxRef` is returned and
  passed down as a prop; unsuffixed, every `.current =` in `BlockEditor`'s drag handlers trips
  `react-hooks/immutability`. Same for `previewPaneRef`, `undoTimerRef`, `editorRef`, `weekGridRef`.
- **`react-refresh/only-export-components`:** one component export per new `.jsx`; hooks in `.js` with no
  component export. Nothing gets added to `eslint.config.js`'s five-file allowlist.
- **Don't reset state the current code doesn't reset.** `closeEditor` leaves `collapsedBlocks`,
  `insertAtIdx`, `showBlockPicker` and `dragOverBlkIdx` alone. Preserve that exactly.
- **`onApply` from `SessionTextPane` must not be re-mapped** — plans/61·B: the locked blocks in `next` are
  the *original objects*; `normalizeLegacyCardio` already ran on the parsed half inside the pane. The
  comment at `:1064-1066` moves into `SessionEditor.jsx` with the handler.
- **Gallery/client-free rule holds:** `SessionTextPane` and `WeekImportModal` render in the client-free
  gallery. `SessionEditor.jsx` is *not* gallery-rendered, so it keeps `typePicker={CriadorTypePicker}` as
  the injected prop — do not move that import into the pane.
- `updBlock`'s changed-field list (`label · type · duration · rounds · notes · zone · ladderMode · goal`)
  moves verbatim.
- **Benign, and stated in the commit message rather than hidden:** `loadSettings()` (for `gymName`) and
  the three `tvPreview*` memos ran on **every** container render; inside `TvPreviewPane` they run only
  while the pane is mounted. Same values, fewer calls. `loadAthletes()` stays per-render in the
  container, unchanged.
- Also collapse the no-op `CriadorTab` → `TrainingCreator` wrapper (`:1180-1198`) into one exported
  component, matching `Resultados.jsx`'s post-plans/44 shell shape.

## Commit 2 — the `getWeek` fork (user's call, 2026-08-04: separate commit, same session)

`getSundayWeek` (`:529-538`) is a semantically identical fork of canonical `getWeek(off)`
(`public/lib/week.js:80-89`) — same Sunday anchor, same 7 `Date`s, same in-place `setDate` walk. Same
duplication class #83/#84 closed.

Land the decomposition first as a pure move, then a second commit: delete `getSundayWeek`, import
`getWeek` from `public/lib/week.js` (the container already imports `DAY_PT` from that module), call
`getWeek(weekOffset)`. Two lines net. Reviewable and revertable on its own — plans/44's
`getPerformanceStr` precedent.

## Acceptance

- `Criador.jsx` is the container only (~330–360 raw lines); no new file over ~330.
- **Zero behaviour change** in commit 1 — the diff is moves, imports and prop plumbing.
- `npm test` **698 passing** · `npm run lint` clean at `--max-warnings 0` · `npm run build:all` clean ·
  `npm run format:check` clean.
- The four 🔴 items above are verifiably intact (see the sticky check in Verification).
- BACKLOG #74-C marked done, Tier-2 line and the **#74 watch** line updated; Done marker on this plan;
  CLAUDE.md's Criador section names the new layout; committed and pushed.

## Verification

Gates first: `npm test` → 698 · `npm run lint` → clean · `npm run build:all` → clean · `npm run format`
before committing.

**Then drive it live** (`npm run dev` against the local stack — `supabase start` first).
⚠️ **Check for a stale service worker before trusting anything you see** — `sw.js` scopes over the SPA dev
server and serves precached prod assets with *no console error*; a `cone-v7` worker was in fact found on
this origin during the 2026-08-03 review.

At **1280**:
1. **Create** — "+ Nova sessão" → meta modal → confirm → editor opens, add two blocks, Salvar. The week
   scrolls to the saved session and it highlights for 2s (`onSaved`).
2. **Edit** — reopen it, change a block, ✕ → the discard confirm appears (`isDirty`); Voltar keeps it.
3. **Move** — gear → change the date → the "Mover sessão de dia" confirm appears; "Manter o dia" reverts
   *only* the date and keeps the other meta edits.
4. **Delete** — trash a session → confirm → the undo toast restores it (`fireUndo` still reaches
   `confirmDelete` and `delBlock` from the container).
5. 🔴 **Sticky/scroll, the regression that matters** — with the editor open, scroll down: the week bar +
   box tabs stay pinned and Avisos scrolls under them. Toggle the week **collapsed**: the day strip renders
   in the same slot (below Avisos), and clicking a day opens that day's session and scrolls it just below
   the pinned chrome — **not** to the top of the page. Opening a session from an unscrolled page scrolls
   **nothing at all**.
6. **Text mode** — `¶ Texto` on a session with a locked Benchmark block: the block renders read-only with
   its `block-locked` warning, Aplicar comes back with the same object; `▤ Detalhado` round-trips.
7. **TV preview** — toggle it, resize the window: the slide re-scales (the `ResizeObserver` survived the
   move), and it disappears when the editor closes.
8. **Templates** — save as template, apply it from the week (opens the editor), then the update-template
   confirm; the recurring generator creates its dates.
9. **Import semana** — paste a week, create, and confirm the grid scrolls back to itself.

At **390**: the 4-row mobile header, `‹ Voltar à semana` as the close, no TV-preview button, no red ✕;
two days' cards open at once; the box-warnings bottom sheet.

**Gallery:** no gallery-rendered component's markup changes (the Criador group renders
`SessionTextPane`/`BlockTextEditor`/`WeekSessionCard`/`WeekImportModal`/`GoalInput`/`SessionMetaModal`/
`ParseWarnings`, all already extracted). **Open `gallery.html` anyway** — it is dev-only, never built, and
no CI gate catches a broken import there (#51/#52). **No `design:cards` run** unless that opening turns up
a change.

Model: Opus · Size: M
