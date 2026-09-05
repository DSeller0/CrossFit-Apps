# 83 — #59 · C5·b2 — Publicador: the export renderer

> ✅ Done: `ed637ea` → `85afedc` → `2856182` → `f995b6f` → `248b4d9` · 2026-09-04 — closed #15, #18. See BACKLOG.md. The design program’s two fold-ins (hex→vars, desktop scroll-in-panes) finished here and the last `TAB-OWNED → Publicador` tag went with them. Also fixed **B2** (Saturday/Sunday were silently dropped from the Mês and Semana-calendar exports) and the Dia-mobile “modelo” question b1 deferred. Design (Opus) ran ahead of this session; this was build only. Two fit-check bugs were caught live, not by a test — see the Notes.

> Split out of [plans/81](./81-design-c5-publicador-agenda.md) § "C5·b — Publicador".
> **Runs after [plans/82](./82-c5b1-publicador-shell-e-cores.md) and depends on it** — the `--a-*` palette
> seam, the fixed-canvas wrapper and the decomposed shell are all b1's output.
> Design record: `cone/design/mockups/64-publicador-WIP.html`.

## Context

b1 makes the tab usable: one `when` picker, a format rail, the preview as the surface, and colour resolved
from the theme. It deliberately leaves the artefacts themselves alone — the export views still emit the
markup they always did, only recoloured.

**b2 is where the artefacts become parametric.** Four axes the coach can set — **Layout** (zones · which
days · the full month), **Blocos** (card treatment + what each card shows), **Títulos** (per-format
overrides), and **fit** (does this actually fit the canvas, and what happens when it does not).

It is one pass because these four are the same edit. Every one of the 7 views hardcodes its grid, its block
treatment and its heading; making any of them a prop means rebuilding that view flow-driven, and the fit
check is meaningless until the canvas is fixed. Splitting them would mean touching the same 2 203 lines four
times.

## Inherited from b1 — do not re-derive

- **The `--a-*` contract** (8 roles, resolved to literal hex by `publicador/exportPalette.js`). Every view
  already reads it; b2 adds no colour plumbing.
- **`blkColor`'s families fail on both light themes** — `totk-light` amber **1.79**, green **2.07**;
  `sb-light` amber **1.92**, green **2.23**, all below the 3:1 large-text bar, against `--accent`'s
  **5.37 / 4.95**. Family colouring is **not** coming back (see T5 below).
- **The two write-only refs are gone** and the farm mounts only the selected format.
- **B2 (from plans/82):** `CalendarExportView` hardcodes `SHOW_DAYS = [1,2,3,4,5]` +
  `CAL_DAY_LABELS = ['SEG'…'SEX']` (`:840-841`) and `WeeklyCalendarExportView` uses
  `weekDates[1]`/`weekDates[5]` — **Saturday and Sunday are dropped from both exports today**, despite
  `getWeeksOfMonth` handing them Sunday-start 7-day weeks. **This pass is the fix.**

## Decisions taken with the user — do not re-litigate

1. **Dia → Zonas.** 1 / 2 / 3, and at 2 the coach picks **iguais (50/50)** or **30/70**.
2. **Semana → 7 days, Sunday-start, all days rendered**, an empty day showing the rest-day treatment, and a
   **per-day picker** so the coach chooses which days appear.
3. **Mês → all days**, and each day names its **sessions per box**.
4. **Blocos:** five card treatments — `Nu` · `Acento` · `Contorno` · `Faixa` · `Etiqueta` — plus content
   toggles for Intensidade/carga and Observação do bloco. **Family colouring is dropped.**
5. **Títulos:** the title is **per format**; Academia and Rodapé are global.
6. **Fit:** per-format-kind `fontScale` · auto-shrink is **manual**, never automatic · overflow does **not**
   block Baixar, it folds into b1's size prompt · a terminal state at the floor.
7. **Card names are shape-descriptive.** "Schedule" and "TV" were rejected because
   `shared/WodBlockCard.jsx` and TV's `BlockCard` are **token-based screen components** — what these draw
   are visual quotations re-implemented in the artefact CSS, and the names must not send a reader hunting
   for an import that does not exist.
8. **The rest day is the label `Descanso`, never an icon** — the app's existing standard.

## Open decision inherited from b1 — the Dia mobile pair

b1 collapses `MobileWeekly`'s `variant: 'A'|'B'` (they differed only by colour, which is now `--a-*`).
🔴 **That does not extend to `MobileEaglesExportView` and `MobileMegaManExportView`.** Measured: 415 lines
vs 274, `borderBottom` 6 vs 2, `borderRadius` 4 vs 2 — structurally different designs, not two skins.

Once b1 removes the colour distinction they are **two layout treatments of the Dia mobile format with no
named difference left**, which is this pass's problem. Two ways out:

- **(a) Keep both as a named "modelo" choice** on the Dia mobile format — a second layout axis alongside the
  zone/day/month ones. Costs a name for each (they are currently named after two gyms) and keeps 690 lines.
- **(b) Pick one and delete the other.** Consistent with the rest of the programme, and it is ~275–415 lines
  of dead weight otherwise — but it removes a design the user may prefer for a specific post.

**Recommendation: (a) in b2, deferring deletion** — the usage answer for this tab was "keep and enhance",
and 690 lines is not what makes this tab hard to use. Name them for what they look like, the way the block
card treatments were named, and revisit deletion once either one has actually been sent to someone.

## T5 · Blocos — card treatments and content

```
 Nu          Acento         Contorno        Faixa          Etiqueta
 ────        │────          ┌──────┐        ┏━━━━━━┓       [WOD]────
 ────        │────          │ ──── │        ┃ WOD  ┃        ────
 ────        │────          │ ──── │        ┗━──── ┛        ────
             ↑ regra        └──────┘        ↑ barra cheia   ↑ chip inline
```

Every treatment keys off **`--a-hdr`**, which is what all ten block-header defaults already were (`#4ac8c0`).
**No regression:** nothing shipped today colours block headers by family, so dropping family colour removes
a proposed feature rather than an existing one.

⚠️ **If family colour is ever revisited, it is `blkColor(block)` and nothing else.** The prototype's `FAM`
regex table would have been a sixth fork of a taxonomy plans/81 decision 5 declared closed, and it matched
against *display strings* (`'WOD · AMRAP 12\''`), so a coach's custom label falls through to the fallback —
which is `#d8a840`, identical to the amber family, so the failure is invisible.

Content toggles: **Intensidade / carga** and **Observação do bloco**, both defaulting on.

## T6 · Layout

### Dia → Zonas: 1 / 2 (iguais or 30/70) / 3

🔴 **This axis already exists as data.** `block.zone` is persisted (`blockModel.js:30,40`, default
`'Zona 01'`), the coach sets it per block in `BlockEditor.jsx:371,551` over `ZONES` (`config.js:33`), and
**`DailyExportView` already groups by it** — `:49-56` builds `byZone`; `:123-124` renders `.dv-zones` as
three zone columns, each scaled by `zoneScales[zi]`. So this is **not** "add zones to the Publicador"; it is
making the always-3 count choosable, plus a width split.

```
1 zona                2 zonas · iguais       2 zonas · 30/70        3 zonas (hoje, fixo)
┌───────────────┐     ┌───────┬───────┐      ┌────┬──────────┐      ┌────┬────┬────┐
│ Zona 01       │     │Zona 01│Zona 02│      │Z01 │ Zona 02  │      │Z01 │Z02 │Z03 │
│ (tudo)        │     │       │       │      │    │          │      │    │    │    │
└───────────────┘     └───────┴───────┘      └────┴──────────┘      └────┴────┴────┘
                       50% / 50%              30% / 70%              33% × 3
```

Implementation: `.dv-zones`' `grid-template-columns` as a function of `{count, split}` plus
`ZONES.slice(0, count)`.

⚠️ **Where do the hidden zones' blocks go?** At count 1 or 2, blocks assigned to Zona 03 have no column.
Dropping them silently is the bug class this whole programme is fighting (it is literally B1, one file over)
→ **they collapse into the last visible zone**, and the panel says so:
*"Zona 03 tem 2 blocos — vão para a Zona 02."*

🔴 **`zoneScales[3]` and `blockTitleScales[3]` are THESE zones.** They stay in the Tamanho panel (b1), which
means b2's `em` typography rework must keep the three zone bands as **real multipliers inside the em
system**, not collapse them into one root scale. Cheap if planned in from the start, expensive retrofitted.
Label the Tamanho rows with the zone names this layout now exposes.

### Semana → 7 days, Sunday-start, all rendered, with a day picker

```
Semana · dias no export
 [✓]DOM [✓]SEG [✓]TER [✓]QUA [✓]QUI [✓]SEX [✓]SÁB     ← todos por padrão;
                                                          desmarcar remove a coluna
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ DOM  │ SEG  │ TER  │ QUA  │ QUI  │ SEX  │ SÁB  │
│      │Força │Skill │ LPO  │EMOM  │Estaç │      │
│Desc. │AMRAP │ FT   │Cond  │      │      │Desc. │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

- **The column count derives from the picker.** An earlier draft offered "5 / 3 / 2 columns"; three columns
  was only ever a proxy for *hide the empty days*, and the picker says which, explicitly.
- **Reuse `DAY_PT`** (`week.js` — `['DOM','SEG',…]`, uppercase abbreviated: exactly this shape). Do not
  hardcode a seventh label array; `CAL_DAY_LABELS` is deleted, not extended.
- ✅ **Rest day is the LABEL `Descanso`, and no icon** (user, 2026-09-04 — *"use Descanso, keep the app's
  standard"*). That standard is `public/index/rail.jsx:67`, which renders `{d.count ? d.name : 'Descanso'}`
  on the public week grid; `APP_CONFIG.restDayLabel` keeps it configurable. **Do not introduce a rest-day
  icon** — there is none in the repo, and `ti-clock-pause` (`StationEditor.jsx:206`) means a rest *station*,
  a different thing. An empty day renders the label in the same slot the session name would occupy.
- ⚠️ Criador's own `WeekGrid.jsx:329` says **"sem sessão"** for the same state — two strings, one condition.
  The export follows the **public** convention (`'Descanso'`), because that is what an athlete sees.

### Mês → all days, each day naming its sessions per box

```
┌─────────┬─────────┬─────────┐
│  12     │  13     │  14     │
│ ● LPO + │ ● EMOM  │ ● Estaç.│   ● = a cor do box (loc.color)
│   cond. │ ○ Open  │         │   ○ = outro box, mesmo dia
└─────────┴─────────┴─────────┘
```

- **Title:** `s.sessionName`, falling back to `mainTraining` (what the exports render today).
- **Box:** 🔴 **`sessionBoxIds(session)`** (`public/lib/boxScope.js`) — the canonical `locationIds` read with
  its legacy singular `locationId` fallback. **Never re-implement that read.**
- **Colour per box:** `loc.color`, already on every affiliate (defaulted `Afiliados.jsx:137`). b1 passes
  `locations` into `SchedulePublisher`, which does not take it today.
- ⚠️ **Density is the risk.** Six rows × seven columns with 1–3 titled sessions per cell at 1920×1080 is the
  tightest thing in the tab, and unlike Dia it has no zone/column escape hatch. It needs a truncation rule
  (`+2 mais`) and it is the format most likely to exercise T9.

## T7 · Títulos — per format

`gymName` and `label` already exist and reach every view (`Publicador.jsx:41-42`); only the footer is new.

**Why not one shared field** — the same string means different things in five formats:

```
Título [ SEMANA DO CAOS ]  →  Semana     "SEMANA DO CAOS"   ✅
                              Dia        "SEMANA DO CAOS"   ❌ era "QUA 12/08 · LPO"
                              Mês        "SEMANA DO CAOS"   ❌ era "AGOSTO 2026"
                              Dia mobile "SEMANA DO CAOS"   ❌
```

Three of five silently lose their date, and because the field is only visible while on one format, it is
discovered a week later in an image already sent.

```
Aparência ▸ Títulos
┌──────────────────────────────────────────────────┐
│ GLOBAL — vale para todos os formatos             │
│   Academia   [ CONE · BOX VILA              ]    │  ← gymName
│   Rodapé     [ @conebox                     ]    │  ← só nos formatos mobile (novo)
│ DESTE FORMATO — Semana                           │
│   Título     [                              ]    │
│              vazio = "SEMANA 10–14 AGOSTO"       │  ← placeholder = o computado
│   ↳ Dia · Mês · Dia mobile · Semana mobile       │
│     guardam o próprio título                     │
└──────────────────────────────────────────────────┘
```

`label` keeps its meaning as the Semana title, migrated in on first read — no orphaned key.

## T9 · Fit, overflow, auto-shrink

`html2canvas` crops **silently** today whenever content exceeds a fixed height, and nothing anywhere says so.

**It is inseparable from the canvas work** — `fits()` needs a *clipping* container, and before b1 only two
of seven views had one:

```
WeeklyCalendar / Calendar   1920×1080 + overflow:hidden   → detectable
Daily                       no height                     → never overflows
MobileEagles/MegaMan/Weekly width:1080, height auto        → never overflows
```

Shipping the check without the fixed-canvas wrapper yields one that **always passes** — worse than none,
because it reads as an assurance.

**The prototype's loop does not port.** `while (g++ < 24) { st.fs -= .05; renderPreview(); if (fits()) break }`
is synchronous; in React it becomes a bounded measure → `setState` → effect → re-measure cycle, against the
**off-screen** node. The on-screen preview is `transform:scale`d and returns scaled metrics.

- **D1 · per-format-kind `fontScale`** (nested like the prototype's own `st.lay`; composes with the zone
  multipliers), so fitting a 9:16 mobile export never shrinks next week's 1920×1080 Semana.
- **D2 · overflow does not block Baixar.** It folds into b1's size prompt, so one `ConfirmReview` carries
  both facts: *"1080×1920 · 312 KB · os 2 últimos blocos ficam cortados"* → **Salvar** / **Voltar e ajustar**.
- **D3 · manual, never automatic.** An automatic shrink is a silent state mutation — this is the one site
  that earns `ui/Toast` (*"Fonte ajustada — 0,85× nesta semana"*).
- **D4 · a terminal state at the floor:** *"não cabe nem no tamanho mínimo; tente 4:5, altura livre, ou menos
  blocos."*

## Acceptance

- `Publicador.jsx` stays **under 800 lines**; `createElement` across the tab stays at **0**.
- **B2 fixed:** `SHOW_DAYS`/`CAL_DAY_LABELS` are deleted; both the Semana and Mês exports render all seven
  days, Sunday-first, via `DAY_PT` and the canonical `getWeeksOfMonth`.
- **Zonas:** 1/2/3 render; the 2-zone split offers iguais and 30/70; blocks in a hidden zone **collapse into
  the last visible zone** and the panel states the count. `zoneScales`/`blockTitleScales` still apply per zone.
- **Day picker:** unchecking a day removes its column; all seven are checked by default; a checked day with
  no session renders the label `APP_CONFIG.restDayLabel` (`Descanso`) — never a blank cell, and **never an
  icon**.
- **Mês:** every day cell names its sessions, one row per session, dotted with `loc.color` resolved through
  `sessionBoxIds`; a cell with more than the truncation limit shows `+N mais`.
- **Blocos:** the five treatments render; both content toggles work; **zero** family-colour code exists.
- **Títulos:** the title is per format kind and its placeholder is the computed default; Academia and Rodapé
  are global; `label` migrates in as the Semana title.
- **Fit:** the overflow warning appears only when content genuinely clips; each escape works; auto-shrink is
  manual, bounded, and moves **only the current format's** scale; the floor has a terminal state.
- **`index.css` ends with no `TAB-OWNED → Publicador` tag** — the `dv-*` (29 rules) and `wk-*` (14) sets move
  into `Publicador.module.css`, plus the `:240` grab-bag. 🔴 The eight **Criador**-tagged sections remain,
  correctly attributed, for #58 (see plans/82's amended criterion).
- New unit tests for the pure helpers: zone distribution (including the collapse rule), the day-picker
  filter, and the month cell's per-box grouping.
- `#15` closes with this pass — its row says to close it when the programme ends.
- plans/16 marks C5 ✅ and #43 becomes the resume point.
- Gallery: the `Publicador` group gains the layout/blocos/títulos panels and the overflow state.
  `npm run design:cards` → DesignSync.

## Files

**Modified**
- `src/components/tabs/publicador/exportViews.jsx` — `DailyExportView` zone count + split;
  `WeeklyCalendarExportView` 7 days + picker; `CalendarExportView` 7 days + per-box titles
- `src/components/tabs/publicador/mobileExportViews.jsx` — the same axes for the two vertical formats
- `src/components/tabs/publicador/publisher/AparenciaPanel` + the three new panels
- `src/components/tabs/publicador/Publicador.module.css` — the `dv-*`/`wk-*` sets move in
- `src/index.css` — those two sections deleted; triage header updated
- `docs/BACKLOG.md` · `docs/plans/16-design-pass-program.md` · `CLAUDE.md`

**Read-only reuse — do not reimplement**
`public/lib/week.js` (`DAY_PT`, `MONTH_PT`, `monthGridCells`) ·
`publicador/exportHelpers.js` (`getWeeksOfMonth`) · `public/lib/boxScope.js` (`sessionBoxIds`) ·
`utils/config.js` (`ZONES`, `normaliseZone`, `APP_CONFIG.restDayLabel`) ·
`publicador/exportPalette.js` (b1's) · `ui/*` + `ConfirmReview` + `ui/Toast`.

## Constraints that bite

- 🔴 **A hidden zone must never silently drop its blocks.** Collapse into the last visible zone and say so.
  This is the same failure mode as B1, in the same file.
- 🔴 **`sessionBoxIds` is the only way to read a session's box tags.** Canonical `locationIds` with the
  legacy `locationId` fallback; a hand-rolled read reintroduces the bug #80 closed.
- 🔴 **The fit check must measure the OFF-SCREEN node.** The on-screen preview is `transform:scale`d.
- 🔴 **Auto-shrink must not touch another format's scale.** That is the whole point of D1.
- ⚠️ **Keep the three zone bands as real multipliers inside the em rework.** Collapsing them into one root
  scale silently retires two persisted settings the user asked to keep.
- ⚠️ **`DAY_PT` is UPPERCASE abbreviated and `MONTH_PT` is Titlecase full-name** — they are not the same
  casing despite the parallel names. `DAY_PT_TITLE`/`MONTH_PT_SHORT` are the other variants. See #16's
  casing hazard.
- ⚠️ **The Mês format is the density risk.** Decide the truncation rule before building the cell, not after.
- ⚠️ **`index.css` never sees prettier.**

## Verification

1. **The four gates:** `npm test` · `npm run lint --max-warnings 0` · `npm run format:check` ·
   `npm run build:all` (10 pages).
2. `npm run dev` at 1280×800 and 390×844 under all 4 themes.
3. **Named click-paths:**
   - **Zonas:** a session with blocks in all three zones → 3 zonas renders three columns → 2 zonas (iguais)
     collapses Zona 03 into Zona 02 **and the panel says so** → 30/70 changes the widths, not the contents →
     1 zona holds everything.
   - **Semana:** all seven days render, Sunday first; a day with no session shows the rest-day treatment;
     unchecking Sáb removes exactly that column; the header still reads a pt-BR month **with the browser
     language set to English**.
   - **Mês:** Saturday and Sunday are present (they are not today); a day with two boxes shows two dotted
     rows in the right colours; a day past the truncation limit shows `+N mais`.
   - **Blocos:** each of the five treatments renders; toggling Intensidade and Observação changes the image;
     a block with a custom label renders the same colour as any other (no family colouring anywhere).
   - **Títulos:** typing a Semana title does **not** change the Dia export; clearing it restores the computed
     default; the Rodapé appears only on the mobile formats.
   - **Fit:** a 5-block day at 9:16 warns; each escape resolves it; auto-shrink moves only that format's
     scale (check another format afterwards); at the floor the terminal message appears.
   - **Public pages unchanged** — this pass touches `index.css` again.
4. **Gallery walk** (4 themes × 2 widths) → `npm run design:cards` → DesignSync.

## Notes

- After this pass the app has, for the first time, a **parametric WOD renderer**: what a WOD looks like is a
  descriptor (`{skin, zones, days, cardStyle, content, titles, scale}`) rather than markup. That is the
  premise of the new backlog row **#171** (TV as a customisable display), which plans/82 files and which must
  not start before this ships.
- 🔴 **#171 must not inherit the fixed-canvas/crop model** — a wall display reflows, never crops.
