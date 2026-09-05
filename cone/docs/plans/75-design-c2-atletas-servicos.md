# 75 — #56 · Design pass C2 — Atletas + Serviços → Afiliados

> ✅ Done: `87aeeb1` · 2026-08-28 — see BACKLOG.md. **All phases shipped** (Phase A the two tabs onto C0 primitives, Phase B me.html’s PR sub-cards). Planned + built to the approval gate 2026-08-13, wired and verified live 2026-08-28. Closed **#56** and **#87** (folded in whole). Spawned #160/#161/#162 from mockups 51 + 60.

> C2 in the [design-pass program](./16-design-pass-program.md). **Lane A — gallery-first,
> no static mockup** (plans/16 rule 1: the surfaces exist, so the real component is the
> truth). Adopts the [C0 standard](./33-design-c0-spa-standard.md) on the two tabs and
> absorbs the Serviços → Afiliados restructure ([plans/42](./42-afiliados-direction.md)).
>
> **Runs in two phases, each stopping at its own approval gate** (same shape as C1/plans/38):
> **Phase A — Atletas**, **Phase B — Afiliados**. They share no files; either can ship alone.
>
> ⚠️ **Gate protocol for this plan, per the user's 2026-08-14 instruction:** the components are
> built and gallery-covered **first, without rewiring the tabs**. `Atletas.jsx`, `Servicos.jsx`,
> `App.jsx`, `tabs.js` and `index.css` stay untouched until the states are reviewed, so the
> running app carries zero risk while the design is under review. The wiring (Approach §§4–8 of
> each phase) is the post-approval half.

## Context

C1 (#55, `118f786`) was the last C-session to land; C4 shipped 2026-07-22. The program
resumes here in table order — C2 → C3 → C5. These are the two largest un-passed SPA tabs
and the two worst token offenders left outside Publicador's jsPDF-exempt block.

**Re-measured 2026-08-13** (the board's figures predate `9b82015`'s reformat and undercount):

| | lines | hex lines | `borderRadius` | `aria-label` | `.module.css` |
|---|---|---|---|---|---|
| `Atletas.jsx` | **1795** | 17 | 2 (both `50%`, exempt) | **0** | none |
| `Servicos.jsx` | **1199** | **110** (board said 75) | **34** (board said 31) | **0** | **none** |

**`Atletas.jsx:20-26`** (the board's `:14-20`, shifted by the reformat) freezes the totk-dark
palette as seven JS consts — `BG/STONE/DIV/CREAM/SUB/MUTED/DIM` — and inline-styles the whole
1795-line component off them. Colors are wrong in **3 of 4 themes**. Same bug class C1 killed in
`Exercicios.jsx`, and the same class as the retired `athletes.html` / #53's `Index.jsx` `BLOCK_COLORS`.

**`Servicos.jsx` has no stylesheet at all** — 110 hex lines of inline style objects (`#0d0d0d`,
`#2e2e2e`, `#111`, `#ccc`, `#555`, `#1e1e1e`, `#3a1010`…), a hardcoded palette that is not even
totk-dark, so it is wrong in **4 of 4** themes.

**Five things found while planning that the board does not record.** Each is a concrete
deletion or dedupe, not a judgment call:

1. **`.ex-input` has exactly ONE consumer app-wide: `Atletas.jsx`.** `index.css:306`'s grab-bag
   comment says it is "shared Criador ExerciseCombobox (#58) + Atletas" — that is **wrong**;
   Criador's combobox moved to `s.comboInput` in its own module. Once Atletas adopts `Input`,
   `.ex-input` + `.ex-input:focus` + `.ex-input::placeholder` are zero-consumer and get deleted.
2. **`Atletas.jsx:34` is a private fork of `criador/ExerciseCombobox.jsx`**, strictly worse:
   no `role="combobox"`/`aria-expanded`/`role="listbox"`/`role="option"`, no click-outside close,
   no scroll close, frozen-palette dropdown. Its prop-sync at `:71-73` is
   **`useState(fn, [value])` — not a real API**; `useState` ignores the second argument, so the
   sync the author intended has never run. Criador's copy already does this correctly
   (`:45-49`, adjust-during-render). One implementation survives.
3. **`PrRow`'s bar (`:205-243`) and `HpBar`'s bar (`:654-704`) are two more hand-rolled 10-block
   gauges** — the exact primitive `TallyBar` is, complete with milestone ticks. #52's rule is
   "ONE bar primitive, never two"; `me/GoalList.jsx:51` already renders the *identical* goal case
   through `TallyBar` with `ticks`. The #52 sweep only covered public pages, so these two survived.
4. **`Servicos.jsx:303`'s `ConfirmDeleteModal` is a fourth confirm fork**, on top of the three C0
   collapsed. `Atletas.jsx` adds **four `window.confirm`s** (`:630, :648, :993, :1069`).
5. **`--theme-accent` is defined in `src/index.css:3`, not `themes.css`.** It is an SPA-only alias
   for `var(--accent)`. `gallery.html` loads **`themes.css` only** — so every component extracted
   for the gallery must use `var(--accent)` / `var(--accent-text)` directly. Atletas has 10 uses,
   Servicos 19; all of them move.

**The restructure.** plans/42 decided the affiliate record carries identity/roster/structure and
**no pricing** — `locations[].rate` means *what the coach charges that box* (money flows box → coach)
and the Relatório depends on it, so the rate/Pix half keeps its own pane. Decisions taken
2026-08-13, closing plans/42's "#56 owns the tab rename when it runs":

- **Two live panes ship: `Afiliados` + `Meu negócio`.** Coaches (#103) and Turmas (#40) have no data
  behind them; the pane shell is built so each drops a pane in later. No "em breve" placeholder —
  `locations[].coachName` (written at `Servicos.jsx:740`, read by nothing) is the standing lesson.
- **Nav label → `Afiliados`.** Label only. Tab **id stays `locations`**, the file/blob stays
  `locations`, `App.jsx`'s wiring is unchanged.
- **Atletas' detail pane becomes `Card` sections** with real `<h2>`s and a reserved #39 Adaptações
  slot. PR rows stay **dense rows**, not me.html's one-card-per-row — a coach scanning 20 PRs wants
  density; plans/73's card language is the athlete's surface, not his.

⚠️ **This is a UI restructure with zero data change.** `locations[]`'s shape is read by
`Config.jsx:41`, `Criador.jsx:57`, `AgendaView.jsx:42,659`, `events.jsx:13,604`,
`billing.js:45-46` and `stateBackup.js:39`. Nothing in the blob moves, is renamed, or is added.

## Acceptance

**Both phases**
- Zero frozen-palette JS consts; zero non-data hex; zero non-circle `border-radius` literals;
  zero `--theme-accent` / `--theme-accent-text` in any file the gallery renders.
- Zero `.b`/`.bp`/`.bsec`/`.bd`/`.bsm`, `.ex-input`, `.settings-*`, `.fg`/`.lbl`/`.g2` usages
  **in these two tabs** (the classes themselves survive in `index.css` for Resultados/Publicador —
  C3/C5 delete the rest; see "Constraints that bite" for what C2 may delete outright).
- Zero unnamed icon-only buttons; zero keyboard-inaccessible click-`<div>`s; every section a real
  `<h2>` (`AppChrome` already renders the pane `<h1>`).
- Zero `window.confirm`; every destructive action goes through `ConfirmReview`.
- Correct under **all 4 themes** at **1280×800 and 390×844** — the frozen-palette bug is gone,
  verified by switching themes on each tab.
- `npm test` green · `npm run build:all` clean · `npm run lint` clean at `--max-warnings 0`.

**Phase A — Atletas**
- `Atletas.jsx` is a container over `src/components/tabs/atletas/` + `Atletas.module.css`.
- Both hand-rolled bars are gone; `TallyBar` renders the goal bar (with `ticks`) and the PR bar.
- The private `ExerciseCombobox` fork is deleted; one implementation lives in
  `src/components/shared/`. `.ex-input` is deleted from `index.css`.
- Detail pane = `Card` sections (Sessões · PRs · Objetivos) + the reserved Adaptações slot.
- Empty states carry their affordance instead of centred italic dead space.
- New gallery group **`Atletas`** covering the extracted components across the state axes.

**Phase B — Afiliados**
- `Servicos.jsx` → `Afiliados.jsx` + `src/components/tabs/afiliados/` + `Afiliados.module.css`;
  `App.jsx`'s lazy import updated; `tabs.js` label → `Afiliados` with `id:'locations'` unchanged.
- Two panes: **Afiliados** (the list + roster) and **Meu negócio** (coach profile · Pix · rates).
- The left-pane overflow is gone **by construction** — the coach profile no longer sits above the
  list in a 260px scrolling column.
- `ConfirmDeleteModal` is deleted in favour of `ConfirmReview`.
- New gallery group **`Afiliados`**.

**Both:** `npm run design:cards` regenerated + DesignSync'd, then **stop at the approval gate**.

## Files

**Phase A**
- `src/components/tabs/Atletas.jsx` — container only (list/detail composition, mobile pane switch,
  the data mutators, modal wiring).
- **new** `src/components/tabs/atletas/` — `AthleteList.jsx` · `AthleteHeader.jsx` ·
  `SessionStrip.jsx` · `PrRow.jsx` · `GoalBar.jsx` (was `HpBar`) · `GoalConfigPanel.jsx` ·
  `PrModal.jsx` · `AddResultModal.jsx` · `AthleteProfileModal.jsx` · `atletasHelpers.js` +
  `atletasHelpers.test.js` · `Atletas.module.css`.
- **new** `src/components/shared/ExerciseCombobox.jsx` — moved from `criador/`, gains
  `excludeNames`. Keeps its own `loadRegistry()` call (see Approach §3), so it is **not**
  gallery-covered — same footing as `components/shared/IntensityInput.jsx`.
- `src/components/tabs/criador/ExerciseCombobox.jsx` — deleted; `criador.module.css`'s
  `combo*` rules move with it. Update `criador/ExerciseRow.jsx` (+ any other importer).
- **new** `src/components/ui/ColorField.jsx` + `.module.css` — the hidden-`input[type=color]`
  + swatch + hex-text pattern, duplicated at `Atletas.jsx:1624-1650` and `Servicos.jsx:243-277`.
- `src/index.css` — delete `.ex-input*`; delete `.color-row`/`.color-swatch`/`.color-input`
  **only if the grep confirms zero consumers**.
- `src/public/gallery/groups/atletas.jsx` (new) + `Gallery.jsx` `GROUPS`.

**Phase B**
- `src/components/tabs/Servicos.jsx` → **renamed** `Afiliados.jsx` (container + pane router).
- **new** `src/components/tabs/afiliados/` — `AffiliateRow.jsx` · `AffiliateFormModal.jsx` ·
  `AthleteAssignment.jsx` · `BoxQrModal.jsx` · `MeuNegocioPane.jsx` (was `CoachProfileForm`) ·
  `CurrencyInput.jsx` · `affiliateHelpers.js` + `affiliateHelpers.test.js` · `Afiliados.module.css`.
- `src/App.jsx` — the lazy import path (`:13`) only; the `tab === 'locations'` branch is unchanged.
- `src/components/chrome/tabs.js` — `label: 'Afiliados'`, `id` untouched.
- `src/public/gallery/groups/afiliados.jsx` (new) + `Gallery.jsx` `GROUPS`.

**Read-only reuse:** `src/components/ui/{Button,Input,Card}.jsx` · `src/public/shared/
{ConfirmReview,TallyBar,MaskedTimeInput}.jsx` · `public/lib/goals.js` (`prBest`/`prDelta`/`prPct`,
already imported) · `public/lib/registry.js` (`buildRegistryIndex`/`resolveExercise`, already
imported) · `public/lib/week.js` (`DAY_PT_TITLE`, already imported).

## Approach

### Phase A — Atletas (Lane A, gallery-first)

1. **Kill the frozen palette (the #15 core).** Delete `:20-26`. Map `BG→--bg` · `STONE→--stone` ·
   `DIV→--divider` · `CREAM→--cream` · `SUB→--sub` · `MUTED→--muted` · `DIM→--dim` into
   `Atletas.module.css`. The remaining literals: `#68d8a0`/`#e05848` (PR delta good/bad) →
   `--green`/`--red`; `#d8a840` (milestone tick, "Novo PR!") → `--gold`; `rgba(74,200,192,.1)`
   (the "Hoje" chip, `:1431`) → `color-mix(in srgb, var(--accent) 12%, transparent)`.
   **`#e87820` stays** — it is the default *athlete identity* color (a data color, `:923/941/950/
   968/1141/1628/1638`); promote it to one named const rather than seven literals.
   `ECOL` block-family colors stay — data colors, exempt.
2. **Bars → `TallyBar`.** `PrRow`'s bar becomes `<TallyBar pct={prPct(pr)} color={athColor} />`;
   `HpBar` becomes `<TallyBar pct={…} color={athColor} ticks={…} size="lg" />` with the ticks built
   exactly as `me/GoalList.jsx:25-31` builds them (`hit` / `next` / `future`). Keep the literal
   `N/M` counts printed beside the bar — TallyBar is always 10 blocks whatever the denominator,
   and the caller owns the numbers.
3. **One `ExerciseCombobox`.** Move `criador/ExerciseCombobox.jsx` → `components/shared/`, add an
   optional `excludeNames` prop (Atletas' only real addition), delete Atletas' fork. **Keep the
   internal `loadRegistry()`** — making it props-in would rewrite Criador's call sites on a
   shipped C4 surface for no gain here, and `components/shared/` is already the home for
   client-touching shared components (`IntensityInput`). Then delete `.ex-input*` from `index.css`
   (zero consumers after this — re-grep to confirm). `.ex-suggestion` **stays**: the moved
   component still uses it.
4. **C0 adoption.** `.b bsm` → `Button size="sm"`; `.b bd bsm` → `Button variant="destructive"`;
   `.b bsec` (a mislabelled accent-fill primary, `index.css:62`) → `Button variant="primary"`.
   `.ex-input`/`select`/`input[type=date]` → `Input` (+ `as="select"`). Modal shells
   (`.settings-overlay`/`.settings-modal`/`.settings-drag-hdr`) → `Card` inside the C0 modal shape.
   Per C0's recorded decision this **replaces**, never wraps.
5. **Confirms.** `deleteAthlete` (`:993`), `deletePr` (`:1069`), `HpBar`'s delete (`:648`) →
   `ConfirmReview` with canonical labels. **The `+1 sessão` confirm (`:630`) is removed outright** —
   it gates a reversible single increment (the config panel edits `completedSessions` directly),
   which is confirm-fatigue, not safety.
6. **Detail pane → `Card` sections.** `SecLabel` (`:1097`, a 9px uppercase div) becomes `Card`'s
   own `title` + a real `<h2>`; sections are Sessões · PRs · Objetivos · **Adaptações slot**.
   The slot is a **comment-marked position in the JSX order plus a gallery case** — no on-screen
   placeholder, same reasoning as the pane decision. #39 fills it.
7. **Empty states.** `:1244` "Selecione um atleta" (centred italic in a full pane) forks into two:
   **no athletes yet** → the same block as the footer's `+ Novo atleta`, with the affordance in it;
   **athletes exist, none selected** → a short hint, not a full-pane void. Same for `:1125`,
   `:1367`, `:1474`, `:1528`.
8. **#14 fold-in.** `:1145` (athlete row) and `:656` (bar expand toggle) → `role="button"` +
   `tabIndex={0}` + Enter/Space; the color-proxy `<div>` (`:1633`) disappears into `ColorField`.
   Every icon-only `Button` gets `aria-label` (the primitive warns in DEV if it doesn't).
9. **Helpers + tests.** `combinedPct` (`:928`), the PR label/date formatting (`:184-203`), and the
   session-strip window selection (`:1077-1095`) move to `atletasHelpers.js` with unit tests —
   the convention `resultadosHelpers` / `exerciciosHelpers` / `stateBackup` / `billing` set.
10. **Gallery group `Atletas`.** Client-free items only (no `utils/storage` import, direct or
    transitive — it pulls the SPA Supabase client and breaks the public-server gallery).
    Cases: `PrRow` load/time/reps × with-target/without × delta ↑/↓/none × long name ×
    mobile/desktop · `GoalBar` 0% / partial / 100% / with milestones / expanded ·
    `AthleteList` empty / one / many / selected / long name · `GoalConfigPanel` ·
    `AthleteHeader` full / minimal fields · the detail empty states · the Adaptações slot.
11. **Gate:** `gallery.html` across 4 themes × both widths → `npm run design:cards` + DesignSync →
    **stop.**

### Phase B — Afiliados (Lane A, gallery-first)

1. **Create `Afiliados.module.css` and move all 110 hex lines into it as tokens.** The mapping is
   mechanical and one-way: `#0d0d0d`/`#111` → `--bg`/`--stone`; `#161616` → `--stone2`;
   `#1e1e1e`/`#2e2e2e` → `--divider`/`--border` (**pick deliberately** — plans/65 made these two
   differ by 1.50:1, and a form control is `--border` while an inner separator is `--divider`);
   `#ccc`/`#bbb`/`#fff` → `--text`/`--cream`; `#888`/`#666` → `--sub`; `#555`/`#444`/`#333`/`#3a3a3a`
   → `--muted`/`--dim`; `#e05050`/`#5a1a1a`/`#3a1010`/`#6a2020` → `--red` (+ `color-mix` washes);
   `#d8a840` → `--gold`; `#4ac8c0` → `--accent`. All 19 `--theme-accent` → `--accent`.
   All 34 `borderRadius` literals → `--radius-sm`/`--radius-md`, **except** the four `'50%'`
   circles (`:247`, `:539`, `:898`, and the athlete dot), which are the exempt shape primitive.
   The QR image's `background:'#fff'` (`:629`) **stays and gets a comment** — a QR must scan on
   every theme, exactly like the video letterbox `#000` C1 kept.
2. **Pane shell.** `Afiliados.jsx` becomes a container with a two-pane switcher
   (**Afiliados** · **Meu negócio**), built so adding a third/fourth pane is a row in an array —
   #103 and #40 each add one. Desktop keeps the list/detail split *inside* the Afiliados pane;
   mobile keeps the accordion. `CoachProfileForm` becomes `MeuNegocioPane` and is **no longer
   stacked above the list** — that removal is the left-pane overflow fix, and it retires the
   `compact` prop fork (`:376-396`) with it.
3. **C0 adoption.** Every inline-styled `<button>` → `Button` (the accent-fill "Novo"/"Salvar
   alterações"/"Copiar link" → `primary`; the bare-icon QR/edit/trash row → `ghost`/`destructive`
   `iconOnly` with `aria-label`); every inline-styled `<input>`/`<select>`/`<label>` → `Input`;
   the three modal shells → `Card` on the C0 modal shape. `CurrencyInput` keeps its centavos logic
   (and its render-time prop sync, `:23-28` — that is the documented React pattern, don't "fix" it)
   but renders through `Input`.
4. **`ConfirmDeleteModal` → `ConfirmReview`** (destructive), preserving the "Eventos vinculados
   perdem a referência ao local" consequence line as read-back body. The fork is deleted.
5. **`ColorField`** replaces the `document.getElementById('loc-color-picker').click()` proxy
   (`:243-277`) — same component Phase A introduces.
6. **Empty states.** `:866`/`:1085` "Nenhum local cadastrado." carries the `+ Novo` affordance;
   `:1182` "Selecione um local para configurar atletas." becomes a short hint, not a full-pane void.
   `AthleteAssignment` gains a genuine zero-athletes state (today it renders an empty `<div>`).
7. **#14 fold-in.** `:892` (mobile accordion header `<div onClick>`) → `role="button"` +
   `tabIndex` + keys + `aria-expanded`; `:1092` (desktop list row) same; the three `title=`-only
   icon buttons get `aria-label` too (`title` alone satisfies `Button`'s DEV warning but is not
   an accessible name on touch).
8. **Rename + rewire.** `tabs.js` label → `Afiliados`; `App.jsx:13` import path.
   **Do not touch `id:'locations'`**, the `locations` blob, or any of the seven consumers listed
   in Context.
9. **Helpers + tests.** `rateLabel` (`:793`) and the centavos round-trip move to
   `affiliateHelpers.js` with tests.
10. **Gallery group `Afiliados`.** Cases: `AffiliateRow` box / personal / selected / no-rate /
    long name / mobile-expanded · `AffiliateFormModal` new / edit · `MeuNegocioPane` Pix on / off /
    with test cap · `AthleteAssignment` empty / few / many / checked · `BoxQrModal` loading /
    ready / copied · the empty states.
11. **Gate:** `gallery.html` 4 themes × both widths → `design:cards` + DesignSync → **stop.**

### Constraints that bite (both phases)

- 🔴 **Gallery components must be client-free** — no `utils/storage` / `utils/supabase` import,
  direct or transitive. Pass athletes/registry/coach in as props. **No CI gate catches a broken
  gallery import** (C1 left `gallery.html` a hard 500 until #52 noticed); open it after wiring.
- 🔴 **Use `var(--accent)`, never `var(--theme-accent)`** in anything the gallery renders —
  the alias lives in `src/index.css`, which `gallery.html` does not load.
- Gallery group names become card filenames via `group.toLowerCase()` → **`Atletas`** and
  **`Afiliados`** (clean ASCII). Never "Serviços" — the cedilla would land in a filename.
- `.b`/`.bp`/`.bsec`/`.bd`/`.bsm`, `.fg`/`.lbl`/`.g2`, `.settings-*` and `.rp-mobile-back` are
  **still consumed by `resultados/*` and `Publicador.jsx`/`AgendaView.jsx`** — C2 stops using them
  but must **not** delete them. Only `.ex-input*` (and possibly `.color-*`) go to zero here.
- `<main>` is absent from the whole SPA (`App.jsx`'s `.pane` is a `<div>`). **Deliberately not
  fixed here** — plans/16 rule 5 puts landmark architecture in #14's post-C5 residue, and the
  element is shared by all nine tabs. Noted so it is not re-derived.
- First session to use Cinzel 500/800 adds the `@fontsource` import to `src/fonts.js` —
  both are already loaded (#52), so this is a no-op unless a new weight appears.

## Verification

1. `npm test` green (incl. the two new helper suites); `npm run build:all` clean;
   `npm run lint` clean at `--max-warnings 0`.
2. `npm run dev` — **Atletas** and **Afiliados** at **1280×800** and **390×844**, under **all 4
   themes** (⚠️ if a change does not appear, unregister the service worker first — CLAUDE.md's
   `cone-v*` poisoning note; check it *before* debugging `src/`):
   - Switch themes on each tab → colors track the theme (the frozen-palette bug is gone).
   - **Atletas:** add / select / edit / delete an athlete (delete confirm fires); add a PR, add a
     result to it, edit it, delete it; add a goal, `+1` (no confirm), configure milestones, watch
     the `TallyBar` ticks; keyboard-reach the athlete row and the bar toggle with Enter/Space.
   - **Afiliados:** switch panes; add / edit / delete a location (confirm fires and states the
     consequence); toggle athletes onto a box; open the QR modal and copy the link; on **Meu
     negócio** edit the coach fields, toggle Pix, set the test cap — then reload and confirm it
     persisted (the debounced save at `:707-714` must survive the move to its own pane).
   - Confirm the left-pane overflow is gone: the affiliate list is the first thing in its column.
3. **Regression the restructure could break, check explicitly:** Agenda's event form still resolves
   a service rate; the **Relatório** still bills and still stamps Pix (`events.jsx` + `billing.js`
   read `locations[]` directly — a shape change there is the failure mode this plan forbids);
   Criador's box picker and Configurações' box list still populate.
4. Greps return zero for each acceptance category over both tabs: frozen consts, non-data hex,
   non-circle radii, `--theme-accent`, `.b`/`.ex-input`/`.settings-`, `window.confirm`,
   unnamed icon buttons. `ECOL` and the named athlete/affiliate default colors expected to remain.
5. `npm run dev:public` → `gallery.html`: **open it** (no CI gate), walk both new groups across
   4 themes × both widths → `npm run design:cards` → DesignSync → **stop at the approval gate.**
6. `/verify` before committing; `/code-review` before pushing (L).
7. **Docs are part of Done:** move #56 to Done in `BACKLOG.md`; update the plans/16 table's C2 row
   and the RESUME POINT (next is C3/#57); update `CLAUDE.md` — the tab label, the two new
   `.module.css` files, the `ExerciseCombobox` promotion, `.ex-input`'s deletion, the gallery item
   count (46 → new total) and its group list, and the test count.

## Notes

- **Size L, not M→L.** ~3000 lines across two tabs, two decompositions, two new module
  stylesheets, two gallery groups and a tab restructure. Planning was Opus (the restructure
  scope and the five dedupes above); **execution is Sonnet per phase** — each phase is
  mechanical-with-judgment once the mappings in §1 are fixed.
- **Phase A ships independently of Phase B.** They share only `ColorField`; build it in whichever
  phase runs first.
- Two follow-ups this plan deliberately does **not** take: the `<main>` landmark (#14's residue)
  and any `settings.value.coaches` / `classSchedule` work (#103 / #40 own their panes).

Model: Opus (plan) · Sonnet (execute, per phase) · Size: L
