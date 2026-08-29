# Cone — CLAUDE.md

## App overview
CrossFit coaching management app. Vite + React 19 + Supabase.  
**Repo:** https://github.com/DSeller0/CrossFit-Apps  
**Deploy:** GitHub Pages at https://dseller0.github.io/CrossFit-Apps/ via GitHub Actions (push to `main`).  
**Working dir:** `cone/` subfolder. Dev server: `npm run dev` inside `cone/`.

---

## Structure

### Public pages (standalone HTML + vanilla JS)
Each page is a self-contained HTML file. Most use a React component mounted at `#root`.

| Page | Source |
|---|---|
| `index.html` | full-width week grid → selected-day panel (session + ranking) + box-warnings strip (#53) |
| `schedule.html` | week schedule + RM calculator |
| `results.html` | week results logging + leaderboard |
| `me.html` | athlete profile + PRs + goals |
| `leaderboard.html` | all-time rankings |
| `timer.html` | standalone WOD timer (launched from schedule.html) |
| `tv.html` | TV display for gym wall (no nav) |
| `athletes.html` | **RETIRED (#52) — a redirect stub, not an app.** Maps `?athlete=<id>` → `me.html?id=<id>`. Keep the file: `sw.js` precaches it and `cache.addAll` rejects **atomically** on a 404, so deleting it stops the service worker installing for every user, on every page. |
| `tema.html` | theme picker (#143 · plans/67) — 4 theme cards with live `--pv-*` previews, reached from a Nav-sheet tile. Writes **`cone_theme_user`** (the visitor's own pick, which always beats the box default) **and** the legacy `cone_theme` the pre-paint script reads; shows a "Usar o tema do box" reset only once a personal pick exists. |
| `recover.html` | data recovery ("Recuperar dados") |

**Page whitelist** — the HTML entry list lives in `cone/vite.public.config.js` (`rollupOptions.input`, **10** pages). Every new public HTML page must be added there or it isn't built and 404s live. (`deploy.yml` at the repo root copies `public-dist/` wholesale — no whitelist there anymore.) The HTML entry files and `themes.css` live at the **repo root** (`CrossFit-Apps/`), not inside `cone/` — the public Vite config sets `root: '..'`.

**Never-built legacy HTML (plans/48, 2026-07-27)** — of 33 tracked root `.html` files, 18 (old design mockups, `athletes_v1/v2.html`, `me-a/b/c.html`, `designer.html`) were zero-consumer and deleted; the 4 `schedule_builder_*` variants moved to `legacy/` (kept for the `exerciseRows` reference above, not deployed). **`log.html` looks the same — untracked from `vite.public.config.js`'s input, never built — but is NOT dead:** `Publicador.jsx`'s `PresenterView` builds a live share URL (`_presenterLogUrl`) pointing at it. Since only `public-dist/`'s 9 built pages actually deploy, that URL 404s on the real site today — a pre-existing bug, not introduced here, filed as #113 and deliberately not fixed by this sweep (deletion-only).

### Criador layout (#58 / plans/37)

**The page opens on the week grid, not on a form.** `Criador.jsx` is the container;
the editor renders only while a session is open (`editorOpen`, which `editing` alone
can't carry — a *new* session is being edited but has no id/dateKey yet).

**Decomposed #74-C/plans/62 (2026-08-04, pure move — 1198 → 379).** `Criador.jsx` now owns
only the week around the editor, the composition order of the two, and the measurement that
keeps both on screen. Everything else is in `criador/`: **hooks** `useSessionEditor` (form ·
blocks · editing · editorOpen · isDirty · changedBlockFields · activeTemplateId · metaModal ·
pendingDate · pendingClose · sessionMode, + start/new/close/commitMeta/**saveS**) ·
`useBlockList` (add/copy/upd/del/reorder + collapsed · insertAtIdx · the drag refs) ·
`useTemplates` (the list + the whole recurring generator) · `useBoxWarnings`; **components**
`SessionEditor` (the editor Card, both header layouts) · `CriadorConfirms` (the 4 dialogs) ·
`CriadorToolbar` · `TvPreviewPane`. Three rules that survived the split and must keep surviving:
- 🔴 **`scrollToEditor` stays in the container** — it measures `--spa-sticky-top` plus the pinned
  block's *live* height and needs both `editorRef` and `weekGridRef`. `useSessionEditor` receives
  it as an injected **`onOpened`** callback and must never reach for it.
- 🔴 **`saveS` writes the session; the container reveals it.** The hook does the `setSessions`
  write and the target-week arithmetic, then calls **`onSaved({savedId, weekOffset})`** — the week
  jump, the 2s highlight and the scroll are week-view state and stay in the container.
- **`SessionEditor`/`CriadorConfirms` take the hook APIs whole** (`editor`, `blockList`,
  `templates`) rather than 30 flat props. They are container-private surfaces, not gallery
  components — don't "improve" them into a reusable prop contract they have no second consumer for.

- **The week grid renders unconditionally** — an empty week is this page's empty
  state, with its day columns and their `+ sessão` affordances. (It used to be
  gated on `totalSessions > 0`.)
- **`criador/SessionMetaModal.jsx`** holds everything about a session that isn't a
  block (date · name · audience · visibility · box tags · briefing) — it was a
  permanent slab above the blocks. It holds a **draft** and commits on confirm, so
  Cancelar really cancels; the athlete picker is **inline inside it**, not a second
  modal on top; the briefing is **always visible** (it was a disclosure — a seventh
  field in a dialog doesn't need folding). It opens from an **icon-only gear beside
  the Público/Oculto tag in the editor title**, not from the action cluster: what it
  edits is what the title shows. The move-to-another-date confirm stays in
  `Criador.jsx` (only the container knows whether the session is saved, and on which
  day). Editor header order is **gear · Template · TV Preview · Salvar · ✕**.
- **Desktop keeps the week in view** while editing, auto-collapsed to a day strip
  (`weekGridCollapsed`); **mobile hides it** and the editor takes over with a
  `‹ Voltar à semana` link. That strip **is the index's own `WeekGrid`**
  (`public/index/rail.jsx`), not a private one — it shows each day's *session name*,
  which the retired `dayChip` set didn't. Three props exist for the coach's case:
  `dates` (he browses other weeks), `filter` (he sees `public:false` sessions and
  filters by his own box selector) and `showCount` (he has more than one session a
  day; the index renders only the first, so it stays off there). Imported aliased —
  `criador/WeekGrid.jsx` exports a `WeekGrid` of its own, the 7-column card grid.
- **The week grid stays exactly as it is while editing** — opening a session does
  *not* collapse it, and the week bar keeps all its controls. The coach wants the
  week's contents and the session he is editing on screen together; the collapsed
  strip is a manual choice (the toggle), never something opening a session does for
  him. Two earlier attempts — auto-collapse to the strip (#58) and then forcing the
  strip whenever `editorOpen` — were both rejected on the same ground.
- **`cr.stickyHead` pins week arrows + box tabs + the strip; the toolbar and Avisos
  scroll.** Two traps, both hit live:
  - **Offset is `var(--spa-sticky-top)`** (`index.css`, a single `49px` since `AppChrome`
    collapsed the two-layout chrome to one row at both widths — #95/plans/69). Hardcoding
    `88px` — which `.sync-conflict-banner` and Resultados'/Agenda's `.rp-sticktop` both used
    to do — was wrong even before that pass: the flat figure was topbar + tab bar, 39px too
    low once the sidebar replaced the tab bar at ≥768px, parking the block on top of Avisos.
    Both now read the token too (`AppChrome.module.css`'s `.banner`; `index.css`'s
    `.rp-sticktop`), so this is no longer a live trap anywhere in the app — recorded here
    because `scrollToEditor` below still measures the token itself, independently.
  - **`WeekGrid` returns a FRAGMENT, not a wrapper div.** `position: sticky` is
    clipped by its parent's box, so while the component owned a div the header could
    only travel that div's height and scrolled away as soon as you reached the block
    list. As a fragment its parent is the container holding the editor too.
  The strip is *inside* the sticky block, not below it: once the card grid is gone it
  **is** the week picker, and left below the bar it slid under it on every open.
  **The strip renders in the SAME slot the card grid occupies (below `BoxWarnings`),
  not inside `stickyHead`** — an earlier version pinned it alongside the week bar,
  which is *above* Avisos, while the expanded grid sits *below* Avisos: minimizing
  silently swapped their vertical order (a real bug, caught live 2026-07-22). Collapse
  is a manual choice only (see above), so the strip losing its pin costs nothing.
- **Opening a session brings the editor into view and no further** (`scrollToEditor`
  in `Criador.jsx`). At a normal window size the editor already sits below the grid
  and in view, so opening a session **scrolls nothing at all** — that is the point:
  scrolling it to the top would push the grid off screen and undo the bullet above.
  It only moves from a scrolled-down position, or with the grid collapsed. It measures
  rather than using a CSS `scroll-margin`, because the pinned block's height isn't
  constant (week bar + box tabs, plus the strip when collapsed).
- **Closing the editor asks before discarding** (`requestClose` → `pendingClose`
  `ConfirmReview`), and only when `isDirty`. The close control is the same red ✕ as
  the exercise delete; it always threw the edit away, but as a red ✕ beside *Salvar*
  it is one slip from losing a session.
- **The editor header is two different layouts, not one that reflows** — desktop is
  the single flex-wrap row; mobile is **4 explicit stacked rows** (close · date+name ·
  box+visibility tags · actions). Forcing one flex-wrap row to break into exactly
  those 4 groups at 390px would need the content to happen to fill each line right;
  explicit row wrappers don't depend on that. Mobile drops the TV-preview button
  (desktop-only pane) and the red ✕ (`‹ Voltar à semana` is already the close there).
- **A block's custom name shows in the collapsed bar only** — expanded, the body's
  own `blk-name-input` already carries it one line down, so showing it in the bar too
  was a literal duplicate on screen (`{collapsed && customName && …}` in
  `BlockEditor.jsx`).
- **`block.goal` is the one new persisted field (#10)** — `{kind:'time'|'rounds'
  |'text', min?, max?, reps?, text?}`, written by `criador/GoalInput.jsx` (type-aware
  via `goalKindFor` in `blockModel.js`) and by textFormat's `parseGoal`, same shape
  either way. An all-empty goal is stored as `undefined`, never as a hollow object.
- **`goalStr(block)` in `public/lib/wod.js` is the one display formatter** —
  `WodBlockCard` · `schedule/BlockDetail` · `tv/slides` (BlockCard + TimerSlide) ·
  `WeekSessionCard`. It is deliberately **not** textFormat's `serializeGoal`: that
  one emits re-parseable ASCII notation (`11-12'`), this one is display-only and
  uses an en dash. Same data, different contracts — don't collapse them.
- **`block.duration` stays a minutes number field** (see the mm:ss note under #35 —
  `toSecs('14')` reads 14 as *seconds*; converting it is a data migration, #93).
- **On mobile the exercise name is a tap target, not a field** — the real
  `ExerciseCombobox` lives in the bottom sheet below Séries/Reps, where its dropdown
  has room; tapping the name and tapping the gear are the same gesture.
- **Séries and Reps are not the same width.** Séries is one or two digits; Reps holds
  a rep *scheme* (`21-15-9`, `10-9-8-7`, `15,12,9` in escada mode). Both shared one
  40px box (76px at 20px font in the mobile sheet), which clipped `21-15-9` to
  `21-15` with nothing on screen saying so — on a row with ~800px unused beside it.
  `.ex-qty-reps` (88px) / `.sheet-qty-reps` (130px) split them, and the tooltip
  carries the value so a ladder longer than the box is still readable.
- **The mobile exercise sheet's distance field is value + unit side by side,
  centered** (`.sheetDistInline`), not stacked. `.sheet-qty-field` (index.css,
  global) is a column flexbox for every field in that sheet — value on top, label
  under — which is right for a plain number but stacked the `m`/`cal` `<select>`
  *under* the input instead of beside it for the one field with two controls.
  `.sheetDistInline` wraps just those two, ahead of the shared label.
- **The mobile exercise sheet's close button reads "Salvar alterações"**, matching
  the header Salvar button elsewhere — it was "Feito", inconsistent wording for the
  same action (the button has never gated a save; every field writes on change,
  same as the box-warning sheet below).
- **Mobile session-card actions are icon-only, pencil (edit) then trash** — no
  "Editar" label. Same treatment as the editor header's gear/close.
- **Mobile can have more than one day's card open at once** — `WeekGrid`'s
  `openIds` is a `Set`, not a single id, so the coach can expand two days to
  compare them without closing the first.
- **Mobile box tabs wrap 4-per-row instead of scrolling** (`@media (max-width:600px)`
  on `.boxTabs`, matching `useIsMobile`'s breakpoint) — a side-scrolling filter row
  gives no visual hint there's more to the right; wrapping doesn't, since box counts
  here stay small.
- **`criador/BoxWarnings.jsx` forks on `useIsMobile`.** Desktop keeps the original
  inline row (date input · message input · on/off toggle · remove, all live). Mobile
  can't fit that row, so it renders compact read-only rows (date · message · a dot for
  active) and edits through a bottom sheet — the same `ex-sheet*` global classes
  (index.css) the exercise row's sheet uses, tap a row to edit it. `addWarning` now
  **returns the new id**, so "+ Adicionar" can open the sheet straight onto the row it
  just created instead of leaving the coach to find it in the list.
- **`TypePicker`'s three benchmark-category colours are data colours** (gold/blue/
  violet, the same values the block-family palette uses) — exempt from #15, recorded
  in a comment there.

### Criador text format (#92)

The Criador was built to *replace* the coach's free-text weekly file and didn't — he
writes the week in a phone notepad and re-types it. `src/components/tabs/criador/textFormat.js`
parses **his** notation into the real block model (deterministic grammar, **no LLM**) and
serializes back: `parseWeek`/`parseSession`/`parseBlock`/`parseExerciseLine` +
`serializeBlock`/`serializeSession`/`serializeGoal`. Pure — no React, no client; the
registry is passed in (same convention as `blockModel.js`). Grammar + recorded
refinements: [docs/plans/36](./docs/plans/36-criador-text-mode.md).

- **Blocks stay canonical — text is an input/output projection, never storage.** TV,
  `schedule.html`, `results.html` and Publicador read the same block objects as before.
  The only new persisted field is **`block.goal`** (`{kind:'time'|'rounds'|'text', …}`,
  the coach's `Meta:` line). Mode toggles are editor UI state and are **never persisted**.
- **The parser never drops a line.** Anything unclassified lands verbatim in
  `block.notes`; `audit` returns one entry per non-blank input line, which is how
  "nothing was lost" is asserted rather than hoped. Warning kinds: `type-unresolved` ·
  `unknown-exercise` · `complex-detected` · `interval-approximated` · `unparsed-line` ·
  `orphan-load` · `preamble`.
- **`scripts/audit-text-roundtrip.mjs` (61·A) is the fidelity instrument** — read-only,
  runs serialize→parse over every prod block in two passes (the pane direction and the
  coach's header-less **paste** direction, which break differently) and prints a
  per-class table. Run it before and after any grammar change. Two things make it
  trustworthy and are worth preserving: it diffs at **path level**, so a loss can't hide
  behind a class nobody thought to look for, and it separates loss from **projection
  shift** by asking whether the text *stabilizes* (`t2 === t3`) rather than whether it
  came back byte-identical — volume the coach typed into the NAME field ("30\" HSW HOLD",
  "800m Run") moving into the reps/dist the grammar names is re-attribution, not loss,
  and it is the single biggest bucket on prod. The **"em Estações"** column exists because
  Estações is 61·B's scope, not A's.
- **An unresolved block type is `type: ''` + `typeUnresolved: true`** — nothing is
  guessed; the preview's chip is a button onto the existing `TypePicker`. `typeUnresolved`
  means exactly "no format yet", whether the header was unrecognised, was a bare `WOD`
  section marker, or the block had no header at all. ⚠️ **`serializeBlock`'s header is
  keyed on `block.type`, NOT on `typeUnresolved`** — a block imported from text and then
  given a type in the block bar keeps a stale `typeUnresolved:true` in storage, and
  honouring it silently dropped the type it now has.
- **One predicate decides "exercise vs structure": `isExerciseNotStructure`.** A line is
  an exercise when it has a leading quantity AND a name — and, when `parseStructure` also
  bit, when the two cover the **same span**. `50' Run` (structure took `50'`, the exercise
  took `50'` too) is a 50-second Run; `3 sets cada letra` (structure took `3 sets`, the
  exercise could only take `3`) is a structure line with prose after it, and stays one.
  Used by the header probe and the structure probe both, so they can't disagree.
- **`3x60kg / 2x70%` is the pair form** — the only notation carrying per-step reps and
  mixed units. Every token carries its own unit, which is what keeps it off `60/70/80kg`
  (one trailing unit) and off the gender pair (`–`-separated). Tried FIRST in `takeLoad`.
  ⚠️ A line that is *entirely* a load must skip the leading-quantity strip, or `3x55%` is
  read as "3 sets × 55 reps".
- **Gender scale pairs are POSITIONAL** (RX · Inter · SC), so a missing middle scale is
  emitted as `-/-` to hold its slot — without it an SC load read back as Inter.
- **`block.goal.kind` is a function of `block.type` via `goalKindFor`, one-directionally.**
  A parse is demoted to the coach's own sentence on a block with no scoring axis (`Meta:
  sub 10'` on a Skill block), never promoted into an axis the line doesn't carry. This is
  what `GoalInput.jsx:20` needs — it drops any goal whose kind doesn't match the type.
  `parseGoal` keeps `min` a **string** (#110's type-mismatch family).
- **The week grid has two render modes, it is not a new view** (`WeekGrid` `gridMode` +
  `WeekSessionCard`): **Grade** = the real `ExerciseList` at size `tiny`; **Texto** =
  `serializeSession`. Same 7 columns, same `boxFilter`. Texto is the copyable one and
  the only one carrying the structure line, `Meta:` and notes.
- **`isTextEditable(block)` is false for a LINKED Benchmark only** (`block.benchmarkRef`) — its
  movements come from the benchmark definition, not from the coach, so a round trip would
  rewrite an official WOD from a paraphrase of it. The block toggle renders **disabled, not
  hidden**. Estações joined the grammar in 61·B; `TEXT_UNSUPPORTED_TYPES` went with it.
- **Estações notation (61·B): `Ciclos: N` · `Entre ciclos: mm:ss` · `<nome> <mm:ss>` per
  station** (`matchStationLine`), plus `<nome>:` for a duration-less one. The cycle fields are
  **keyword lines in the `Meta:`/`Obs:`/`Zona:` family, NOT `×2` on the header** — the header
  splits into type+label segments (`HEADER_SPLIT`) and has no grammar for a `×2` segment, and a
  bare `2 ciclos` is already claimed by `RE_ROUNDS` as `block.rounds`. ⚠️ **A station duration is
  mm:ss ONLY**: `'`/`"` are the exercise/structure notation and a station NAME can contain them
  (prod has one called `AMRAP 3'30''`, which used to parse as a 3-minute block duration).
  ⚠️ **Inside an Estações block `Descanso 1:00` is a rest STATION** — the station probe runs
  before `RE_REST`, which would otherwise claim it as a Rest *exercise*; a rest exercise writes
  `Rest 2'`, not mm:ss. A leading digit means an exercise wearing a quantity, never a station.
- **When a block carries BOTH `stations` and `exercises`, its TYPE decides which side is live**
  (prod has 5 — the type was switched after the fact and the editor left the old side behind).
  That is the fork every consumer already makes: `blockExercises` (`wod.js`),
  `normalizeLegacyCardio`, `materializeBlocks`, `blockSummary`, `BlockDetail`, `rail.jsx`. Text
  projects the **live** side only; the other is unreachable residue and does not survive a round
  trip. `audit-text-roundtrip.mjs` **counts** it (`vestigial-exercises`/`vestigial-stations`)
  rather than letting it hide in `projection-shift`. In that script **a station's exercise is an
  exercise** — the per-field rules apply to `stations[].exercises[]…` exactly as to
  `exercises[]…`, and only a station's own structure (which stations exist · name · duration ·
  isRest) is `stations-lost`.
- **The session pane holds locked blocks OUT of the textarea and puts them back by index**
  (`splitLockedBlocks`/`mergeLockedBlocks` in `textFormat.js` — pure and unit-tested, so the pane
  stays thin). A locked block comes back as the **same object**, never a re-parse, rendered as a
  read-only `PreviewBlock` at its real index with a `block-locked` warning. `normalizeLegacyCardio`
  runs on the **parsed half only** — `SessionEditor.jsx`'s `onApply` must not re-map what the pane hands it.
- **Flipping a session to text and back normalizes whitespace and curly quotes in
  names** (`40” prancha ` → `40" prancha`). Verified on real prod data: 4 diffs in 42
  lines, all of that kind — no semantic loss.
- **The gender-load emitter groups by SCALE** (`60/45kg – 50/35kg` = RX pair, Inter
  pair) while canonical `fmtIntensity` groups by GENDER (`M: 60/50 kg | F: 45/35 kg`).
  Different axis order, both correct for their surface — **do not "fix" `fmtIntensity`**.
- `SessionTextPane` takes its **type picker as a prop** and `WeekImportModal` imports
  `uid`/`toISO` from `public/lib/` rather than `utils/storage` — both render in the
  client-free gallery, and `utils/storage` pulls the SPA Supabase client.

### SPA (React — `src/`)
Entry: `src/App.jsx`. All tabs lazy-loaded with `React.lazy()`:  
Criador, Atletas, Exercícios, Afiliados, Resultados, Agenda, Publicador, Configurações, TvController.  
Providers: `AuthContext` (session), `SyncContext` (sessions + events + Supabase sync).

**AppChrome (#95 · plans/69, 2026-08-06)** — `src/components/chrome/AppChrome.jsx` +
`AppChrome.module.css` + `tabs.js` replaced `App.jsx`'s inline topbar/tab-bar/sidebar (two stacked
layouts, up to 226px tall on mobile — `.topbar-right`'s `flex-wrap` broke six chrome controls into
~6 rows, and the account email drove `document.scrollWidth` past `clientWidth`) with **one 49px row
at both widths** (`.bar`, no `flex-wrap` — that single removal was the bug fix). Desktop keeps the
220px fixed sidebar for nav; mobile gets a horizontal-scroll tab strip instead (active tab
auto-scrolled into view via `useEffect([tab])`, `block:'nearest'`). **Fully props-in and
client-free** — no Supabase/storage/context import, direct or transitive; every handler arrives as a
prop, which is what makes it render in the gallery unmodified. Returns a **Fragment, not a wrapper
div** — `position:sticky` is clipped by its parent's box, the same trap this file records for
Criador's `WeekGrid`. `Salvar`/`Carregar`/`Limpar estado` moved out of the chrome entirely into a new
"Dados" section in Configurações (`src/components/tabs/config/stateBackup.js` — pure
`buildSnapshot`/`stateFileName`/`parseStateFile` + the two with real side effects,
`downloadSnapshot`/`applyState`; `applyState` returns `{needsReload}` rather than reloading itself,
the same "reader returns a flag" shape as `initRegistry`'s `{registry, needsSave}`); Limpar now goes
through `ConfirmReview` with copy that states the server-sync + sessions-only scope, replacing a
`window.confirm` that was wrong on both counts. **`--spa-sticky-top` (`index.css`) is now a single
`49px` declaration with no `@media` override** — the chrome is one height at both widths by
construction (`min-height:48px`, no wrap), so every consumer (Criador's `cr.stickyHead`,
Resultados'/Agenda's `.rp-sticktop`, the sync-conflict banner) reads the same token unconditionally.

**Publicador (#25 · plans/39, pure move — no behavior change)** —
`src/components/tabs/Publicador.jsx` is the `SchedulePublisher` shell only (~660 lines); the rest
lives in `src/components/tabs/publicador/`: `exportHelpers.js` (pure formatters + the `useSpeech`
hook), `MicButton.jsx`, `exportViews.jsx` (`DailyExportView`/`WeeklyExportView`/
`WeeklyCalendarExportView`/`CalendarExportView`), `mobileExportViews.jsx` (the mobile export
views), `events.jsx` (`EventFormInner` + `ReportModal`), and **`AgendaView.jsx`** — the file
**#59**'s Agenda design pass will own. `App.jsx` lazy-loads `AgendaView` straight from
`publicador/AgendaView`, not through `Publicador.jsx`, so opening Agenda no longer drags in the
export/PDF graph (`jspdf`/`html2canvas`/`qrcode` stay Publicador-only chunks — verified via
`npm run build` chunk list). Still **`React.createElement`, not JSX** — kept that way on purpose
so #59's eventual rewrite is the first JSX pass over this markup, not a second one.

**Atletas + Afiliados (#56 · C2 · plans/75, shipped 2026-08-28)** — the old
`Atletas.jsx` (1795 lines, 7 frozen totk-dark palette consts) and `Servicos.jsx` (1199
lines, inline styles only, no `.module.css`) are now both containers over decomposed,
token-only components: `src/components/tabs/atletas/` (originally `AthleteList`/
`AthleteDetail` — both superseded by #160's grade/ficha rebuild below —
`AthleteHeader`/`SessionStrip`/`PrRow`/`GoalBar`/`GoalConfigPanel` + the 3 modals +
`atletasHelpers.js` + `Atletas.module.css`) and `src/components/tabs/afiliados/`
(`Afiliados.jsx` is the new container, replacing `Servicos.jsx` entirely —
`AffiliatesPane`/`AffiliateRow`/`AthleteAssignment`/`MeuNegocioPane` (was
`CoachProfileForm`; renamed `MeuPerfilPane` by #161 below) + the 2 modals +
`affiliateHelpers.js` + `Afiliados.module.css`).
**Tab label is "Afiliados"; `id:'locations'` and the `locations` blob are unchanged**
(plans/42 decision 1 — `type` is already the discriminator, no new entity). Every new
component is client-free and gallery-covered (`Atletas`/`Afiliados` gallery groups).
Both hand-rolled 10-block PR/goal bars are gone in favour of the one `TallyBar`
primitive; both tabs' delete/remove actions go through `ConfirmReview` instead of
`window.confirm`, except the goal `+1` (was a confirm on a reversible single
increment — removed, not converted). **`ExerciseCombobox` moved from
`criador/ExerciseCombobox.jsx` to `src/components/shared/ExerciseCombobox.jsx`**
(gained an `excludeNames` prop for the PR-name case) — Atletas' own private fork is
deleted, so there is exactly one implementation now, reused by Criador's
`ExerciseRow.jsx`. It still reads the registry itself via `loadRegistry()`, so like
`shared/IntensityInput.jsx` it is **not** client-free and does not render in the
gallery — callers needing it in a client-free component (`atletas/PrModal.jsx`) take
it as a wired node prop instead of importing it. `.ex-input`/`.ex-input:focus`/
`.ex-input::placeholder` are deleted from `index.css` (zero consumers once Atletas
adopted `ui/Input`); `.ex-suggestion` stays, since the moved combobox still uses it.

**Atletas → Fichas (#160 · mockup 51 · plans/76, shipped 2026-08-28)** — `Atletas.jsx`'s
composition changed from a 220px alphabetical list + detail pane to a **grade** ordered by
each athlete's next session and a **ficha** that is 1:1 preparation, not a roster entry.
`AthleteList`/`AthleteDetail` are gone; `atletas/` gained `AthleteGrid`/`AthleteCard`/
`DayGroupHeader` (the grade) and `Ficha`/`SinceLastOneOnOne`/`PresenceGrid`/`CoachNotePanel`
(the ficha) — `AthleteHeader`/`SessionStrip`/`PrRow`/`GoalBar`/`GoalConfigPanel` and the 3
modals are unchanged. Grade cards group under **Hoje → Amanhã → `<Dia dd/mm>` → Sem sessão
marcada** (`nextSessionGroups`, a time appended only when an `events[date]` row links the
session by `sessionId`) and carry 4 signals — últ. sessão · aderência (+ trend arrow, "% of
prescribed WOD blocks logged", **not** `calcKPIs.freq`, whose denominator is result rows that
exist) · sem feedback · objetivo (nearest OPEN goal, or "parado há N sem" once its newest hit
milestone is > 21 days old) — over a full-width `TallyBar` with its label on the line below,
never sharing the row (the same % renders a different length card-to-card otherwise, and the
grade is a 2-up grid of many). Mobile collapses the date grouping into a 3-bucket signal list
(**Precisa de atenção / Próxima / Em dia**) computed in the container, fed through the same
`AthleteGrid`. The ficha adds **Desde o último 1:1** (anchored on the newest coach note,
listing PR improvements/milestones hit/unlogged assigned sessions since), **Presença · 4
semanas** (`presenceGrid`, Sunday-start, `sem registro` — never `faltou`, since a missing
`results_v2` row means unknown, not absent, until #102) and **Nota do coach**
(`CoachNotePanel`, mounted `key={athlete.id}` so a draft can't leak across athletes) around
the still-reserved #39 (Limitações) and plans/22 (Atributos) slots, which render nothing on
purpose. **One new capture:** `goals_data.coachNotes[athleteId] = [{id,date,text}]` (same blob,
same athlete-id keying as `prs`/`athleteGoals`; `storage.js`'s `loadGoalsData` now defaults it
to `{}`) — written straight from `Atletas.jsx`'s `saveNote` mutator, never a mount effect (the
#76/#109/#111 bug class). `calcBlockStats` **promoted** from `public/me/meHelpers.js` to
`public/lib/sessions.js` (the #70 move, repeated) and re-exported from `meHelpers` for its
existing `me.html` call sites — it's session-domain and now has two consumers. All 6 new pure
helpers (`nextSessionGroups`/`adherence`/`daysSinceNote`/`goalSignal`/`presenceGrid`/
`sinceLastNote`, plus the shared `agoLabel`/`lastSessionSignal`) live in `atletasHelpers.js`,
`todayKey`-injected like `sessionStrip`.

**Afiliados → painéis do coach (#161 · mockup 60 · plans/77, shipped 2026-08-29)** —
`Afiliados.jsx`'s composition changed from a horizontal `PaneTabs` strip + two panes to a
**vertical rail** (`AffiliateRail.jsx`, 214px, grouped "Painéis"/"Conta", falls back to the
existing horizontal strip below 768px — a SEPARATE `PaneTabs` render branch
(`orientation='vertical'`), not a CSS reflow of the same markup, since `role="tablist"`/`"tab"`
needs the tab as a direct child) over **two panes, renamed to match the mockup: "Meus
afiliados" and "Meu perfil"** (was "Afiliados"/"Meu negócio"; `MeuNegocioPane.jsx` renamed
`MeuPerfilPane.jsx`). `PANES` is still array-driven (`{id,label,group,count}`) — plans/78 appends
Fechamento + Minha semana as two more "Painéis" rows. Mockup 60's `Sou coach / Sou dono do box`
role switch and its four box-owner panels (Coaches · Turmas · Contas a pagar · Vínculos) are
**dropped outright**, not placeholdered — the app has no role model to switch on (plans/42).
**"Meus afiliados" is three columns** (`AffiliatesPane.jsx`): the list ("Onde eu trabalho",
232px) · the selected affiliate's detail · **`ReceivableRail.jsx`** ("A receber", 262px, hidden
below 960px — list+detail+receivable doesn't fit a tablet width). The detail gained the
**two-direction pair** (`DirectionPair.jsx`) — `locations[].rate` is what the BOX pays the coach,
the coach's Pix key is what the COACH charges the athlete; same field, same Pix identity,
opposite arrows depending on `loc.type` (plans/42 decision 2) — and **`AffiliateSessions.jsx`**,
the month's events for that affiliate. Both new components and `ReceivableRail` take already
date-ranged data and reuse `publicador/billing.js`'s `calcTotal`/`sumByCurrency` directly (both
pure, so this is fine in client-free components) — `affiliateHelpers.js` gained
**`monthBounds`** and **`eventsForAffiliate`** (a box event matches on `locationId`; a personal
one never carries one — the coach picks an athlete instead — so it matches on a shared id with
`loc.athleteIds`). `Afiliados.jsx` now takes **`events`** as a prop (`App.jsx`, from
`useSync()`, read-only — the same pattern `AtletasTab` already used). **`AthleteAssignment.jsx`**
renders an `athleteIds` entry pointing at a deleted athlete (no DB can enforce integrity inside a
JSONB array, plans/42 decision 7) as a removable "Atleta removido" row instead of silently
dropping it. **`MeuPerfilPane.jsx`** gained a read-only **"Taxas por afiliado"** card (click a
row to jump to that affiliate in "Meus afiliados"); mockup 60's **"Quem vê o quê" is deliberately
NOT built** — it would describe per-affiliate visibility no layer of the app implements,
asserting an isolation guarantee that does not exist (plans/42's tenancy sequencing puts real
isolation dead last; the panel becomes buildable once #31 lands). **Zero change to the
`locations[]` shape** — every existing reader (`Config.jsx`, `Criador.jsx`, `AgendaView.jsx`,
`events.jsx`, `billing.js`, `stateBackup.js`) is unaffected.

---

## Supabase clients — CRITICAL

**Two clients exist — use the correct one:**
- `src/utils/supabase.js` → SPA only (components under `src/components/`)
- `src/public/supabaseClient.js` → public pages (components under `src/public/`)

Importing both in the same bundle causes a GoTrueClient warning (non-fatal but visible in console).

**A load/read path never writes.** This is a recurring bug class (#109, plans/45), not a one-off: `results_v2` wrote back on every load until #76 fixed it — and that wasn't merely wasteful, it destroyed `updated_at` as a provenance signal, which is why migration `0007` then had to add a real `created_at` column to recover it. A read that writes costs a column. When a load path needs to migrate or re-sort data, the function that does the reading **returns a `needsSave` flag** (or equivalent) instead of calling the save function itself — the caller decides whether to persist. `src/components/tabs/exerciciosHelpers.js`'s `initRegistry` is the reference shape: it returns `{ registry, needsSave }`, and `Exercicios.jsx`'s `useState` initializer is what calls `saveRegistry` if `needsSave` is true. Mount effects are the other half of this class — `useEffect(() => { save(x) }, [x])` **runs on mount**, so seeding `x` from `useState(load...)` means merely opening the component re-persists it; prefer saving from the mutators that actually change the state (`afiliados/Afiliados.jsx`'s `saveLoc`/`deleteLoc`/`toggleAthlete` call `saveLocations` directly, since #56/C2 — was `Servicos.jsx`) over a mount-guarded effect, since the mutator shape makes a future "just add a save effect back" mistake harder to reintroduce. Where many small fields feed one persisted blob (`MeuNegocioPane` → `coach`, was `CoachProfileForm`), debounce the effect and skip its first (mount) run, rather than writing on every keystroke. **Third instance, and the one that could actually lose data (#111, plans/47, fixed 2026-07-27):** `SyncContext.jsx`'s startup `syncFromSupabase()` pulled all 9 remaining blob tables and immediately called each one's normal `save*` on what it had just read — which upserts, so a pull re-wrote everything with a fresh `updated_at` on every authenticated mount. The dangerous half wasn't the amplification, it was `SyncContext.jsx:30-31`'s `useEffect(() => saveLS(sessions), [sessions])` firing on mount from `useState(loadLS)`-seeded state — on a device whose localStorage was stale (created a session on another device, hadn't reopened the app since), that mount write silently overwrote the server's newer document with the stale local one, deleting the session that only existed on the server. Fixed the same way as #76/#109: `storage.js` now gives every table a `cache*LS` half (localStorage-only, no `dbSave*`) via a shared `cacheLS(key, data)` helper, and `syncFromSupabase` calls only the cache half. `SyncContext.jsx`'s two auto-save effects gained a `useRef` mount guard (skip the first run, same as plans/45's `CoachProfileForm`, now `MeuNegocioPane`) **and** a pull-suppression ref set immediately before `setSessions`/`setEvents` in the pull's `.then()` — consumed and cleared by the effect on its next run — because unlike `afiliados/Afiliados.jsx`'s mutators, `setSessions`/`setEvents` are shared across the whole app via `useSync()` and can't be moved to a handful of call sites. The same suppression applies to the manual "Sincronizar" button (`handleSync`), which is the same read-then-`setState` shape.

Both clients read `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — never hardcode a URL/key in `src/`. Vite picks the file by mode: `npm run dev` / `dev:public` → `.env.development` (local stack); `npm run build` / CI → `.env.production` (prod, `https://crsalcpvsedmiabkeibp.supabase.co`, committed — anon key is public by design). `vite.public.config.js` needs `envDir` set explicitly (its `root` is the repo root, but the env files live in `cone/`).

**Local dev environment:** `supabase start` (Docker required) boots a local stack on ports shifted +10 from the CLI default (API `54331`, DB `54332`, Studio `54333`, Mailpit/mail `54334`) — the default ports collide with another local Supabase project already running on this machine. `node scripts/seed-dev.mjs` snapshots prod's blob tables + `results_v2` into it (reads `.env.production` for source, `.env.development`'s `SUPABASE_SERVICE_ROLE_KEY` for target — that key is local-only and must never carry a `VITE_` prefix). `supabase db reset` wipes and reapplies migrations from scratch. Login OTP emails never leave the stack — they land in Mailpit (`http://127.0.0.1:54334`), not a real inbox. `supabase/templates/magic_link.html` + the `[auth.email.template.magic_link]` block in `config.toml` are required for the email to show the 8-digit `{{ .Token }}` code at all — GoTrue's built-in default template only renders `{{ .ConfirmationURL }}` (a dead link locally, since `LoginScreen.jsx` never uses `emailRedirectTo` and only ever verifies a typed-in code). Changing `config.toml`'s `[auth.email]`/`[auth.email.template.*]` needs a `supabase stop` + `supabase start` cycle to take effect (data is preserved). **`npm run dev`** (SPA, base `/CrossFit-Apps/cone/`) and **`npm run dev:public`** (public pages, base `/CrossFit-Apps/`) are two independent Vite dev servers on different ports (Vite auto-increments from 5173 if occupied) — a relative link from one (e.g. Nav's "Coach" link to `cone/`) 404s-as-HTML if followed on the wrong server; open the SPA's own dev server URL directly instead of following that link. **Cross-port cache poisoning (2026-07-09):** because both servers share the `localhost` origin and swap ports between sessions, the browser can reuse a cached module transform from the *other* server's config — symptom: "Invalid hook call" + `useRef` null (two React copies, one from `/CrossFit-Apps/.vite/deps/` = the public config's cache at the repo root, one from `/CrossFit-Apps/cone/node_modules/.vite/deps/` = the SPA's). Not a product bug — fix with a cache-bypassed reload (DevTools "Disable cache" + reload, or Ctrl+Shift+R); do not chase it in `src/`. **Service-worker poisoning is the same family and bites harder (2026-07-22):** `sw.js` registers at scope `/CrossFit-Apps/`, which on localhost covers the SPA dev server too — so a previously-visited public page leaves a SW that serves the SPA *precached production assets*, and the dev server appears to be running code from weeks ago with **no console error at all**. Symptom: your edits simply do not appear, HMR looks healthy. Fix: unregister the worker and clear the `cone-v*` cache (DevTools → Application, or `navigator.serviceWorker.getRegistrations()` + `caches.delete`), then reload. Check this FIRST when a change does not show up.

**Schema source of truth: `supabase/migrations/`** (`0001_init.sql` — tables, RLS, grants; `0002_rpcs.sql` — `submit_pr`/`clear_pr` used by `me.html`'s PR log sheet; `0003_anon_write_rpcs.sql` — `class_checkin`/`log_result` RPCs + the anon-write revoke, see RLS note below; `0004_class_exec_auth_hardening.sql` — drops prod's `ce_insert_auth`/`ce_delete_auth` and adds `class_executions`' `"auth write"` (#34); `0005_enable_realtime.sql` — adds `tv_state`/`results_v2`/`class_executions` to the `supabase_realtime` publication, local-only fix (prod already has this, confirmed working live at the gym — likely dashboard-configured and never captured before); `0006_lock_business_reads.sql` — drops the permissive `"public read"` on `coach_profile` (Pix key) + `locations` (service rates) so anon can no longer GET them via REST, leaving each table's `"auth write"` (`FOR ALL`, `is_allowed_user()`) to cover the coach's read too (#81); `0007_results_created_at.sql` — adds `results_v2.created_at` (`timestamptz not null default now()`, backfilled to `updated_at`) after #76 stopped the load-time write-back that had destroyed `updated_at` as a provenance signal; `resultToRow` **omits** `created_at` so INSERT fills the default and a conflict-UPDATE preserves it (#76); `0008_class_checkin_guest_cap.sql` — recreates `class_checkin` with `anon_names` **capped at 20** (#71/plans/68). ⚠️ **`0008` is a CAP, deliberately NOT a server-side dedupe** — two real guests can share a first name and both must reach the roster, so the disambiguation is a question the client asks (`Schedule.jsx`'s check-in sheet opens a `ConfirmReview`-family prompt suggesting an initial) and this function stores whatever they confirm. **It is now the baseline #102 must build on** — that row's migration recreates this same RPC and must not restart from `0003`'s uncapped body); `0009_lock_unread_anon_tables.sql` — drops the anon `"public read"` on `events`/`templates`/`results`/`lb_colors` (#150; see the RLS note below, including the legacy-`results` anon INSERT hole it also closed). ⚠️ **`0009` drops `templates`' read policy under BOTH names** — prod's is `"public read templates"`, `0001`'s reconstruction is `"public read"`; enumerating that divergence with `db dump --linked` *before* writing the migration is the only reason it isn't a silent no-op. **`0005`, `0006`, `0007`, `0008` and `0009` are recorded local-only** (`migration list --linked` shows them `remote:""`) — `0005`'s realtime effect already exists on prod, so `supabase db push` would try to re-apply it and error; apply `0006` to prod as the standalone two-line `DROP POLICY` (SQL editor or targeted psql), then `migration repair --status applied 0006`, rather than `db push`. `0007` is additive (`ALTER TABLE … ADD COLUMN IF NOT EXISTS` + a one-time backfill) — apply the standalone SQL to prod, then `migration repair --status applied 0007`, same reason (a `db push` would drag `0005`). `0008` is the same shape — it is a single `CREATE OR REPLACE FUNCTION` + `GRANT`, so paste the file into the SQL editor and then `migration repair --status applied 0008`. The root-level `supabase-schema.sql` / `supabase-schema-v2.sql` / `supabase-auth-policies.sql` / `supabase-rpcs.sql` (the last one lives one level above `cone/`, not inside it) are historical (how the schema was built up via dashboard SQL) and no longer authoritative.

**Prod migration history:** prod's schema predates the CLI migration workflow and was built via dashboard SQL with its own policy-naming conventions that don't always match `0001`/`0002`'s hand-reconstruction (e.g. prod's real permissive-update policy on `class_executions` is named `ce_update_anon`, not `"public update"` — confirmed via `supabase db diff --linked`). `0001`/`0002` were marked applied on prod via `supabase migration repair --status applied 0001 0002` (metadata-only, never executed against prod) rather than replayed — replaying them risks `CREATE POLICY` collisions with prod's existing same-purpose-different-name objects. Any migration touching a table that existed before `0001` should use `IF EXISTS`/`IF NOT EXISTS` and not assume `0001`'s policy names are what's actually on prod — enumerate prod's real policies with **`supabase db dump --linked --schema public`** (authoritative — pg_dump emits every `CREATE POLICY`). Do **not** trust `supabase db diff --linked` for this: its pg-delta engine reported "No schema changes found" on `class_executions` while the dump showed prod actually had `ce_insert_auth`/`ce_delete_auth`/`ce_select_anon` and no `is_allowed_user()` policy (#34) — the diff engine silently ignores RLS-policy divergence. `templates`, `tv_state`, and `settings` are also known to have real prod policy names that diverge from `0001`. (Also: `supabase db push` may print a `pg-delta` "failed to cache migrations catalog … ENOENT pgdelta-target-ca.crt" warning *after* "Applying migration …" — that's a cosmetic post-apply catalog-cache step; the DDL still commits. Confirm via a re-dump + `supabase migration list --linked`.)

**Schema:** 11 single-row JSONB blobs (id=1, value=JSONB: `sessions, athletes, results, events, locations, coach_profile, settings, exercise_registry, goals_data, lb_colors, templates`), plus `results_v2` (normalized), `tv_state` and `class_executions` (both hand-reconstructed into the migration from code + docs — see TV system section below).  
**RLS:** anon read is **no longer read-all**. **Six** tables are locked to `is_allowed_user()` reads: `coach_profile` + `locations` (`0006`, #81 — Pix key + service rates) and `events` + `templates` + `results` + `lb_colors` (`0009`, #150 — the coach's agenda incl. free-text notes, session templates, the legacy v1 results blob, and a table with no references left in `src/` at all). 🔑 **The principle behind both migrations, and the one to apply to any new table: a `"public read"` policy is justified only by a real public-page `.from()` call site** — all six had zero, mapped call-site by call-site. Each keeps its own `is_allowed_user()` write policy, which is **`FOR ALL` (no `FOR` clause) and therefore covers the coach's read too** — that is the mechanism the lock depends on, so if you touch one of these policies, verify an *authenticated* read or you blank the coach's tab. ⚠️ **`0009` also closed a WRITE hole:** legacy `results` still had a permissive `"public result insert"` **plus** `GRANT ALL … TO anon`, so the public anon key could insert rows into it — #7/`0003` closed exactly this on `results_v2` and never touched the v1 table. Write is otherwise restricted to `is_allowed_user()` everywhere. ⚠️ **The login gates writes AND these six reads — but every *other* table is still anon-readable**, so the SPA email login is not a general read gate; a scoped `?box=` link (#80) is a view filter, not access control. `results_v2`/`class_executions` direct anon INSERT/UPDATE closed (#7, `0003_anon_write_rpcs.sql`) — anon writes now go through `class_checkin`/`log_result` RPCs only. The authenticated-role gap on `class_executions` (prod's `ce_insert_auth`/`ce_delete_auth` scoped INSERT/DELETE to `auth.role()='authenticated'`, not `is_allowed_user()`, so an open-signup non-coach session could forge/delete class rows) is closed by #34 (`0004_class_exec_auth_hardening.sql`): it drops those two and adds the canonical `"auth write"` (`is_allowed_user()`, `FOR ALL`) — which prod's dashboard-built `class_executions` never had, so `0004` also **restored coach UPDATE** (end-class/live-registration/rotation) that `0003` had inadvertently removed on prod by dropping `ce_update_anon` with no `is_allowed_user()` fallback in place. Prod `class_executions` is now `auth write` (all writes) + `ce_select_anon` (public read); anon check-in stays on the `class_checkin` RPC.

---

## TV system

**Files:** `src/components/tabs/TvController.jsx` (SPA controller, desktop layout: full-width Sessão date-picker + two-pane grid — see `src/components/tabs/tv/tvController.module.css`) + `src/public/tv/TV.jsx` (display) + `src/public/tv/TV.module.css`

**Data flow:**
1. TvController calls `push(patch)` → upserts `{ id: 1, ...patch, updated_at: Date.now() }` to `tv_state`.
2. TV.html subscribes to `postgres_changes` on `tv_state` → receives delta → re-renders.
3. `push()` is **patch-only**. Never include local-only fields that are not DB columns — they poison the upsert and freeze all subsequent updates.

**Controller class roster (`tv/ClassPanel.jsx`):** every class started today renders as an accordion card (active one auto-expanded, live-updated via `class_executions` realtime subscription already in `useClassTracking`); ended classes render the same roster read-only. Roster rows merge ranking + live registration + editing (`useLiveRegistration.js`) for both real athletes (`results_v2`, keyed by `athlete_id`) and guests (`class_executions.anon_results`, keyed by name — day-scoped only, deliberately not in `results_v2` since guests don't need durable cross-day tracking). "Registrar" captures the live timer elapsed as `perfTime` (mm:ss string, `For Time` blocks only); "Editar" reveals scale + a manual mm:ss field to overwrite (covers both corrections and misclicks).

**tv_state columns (source of truth: `supabase/migrations/0001_init.sql:177-195` — plans/04 landed; the list below matches it):**
```
id                   INTEGER   PRIMARY KEY (always 1)
slide                TEXT      'blank'|'wod'|'timer'|'results'|'qr'
class_id             TEXT
session_id           TEXT
date_key             TEXT
timer_block_id       TEXT      (code reads/writes timer_block_id — NOT block_id)
timer_type           TEXT      'For Time'|'AMRAP'|'EMOM'|'TABATA'|...
timer_cap_secs       INTEGER
timer_paused_elapsed INTEGER
timer_started_at     BIGINT
timer_paused         BOOLEAN   (CONFIRMED unused by code — 0 hits, verified 2026-07-16)
group_positions      JSONB     { [groupId]: blockId }
rotation_block_ids   JSONB     DEFAULT '[]'   (empty = all WOD blocks)
rotation_rest_secs   INTEGER   DEFAULT 0
rotation_rest_until  BIGINT    DEFAULT NULL
show_qr              BOOLEAN   DEFAULT TRUE
updated_at           BIGINT
```

**Block/exercise rendering** — three separate render paths that must always be kept in sync:
1. `TV.jsx` → `BlockCard` (WOD slide)
2. `TV.jsx` → `TimerSlide` right panel
3. `src/public/schedule/Schedule.jsx` → exercise rows

**Shared components (`src/public/shared/`)** — each renders in the gallery:
- `ExerciseList.jsx` — read-only exercise rows. **Sizes: `grid` (tiny's scale with a 12px name, Criador week column) · `tiny` (12–15px, phone/web — LogPane, WodBlockCard) · `compact` (22–26px, TV-wall scale) · `large` (30–42px, TV).** `compact` is *not* a web-page size; picking it for a phone card is the mistake #51 made and fixed. **`grid` exists because `tiny` is shared** — a 200px column needs the 12px name and the intensity on its own line (inline, `63/70/75/80/85 %` clips at the column edge), and `tiny`'s other consumers are not in a 200px column. Its body is a **text block, not a flex row**: `flex-wrap` split the vol off onto its own line whenever the name was too long to sit beside it, so vol and name are inline and wrap as one run, and only `ins` is forced to break.
- `RankList.jsx` — the one ranking list (leaderboard + both results panes; 3 divergent copies collapsed in #51). Scale/perf are fixed **left-aligned** columns; rows go **two-line via a container query** (`@container (max-width:400px)`) because the list is narrow both on a phone and inside results' 300px desktop pane. Podium via `--podium-*`. TV's podium rows deliberately stay separate (wall-display CSS).
- `AccordionCard.jsx` — the disclosure shell behind results' `SessionCard` and leaderboard's `WodCard`. One keyboard contract / `aria-expanded` / chevron; the two headers stay separate because they carry different data.
- `WodBlockCard.jsx` — the WOD above a ranking (family rule + type badge + `ExerciseList`, then date · session footer). Same shape as TV's `BlockCard`.
- `ScaleFilter.jsx` — the scale pills (leaderboard rendered them twice, results had a third copy). **Lives in `shared/`, not `leaderboard/`** — #51 moved it and left `Gallery.jsx` importing the old path, which made `gallery.html` a hard 500 until #52 noticed. The gallery is dev-only and never built, so **no CI gate can catch a broken import there** — open it after touching it.
- `TallyBar.jsx` — **the app's one bar primitive** (Design mockup 24; replaced `SegBar`, #52's version). Used by me.html's goal bars + milestone ticks, its adherence bars (WODs/Distribuição), its PR mini-gauges + detail bars, and (plans/22) the Desenvolvimento stats card. **Reads in tens:** always 10 blocks of 10%, and the one block the value lands inside subdivides into 10 units — countable at a glance, still 1%-accurate where the value is. Always 10 blocks *whatever the denominator*: the caller turns its own "5 / 6" into a percentage and keeps printing the literal numbers beside the bar (a block-per-real-unit variant was designed and rejected — it degrades to hairlines past ~50 units). The three copies `SegBar` originally replaced each faked their segments with a `repeating-linear-gradient` that had the **dark theme's background baked in as a literal `rgba(13,11,9,.65)`**, so both light themes painted dark bands across the bar; every divider here is a real element in `var(--bg)`. Ticks are siblings of the blocks and only each *block* clips, so a milestone at 0%/100% isn't sliced in half — `SegBar` needed a separate non-clipping wrapper for that, this doesn't.

⚠️ **Shared components must not depend on the `ti` icon webfont.** `results.html`/`schedule.html`/`gallery.html` load it; **`leaderboard.html` does not** (it uses `@tabler/icons-react`). Icons in `shared/` come from `@tabler/icons-react` — a `ti` class there silently renders nothing on the leaderboard.

**Shared rendering:** `src/public/shared/ExerciseList.jsx` is the shared (read-only, compact) exercise-row component — TV uses it for both paths. Schedule.jsx still renders its own *interactive* markup (`ExRow`: check-off/rounds, RM chip+calc, Demo, progression-step expansion) — full markup adoption stays open under #17, deprioritized 2026-07-05: TV's big-font wall-display CSS and Schedule's dense pill/checkbox interaction model diverge enough that unifying markup would mean a new CSS variant for no visible change, on a page used live at the gym. `exVolStr`/`fmtIntensity` are **canonical-only** in `src/public/lib/wod.js` — #37 deleted the diverged local copies in `Schedule.jsx`/`Publicador.jsx`/`Resultados.jsx`; all re-import from `wod.js`. Progression-step grouping (`steps → {reps,loads}[]`) is canonical for `Schedule.jsx`'s own 4 call sites via `groupProgressionSteps()` in `wod.js` (2026-07-05) — **not yet cross-file canonical**: `publicador/exportHelpers.js`'s `buildProgressionLines()` still hand-rolls the same grouping independently (keyed on `reps`+`unit`, not just `reps`), so a grouping-semantics fix applied only to `wod.js` won't reach the printed/exported WOD view (tracked under #45). Estações: TV intentionally flattens stations into one exercise list (glanceable wall display) while Schedule renders full station structure (canonical detailed view) — a recorded decision, not drift (see BACKLOG.md "Decisions recorded").

---

## Shared utilities (`src/public/lib/`)

- `wod.js` — `uid`, `WOD_TYPES`, `isWodBlock`, `TIMER_TYPES` (#70 — the WOD types a timer can drive; a semantic subset of `WOD_TYPES`, not derived from it), `blkColor`, `blkLabel`, `exVolStr`, `groupProgressionSteps`, `toSecs`, `fmtSecs`, `maskMMSS` (#54 — the mm:ss input mask behind `MaskedTimeInput`; a mask not a validator), `rankResults`, `perfStr`, `fmtIntensity`, `SCALES`/`SCALE_COL`/`scaleColor`/`scaleLabel`/`deriveScale` (#51). `perfStr` renders a capped For Time athlete as `"N rds (DNF)"`, not `—`. (`loadRegistry` is `src/utils/storage.js`, SPA-side localStorage cache — not a `wod.js` export.)
- `registry.js` (#62) — `normExName`, `ALIASES`, `buildRegistryIndex`, `resolveExercise`: the one path every coach-typed-name→registry lookup goes through (demo videos, #38 ghost defaults, PR category tagging). Raw exact-lowercase equality at each consumer joined only ~12.7% of real prod exercise names (the registry is English long-form; the coach free-types shorthand/pt-BR and 57% of names carry stray whitespace) — `normExName` (trim/casefold/accent-strip/whitespace-collapse) + a hand-authored `ALIASES` table (real prod-data diff, not guessed) gets that to 51.3% on the same sample; the remaining misses are compound prescription notation (`"1 MUSCLE + 3 FRONT 3\""`, `"A- 3 SNATCH BALANCE"`) that isn't a single exercise name. Match-only: never rewrites what the coach typed. `buildRegistryIndex` returns a `Map<normKey, entry>` with a `categories` array per entry (every block family it's tagged under) — build once per registry fetch, pass the Map to `resolveExercise` for repeated lookups (`ExRow`/`DemoPanel`'s `demoMap` prop is this Map, not a plain object, since #62). **#94 (2026-07-25) took prod's unresolved rate 58.5% → 43.4% by generalizing the resolver instead of growing the table** — four rules, all match-only: (1) `stripVolumeNoise` peels leading distance/duration/rep-scheme/per-side (`8/8` = 8 each side)/cal/zone/`heavy` prescriptions, and a unit letter must be followed by a non-letter or the `s` in `"5 Strict…"` reads as seconds and mangles the name; (2) an entry named `Movement (SH)` is auto-indexed under its base name **and** the shorthand, so `Single Under (SU)` answers to `SU` — **this is the naming convention for new entries**, and a parenthetical only counts as a shorthand when it's a short all-caps token (keeps `Remo (Ergômetro)`/`(banded)` from becoming keys); (3) every hyphenated entry is also indexed spaced, because `normExName` keeps hyphens for `rootGroup` so `"Pull Up" ≠ "Pull-up"`; (4) a trailing plural is a last-resort fallback (guarded so `Press` isn't cut to `Pres`). `buildRegistryIndex` is **two passes** — every real name is indexed before any derived key, so a derived key can never shadow a real entry. ⚠️ **Every `ALIASES` value must be an EXACT existing entry name**; a value naming a missing entry is a dangling pointer that silently resolves to nothing (prod shipped `'run'/'sprint' → "Corrida"`, an entry that never existed — the real one is `Run`). `scripts/audit-session-registry.mjs` now reports danglers against live prod each run.
- `exerciseGroups.js` (#55/#87 · plans/38 · mockup 45) — the Exercícios catalog grouping, 3 pure pieces the tab composes (no client): **`FAMILY_GROUPS`** (the 4 movement families the category column groups under — WOD·Força·Ginástica·Condicionamento — each mapping a disjoint set of the 15 registry categories; `familyOf`/`ALL_CATEGORIES`; family colors are DATA colors), **`ROOTS`/`rootGroup(name)`/`groupByRoot(list)`** (curated variation roots: the primary movement of a compound lift is its LAST word — "Snatch Deadlift"→Deadlift, "Push Press"→Press, "Clean & Jerk"→Jerk — so `rootGroup` matches the root whose token-run ENDS rightmost, longest-wins-on-tie so "Strict Pull-up"→Pull-up not Pull; `normExName` keeps hyphens, `tokenize` splits on space+hyphen; `groupByRoot` returns `{groups (≥2 members), singles}`), and **`completeness(ex)`** (the 5-field indicator — `cargas`/`desc`/`musc`/`det` booleans + `video` 3-state `'none'|'unpub'|'pub'` — on the Pane-2 cards, the Pane-3 field labels and the header summary). Grounded + unit-tested against the real 157-name prod registry (`exerciseGroups.test.js`). **Extend `ROOTS`/`FAMILY_GROUPS` here, never at a call site** (same rule as `registry.js`'s `ALIASES`).
- `week.js` — `MONTH_PT`, `MONTH_PT_SHORT`, `DAY_PT`, `DAY_PT_TITLE`, `fmtDate`, `toISO`, `todayISO`, `getWeek`, `dateToWeekOffset` (`DAY_PT`/`MONTH_PT` are UPPERCASE/full-name; `DAY_PT_TITLE`/`MONTH_PT_SHORT` are the Titlecase/abbreviated variants most display call sites actually want — not drop-in for each other, see #16's casing-hazard note)
- `goals.js` — `prBest`, `prPct`, `prDelta` (PR-best-result / progress-% / delta-vs-previous; canonical since #48, 2026-07-05 — collapsed from 3 near-identical copies in `Atletas.jsx`/`Athletes.jsx`/`Me.jsx`)
- `theme.js` (#143 · plans/67) — `THEMES`, `DEFAULT_THEME`, `resolveTheme`, `applyTheme`, **`syncTheme(settings, box)`**: the canonical theme list + resolution, collapsing 3 divergent copies. **Two keys, and the distinction is the whole feature:** `cone_theme_user` is the **visitor's own pick** and always wins; `settings.value.boxThemes[locationId]` is the **box default**, applied only when the visitor has never chosen — which is what lets a box brand its `?box=` link without ever overriding someone who has picked. `applyTheme` also writes the legacy `cone_theme` key, because every entry HTML's pre-paint FOUC script reads that one. Called once per page on the **6** public pages; ⚠️ **`tv.html` is deliberately excluded** (the gym wall has no box scope and is driven by TvController) — a recorded decision in plans/67, not a gap. The theme **defaults live in `settings`, not `locations`**, for the same reason `boxWarnings` does: `locations` is anon-locked by `0006` and a public page cannot read it at all.
- `sessions.js` — `getTargets`, `matchesAthlete` (#70; session-domain, not WOD- or date-domain, so it doesn't live in `wod.js`/`week.js`). Promoted from `me/meHelpers.js` (the copy with tests) over `storage.js`'s and `Schedule.jsx`'s untested equivalents; both now re-export from here. **`normalizeSessionIds(blob)` (#110/plans/46) is the session-id type-mismatch fix** — `uid()` (`wod.js`) has returned a base36 **string** since mid-June 2026, but sessions created before that carry a raw `Date.now()+Math.random()` **number**; `results_v2.session_id` is `text` and every writer does `String(sessionId)`, so a numeric session id never `===` its own results (a re-log inserted a second row instead of merging — the worst of ~12 broken comparison sites). Call it at every point sessions enter the app rather than coercing at each comparison site (that's how the bug came back before): `storage.js`'s `loadLS`/`syncFromSupabase` (SPA) and each of the 6 public pages' own `sessions` fetch (`Index`/`Schedule`/`Results`/`Me`/`Leaderboard`/`TV` — there's no shared public loader, see #82). Pure, idempotent, a missing id gets a fresh `uid()`. The one-time blob fix for the 7 already-numeric prod sessions is `scripts/normalize-session-ids.mjs` (dry-run by default; `--write` only applies locally — prod has no service-role key in this repo, so it prints a `jsonb_set` UPDATE to paste into the SQL editor instead, per the migration workflow below).
- `blobTables.js` — now exports only `mapResultRow` (the `results_v2` snake→camel mapper), the widely-used half: `Me.jsx` was hand-writing a fourth copy of it until #52, and `src/utils/resultMappers.js`'s SPA-side `rowToResult` aliases it since #70. **`BLOB_TABLES` (the old 8-table fetch-order array) was removed in #81** — #52 retired its `athletes.html` consumer and #81 trimmed `Leaderboard.jsx` to fetch only the 3 tables it uses (`sessions`/`athletes`/`settings`), dropping the 5 dead round-trips (incl. the now-anon-locked `coach_profile`/`locations`). `scripts/seed-dev.mjs` keeps its own private copy of the list for the dev snapshot.
- `results/resultsHelpers.js` — results.html's pure helpers (`calcKpis` one calculator/two variants, `blockEntries`, `cardSummary`, `sessName`, `blkMeta`), mirroring `schedule/scheduleHelpers.js`
- `boxScope.js` (#80) — `getBoxScope`/`inBoxScope`/`clearBoxScope`/`sessionBoxIds`, the per-box **soft** view scope. A `?box=<locationId>` param filters every public page's session list (`inBoxScope(s, box)` alongside `s.public !== false`); it sticks via `cone_box_scope` localStorage (mirrors `cone_athlete_filter`) and `Nav` carries it across tabs, **deliberately with no visible indicator** — a `?box=` link is handed to testers/a specific box's members so they see "their" schedule without it looking filtered; a Nav banner surfacing the active scope was built and then reverted the same day (2026-07-19) once this was clarified as the intended behavior, not a bug. `?box=all`/empty clears. **View filter for sharing/testing, NOT access control** — sessions/athletes/results are anon-read-all, so a scoped link only tidies what's shown (real per-athlete/per-session gating is #30/#31; #81 separately closed the `coach_profile`/`locations` read leak, but hidden `public:false` sessions stay bypassable until `sessions` normalizes out of its single JSONB blob). **Partition, not overlay (2026-07-19):** a session's box tags put it in exactly one audience — untagged ("Sem box") sessions show only in the unscoped/all view; a session tagged with one or more boxes shows only under a scope matching one of those tags, and is hidden from the plain unscoped view. `sessionBoxIds(session)` is the one place that reads a session's tags: canonical field is `locationIds` (array, multi-box — same "toggle to add/remove" UX as exercise categories), with a read-side fallback to the legacy singular `locationId` for sessions saved before multi-box support (never written for new saves). Set in Criador's box picker (multi-select toggle chips, `criador/SessionMetaModal.jsx:42,50` — it moved out of the container with #58 and again with #74-C) — "Sem box" is the 0-tags state, not a tag. **Box warnings (#53):** the index's "Avisos do box" reads `settings.value.boxWarnings` — a **dated list** `[{ id, date, message, box, active }]` (`box` = a `locationId` or `'all'` gym-wide); it shows the 3 most recent active in-scope ones (desktop strip) / 1 (mobile), bolding the message part before `' — '`. The coach manages the list via `criador/BoxWarnings.jsx` (add/date/message/on-off/delete; state and handlers live in `criador/useBoxWarnings.js` since #74-C, consumed by the container and passed down as props) scoped to the same `selBox` selector (Criador's own single-select browsing filter, owned by `criador/WeekGrid.jsx` — unrelated to a session's own multi-box tags). Stored on `settings` (anon-readable), **not `locations`** (anon-locked by #81, and the index is anon).

Always check these before reimplementing a formatting or date utility. `src/utils/storage.js` (SPA side) re-exports `uid`/`toISO`/`todayISO`/`getTargets`/`matchesAthlete` from these modules rather than reimplementing them (#16, 2026-07-05; `getTargets`/`matchesAthlete` added #70) — one canonical implementation, imported via either path. `Resultados.jsx` was the last SPA holdout still forking `wod.js`/`week.js`/`goals.js` constants directly; #70 folded it in.

---

## Design system

**TotK CSS variables (`themes.css` at the repo root — 4 themes as `html.theme-*` classes):**
```
--bg:#0d0b09  --stone:#161210  --stone2:#1e1a16  --divider:#2a231c  --border:#4a3e30
--gold:#d8a840  --gold2:#b88820  --teal:#4ac8c0  --cream:#f0e8d0  --red:#fa3c3c
--sub:#c8b090  --muted:#806850  --dim:#554a3a
```
**Contrast is measured, not assumed** — the standing table is #14's row in BACKLOG.md; re-run it before touching any of these (#43 adds four more themes and inherits the method). #137/plans/65 fixed the three cells it owned: `--red`/`--err` (identical values, always moved together — text only, never a fill) went 3.23–3.69:1 → **4.58–5.40:1** on the two **dark** themes by an exact per-channel scalar, so the hue is untouched and the light themes are unchanged; sb-light's `--teal`/`--accent`/`--cyan` went `#1490a0` → `#0f727e`, clearing **both** `--accent-text`-on-`--teal` (3.80 → 5.63, the `.rpeBtn.on`/`Button` primary pairing plans/57 deferred here) and `--teal`-as-text-on-`--bg` (3.34 → 4.95) from one token. ⚠️ **`--gold` on light themes (3.79 totk-light / 4.49 sb-light), `--muted` on darks, `--dim` in all four, and `--green` on sb-light (2.93) still fail and are #14's, deliberately not touched here** — they are palette-identity colors used app-wide, not a scoped fix.
- `var(--card)` is NOT defined — it resolves to transparent, so use `var(--stone)`/`var(--stone2)`. (Historical: the codebase is **clean** as of 2026-07-16 — 0 usages remain. Kept as a don't-reintroduce note, not a live defect.) All 4 themes define exactly the same **29** tokens, verified (one of them is `--font-mono`, added #53/4·C — a theme-invariant system-mono stack; TV numeric readouts + the index ranking use it). **There are no undefined-token references left in the repo** — #99/plans/40 deleted `src/App.css` (which nothing imported and which held all 5 of them) and dropped the unused `--lb-font`, taking each theme 30 → 29. **The `:root` fallback block *also* carries theme-invariant geometry (#54/C0): `--sp-1..--sp-5` (4/8/12/16/24) + `--radius-sm:4px`/`--radius-md:6px`. These live only in `:root` (not the per-theme blocks) on purpose — spacing/radius don't vary by palette, and keeping them out of the theme classes preserves the per-theme token count. Every page loads themes.css, so `src/public/shared` primitives inherit them.**
- **`index.css` is triaged, and its comments are load-bearing (#99 · plans/40).** Every rule carries one of three ownership tags: **`GLOBAL`** (keep + tokenize — the only bucket worth tokenizing) · **`TAB-OWNED → <tab> #NN`** (24 of them — leave in place; the named design pass moves it to that tab's `.module.css` and deletes it here) · **`DEAD`** (deleted on a zero-consumer grep). **A C-session reads its own `TAB-OWNED` tags instead of re-deriving what belongs to it.** Evidence is per *selector*, never per section — the Criador block looks wholly dead but `blk-row` has 0 refs while `intensity` has 57. File is 800 raw lines / 237 hex after the pass.
- **`var(--border)` = stronger (card outlines + form controls); `var(--divider)` = subtle (internal separators) — and since #137/plans/65 (2026-08-04) this is TRUE IN THE CODE.** The two were **byte-identical in all four themes**, so every call site that "chose" between them chose nothing; that was the direct cause of #134 (a `.notesToggle` at `--divider` measured identical to the `<input>` at `--border` beside it). `--border` is now derived **per palette** — two of the four themes are light, where "stronger" means *darker* — as the point on that palette's own `--div → --muted` ramp measuring **1.50:1 against `--divider`**, which lands it at **1.80–1.98:1 against `--bg`** in every theme (`--divider` is 1.18–1.33). ⚠️ **`--divider` itself did NOT move** — it is ~330 of the ~360 call sites, and moving it would restyle the whole app; `--div` remains its legacy alias, still equal to it. **Token count is unchanged at 29 per theme** (both already existed) — verified programmatically, as this file's other 29-token claims are. 🔴 **The corollary the change exposed: ~150 full-box borders across page-level CSS are on `--divider` and now render a step weaker than the ~28 on `--border`.** That is not automatically a bug — containers/inputs strong, inner chips/KPIs hairline reads coherently, and `AccordionCard`'s `.card`(divider)/`.expanded`(border) pair became *better*. plans/65 reclassified only the two **shared primitives** whose mismatch is visible side by side (`ui/Input` and `shared/MaskedTimeInput`, both form controls, both → `--border`; the latter renders in the same `.numRow` as `ScoreFields`' `.input`). Everything else is each page's own design-pass call — check the pair deliberately when you touch a page's CSS.
- No **rounded rectangles** on public pages — but `border-radius: 50%` (true circles: timer ring, avatar badges, dots) is an exempt shape primitive; pills (`999px` ends) count as rounded rects and get squared. Minimal radius on SPA components → `--radius-sm`/`--radius-md` (#54/C0). (Settled 2026-07-09 — BACKLOG "Decisions recorded".)
- **Any focusable form control on a public page is ≥16px** — iOS Safari auto-zooms a focused control under that size, and `user-scalable=no` does not suppress it. Rediscovered three times before finally being written down here instead of re-found a fourth: `ui/Input.module.css` (`font-size:16px` comment), `shared/MaskedTimeInput`, and `shared/ScoreFields`' `.input` (#155/plans/74 — which also un-inverted `schedule.html`'s `.lpSelect`/`.rmInput`, given 16px only at `≥768px` and 13px on the phone, backwards for a phone-only bug).
- **SPA UI primitives (#54/C0 — the standard C1–C5 adopt, page-by-page, *replacing* the global `.b`/`.bp`/`.bsec`/`.bd`/`.tb-btn` zoo, not wrapping it):** `Button` (primary/secondary/destructive/ghost × md/sm/xs; destructive = `--red`; icon-only requires `aria-label`), `Input`, `Card` live in **`src/components/ui/`** (SPA chrome; **client-free by rule** — the gallery renders them, so no Supabase import, direct or transitive). `ConfirmReview` (one `role="dialog"` confirm shell — focus-trap, Escape→Editar, canonical labels "Revisar registro"/"Editar"/"Confirmar"; collapses the 3 old forks) + `MaskedTimeInput` (#35, mm:ss) are cross-surface (public consumers too) → **`src/public/shared/`**. All token-only; hover via `filter`/`color-mix`, never hex. Built + gallery-covered in C0; **C1 (Exercícios/Config), C2 (Atletas/Afiliados) and C4 (Criador) have adopted them — C3 (Resultados) and C5 (Publicador+Agenda) are next.**
- Font: `var(--font)` → Cinzel (TotK themes) or Amarante (Spirit Blossom themes). Loaded weights (`src/fonts.js`): Cinzel **400/500/600/700/800/900** (500 + 800 added in #52, the first session to touch a weight-800 use), Crimson Pro 400/600, Amarante 400 **only** — Amarante ships no bold upstream, so its synthesized bolds are by design.
- All UI strings: pt-BR.
- **Design process is component-driven, two lanes (WORKFLOW.md "Design work"):** the all-states source of truth is the **in-app component gallery** (`gallery.html`, dev-only), which renders the *real* components — Lane A (changing existing UI) is gallery-first, no static mockup; Lane B (net-new) does a Claude Design ideation mockup first, then the built component enters the gallery. The moment code exists, the gallery is the truth — never hand-maintain a mirror. Claude Design (`cone/design/` → "Cone Design System" project) is token canon + **generated component cards** + Lane-B ideation + a screenshot archive, not a mirror.
- **Component gallery:** `gallery.html` (repo root) + `cone/src/public/gallery/` — theme switcher + width toggle rendering the real components in every state from mock fixtures. **Decomposed #74/plans/41 (2026-07-26, pure move — `Gallery.jsx` had grown to 1790 lines, the fastest-growing file in the repo, and every design pass edits it):** `Gallery.jsx` is now the ~95-line shell (theme `<select>`, width toggle, sidebar) that imports and composes `GROUPS` from `gallery/groups/*.jsx`; `gallery/fixtures.js` holds the pure-data mock fixtures shared across groups (exercise/session/result shapes); `gallery/harness.jsx` holds the 6 generic render shells (`Case`/`Section`/`FixedFrame`/`ModalBox`/`TallModalBox`/`ScrollFrame` — the last one added with `AppChrome`, #95/plans/69: same `transform:translateZ(0)` containment as `ModalBox`, but scrollable with tall filler so a `position:sticky` element can demonstrate actually sticking); each of the 11 groups (`spa.jsx`/`criador.jsx`/`atletas.jsx`/`afiliados.jsx`/`shared.jsx`/`results.jsx`/`leaderboard.jsx`/`me.jsx`/`schedule.jsx`/`index.jsx`/`tema.jsx`) owns its own items array plus any fixtures/stateful demo wrappers used only by that group (e.g. `MeSheetHarness`, `LbMobileDemo`, `StubTypePicker`) — co-located with their sole consumer rather than centralized, since every demo wrapper turned out to be single-group. `GROUPS` holds **75** items (re-measured 2026-08-29; #161 grew the `Afiliados` group 7 → 11 adding the rail + the two-direction pair + the month's sessions + the receivable rail) across **SPA**/**Criador**/**Atletas**/**Afiliados**/Shared/Results/Leaderboard/Me/Schedule/**Index**/Tema (the **SPA** group = the #54/C0 primitives `Button`/`Input`/`MaskedTimeInput`/`Card`/`ConfirmReview` plus **`AppChrome`** (#95/plans/69 — the SPA chrome bar + sidebar, 7 cases incl. sync states, the conflict banner and the sticky-scroll pin); the **Criador** group = #92's text mode (`SessionTextPane`/`BlockTextEditor`/`WeekSessionCard`/`WeekImportModal`) plus #58's `GoalInput`/`SessionMetaModal`; the **Atletas** group = #160's `AthleteGrid`/`AthleteCard`/`DayGroupHeader`/`Ficha`/`SinceLastOneOnOne`/`PresenceGrid`/`CoachNotePanel` plus C2's surviving `PrRow`/`GoalBar`/`GoalConfigPanel` + its 3 modals; the **Afiliados** group = `PaneTabs`/`AffiliateRail`/`AffiliatesPane`/`DirectionPair`/`AffiliateSessions`/`ReceivableRail` (#161) plus C2's surviving `AffiliateRow`/`AthleteAssignment`/`MeuPerfilPane` + its 2 modals; the Index group = the #53 landing-page pieces: `WeekGrid`/`DaySessionCard`/`DayRanking`/`BoxWarnings`, all from `src/public/index/rail.jsx` — `WeekGrid` carries a second case for its Criador day-strip use, `filter`+`showCount`), picked from a sidebar. (The SPA group's card generates as `design/components/spa.html` — `design:cards` derives the filename from `group.toLowerCase()`, so that group name is a single clean token, not "SPA / UI".) **Dev-only:** NOT in `vite.public.config.js` `input`, so `npm run dev:public` serves it at `/CrossFit-Apps/gallery.html` but it is never built/deployed. Grows page-by-page as components are extracted (#17).
- **`npm run design:cards`** (`vite.design.config.js` + `scripts/build-design-cards.mjs`) SSRs the gallery's exported `GROUPS` into the self-contained Claude Design cards — real markup + real CSS + inlined themes/fonts + a 4-theme switcher — so Claude Design can read and compose from actual component markup. Cards are a **build artifact: never hand-edit one**, change the component and re-run (Lane A ends with regenerate + sync). Cards can't load the `ti` webfont or any external URL (CSP), so `results`/`schedule` cards show blank icon gaps — expected, noted on the card itself. `tokens/palette.html` is generated from `themes.css`, which is what finally killed its 13-vs-29 token drift. Details: `cone/design/README.md`.
- Design-pass program (restructured #27/#28, sessions #49–#59): `docs/plans/16-design-pass-program.md`. Product docs: `docs/FEATURES.md` (feature catalog + gate candidates), `docs/PRODUCT.md` (personas/tiers), `docs/MOBILE.md` (Android/iOS assessment — do nothing until a trigger fires). Consolidated interactive view: `docs/site/cone-docs.html` (open via `file://` — repo-only, NOT in the deploy whitelist by design; interactive tier board + coach-services worksheet for the tier meeting, full screenshot baseline in `docs/site/img/`; snapshot of the .md docs, regenerate on request).

**Data colors — exempt from tokenization (they identify a thing, so they must stay stable across all 4 themes):**

*Block families* (`blkColor`, `lib/wod.js`):
- RED: WOD / HIIT / MetCon
- AMBER: EMOM / For Time / AMRAP / Estações
- BLUE: Força / LPO / Core / Acessórios
- GREEN: Aquecimento / Skill / Cardio / Mobilidade

*Scales* (`SCALE_COL` / `scaleColor()`, `lib/wod.js` — canonical since #51): RX teal · Inter orange · SC violet · Adaptado warm-grey, plus one fallback grey. This reconciled two diverged copies (`Results.jsx` had Inter orange, `Athletes.jsx` had it gold; Results' red Adaptado collided with the RED block family and misread as an error). **All public pages are on it since #52** — `me.html` was a *third* copy that painted SC orange and Inter blue (the same result showed a different-colored badge depending on which page you opened), and `athletes.html`'s copy retired with the page. `scaleLabel()`/`SCALE_SHORT` gives the short form ("Adaptado" → "Adap") for tight aligned columns.

⚠️ **`exerciseRows` had been a dead write path** (audited #52) until **#116 gave it its first real writer**: `ScoreFields.jsx`'s `ExerciseNotesRows`, a per-exercise adaptation-note row (`{exId, name, note}`) revealed only when the block's `scale` isn't RX. **It still carries no `scale` field of its own** — a deliberate #116 decision — so `deriveScale(blk)` (`wod.js:78`, the ONE place that reads the field itself) still falls through to the flat `blk.scale` on every row: the per-exercise "an athlete who scaled one movement did not do the WOD RX" signal `deriveScale` was built for stays dormant until a future write includes a real `scale`. **Four other files CALL `deriveScale()`** (not the field itself) — `LeaderboardView.jsx`, `leaderboard/Leaderboard.jsx`, `results/resultsHelpers.js`, `me/Me.jsx` — the distinction matters: only `deriveScale` lights up for free from a `scale` write; everything else is net-new UI. Before #116 the only writer, ever, was the retired `legacy/schedule_builder_pt.html` (moved out of the root by plans/48, kept as a reference — see below). [plans/22](./docs/plans/22-athlete-character-stats.md) step 4 now **extends** #116's shape with `{load, loadUnit}` for strength blocks, rather than reviving it from scratch. Do not assume a block's `exerciseRows` carries a `scale` or `load` — check what's actually there.

**`--podium-1/2/3`** (themes.css, all 4 themes): medal colors, tuned per palette. Row tints derive from them via `color-mix()` at the call site — 3 tokens, not 6.

**Exercise data shapes:**
```js
// Standard exercise (dist/distUnit are siblings of sets/reps — #37; exVolStr renders dist first)
{ id, name, sets, reps, dist?, distUnit?: 'm'|'cal', intensity: { mode, ... }, note }

// Complex exercise
{ id, name?, isComplex: true, sets, complexMovements: [{ id, name, reps }], intensity, note }

// intensity modes: 'progression' | 'pct' | 'gender'   (+ legacy 'cardio')
// cardio: LEGACY — the Cardio intensity tab was removed in #37; distance now lives in
//         dist/distUnit. Old { mode:'cardio', cardioVal, cardioUnit } data still renders
//         (exVolStr fallback) and lazy-normalizes to dist/distUnit on edit/save.
// gender: { mode:'gender', Masculino_RX, Masculino_Inter, Masculino_SC, Feminino_*, *_unit }
// Registry entries may carry defaults{sets?,reps?,dist?,distUnit?,intensity?} (#38 ghost loads).
```

---

## Build + deploy

- Dev: `supabase start` (once per Docker session) then `npm run dev` inside `cone/` — talks to the local stack, never prod
- Build: `npm run build` → `dist/`
- Tests: `npm test` (**851 tests across 25 files**, re-measured 2026-08-29 — #161/plans/77 added 6 tests to `affiliateHelpers.test.js` covering the new `monthBounds`/`eventsForAffiliate` — no new file, an existing suite extended; #160/plans/76 before it added 52 tests to `atletasHelpers.test.js` (the 6 grade/ficha helpers: `nextSessionGroups`/`adherence`/`daysSinceNote`/`goalSignal`/`presenceGrid`/`sinceLastNote`, plus `agoLabel`/`lastSessionSignal`) and moved `calcBlockStats` to `public/lib/sessions.js` (still tested via `meHelpers.js`'s re-export)): wod, week, sessions, goals, registry, boxScope, exerciseGroups, resultEntry, theme (`public/lib/`) · entries (`public/`) · meHelpers (`public/me/`) · scheduleHelpers (`public/schedule/`) · pix, resultMappers, storage, config (`utils/`) · blockModel, textFormat (`criador/`) · exerciciosHelpers, resultadosHelpers, stateBackup, billing, atletasHelpers, affiliateHelpers (`components/tabs/`) · useClassTracking (`hooks/`))
- Lint: `npm run lint` (`eslint.config.js`) — gated in CI (below), **clean at `--max-warnings 0`** since #108/plans/51 took the react-hooks correctness cluster 84 → 0 (2026-07-27). The five rules (`set-state-in-effect`/`refs`/`immutability`/`purity`/`static-components`) are back on the plugin's default `error`; there is no floor left to ratchet, so **a new warning fails CI**. Every surviving instance carries an inline disable with a written reason at the site — see the `eslint-disable` policy below
- CI: push to `main` → GitHub Actions → gh-pages deploy (cone/ subfolder); also runs `npm test` then `npm run lint` (plans/43, #32) — a lint regression fails the build same as a test failure

**Chunk hash 404 (GitHub Pages limitation):** After every CI deploy, lazy-loaded chunk filenames change. Old hashes 404 until users hard-refresh (Ctrl+Shift+R). GitHub Pages cannot set `Cache-Control: no-cache`. This is structural — do not re-diagnose, just document and tell the user to hard-refresh.

**`react-refresh/only-export-components` policy (#32/plans/43, 2026-07-26):** two exemptions, both in `eslint.config.js`, not a blanket disable — a new file that trips this rule outside these two carve-outs is a real finding, not noise.
- **`src/public/gallery/**` has the rule off entirely.** It's excluded from `vite.public.config.js`'s `input`, so it is never built or deployed — Fast Refresh correctness there protects nothing, and every gallery group file intentionally pairs its exported items with the fixtures/constants they render.
- **Five production files keep the rule on, but with a per-file `allowExportNames` allowlist** (`AuthContext.jsx`→`useAuth`, `SyncContext.jsx`→`useSync`, `Nav.jsx`→`isNavHidden`, `rail.jsx`→`dayTitle`, `ScaleFilter.jsx`→`FILTER_SCALES`): each pairs one component with exactly one small, stable non-component export that has no other natural home — splitting five two-line exports into five new files costs more than the rule protects. Anything else added to these files still gets flagged.

**React-hooks correctness policy (#108/plans/51, 2026-07-27) — the cluster is at ZERO, so a new warning fails CI.** Conventions established while clearing it; follow them instead of reaching for a disable:
- **A ref passed as a prop MUST be named `*Ref`.** The rule identifies refs *by the name suffix* (its own hint says so), so an unsuffixed ref reads as a plain immutable prop and every `.current =` in a child trips `react-hooks/immutability`. That's why the drag refs are `dragBlkIdxRef`/`dragExIdxRef`/`dragIdxRef`. Same applies to a ref reached through an object (`rotation.rotationCountRef`) — destructure it to a suffixed binding first. **Writing a ref from an event handler is correct** and needs no disable once it's named right.
- **Navigate with `location.assign(url)`, not `location.href = url`.** Identical behaviour (both push a history entry), but a method call rather than an assignment to a browser global. `document.title =` has no method form and is the one place that keeps a disable.
- **Sync state from a prop by adjusting state during render**, React's documented pattern (`if (prev !== next) { setPrev(next); setX(...) }`), not a `useEffect`. Used by `IntensityInput`, `ExerciseCombobox`, `afiliados/CurrencyInput.jsx` (was `Servicos`'s), `TvController`'s `weekStart`. ⚠️ **Except when the sync needs `new Date()`/`Date.now()`** — calling that in a render body is a `purity` violation, so those stay effects with a written reason (AgendaView + RegistroView's month→week reset, Results' auto-select, Schedule's today-session auto-select).
- **Data the render tree reads belongs in state, not a ref** — `Schedule.jsx`'s `demoMap`/`goals` were refs holding fetched data, which is what forced four ref-during-render findings; as state they cost nothing (set in the same batch as everything else `load()` fetches).
- **Seed from a lazy `useState(fn)` initializer, never a mount effect**, when the value is synchronously available (localStorage, `window.location`). Fixed a visible tab-flash in `App.jsx` and two wasted mount renders.
- **Every disable carries a written reason at the site; zero bare disables.** ⚠️ `eslint-disable-next-line` targets the *literal next line* — put the prose ABOVE the directive, and the directive immediately above the reported line (the rule reports the `setState`, not the `useEffect`). Recurring false positives that legitimately get one: a setState past an `await` (the rule can't see the boundary), `Date.now()` inside a handler-only function, and a hoisted `function` declaration used before its definition (no TDZ exists; the rule models it as a `const`).
- ⚠️ **`Timer.jsx` is the one deliberate exception and is documented in-file.** Its `statusRef`/`cfgRef`/`splitsRef`/`finSecsRef` are NOT a latest-ref mirror — handlers write the ref *before* `setState`, the 250ms tick pushes only `forceUpdate()`, and the render body reads the refs. Moving those writes to an effect lands them one frame late on a live wall clock. Don't "fix" it without rewriting the component's state model (plans/51 "Follow-up").

**Always commit + push after completing changes** (user requirement).

---

## Key decisions (do not re-litigate)

- Auth: 8-digit OTP codes, not magic links (Outlook Safe Links breaks magic links)
- No React Router — URL params are sufficient at current scale
- No TypeScript — JSDoc comments if prop shapes need documenting
- All data: Supabase (no local persistence beyond localStorage for UX state)
- Icon library: Tabler Icons (`ti-*`)
- **Exercícios registry is stored alphabetically within each category** (canonical, #55/#87 · C1) — `initRegistry`/`saveDetail` re-sort the touched category on every write. The manual **A→Z button and drag-reorder are retired** (insertion order carried no meaning; the catalog is searched, not hand-ordered). Don't reintroduce drag or an ordering field.
- **Exercícios tab layout is mockup 45** (#55/#87 · plans/38, built) — 3 panes: **Pane 1** categories grouped by family (`FAMILY_GROUPS`) as an **accordion on desktop / flat family-labelled list on mobile** (the whole tab forks on `useIsMobile` into the 3-level drilldown), each category showing a coverage `TallyBar` (% of its exercises with a video URL); **Pane 2** a **card grid** with **variation sub-groups** (`groupByRoot`, singletons under "Avulsos"; Todos shows one section per category, an exercise under each of its categories), sticky search + "+ Adicionar" at the top; **Pane 3** a **2-column detail** (single-column scroll on mobile). Each card + each Pane-3 field label carries the `completeness(ex)` 5-icon indicator (Tabler `ti-*`). **"+ Adicionar" opens a clean blank detail** (no inline name input) with the current category **pre-lit**, footer "Criar exercício", no delete. **Salvar opens a diff modal** (`diffExercise` → Criado/Alterado/Removido per field) instead of a flash. `saveDetail` guards against a create/rename **overwriting an existing name** in a selected category. Not in the component gallery (it's a full tab); mockup 45 in the Cone Design System is the design record.
- Product name: CONE. Gym name from `settings.value.gymName`.
- `session.public === false` = hidden; `undefined` or `true` = public — all **5** session-rendering public pages filter on this (Index, Schedule, Results, Me, Leaderboard; verified 2026-07-16). It was 6 before `athletes.html` retired in #52. `timer.html` reads no sessions; `tv.html` deliberately doesn't filter (next line).
- TvController ignores session visibility — coach always sees all sessions
