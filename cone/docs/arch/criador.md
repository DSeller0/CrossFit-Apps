# Criador — layout + text format

> Split out of `cone/CLAUDE.md` by [plans/95](../plans/95-claude-md-split.md) (#224, 2026-09-20) — the text is unchanged, only its location.
> Criador layout (#58 / plans/37) and the text grammar (#92 / plans/36).
> ↩ back to [CLAUDE.md](../../CLAUDE.md)

---
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
  field in a dialog doesn't need folding). With no athlete picked, "Para quem" names the session's
  **whole audience** (#164 — "Todos os atletas de Eagles", "…do Sem box", or "Ninguém enquanto
  oculta"), mirroring `matchesAthlete`; change the two together. It opens from an **icon-only gear beside
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
refinements: [docs/plans/36](../plans/36-criador-text-mode.md).

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
