# 82 — #59 · C5·b1 — Publicador: the shell and the colour model

> ✅ Done: `e61634d` → `c7af8a2` → `c56fba8` → `f66c64d` → `ac805ff` → `3bfe21b` · 2026-09-04 — see BACKLOG.md. Closed **#113** (Apresentar’s QR now points at the built `schedule.html`, not the never-built `log.html`); **#170** answered “no”. Design was pre-approved (mockup 64, the colour redirect) — this session was build only. The ~40-key colour drawer was measured at ~94% a hand-copied `totk-dark` palette and replaced by the 8 `--a-*` roles.

> Split out of [plans/81](./81-design-c5-publicador-agenda.md) § "C5·b — Publicador".
> Design record: `cone/design/mockups/63-publicador-c5.html` (structure) and
> **`64-publicador-WIP.html`** (the interactive draft — the approved target).
> **Sibling:** [plans/83](./83-c5b2-publicador-renderer.md) — the export renderer (Layout · Blocos ·
> Títulos · fit), which runs after this.

## Context

plans/81 scoped C5·b as one pass: JSX conversion → decompose the shell → `Publicador.module.css` → delete
the zoo → C0 primitives + a11y → the two gate items. The design gate produced two things that change it.

**1 · The usage answer.** Asked which of the seven export targets had been produced and sent in the last few
months, the answer was **none** — *"but I would like to keep and enhance its current capabilities. It is a
good to have feature and right now it is not very user friendly to use."* So this is **not** a deletion
pass. No capability is removed; the **form** is what changes.

**2 · The colour redirection.** The draft kept the ~40-key colour drawer, then redirected: drop the bespoke
palettes, follow the theme, presets per affiliate, a device-local custom override, and a prompt before a
change discards it. That turned out to be **cheaper and more correct than the status quo**, for a measured
reason (below) — and it is why the tab splits into two passes instead of one.

**b1 is the shell and the colour model. b2 is the export renderer.** The split protects plans/81's own
discipline: the JSX conversion must land as a **pure mechanical commit** or the redesign diff after it is
unreadable. b1 keeps that guarantee; b2 spends it deliberately.

## Measurements — do not re-derive these

Taken 2026-09-04 while planning. Every one is load-bearing for a decision below.

1. 🔴 **29 of the 37 export colour defaults are an EXACT `totk-dark` token.** `#4ac8c0` = `--accent` ×10,
   `#c8b090` = `--sub` ×7, `#d8a840` = `--gold` ×5, `#0d0b09` = `--bg` ×3, `#554a3a` = `--dim` ×2, and so on.
   Two more are hand-copied near-misses (`#2a2318` vs `--divider #2a231c` — the same fingerprint plans/81
   decision 4 spotted for `#0d0b08` vs `--bg #0d0b09`). Six are genuinely bespoke, and four of those are
   near-misses too (`#887060` sits between `--muted` and `--sub`; two are dimmed teals).
   **The one truly custom value in the whole system is Marinho's navy `#0a1a5c`.**
   → The 40-key "export theming" feature is **~94% a hand-copied `totk-dark`, frozen to one palette.**
2. 🔴 **`blkColor`'s four families fail on both light themes.** Against each theme background —
   `totk-dark #0d0b09`: red 3.97 · amber 8.98 · blue 4.63 · green 7.77;
   **`totk-light #ede8dc`: red 4.05 · amber 1.79 · blue 3.47 · green 2.07**;
   `spirit-blossom #09070f`: 4.05 / 9.15 / 4.72 / 7.91;
   **`sb-light #f4eefb`: 4.35 / 1.92 / 3.73 / 2.23.**
   `--accent`, which they would replace, measures **9.65 / 5.37 / 9.51 / 4.95**. Amber and green fall below
   even the 3:1 large-text bar on both light themes, and on dark the red family — WOD, the line people
   actually read — drops from 9.65 to 3.97. → Family colouring is **dropped from exports** (plans/83).
3. **`MobileWeeklyExportView` is 103 lines with 11 colour points** (`bg` ×3, `accent` ×3, six literals) and
   **takes no `colors` prop**, unlike its two siblings. Wiring it is one file, not a rewrite.
4. **`resolveTheme()` already implements the required precedence** (`src/public/lib/theme.js`): the visitor's
   own device-local pick → `settings.boxThemes[box]` → `settings.theme` → `DEFAULT_THEME`.
5. **A per-box theme picker is already shipped** at `Config.jsx:220-224`, writing `settings.boxThemes[b.id]`.
6. **Three `ui/` primitives exist that CLAUDE.md does not list** — `ColorField`, `EmptyState`, `Modal`
   (all #56/C2, all client-free). The draft hand-rolls all three, which is a documentation failure rather
   than a design one.
7. **`Publicador.jsx` has two write-only refs** — `exportWeeklyRef` (`:28`) and `weeklyRef` (`:36`) — so the
   off-screen farm's `WeeklyExportView` (`:2095`) is **never rasterised**: 7 mounted views, 6 live targets.
8. **The preview scale ternary (`:1425`) tests only `mobileA`/`mobileB`**, so both Mobile Semanal targets
   (1080px content) preview at `previewWrapW/1920` inside `width:'1920px'` — about 56% of size.
9. **Nine `index.css` rules are Publicador-only** beyond the known zoo — the five `.settings-*` and four
   `.color-*`. Verified by grep: `AthleteProfileModal.jsx`, `ui/Modal.jsx` and `gallery/groups/atletas.jsx`
   match those strings **in comments only**.

## Two live bugs found while planning

**B1 · Zone-less blocks vanish from the Diário export — fix here.** `exportViews.jsx:54` falls back to
`bl.zone || 'Zone 01'` — **English** — while `ZONES` (`config.js:33`) is `'Zona 01'`. `ZONES.map` (`:124`)
never reads the `'Zone 01'` bucket, so **any block without an explicit `zone` is silently absent from the
image**. `blockModel.js:30,40` defaults it for new blocks, so this bites legacy and text-imported ones.
`config.js`'s `normaliseZone` already maps `'Zone 01' → 'Zona 01'` — use it; do not hand-roll a second
fallback.

**B2 · Saturday and Sunday are dropped from the Mês export — fix in b2.** `CalendarExportView` hardcodes
`SHOW_DAYS = [1,2,3,4,5]` + `CAL_DAY_LABELS = ['SEG'…'SEX']` (`:840-841`), and `WeeklyCalendarExportView`
does the same via `weekDates[1]`/`weekDates[5]` — even though `getWeeksOfMonth` hands both Sunday-start
7-day weeks. This violates the standing Sunday-start rule. The fix ships with plans/83's layout work
(it *is* the layout); the finding is recorded here so it is not rediscovered as a preference.

## Decisions taken with the user — do not re-litigate

1. **Two passes.** b1 = shell + colour model; b2 = the export renderer.
2. **Drop the bespoke palettes.** Colour resolves theme → box preset → device-local custom.
3. **The per-box picker MOVES to Afiliados**, keeping the same `settings.boxThemes` key.
4. **Support all four themes**, the two light ones included; drop family colouring; fix the `#000` fills.
5. **All of the colour model lands in b1.**
6. **The export source selection is device-local** (`cone_export_source`), mirroring `cone_box_scope`.
7. **`ColorField` gains a `compact` variant** rather than being forked.
8. **Títulos, Layout, Blocos and fit are b2.**
9. **Format names:** `Dia` · `Semana` · `Mês` · `Dia mobile` · `Semana mobile` — "story" is not used, and the
   two gym names ("Eagles", "MegaMan") disappear from the UI entirely.
10. **#113 — Apresentar keeps a QR, pointing at `schedule.html`.** `log.html` stays unbuilt.
11. **#170 — no.** Closed with the reason.
12. **`App.jsx:61`'s inline `--theme-accent` write is retired.**
13. **TV customisation is a new backlog row (#171), not built here.**

## What ships

**The tab becomes: pick a format → see the file → download it.** One `when` picker (month · week · day), a
format rail, a preview pane rendering the real artefact at true ratio, and a docked Aparência panel.

- **The preview modal dies** (`:1014-1582`, ~569 lines) — it carried its own duplicate month/week/day
  pickers. The preview is the surface.
- **The draggable colour window dies** (`:1596-1645`, ~60 lines of hand-rolled `mousedown`/`touchstart`
  inside a `ref` callback, plus `hdr._drag`/`el._touch` flags on DOM nodes). It only needed to drag because
  it covered the preview it was editing; docked, the reason is gone.
- **The 466-line, ~40-input colour drawer becomes an 8-role panel** shown only under "Personalizado".

### The colour contract

```
--a-bg        ← var(--bg)            dvBg/wkBg/eaglesBg = #0d0b09, exact
--a-div       ← var(--divider)       dvDivider/wkDivider #2a2318 ≈ --divider #2a231c
--a-hdr       ← var(--accent)        ×10 sites were literally #4ac8c0
--a-name      ← var(--sub)           ×7 sites were literally #c8b090
--a-int       ← var(--gold)          ×5 sites were literally #d8a840
--a-note      ← var(--dim)           dvNote/dvBlockNotes = #554a3a
--a-sub       ← var(--muted)         dvMainTraining/wkDateNum/wkExName #887060 ≈ #806850
--a-on-accent ← var(--accent-text)   text sitting on an accent fill (mmBlockMetaText)
```

Precedence, highest first: **device-local custom overrides** → **`settings.boxThemes[locationId]`** →
**`resolveTheme({settings})`**. Storage: presets in the existing `settings.boxThemes`; the selection in
`localStorage` `cone_export_source`; the overrides in `localStorage` `cone_export_custom`.

## Acceptance

**Structure**
- `Publicador.jsx` is a container over `publicador/publisher/` and is **under 800 lines**.
- `createElement` count across `Publicador.jsx` + `src/components/tabs/publicador/` = **0**.
- `publicador/Publicador.module.css` exists.
- `publicador/exportPalette.js` exists — pure, client-free, unit-tested.

**The colour model**
- `EXPORT_ROLES` is one table of 8 role→token pairs; `resolveExportPalette({ themeId, custom })` returns
  **literal hex**, never `var(--…)`.
- An unknown theme id **falls through** to the next rule, mirroring `resolveTheme`'s own documented rule.
- Every export view reads `--a-*`; none takes a colour prop, `MobileWeeklyExportView` included.
- The four hardcoded `#000` fills (`:310, 321-322, 387, 398-399`) and the two skin-bg ones (`:438, 452`)
  take `--a-bg`.
- Switching **away from** Personalizado with overrides set goes through `ConfirmReview`, naming the count.
- The ~40 legacy `dv*`/`wk*`/`ea*`/`mm*` keys are **no longer written and never deleted**; a one-time
  "Importar cores antigas para Personalizado" offer appears when any differs from the `totk-dark` default.

**Afiliados**
- The per-box theme rows move from `Config.jsx:220-224` into an **Aparência** card on the affiliate detail,
  writing the **same** `settings.boxThemes[locationId]`. Configurações keeps the gym-wide default plus a
  one-line pointer.
- The card states that the setting also drives `?box=` on the public pages.
- The write goes through a **mutator** (`saveLoc`-shaped), never a `useEffect` on the blob.

**index.css**
- Zero `.b` / `.bp` / `.bsec` / `.bd` / `.bsm` / `.bfull` / `.pvt` / `.pub-pane` / `.pub-controls` /
  `.pub-view-tabs` / `.settings-*` / `.color-*` usages repo-wide; those rules deleted, plus the global
  `input[type=color]` rule (`:289`) and both `App.jsx` wrappers (`:269,287`).
- 🔴 **`.fg` and `.lbl` STAY**, retagged `TAB-OWNED → Criador #58`. Their stale section header (`:38-42`,
  which still names Atletas/Resultados/Servicos as consumers) is rewritten.
- 🔴 **Amended criterion.** plans/81 says *"no `TAB-OWNED` tag left"*. That is impossible and contradicts its
  own decision 6. The real bar is **no `TAB-OWNED → Publicador` tag left after b2**; the eight
  Criador-tagged sections remain, correctly attributed. `dv-*`/`wk-*` leave in b2, so b1 ends with those two
  export sections still tagged.
- The file's own triage header is updated. **Never run prettier on `index.css`.**

**Primitives + a11y**
- `ui/Button`, `ui/Input`, `ui/Card`, `ui/Modal`, `ui/ColorField`, `ui/EmptyState` and `ConfirmReview` adopted.
- `ui/ColorField` gains `compact`; the default layout is byte-identical for Atletas.
- `ui/Toast` is created by promoting Criador's undo toast (`Criador.jsx:52,201-207`); Criador migrates onto
  it in the same commit with no behaviour change. **b1 adds no Publicador toast** — its one site is b2's
  auto-fit.
- `window.confirm` / `window.prompt` / `alert` count in the Publicador files = **0**.
- Every icon-only control has an `aria-label`; zero click-`<div>`s; the surface has a real heading.
- `var(--accent)`, never `var(--theme-accent)`, anywhere the gallery renders.

**Bugs**
- **B1** fixed via `normaliseZone`; a zone-less block appears in the Diário export.
- The two write-only refs and the dead farm entry are deleted; the farm mounts **only the selected format**.
- The preview scale ternary is gone — canvas derives from the format.

**Docs**
- `#113` and `#170` closed in BACKLOG.md with their reasons; the new **#171** row added as *Backlog*.
- plans/81 records the **supersession of decision 4** with the 29/37 measurement, and the amended
  `TAB-OWNED` criterion.
- CLAUDE.md: the C0 primitive list gains `ColorField`/`EmptyState`/`Modal`; the Publicador section is
  rewritten; the `--export-font` sentence stops being cited as evidence for a colour exemption.
- `node scripts/audit-backlog-markers.mjs` — zero drift.

## Files

**New**
- `src/components/tabs/publicador/exportPalette.js` + `exportPalette.test.js`
- `src/components/tabs/publicador/Publicador.module.css`
- `src/components/tabs/publicador/publisher/` — expect roughly `PublisherHeader` · `WhenPicker` ·
  `FormatRail` · `PreviewPane` · `AparenciaPanel` (+ `OrigemCores`, `LogoPanel`, `TamanhoPanel`) ·
  `PresenterView` · `ExportFarm` · `ExportStates`
- `src/components/ui/Toast.jsx` + `Toast.module.css`
- `src/public/gallery/groups/publicador.jsx`

**Modified**
- `src/components/tabs/Publicador.jsx` — JSX, decomposed, under 800 lines
- `src/components/tabs/publicador/{exportViews,mobileExportViews}.jsx` — JSX; colour props → `--a-*`
- `src/components/ui/ColorField.{jsx,module.css}` — the `compact` variant
- `src/components/tabs/Criador.jsx` — migrate onto `ui/Toast`
- `src/components/tabs/afiliados/` — the Aparência card on the detail pane + its mutator
- `src/components/tabs/Config.jsx` — per-box rows removed, pointer left behind
- `src/App.jsx` — retire the inline `--theme-accent` write; drop both `.pub-pane` wrappers; pass
  `locations` to `SchedulePublisher` (b2 needs it for Mês; wiring it here keeps b2 to one concern)
- `src/index.css` — the deletions, the retags, the header
- `src/public/gallery/Gallery.jsx` — the new group
- `docs/BACKLOG.md` · `docs/plans/81-design-c5-publicador-agenda.md` · `CLAUDE.md`

**Read-only reuse — do not reimplement any of these**
`ui/{Button,Input,Card,Modal,ColorField,EmptyState}` · `public/shared/ConfirmReview` ·
`public/lib/theme.js` (`resolveTheme`, `THEMES`, `isTheme`) ·
`public/lib/week.js` (`DAY_PT`, `MONTH_PT`, `monthGridCells`, `toISO`) ·
`publicador/exportHelpers.js` (`getWeeksOfMonth`, `buildMobileSession`, `buildProgressionLines`) ·
`public/lib/boxScope.js` (`sessionBoxIds`) · `public/lib/wod.js` ·
`utils/config.js` (`ZONES`, `normaliseZone`, `APP_CONFIG`).

## Approach

Each step is independently verifiable; do not merge them.

**a · JSX conversion, pure and mechanical.** `Publicador.jsx` + `exportViews.jsx` + `mobileExportViews.jsx`.
**No behaviour change, no styling change, no reordering.** Verify semantically against `HEAD~` — read the
converted render against the original, do not assert it. This is the commit plans/39 deliberately left for
#59; it must stay boring.

**b · Decompose** into `publicador/publisher/` along plans/81 finding 3's six render regions (PresenterView
`:552` · header `:553` · toolbar `:576` · preview modal `:1014` · settings drawer `:1583` · farm `:2049`).
Still a move: no new behaviour. `Publicador.jsx` under 800 lines.

**c · The colour model.** `exportPalette.js` + its tests first, then the views' colour props → `--a-*`, then
`MobileWeeklyExportView`'s 11 sites, then the six `#000`/skin-bg fills. **Spike html2canvas on one view
before converting the rest** — see Constraints.

**d · The surface.** The `when` picker (one, not two), the format rail, the preview pane with the farm
reduced to the selected format, the Aparência accordion (Origem/Cores · Logo · Tamanho), the states via
`EmptyState`, the size prompt via `ConfirmReview`.

**e · Afiliados + Configurações.** Move the per-box rows; leave the pointer; state the `?box=` consequence.

**f · The zoo.** 🔴 **Re-grep every class before deleting its rule** — including through template literals
(the `` `pvt ${…}` `` form), the blind spot that hid this family from C3 and produced the `.fg`/`.lbl`
correction. Then retag Criador's, rewrite the stale header, update the triage header.

**g · #113, the a11y slice, and B1.**

**h · Gallery, cards, docs.** New `Publicador` group, `npm run design:cards`, DesignSync, then the doc
updates and `audit-backlog-markers.mjs`.

## Constraints that bite

- 🔴 **Spike `html2canvas` + CSS custom properties on ONE view first.** It clones the document and reads
  `getComputedStyle`, so custom properties normally survive — but the whole model rests on it. Resolving
  `exportPalette` to **literal hex** (as specified) removes the risk; the authoring model inside the views
  is identical either way. If the spike fails, nothing else changes.
- 🔴 **The farm must keep a mounted, measurable, UN-transformed target.** The on-screen preview is
  `transform:scale`d and cannot be the raster source. Mount only the selected format — that is the
  optimisation — but never zero.
- 🔴 **`saveSettings` is a blind overwrite, not a merge.** #142 deleted `boxWarnings`, `gymSub`,
  `customBenchmarks` and `theme` from the blob exactly this way. Every write keeps the `...loadSettings()`
  spread, and the settings effect stays **mount-guarded** (the `settingsMounted` ref) — do not remove it.
- 🔴 **`boxThemes` is not only an export setting.** It already drives what a `?box=` visitor sees on the
  public pages (#143/plans/67). The Afiliados card must say so, or a coach adjusting it for a nicer PNG
  silently restyles that box's public schedule.
- 🔴 **Retiring `--theme-accent` is repo-wide.** `App.jsx:61` sets it inline on `<html>` from
  `APP_CONFIG.themeAccent`, beating every `html.theme-*` class. **Sweep every consumer before removing the
  write** — 29 sites in `Publicador.jsx`, 5 in `events.jsx`, plus `index.css:33-36`. Any site outside this
  pass's files must move to `var(--accent)` in the same commit or it renders unstyled. Migrate a non-default
  persisted `themeAccent` into `cone_export_custom['--a-hdr']` rather than dropping it.
- ⚠️ **`ColorField`'s `.swatch[type='color']` selector must not be weakened.** `index.css:289`'s global
  `input[type=color]{width:0;height:0;opacity:0;…}` is what makes a raw colour input invisible in the SPA;
  the primitive outranks it at (0,2,0) on purpose. b1 deletes that global rule — do the deletion and the
  adoption in the same commit, and re-check Atletas' colour fields afterwards.
- ⚠️ **`index.css` is outside `format:check`** and hand-compact on purpose; its per-selector triage tags are
  the evidence model. **Never run prettier on it.**
- ⚠️ **jsPDF's colour calls in `events.jsx` are RGB integer triples** — a genuine print exemption, untouched.
- ✅ **`MobileWeekly`'s `variant: 'A'|'B'` COLLAPSES** (user, 2026-09-04 — *"only by colour"*). The two
  differ only in colour, and colour is now `--a-*`, so the prop, both call sites and the `isA` branching are
  deleted. **Semana mobile becomes one view with no variant.** This removes 2 of the 25 `#00b8d4` sites and
  is the smallest change in the pass.
- 🔴 **But `MobileEagles` and `MobileMegaMan` do NOT collapse — do not extend the answer above to them.**
  Measured: 415 lines vs 274, `borderBottom` 6 vs 2, `borderRadius` 4 vs 2. They are structurally different
  designs, not two skins of one. After b1 removes the colour distinction they become **two layout treatments
  of the Dia mobile format with no named difference**, which is a decision for b2 (keep both as a "modelo"
  choice, or pick one and delete the other) — recorded in plans/83, not resolved here.

## Verification

1. **The four gates:** `npm test` · `npm run lint --max-warnings 0` · `npm run format:check` ·
   `npm run build:all` (**10** public pages — `log.html` stays out).
2. 🔴 **The theme test INVERTS.** It used to be "export → switch theme → re-export → files identical". It is
   now: **export the same week in each of the 4 themes → all four differ, and all four are legible**, the
   light ones included. That is what the `#000`-fill fix buys.
3. **New tests** — `exportPalette.test.js`: the 8-role table; precedence custom → box preset → coach theme;
   an unknown theme id falls through rather than being applied.
4. `npm run dev` at **1280×800 and 390×844 under all 4 themes**. ⚠️ Check the service worker first if edits
   do not appear — `sw.js` registers at `/CrossFit-Apps/` and can serve production assets over the dev
   server with no console error.
5. **Named click-paths:**
   - **Origem:** pick a box → the preview restyles → export → the PNG is in that box's theme. Switch away
     from Personalizado with overrides set → `ConfirmReview` names how many are discarded.
   - **Afiliados:** change a box's theme there → open `?box=<that box>` on `index.html` → the public page
     follows. Proves the shared key still works and this is not a Publicador-private copy.
   - **Migration:** a profile carrying old `dv*`/`mm*` values → the one-time import offer appears →
     declining leaves `settings` untouched → `boxWarnings` and `gymSub` are still present.
   - **B1:** a block with no `zone` field appears in the Diário export (it does not today).
   - **Mobile Semanal** responds to the Origem change (it cannot today) and previews at full size.
   - **Size prompt:** the byte count matches the saved file.
   - **Apresentar:** open it, follow the QR to `schedule.html`, confirm the session matches.
   - **Keyboard only:** tab to every control; no trap, no unreachable action; `ui/Modal` restores focus.
   - **Public pages unchanged** — `index.html` / `schedule.html` / `results.html` still render; this pass
     touches `index.css`, which every SPA page loads.
   - **Atletas colour fields** still render after the global `input[type=color]` rule is deleted.
6. **Gallery walk** — the new `Publicador` group, 4 themes × 2 widths — then `npm run design:cards` and
   DesignSync.

## Notes

- The design record is mockup **64**, not 63. 63 established the structure (format × skin × canvas,
  preview-as-surface); 64 is the interactive prototype and is the approved target for everything except the
  colour model, which was redirected after it.
- ✅ **Both open items are now closed** (user, 2026-09-04): the rest day is the **label `Descanso`** and
  **no icon** — keep the app's standard (`rail.jsx:67` + `APP_CONFIG.restDayLabel`); and `MobileWeekly`'s
  A/B variants differ **only by colour**, so they collapse. See Constraints for the caveat that this does
  **not** extend to `MobileEagles`/`MobileMegaMan`.
