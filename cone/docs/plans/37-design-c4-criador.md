# 37 — #58 · Design pass C4 — Criador (+ #10 goals, #90 box dots, #35/#14/#15 slices)

> Third of three sessions in the Criador overhaul (planning session 2026-07-21).
> Run order: [35 decomposition](./35-criador-decomposition.md) →
> [36 text mode](./36-criador-text-mode.md) → **37 (this)**.
> **Depends on both** — it re-lays-out the components 35 extracted and hosts the mode
> toggle 36 introduced.

## Context

Two things converge here.

**The coach's layout complaint (2026-07-21).** The page opens on an empty form; the
week grid is below it. He thinks in weeks, not forms — the first thing on the page
should be the week, and creating a session should be a deliberate act, not the
default state of the screen. He also asked for a set of concrete fixes to the
detailed editor and the mobile sheet (listed below), and confirmed the block **type
picker is spot on** — it stays as-is.

**The design program.** #58 is C4 in the [design-pass program](./16-design-pass-program.md)
— Criador's session to adopt the [C0 standard](./33-design-c0-spa-standard.md)
(shipped 2026-07-19) and fold in its slice of #15 (hex→tokens), #14 (mechanical
a11y), and #35 (MM:SS rollout). Criador is the SPA's **second-worst hex file — 102
lines, up from 84, still growing.**

Two backlog features land with it because they belong to the same surface: **#10**
(block goals — the `Meta:` line 36's parser already produces) and **#90** (per-box
dot on week-grid cards).

Note the queue jump: C1–C3 (#55/#56/#57) have not run. That is deliberate — the
program's order is convenience, not dependency (only C0 gates C1–C5), and the
coach-pain case justifies taking Criador first.

## Acceptance

- The Criador opens on the **week grid**. No session form renders until a session is
  opened or created.
- `+ add` (grid) and `+ Nova sessão` (toolbar) both open the session modal; confirming
  it creates the session and opens the editor.
- On desktop the week stays visible (collapsed day strip) while editing; on mobile
  the editor takes over with a back link.
- Every block has a type-aware **Meta** field; `goalStr(block)` renders on
  `schedule.html`, the TV wall, and the shared WOD card.
- Complex movement rows read **reps then name**.
- The active Intensidade/Carga tab shows no `✕`.
- On mobile, tapping the exercise **name or the gear** opens the sheet; the sheet
  carries the name input; numeric fields raise the numeric keyboard.
- Week-grid cards show a colored dot per tagged box when the filter is **Todos**.
- `Criador.jsx` + `criador/**`: zero `.b`/`.bp`/`.bsec`/`.bd`/`.bsm` usages, zero
  non-data hex, zero non-circle `border-radius` literals, zero unnamed icon-only
  buttons, zero keyboard-inaccessible click-`<div>`s.
- `npm test` green · `npm run build:all` clean · verified at 1280×800 and 390×844
  under all 4 themes.

## Layout

### Landing = the week

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CRIADOR                    [¶ Importar semana] [🔖 Templates] [+ Nova sessão] │
├──────────────────────────────────────────────────────────────────────────────┤
│ ‹  20/7 – 26/7/2026  ›  [Hoje]   Box:(Todos)(Sem box)(●Eagles)(●Garra)  [▤¶] │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⚠ Avisos — todos os boxes                                      [+ Adicionar] │
│   [21/07/2026] [Feriado — sem aula às 18h                    ] [● On]  [×]   │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────────┤
│  DOM 20  │  SEG 21  │  TER 22  │  QUA 23  │  QUI 24  │  SEX 25  │   SÁB 26   │
│          │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │            │
│          │ │D1 Fo…│ │ │D2 Pu…│ │ │D3    │ │ │HYROX │ │ │D5    │ │            │
│          │ │●● ▸  │ │ │●  ▸  │ │ │●● ▸  │ │ │●  ▸  │ │ │●● ▸  │ │            │
│          │ │Aqu Sk│ │ │Aqu Sk│ │ │Aqu Sk│ │ │Aqu   │ │ │Aqu LP│ │            │
│          │ │FT    │ │ │EM FT │ │ │AM    │ │ │FT FT │ │ │EM FT │ │            │
│          │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │            │
│  + add   │  + add   │  + add   │  + add   │  + add   │  + add   │   + add    │
│          │  ⧉ copy  │  ⧉ copy  │  ⧉ copy  │  ⧉ copy  │  ⧉ copy  │            │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴────────────┘
                 (no form below until a session is opened or created)

  ●● = box color dots, shown when the filter is "Todos"  (#90)
  [▤¶] = detailed / week-as-text toggle (built in 36)
```

The week grid currently only renders when `totalSessions > 0` (`Criador.jsx:1860`).
It becomes unconditional — an empty week is the correct empty state for this page,
with the day columns and their `+ add` affordances.

### New-session modal — the fields from the coach's screenshot, content unchanged

```
        ┌──────────────────────────────────────────────┐
        │  NOVA SESSÃO                             [×] │
        ├──────────────────────────────────────────────┤
        │ DATA                NOME DA SESSÃO           │
        │ [21/07/2026    📅]  [ex: Semana 3 · D1 · Fo…]│
        │                                              │
        │ PARA QUEM                                    │
        │ [👥 Nenhum atleta — clique para selecionar ] │
        │                                              │
        │ VISIBILIDADE   (Público)( Oculto )           │
        │ BOX            (Sem box)(●Eagles)(●Garra)(●TM)│
        │                                              │
        │ ▸ Briefing da sessão                         │
        ├──────────────────────────────────────────────┤
        │               [ Cancelar ]  [ Criar sessão ] │
        └──────────────────────────────────────────────┘
```

Same modal, titled **Editar dados da sessão**, reopens from the editor header — so
these fields stop consuming permanent vertical space above the blocks. `+ add` on a
day column prefills that date. The existing "move session to another date" confirm
(`pendingDate`, `:1433`) still guards a date change on an already-saved session.

### Session editor

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ‹ Semana │ DOM20 SEG21● TER22 QUA23 QUI24 SEX25 SÁB26   ← collapsed strip    │
├──────────────────────────────────────────────────────────────────────────────┤
│ SEG 21/07 · D1 Força Lower  ●Eagles  Público            [⚙ Editar dados]     │
│                             [🔖 Template]  [📺 TV]  [ ✓ Salvar sessão ]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ 3 BLOCOS    Modo:(▤ Detalhado)( ¶ Texto )     [⤒ Recolher]  [⤓ Expandir]     │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⣿ ▾ [⏱ For Time ▾] [Nome personalizado…]     Modo:(▤)(¶)      [⧉]  [🗑]      │
│ │  Time cap (min) [ 14 ]   Rounds [ 5 ]   Meta [11:00]–[12:00]               │
│ │  ⣿ [ 5 ]×[ 8 ] [Power Clean            ] [M/F] [⚙] [×]                     │
│ │  ⣿ [ 5 ]×[10 ] [Toes to Bar            ]       [⚙] [×]                     │
│ │  ⣿ [ 5 ]×[100m▾][Run                   ]       [⚙] [×]                     │
│ │  [ + Exercício ]            [ ⧉ Copiar último ]                            │
│ │  [Notas do bloco — descrição, regras, buy-in…                          ]   │
│ └  Zona [Zona 01 ▾]                            [🔖 Salvar como Benchmark]    │
├────────────────────────────────── + ─────────────────────────────────────────┤
```

**Desktop:** the week stays above, auto-collapsed to the compact day strip that
already exists (reuse `weekGridCollapsed`), so the coach keeps the week in view while
editing. **Mobile:** the editor takes over with a `‹ Voltar à semana` back link.

**The block type picker stays as-is** — the coach calls it spot on. It gets token /
radius / a11y touch-ups only, no layout change.

## Detailed-view fixes (coach's list)

1. **Complex: reps before name.** `Criador.jsx:429-449` (now `criador/ExerciseRow.jsx`)
   renders `[name combobox] × [reps]`; flip to `[reps] × [name]`. The display side
   already complies — `ExerciseList.jsx:31-34` emits `mvReps` then `mvName` — so this
   is editor-only, and it makes the editor agree with every render surface.
2. **Remove the `✕` from the active intensity tab.**
   `src/components/shared/IntensityInput.jsx:67` — `{active && !isGhost ? ' ✕' : ''}`.
   Re-clicking the tab already clears the mode (`setM`, `:30`), so the affordance is
   redundant noise.
3. **Meta field on every block (#10).** Type-aware, in the meta row beside
   Duração/Rounds:
   - For Time · Benchmark · MetCon · HIIT → two `MaskedTimeInput`s, `de`–`até`
     (`até` optional — the coach writes ranges: "Meta: 11-12'")
   - AMRAP → rounds + reps number fields ("Meta: 5 rounds")
   - everything else → one short free-text field

   Stored as `block.goal = { kind:'time'|'rounds'|'text', min?, max?, reps?, text? }`
   — **the exact shape [36](./36-criador-text-mode.md)'s parser emits from `Meta:`**,
   agreed there so it doesn't change here.

   New canonical **`goalStr(block)`** in `src/public/lib/wod.js` (next to `blkMeta`),
   rendered by `src/public/shared/WodBlockCard.jsx`, `src/public/schedule/BlockDetail`,
   and `src/public/tv/slides.jsx` (BlockCard + TimerSlide) — the slots #10 reserved.
   One formatter, four call sites; do not hand-roll a fifth.
4. **MM:SS wherever the stored value is already mm:ss (#35 slice).** Station
   `duration`, `restBetweenCycles`, the Meta time fields, plus `timer.html`'s cap goal
   (`src/public/timer/Timer.jsx:568` — the instance the #35 row confirms is still raw
   `type="text"`). All via `src/public/shared/MaskedTimeInput.jsx`.

   > ⚠️ **Block `duration` deliberately stays a minutes number field.** It is stored
   > as bare minutes and read that way by TV, timer, `blkMeta`, `stationsCapStr`,
   > Schedule and Publicador — and `toSecs('14')` reads `14` as *seconds*, so mixing
   > the two shapes silently corrupts every cap. Converting it is a data migration
   > across every saved session, not an input swap. It has **its own backlog row**;
   > do not smuggle it in here.
5. **Mobile exercise sheet.**
   ```
   ┌─────────────────────────┐
   │  ══                     │
   │  Power Clean            │
   ├─────────────────────────┤
   │ [ 5 ] ×  [ 8 ]     [↔]  │  numeric keyboard
   │  Séries    Reps         │
   │                         │
   │ EXERCÍCIO               │  ← NEW (below séries/reps)
   │ [Power Clean         ▾] │
   │                         │
   │ ( Complexo )  ( Escada )│
   │                         │
   │ INTENSIDADE / CARGA     │
   │ (% RM)(Progressão)(M/F) │  ← no ✕ on the active tab
   │  Masculino      [kg ▾]  │
   │   RX    [ 60 ]          │  numeric keyboard
   │   Inter [ 50 ]          │
   │   SC    [ 40 ]          │
   │                         │
   │ OBSERVAÇÃO              │
   │ [                     ] │
   ├─────────────────────────┤
   │        [ ✓ Feito ]      │
   └─────────────────────────┘
   ```
   The row keeps its name field and gear icon, but **tapping either opens the sheet**
   (`ExerciseRow.jsx:549-574`) — on mobile the name is a tap target, and the real
   `ExerciseCombobox` lives in the sheet below Séries/Reps where there is room for its
   dropdown. `inputMode="numeric"` on sets / reps / dist / `% do RM` / progression
   load / gender load (`ExerciseRow.jsx` qty inputs + `IntensityInput.jsx:76,89,121`).
6. **#90 box dots.** On week-grid session cards when the filter is `Todos`, one dot
   per tagged box using that location's own `color`, read via `sessionBoxIds(s)`
   (`src/public/lib/boxScope.js`). Today the cards show only block-type pills, so the
   coach has to click through each box tab to see which card belongs where.

## Design-pass fold-ins (Criador's slice of the program)

- **C0 adoption.** Replace `.b`/`.bp`/`.bsec`/`.bd`/`.bsm` and the inline-styled
  buttons with `Button` from `src/components/ui/`, form fields with `Input`, and the
  **four** hand-rolled confirm forks — `Criador.jsx:1433` (move date), `:1448`
  (delete session), `:1463` (update template), and the `window.confirm` at `:836`
  (delete exercise) — with `ConfirmReview` from `src/public/shared/`. Per C0's
  recorded decision this **replaces** the globals here; it does not wrap them.
- **#15.** Inline hex → theme tokens; `border-radius` → `--radius-sm`/`--radius-md`
  (circles at `50%` stay — dots, avatar badges). `TYPE_CONFIG`'s per-type colors are
  **data colors and stay** (they identify a block family, same exemption as
  `blkColor`) — but reconcile them against canonical `blkColor` in
  `src/public/lib/wod.js` while here, and record any deliberate divergence in a
  comment rather than leaving a sixth silent taxonomy.
- **#14.** `aria-label` on every icon-only button; role / tabIndex / keyboard handlers
  on the click-`<div>`s (`wg-add`, `wg-copy`, the drag handles, the session cards) —
  14 of them live in this file per the 2026-07-16 census.

## Files

`src/components/tabs/criador/**` (all of it), `src/components/tabs/Criador.jsx`,
`src/components/shared/IntensityInput.jsx`, `src/public/lib/wod.js` (`goalStr`),
`src/public/shared/WodBlockCard.jsx`, `src/public/schedule/BlockDetail`,
`src/public/tv/slides.jsx`, `src/public/timer/Timer.jsx`,
`src/public/gallery/Gallery.jsx`.
New: `criador/SessionMetaModal.jsx` (the session modal), `criador/GoalInput.jsx`
(the type-aware Meta field).

## Gate — Lane A

These surfaces exist, so per WORKFLOW "Design work" this is **gallery-first, no
static mockup**: adjust the real components → review every state in `gallery.html`
across all 4 themes and both widths → `npm run design:cards` + DesignSync → **stop at
the approval gate.** Add `GoalInput` and `SessionMetaModal` to `GROUPS`.

## Verification

1. `npm test` green (add `goalStr` cases to `wod.test.js`); `npm run build:all` clean.
2. `npm run dev`, at **1280×800 and 390×844 under all 4 themes**:
   - Land on the page with an empty week → the grid renders with `+ add` per day and
     no form below it.
   - `+ add` → modal → Criar sessão → editor opens with the date prefilled → add
     blocks via the type picker → Salvar → card lands on the right day, week grid
     scrolls into view highlighted.
   - Reopen the session → `⚙ Editar dados` → change the date → the move-confirm fires.
   - Set a Meta on a For Time block (type `1`,`1`,`0`,`0` → `11:00`) and on an AMRAP
     block → check it renders on `schedule.html` and on the TV preview.
   - Mobile: tap an exercise **name** → sheet opens with the name input present; tap
     the gear → same sheet; every numeric field raises the numeric keyboard.
   - Complex exercise: movement rows read reps-then-name in the editor and in
     `ExerciseList` on the public pages.
   - Box filter `Todos` → cards show their box dots; switch to a single box → dots
     hidden, filter still correct.
   - Regression: legacy `mainTraining` string session, legacy cardio exercise,
     Estações block, read-only Benchmark block.
3. Token/radius/a11y greps over `src/components/tabs/criador/**` + `Criador.jsx`
   return zero for each of the acceptance categories.
4. `npm run dev:public` → `gallery.html` across 4 themes × both widths; then
   `npm run design:cards` + DesignSync.
5. `/verify` before committing; `/code-review` before pushing (L).
6. **Docs are part of Done:** update `CLAUDE.md` (the new Criador layout, `block.goal`
   + `goalStr`), move #58 / #10 / #90 to Done in `BACKLOG.md`, and confirm the
   `block.duration` mm:ss migration row is still open and accurate.

Model: Opus · Size: L
