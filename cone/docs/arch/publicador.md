# Publicador — the tab, the renderer, Relatório

> Split out of `cone/CLAUDE.md` by [plans/95](../plans/95-claude-md-split.md) (#224, 2026-09-20) — the text is unchanged, only its location.
> The export tab (#59 · C5·b1/b2/c — plans/82, /83, /81 §C5·c).
> ↩ back to [CLAUDE.md](../../CLAUDE.md)

---
#### Publicador — the tab

**Publicador (#25 · plans/39 → #59 · C5·b1 · plans/82 → C5·b2 · plans/83 → C5·c · plans/81 §C5·c,
shipped 2026-09-04)** —
`src/components/tabs/Publicador.jsx` is the `SchedulePublisher` container, **752 lines** (was
2224 pre-redesign, 574 after b1, grew to 818 with C5·b2's T5–T9 axes then back down once
`useFitAutoShrink.js` — the fit/auto-shrink state machine — was extracted), over
`src/components/tabs/publicador/`: `exportHelpers.js` (pure formatters + `resolveDaySession`),
`layoutHelpers.js` (#59/C5·b2 — `distributeZones`/`zoneColumnWidths`/`visibleWeekDates`/
`monthCellSessions`, the T6 pure helpers), `blockTreatments.js` + `BlockHeader.jsx` (#59/C5·b2 —
the 5 Blocos treatments, T5), `titleHelpers.js` (#59/C5·b2 — per-format computed titles, T7),
`fitCheck.js` + `useFitAutoShrink.js` (#59/C5·b2 — off-screen overflow measurement + the manual
auto-shrink state machine, T9), `exportViews.jsx` (`DailyExportView`/
`WeeklyCalendarExportView`/`CalendarExportView`), `mobileExportViews.jsx`
(`MobileEaglesExportView`/`MobileMegaManExportView`/`MobileWeeklyExportView`), `events.jsx`
(`EventFormInner` + `ReportModal` — see the Relatório/#154 paragraph below), `pixQr.js` (#162/plans/78
— `qrToBase64` extracted from `ReportModal`'s own closure so `afiliados/InvoiceDetail.jsx` can render
an identical Pix QR without a second hand-rolled copy), and **`AgendaView.jsx`** — rewritten by #59 ·
C5·a, see its own section below. ✅ **`src/components/tabs/publicador/` is JSX** (`React.createElement` count = 0 in code — the 3 grep hits there are comments,
repo-wide across `src/components/tabs/publicador/`) — `Publicador.jsx`/`exportViews.jsx`/
`mobileExportViews.jsx` converted first (C5·b1); `events.jsx`'s `EventFormInner`/`ReportModal` (76
calls, the family's actual last holdout — **not** caught by C5·b1's "whole family is JSX" claim,
which predated checking this file) converted last, by C5·c.

**The surface (#59 C5·b1, plans/82)** replaced a toggled preview panel + a 466-line settings drawer
with: **one when-picker** (`publisher/WhenPicker.jsx` — month → week → day, always visible; the day
row greys out rather than disappearing outside the two day-shaped formats), a **5-format rail**
(`publisher/FormatRail.jsx` — Dia · Semana · Mês · Dia mobile · Semana mobile; "story" is not used and
the two gym-named skins, Eagles/MegaMan, are gone from the UI — `diaMobile` still only reaches
`MobileEaglesExportView`, the modelo picker for `MobileMegaManExportView` is plans/83's), a **preview
pane** that's always the true-ratio selected artefact (`publisher/PreviewPane.jsx`, plus
`publisher/ExportStates.jsx`'s three non-happy-path states over `ui/EmptyState`), and a **3-panel
Aparência column** (`publisher/AparenciaPanel.jsx`, a carousel over `OrigemCores.jsx` · `LogoPanel.jsx`
· `TamanhoPanel.jsx` — Blocos/Layout/Títulos are plans/83's, not b1's). `publisher/renderArtefact.jsx`
is the one format→view mapping both the preview and the off-screen `ExportFarm.jsx` call, so it can't
drift between what the coach sees and what gets rasterised. **`ExportFarm` mounts exactly the selected
format** (was 6 always-mounted views) — the two write-only refs (`exportWeeklyRef`/`weeklyRef`) and
the on-screen grid they fed are gone with it; the WhenPicker does that navigation job now. **Baixar
PNG generates the real file first**, then a `ConfirmReview` shows the actual filename and measured
byte size before the download fires — not an estimate.

**The colour model (`publicador/exportPalette.js`)** replaced the ~40-key colour drawer — measured at
the design gate as ~94% a hand-copied `totk-dark` palette (29 of 37 defaults were an exact token) —
with **8 roles** (`EXPORT_ROLES`: `--a-bg`/`--a-div`/`--a-hdr`/`--a-name`/`--a-int`/`--a-note`/
`--a-sub`/`--a-on-accent`) resolved through the SAME `resolveTheme()` every public page uses.
`resolveExportPalette({ themeId, custom })` returns **literal hex, never `var(--…)`** — confirmed by a
standalone html2canvas spike before converting anything: a rasterised PNG must not shift colour when
the coach's own SPA theme changes underneath it. Precedence: `custom` (device-local, `localStorage`
`cone_export_custom`, only under "Personalizado") → `resolveExportThemeId`'s `settings.boxThemes[box]`
(the same key Afiliados' Aparência card writes, see below) → `resolveTheme({settings})` (the coach's
own gym theme). The Origem selection itself is device-local too (`exportSource.js`,
`cone_export_source`, mirroring `boxScope.js`'s `cone_box_scope` pattern). **Family block-colouring is
dropped** (measured: `blkColor`'s 4 families fail the 3:1 bar on both light themes) — every block
header is `--a-hdr` uniformly now. Every export view reads `--a-*` directly and takes **no colour
prop** — `exportViews.jsx`/`mobileExportViews.jsx` lost `dvColors`/`wkColors`/`colors`/`bgOverride`
entirely; `MobileWeeklyExportView` also lost its `variant` prop (`'A'|'B'` differed only by colour,
which is now `--a-*` on both, so there is exactly one Semana mobile view — `MobileEaglesExportView`/
`MobileMegaManExportView` stay separate, they're structurally different, not a colour fork). The ~40
legacy `dv*`/`wk*`/`ea*`/`mm*` `settings` keys are **no longer written and never deleted** — a one-time
"Importar cores antigas para Personalizado" offer (`legacyColorsToCustom`/`hasNonDefaultLegacyColors`)
appears when a device has never touched Origem and the profile's legacy colours diverge from
`totk-dark`. **The per-box theme picker lives in Afiliados now**, not Configurações — see that tab's
own section — writing the same `settings.value.boxThemes[locationId]` key #143 already used, so a
`?box=` visitor's public-page theme, Afiliados' picker and Publicador's Origem are three readers/one
writer of one setting, not three copies.

✅ **`WeeklyExportView` was DEAD CODE and is DELETED (#183 · plans/90, 2026-09-18).** It used to
be the always-visible on-screen week grid (never an export artefact: `doExport` never selected
`exportWeeklyRef`), which is why it kept literal chrome colours and never read `--a-*`. C5·b1 deleted
the grid it fed and left the component, plus the 12 classes / 16 rules at the tail of `Publicador.module.css`
that only it referenced — so those read as live to a dead-CSS sweep, and #184 could not be measured around
them. plans/90 removed component and CSS in one commit (leaving the CSS is what made the false positive);
`utils/config.js`'s `DSHORT` alias went with its last importer. C5·b1's pass also closed two live bugs, not deferred: **B1** — a block with no
`zone` (or the legacy English `'Zone 01'` default) vanished from the Diário export (`byZone` was seeded
with the pt-BR `ZONES` list); fixed via `normaliseZone` (`utils/config.js`), already used elsewhere.
**#113** — Apresentar's QR was repointed at `schedule.html?id=<sessionId>` (built and deployed) instead of
the never-built `log.html`, which stays unbuilt on purpose (it reads/writes the legacy `results` blob
whose anon grants `0009` revoked). ⚠️ **That fix does not work — #113 is superseded by #207.**
`Schedule.jsx:393` opens a session only on `date` **and** `session` together, so `?id=` never reaches
one; it falls through to the athlete-lock branch and writes the **session** id into
`localStorage.cone_athlete_filter` unvalidated. The working convention is `?date=…&session=…`. See
`cone/CLAUDE.md`'s "Never-built legacy HTML" note for the full chain. **#170** (a Leaderboard PNG export) was asked and answered "no."
Format names + the `--a-*` contract, precedence and every acceptance bar: [plans/82](../plans/82-c5b1-publicador-shell-e-cores.md).

🔑 **The client-free boundary inside `publicador/` (#193 · plans/90).** The five gallery-rendered files —
`exportHelpers.js`, `exportViews.jsx`, `mobileExportViews.jsx`, `publisher/PreviewPane.jsx`,
`publisher/WhenPicker.jsx` — take `toISO` from `public/lib/week.js`, never `utils/storage` (which re-exports
the same function but constructs the SPA Supabase client at module scope). `exportHelpers.test.js` no
longer `vi.mock`s storage, so **that file importing at all is the regression guard** for `exportHelpers.js`.
`AgendaView.jsx` and `events.jsx` still import `utils/storage` **on purpose** — they read
`loadLocations`/`getTargets`/`loadAthletes`/`loadCoach`, real client consumers rather than a `toISO` slip;
don't "fix" them the same way.

#### Publicador — the export renderer

**Publicador → the export renderer (#59 · C5·b2 · plans/83, shipped 2026-09-04)** — b1 made the tab
usable and recoloured the artefacts; b2 makes them **parametric**. Four axes, one pass (every view
touches all four, so splitting them would mean touching the same files four times):
- **Layout (T6).** Dia's zone axis **already existed as data** (`block.zone`, `DailyExportView`
  already grouped by it) — this pass makes the always-3 count **choosable** (1/2/3, plus a 2-zone
  50/50-vs-30/70 split) via `publicador/layoutHelpers.js`'s `distributeZones`/`zoneColumnWidths`.
  🔴 **Blocks in a hidden zone COLLAPSE into the last visible zone, never dropped** — the same failure
  mode B1 was, in the same file — and the Layout panel states the fact (`zoneCollapseMessage`,
  *"Zona 03 tem 2 blocos — vão para a Zona 02."*). Semana gets a **7-day, Sunday-start, all-rendered**
  grid with a per-day picker (`visibleWeekDates`, reusing `DAY_PT` — `CAL_DAY_LABELS` is deleted, not
  extended); an unchecked day removes its column, a checked-but-empty day renders the label
  `APP_CONFIG.restDayLabel` (**"Descanso", never an icon** — the public convention, `rail.jsx:67` —
  Criador's own `WeekGrid` says "sem sessão" for the same state, a deliberate divergence: the export
  follows what an *athlete* sees). Mês **drops block detail entirely** and shows, per day cell, up to
  `MONTH_CELL_MAX_ROWS` (3) session-title rows dotted by the session's own box colour
  (`monthCellSessions` — `sessionBoxIds` is the ONLY sanctioned read of a session's box tags, never
  hand-rolled) with a `+N mais` truncation past that. **Also fixed, not new scope:** `Wee­klyCalendarExportView`/`CalendarExportView` hardcoded `SHOW_DAYS=[1..5]`, silently dropping
  Saturday/Sunday from the Semana and Mês exports despite `getWeeksOfMonth` handing them full weeks —
  both now render all 7.
- **Blocos (T5).** Five card treatments — Nu · Acento · Contorno · Faixa · Etiqueta — all keyed off
  `--a-hdr` alone (`BlockHeader.jsx` + `blockTreatments.js`; `wrapperStyle()` is the one companion for
  'contorno', the sole treatment that wraps header+body rather than just the header). **Family
  block-colouring stays dropped** (plans/82 measurement: fails 3:1 on both light themes) — nothing
  here reintroduces it. Applies to **Dia and Semana only** (the two formats whose blocks render as
  cards); Dia mobile/Semana mobile keep their own established Eagles/MegaMan-style look (a structural
  difference the file header still documents, not a colour fork a shared treatment picker should
  erase) but DO respect the two content toggles — Intensidade/carga and Observação do bloco, both
  default on — which mobile applies too since those are content-level facts, not structural. Mês shows
  no blocks at all, so neither axis applies there.
- **Títulos (T7).** The title is **per format** now (`titles: {dia, semana, mes, diaMobile,
  semanaMobile}`) — the old shared `label` meant something different on all 5 (a Semana title bleeding
  onto Dia's header) and migrates into `titles.semana` on first read, no orphaned key. Each format's
  title field, left empty, shows the **computed default** (`titleHelpers.js`'s `computedTitle` — the
  weekday+date for Dia, `SEMANA start–end MÊS` for Semana, `MÊS ANO` for Mês) as its actual rendered
  value, not just a placeholder that disappears. Academia (`gymName`) and **Rodapé** (new, mobile-only)
  are global.
- **Fit (T9).** `fontScale` is **per-format-kind** now (`fontScaleByFormat`, migrated from the old
  single number by applying it to every format). `useFitAutoShrink.js` owns the state machine: a
  measurement effect reads the **off-screen** `ExportFarm` node (never the on-screen preview, which is
  `transform:scale`d) via `fitCheck.js`'s `measureFit`, and a separate bounded effect drives
  **manual-only** auto-shrink (D3 — never automatic; the trigger is a button in `PreviewPane`'s
  warning strip) that touches **only the current format's** scale (D1), landing on a `ui/Toast`
  ("Fonte ajustada — 0.85× em Semana") or, at the floor with no fit, a terminal message. The overflow
  fact folds into the existing "Baixar imagem" `ConfirmReview` rather than a second dialog (D2) — it
  never blocks Baixar. 🔴 **`measureFit` must walk `[data-fitblock]` elements, not compare the outer
  canvas root's `scrollHeight`** — a fixed-canvas format's root (`.dvWrap`) is a flex column with an
  *explicit* height, and each zone column clips independently via its OWN `overflow:hidden`; a flex
  child never grows its own `scrollHeight` past a box an explicit-height ancestor already pinned, so
  the root reads exactly the canvas height regardless of how much a nested container is actually
  cutting — caught live against real prod data (content was visibly overflowing on screen while
  `measureFit` reported no overflow at all), not by a test (`fitCheck.js` has no jsdom layout to catch
  it). The fix walks every tagged block and asks whether **its own nearest** `overflow:hidden`
  ancestor is hiding it. ⚠️ **The measurement effect must always set a FRESH `overflowInfo` object,
  never dedupe by returning the previous one when the summary looks unchanged** — it usually does,
  step to step, right up until the step that clears it — or the auto-shrink effect (which only
  re-evaluates when `overflowInfo`'s reference changes) silently stops after one step. Both bugs are
  recorded at their fix site, not just here.

The Dia-mobile Eagles/MegaMan pair — b1's open question — is kept alive as a named **"modelo"** choice
(Clássico/Impacto) on the Dia mobile format rather than collapsed or deleted, per the decision b1
deferred: they differ structurally (border widths, header shape), not just by colour, so a shared
`BlockHeader` would have erased the one thing distinguishing them.

`index.css` ends this pass with **zero** `TAB-OWNED → Publicador` tags — the `dv-*`/`wk-*` sets moved
into `Publicador.module.css` (camelCased; imported as `css`, not the usual `s`, since both export
views use a local `s` for the session object, which would have shadowed a module import named `s`);
9 rules with zero consumers anywhere in `src/` (the bespoke zone-header/block-label markup `BlockHeader`
replaced) were dropped outright rather than carried over dead. `Publicador.jsx` grew past its 800-line
ceiling once T5–T9 landed (818) — extracting the fit/auto-shrink machine into `useFitAutoShrink.js`
brought it back to 752. This pass closed **B2**, kept the Dia-mobile pair alive, and is the premise of
backlog row **#171** (TV as a customisable display) — a WOD is a descriptor now
(`{skin, zones, days, cardStyle, content, titles, scale}`), not markup — which must NOT inherit the
fixed-canvas/crop model TV's wall display has no use for.

#### Publicador — Relatório + rate history

**Publicador → Relatório + rate history (#59 · C5·c · plans/81 §C5·c, shipped 2026-09-04)** — the
last of C5's four sessions. ⚠️ **It was the last holdout *inside* `publicador/`, not in the family** — `src/components/PresenterView.jsx` (157 lines) is still **100% `React.createElement`** and is imported by `publicador/publisher/PresenterLauncher.jsx:1`. A directory-scoped grep misses it; it is unconverted, not absent.
**Closes #154**, the versioned-rate-history half #104(c) deferred back on 2026-08-05: an event-level
`rateSnapshot` (plans/71) freezes the rate at booking time but *categorically* cannot re-price an
event booked **before** it shipped, so a coach changing a box's rate today used to silently re-price
every un-snapshotted past event to today's number the next time a report touched it. `publicador/
billing.js`'s `rateAsOf(loc, isoDate)` walks `loc.rateHistory` (`[{rate, rateUnit, currency, from},
…]`, appended chronologically, never resorted) for the entry whose `from` is the latest date `<=
isoDate`. 🔴 **`effectiveRateSource(ev, loc)` is the ONE precedence chain**
(`ev.rateSnapshot ?? rateAsOf(loc, ev.date) ?? loc`) — `calcTotal` and `events.jsx`'s per-event PDF
"Valor" cell both call it rather than each re-deriving the `??` chain themselves; the first
live-reviewed draft wrote it out twice; a code review caught it and it was extracted before ship,
because that's exactly the "two paths computing the same rate" shape #104(b)/#149 already had to
close once (a two-currency report's on-screen total silently disagreeing with its own PDF footer).
⚠️ **The per-event Valor column's visibility must be gated on whether a price actually RESOLVES
(`calcTotal`'s own `t.currencies.length > 0`), never on the location's CURRENT `loc.rate`** — those
two are no longer the same test now that history exists: a location zeroed out today (deactivated)
still has a real historical rate for a past event via `rateHistory`, so gating on today's (falsy)
rate would silently drop the whole Valor column and header while the group total right below it —
computed from the same event set — still shows a real number. Caught in the same review pass, fixed
by computing the group's `calcTotal` result BEFORE building the PDF rows and gating both the header
and every row on it. `afiliados/Afiliados.jsx`'s `saveLoc` **appends a version**
(`affiliateHelpers.js`'s `appendRateVersion`) instead of overwriting `rate` in place — only when
rate/rateUnit/currency actually changed (renaming or recolouring a location mints no version), and
it **backfills the OLD values at a `1970-01-01` epoch on a location's first versioned edit** —
without that backfill, the very first rate change would still leave every past event uncovered by
history and falling through to the *new* rate, reproducing the exact bug being fixed. ⚠️ **The
"changed" comparison normalizes `loc`'s side through the SAME defaults `startEdit` seeds the form
with** (`rateUnit` → `'per_session'`, `currency` → `'R$'`) — comparing the form's always-defaulted
`next` against a legacy location's raw (possibly `undefined`) `rateUnit`/`currency` read as
"changed" on every edit, even a bare rename, minting a spurious version each time; caught the same
review pass. `rateLabel` gained an optional `isoDate` param (`rateAsOf(loc, isoDate) ?? loc`); every
existing caller (`AffiliateRow`, `DirectionPair`, `MeuPerfilPane`, `startEdit`) keeps calling it with
none, reading the current head unchanged. All written straight from the `saveLoc` mutator, never a
`useEffect` on `locs` (CLAUDE.md's own "a load/read path never writes" rule, applied to itself).

`events.jsx`'s `EventFormInner` (the create/edit form both Agenda and this row's own booking flow
use) and `ReportModal` — 76 `React.createElement` calls, none of it tokenized — convert to JSX.
Both move onto `ui/Modal` (a real `role="dialog"`, a focus trap, Escape-to-close: none of which the
old hand-rolled `position:fixed` overlays had) — 🔴 **with `closeOnBackdrop={false}` on both:**
Modal's default backdrop-click-to-close is new behavior neither old overlay had (their backdrops
had no `onClick` at all), and a coach who taps outside `EventFormInner` while filling in a
recurring event would otherwise lose the whole form with zero confirmation — the same one-slip
data-loss shape Criador's `SessionEditor` explicitly guards against (`isDirty`/`requestClose`). Also
caught by review, not by a test — see `ui/Modal`'s own `closeOnBackdrop` doc comment.
`EventFormInner`'s repeated label+input pattern collapses onto `ui/Input` (`as="select"`/
`as="textarea"` cover the dropdowns/notes field, `hint` covers the "R$ 200/hora" rate readout under
the Serviço select); `ReportModal`'s hardcoded hex and `var(--theme-accent)` move onto new
`Publicador.module.css` tokens (`.optionsBox`/`.previewBox`/`.reportEmpty`/`.reportError` etc).
`window.alert`/`window.prompt` are gone: a PDF generation failure renders as inline text instead of
blocking, and copying a Pix code that SUCCEEDS is a `ui/Toast` message — but a FAILED clipboard
write (a real, common rejection — Chrome's "document not focused" case) renders `pixFallback`, a
dismissible readonly text field holding the actual EMV payload, not just a Toast saying to try the
PDF instead: the generated PDF never prints the payload as text (only a QR image + the bare Pix
key), so a Toast-only fallback would have thrown away exactly what the old `prompt(…)` gave the
coach. Both Pix-copy edge cases were caught by code review before push, not live-verified against a
real clipboard-permission-denied browser.
