# Agenda + Resultados

> Split out of `cone/CLAUDE.md` by [plans/95](../plans/95-claude-md-split.md) (#224, 2026-09-20) — the text is unchanged, only its location.
> Agenda (#59 · C5·a / plans/81), its event filter (#105), recurring series (#106), and Resultados' one surface (#57 / plans/80).
> ↩ back to [CLAUDE.md](../../CLAUDE.md)

---
#### Agenda — the editor

**Agenda → the editor (#59 · C5·a · mockup 62 · plans/81, shipped 2026-08-30)** — `AgendaView.jsx`
is now a **428-line** JSX container (re-measured 2026-09-05) over `publicador/agenda/`, and the answer it is built on is a
structure decision, not a style one. #162 had moved three of this tab's jobs into Afiliados —
`MinhaSemanaPane` (the week), `AffiliateSessions` (an affiliate's month), `Fechamento` (the
invoice). All three are **read-projections by money and none of them writes**; Agenda is the only
surface that writes `events`, and **the only one where `events` meets `sessions`**
(`dayGymSessions` · `linkedSession` · `onEditSession` · `onLogResult` exist nowhere else, and no
Afiliados pane knows `sessions` exists). 🔴 **THE AGENDA IS THE EDITOR** — don't reintroduce a
read-only view here that one of those three already owns, and don't move a write out of it.
- **New files:** `agenda/{CellDay,DayList,DayPane,EventCard,EventFilter,DeleteEventConfirm}.jsx` +
  `agendaHelpers.js` + `Agenda.module.css`, plus `publicador/eventFilter.js` (see below). All
  client-free and gallery-covered (`Agenda` group).
- 🔴 **The day pane is NOT conditional.** The selection is always a real day (today, or the 1st of a
  navigated month). That is what removed the grid reflowing 100%↔60% on every click and the 40% of
  the surface that rendered "Clique num dia para ver detalhes". Don't re-gate it on `selDay`.
- **Two views, one selection: Mês and Lista.** Lista is #105's second half and is **deliberately not
  a second `WeekEventGrid`** — that is a *time-grid* (rows = the times that occur) answering a
  different question, and it lives in Afiliados. It is `renderMobileDayList` **promoted out of the
  `isMobile` fork**, i.e. a fork deleted, not a surface added. ⚠️ The same toggle is what finally
  lets a phone render the month grid: `index.css` had carried `@media(max-width:540px)` rules sized
  for exactly that grid which were **unreachable**, because `useIsMobile(800)` meant it never
  rendered that narrow. Those rules now live in `Agenda.module.css` and are load-bearing.
- **An event with no affiliate says so.** `svcLoc` null used to render *nothing*, so the one
  condition that makes an event unbillable (`calcTotal` produces no line, Fechamento never sees it)
  was invisible on the only surface that can fix it. `EventCard` renders a dashed "sem afiliado" tag
  plus a line naming the consequence. A personal event resolves its affiliate through the athlete —
  the same reverse lookup `EventFormInner` does at booking time.
- 🔴 **#102's reserved slot is in `EventCard`, directly under the coach's manual `athleteIds`, and
  renders NOTHING** (the `atletas/Ficha.jsx` device). **Its empty state is empty** — not "0
  presentes", not "sem check-ins": `events` does not know who showed up, so a zero would be a claim.
  `evStatus` moved to `eventFilter.js` **verbatim** and nothing assumes `status` is a manual toggle
  in its *shape*; labels are **"A lançar"/"Feita"** (what the coach did with the record, never what
  the athlete did). The stats strip counts "a lançar" and never anything resembling attendance.
- **`Agenda.module.css` is token-only** — zero non-data hex, zero non-circle radius literals, and
  (re-verified 2026-09-06 while closing #175/plans/84) zero live `var(--theme-accent)` usage — the
  file's only occurrence of the string is its own file-header comment banning the token; the
  2026-09-05 review's "one survives" claim didn't reproduce. `index.css` went 625 → **556** (the "554" this line used to carry disagreed with the 556 recorded in the Design-system section for the same event; **454 today**): the **7 `rp-*`**, the
  `pub-mobile-*`/`pub-day-*`/`pub-chip-*` and `agenda-*`/`cell-card-*` sets all moved here. ⚠️
  `.rp-sticktop`'s successor `.hdrSticky` keeps `top: var(--spa-sticky-top)` — never 88px.
  `BLOCK_C` stays a **data-colour** map at module scope in `AgendaView.jsx` (per-*type* chip hues,
  not `blkColor`'s 4-family grouping) and arrives at components as inline style.
- **`dayTitle` is built from `DAY_PT_FULL`/`MONTH_PT`, never `toLocaleDateString` + CSS
  `capitalize`** — that combination capitalises every word and rendered "Quarta-Feira, 05 De
  Agosto". `dayTitleShort` is the compact variant for a labelled dialog row.
- **a11y contract:** zero click-`<div>`s (every interactive element is a real `<button>`, not
  `role`+`tabIndex`), every icon-only control has an `aria-label`, cells carry an `aria-label`
  naming the day + item count, `<h1>` for the surface and `<h2>` for the day. `window.confirm` = 0.

#### Agenda — the event filter

**One event filter (#105 · closed by C5·a)** — `publicador/eventFilter.js` is pure (no React, no
client, no storage; 48 tests) and `agenda/EventFilter.jsx` is its client-free UI, with `axes` and
`layout="row"|"column"` so each call site declares what it renders. It is a **superset** of the two
sets it replaced, not a move: Agenda's old tri-state, plus ReportModal's period/type/status/
affiliates/athletes — whose status only ever narrowed to `completed` and whose athlete axis applies
**only to personal events** (a rule that was buried in `filteredEvents` and is now labelled on
screen). 🔴 **The coupling boundary with `groupByLocation`, and the reason the module exports two
predicates:** the athlete rule is needed at **two granularities** — event level (`matchesEvent`:
does this event survive?) and athlete level (`matchingAthleteIds`: which of *its* athletes survive?),
the second because the Relatório fans one personal event with three athletes into three groups.
**The filter owns the predicate at both granularities; the report owns the grouping.**
`groupByLocation` stays in `events.jsx` and calls `matchingAthleteIds` — do not re-implement
`athAll || athSelected.has(id)` there again. `agendaFilter()`/`reportFilter(yr,mo)` preserve each
call site's own opening position (Agenda: no period axis, status `all`; Relatório: this month,
`completed`). ⚠️ `period` keeps `yr`/`mo` **in range mode too** — ReportModal's Pix `txid` reads them
unconditionally, and dropping them would put `undefined` in a payment identifier.

#### Agenda — recurring series

**Recurring series are operable (#106 · closed by C5·a)** — `recurrenceGroup` had been written by
`events.jsx`'s expander since it shipped and **never read back**, so deleting a generated quarter was
~13 separate deletes. `agendaHelpers.js`'s `seriesEvents`/`seriesScopes` + `SERIES_EDIT_FIELDS` are
pure and unit-tested; the three scopes (só este / este e os seguintes / toda a série) live inside
`DeleteEventConfirm.jsx`'s `ConfirmReview`, and appear **only for a real series** (2+ events).
⚠️ **Scope covers delete and edit, NEVER the status toggle** — "this and following" over a state that
describes the past is a false claim — and `SERIES_EDIT_FIELDS` never propagates `date`, `status`,
`id` or `recurrenceGroup`.


#### Resultados — one surface

**Resultados → one surface (#57 · mockup 61 · plans/80, shipped 2026-08-30)** — the tab had three
sub-tabs and **two of them went months without being opened even by their author**, so C3 ran as
**Lane B** and the structure was the finding. **Leaderboard** was a second copy of `leaderboard.html`
(deleted, Phase 0 — the 1080px PNG export died with it, filed **#170** for #59). **Histórico** was
redistributed: *Por atleta* → the Atletas ficha, *Por sessão* → the class header. That left nothing
behind the bar, so **`Resultados.jsx` renders ONE surface** — `resultados/RegistroView.jsx` over a
260px `WeekRail` + the class pane. `HistoryView.jsx` and `cards.jsx` are gone.
- 🔴 **The roster IS the form container.** Three panes became two because `AthleteRow` opens **in
  place** (accordion, one at a time) instead of pushing a form into a third pane. That one change
  retires the 220px roster column, the 10–13px form column, the dashed "Registrar atleta" disclosure
  (which hid the whole class in the normal case — nobody logged yet), `rp-ath-row` vs `rp-add-item`'s
  two visual languages, and mobile's 3-step drilldown with two differently-worded back links.
  **Don't "restore" a detail pane** — the width and the single row-language both depend on this.
- **`Salvar e próximo` is the logging loop**, and it is what replaced the `saveFlash` toast: the row
  collapsing into its logged state with the next unlogged athlete already open IS the feedback.
  Three bespoke feedback mechanisms (two inline delete confirms + the toast) became one
  `ConfirmReview` plus a state change.
- **`ClassHeader` GROWS; it is never an empty KPI grid.** One line + a progress `TallyBar` with no
  data → an inline `RPE · RX% · flags` run → the full four-KPI `SessionKpis` under a disclosure.
  Four blank tiles at exactly the moment the coach wants to type was the alternative. Distribuição
  is a stacked bar in canonical `SCALE_COL` — **this is where the SPA's FOURTH divergent scale
  palette died** (`SCALE_CLS` painted RX green · Inter blue · SC amber; same bug #51/#52 closed).
- **`skipped` (#157) is a real `ATHLETE_KEY_DEFAULTS` key**, not a relaxed gate — see the
  result-shape section below. Its toggle lives in the **block card header** (it changes what the
  block IS, not what its score is) and **removes the fields rather than disabling them**: a greyed
  "RPE —" still asserts the field was considered.
- **The save gate names what is missing.** `saveGate(presence, blockLogs)` is pure and unit-tested;
  a silently-disabled Salvar on a 3-WOD session was #157's user-facing face, and the tempting fix
  (pre-select a scale) is exactly what #61a forbids.
- **Score fields are the shared composed `ScoreFields`** (already Escala → RPE → score) — the
  hand-rolled 10-segment RPE bar and its inline `rgb()` ramp are gone.
- ⚠️ **`index.css` kept the 7 `rp-*` rules AgendaView shares** (until C5·a moved them into `agenda/Agenda.module.css`) (`rp-sticktop` · `rp-month-nav` ·
  `rp-nav-btn` · `rp-month-label` · `rp-weeks` · `rp-week-btn` · `rp-mobile-back`), retagged
  **TAB-OWNED → Publicador/Agenda #59**. ~120 other lines went, and `App.jsx`'s `.res-pane` wrapper
  went with the three rules it existed to feed. ⚠️ **`.fg`/`.lbl` stay; `.b*`/`.pub-pane` are GONE** (re-measured 2026-09-05). The old rule here
  said all four survive because `Publicador.jsx` builds them with `React.createElement`, where a
  `className="b ` grep misses them — **both halves are now false.** C5·b1 converted that file to JSX
  (0 `React.createElement` in it) and C5·b2 deleted the button zoo; `index.css:24-29` records the
  deletion. Only `.fg` (`:32-38`) and `.lbl` (`:31`) remain, and they are **Criador's (#58)**, not
  Publicador's.
- ⚠️ **Three defects that only live verification caught**, all invisible to tests and to the mockup:
  the mobile sheet at `z-index:60` sat **under** AppChrome (100/200) and lost its own header — it is
  **1000**, matching the `ex-sheet` precedent it claims to follow; the week strip side-scrolled
  `Hoje` out of a 260px rail (now wraps, Criador's own recorded call); and the class progress
  `TallyBar` spanned the full pane at 78px/block, reading as a ruler.
