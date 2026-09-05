# 38 — #55 · Design pass C1 — Exercícios + Configurações (+ #87 registry & PR board)

> ✅ Done: `cab19c8` → `63d8394` → `3bf5bae` → `3b6a826` → `118f786` · 2026-07-26 — closed #55, #87. See BACKLOG.md

> **All phases shipped.** Phase A `cab19c8` (Exercícios + Configurações adopt C0 —
> Button/Input/ConfirmReview, the frozen totk-dark palette gone, "Salvar config.json"
> removed, native-button a11y, and #87's search + alphabetical-canonical registry
> ordering with drag-reorder + A→Z retired), scrollbar tokenize `63d8394`, Phase B
> `3bf5bae` (me.html PR board → family cards + tiles + the #87 benchmark time-PR card),
> direction mockups D1–D5 `3b6a826`, and the **Exercícios rework** `118f786` (mockup 45 —
> family accordion/flat list, variation sub-groups, completeness indicator, new
> `src/public/lib/exerciseGroups.js` + 15 tests). Live-verified 4 themes × 2 widths.
>
> Follow-ups the [2026-07-26 review](../reviews/2026-07-26.md) raised on this work — none
> blocking, all filed: **#96** (the 3-pane proportions at 1280 and the empty-by-design WOD
> categories filling the first phone screen), **#98** (the category taxonomy forked a third
> way — `BLOCK_ORDER` vs `ALL_CATEGORIES`), **#101** (no tests for the tab's own helpers;
> `initRegistry` writes during load).

> C1 in the [design-pass program](./16-design-pass-program.md). Adopts the
> [C0 standard](./33-design-c0-spa-standard.md) (shipped 2026-07-19) on two SPA tabs
> and folds in their #15/#14/#35 slices. **Two scope decisions were settled at planning
> (2026-07-22):**
>
> - **Agenda is deferred to C5.** The program bundle named "Exercícios + Configurações
>   + Agenda", but Agenda is `AgendaView` — ~1050 lines of `React.createElement` living
>   *inside* `Publicador.jsx` (`:1077-2124`), the exact file **C5/#59** decomposes
>   (#25's "agenda+events" seam). Design-passing createElement code in-place only for
>   C5 to rip it apart weeks later is churn; Agenda's chip-legibility + token/a11y pass
>   rides #59 where the file is already being restructured. C1 = **Exercícios +
>   Configurações**.
> - **All of #87 folds in** (user directive "fold #87 into #55", taken whole). #87 spans
>   two surfaces and two lanes, so this plan runs in **two phases**: Phase A (Lane A,
>   gallery-first) does the tabs + the Exercícios-registry half of #87; Phase B
>   (Lane B, mockup-first) redesigns the me.html PR board as sub-cards. Phase B stops at
>   the approval gate.

## Context

The public design program (B1–B4) is done and C0 shipped the SPA standard + the five
primitives (`Button`/`Input`/`Card` in `src/components/ui/`, `ConfirmReview`/
`MaskedTimeInput` in `src/public/shared/`). **No tab adopts them yet** — C1 is the
first. It takes the two smallest, most self-contained SPA tabs first:

- **`Exercicios.jsx` (558 lines)** is a textbook C1 target. It **freezes the totk-dark
  palette as JS consts** (`BG/STONE/DIV/CREAM/SUB/MUTED/DIM`, `:8-14`) and inline-styles
  the entire component off them → **wrong colors in 3 of 4 themes** (same bug class as
  `Atletas.jsx:14-20` / retired `athletes.html`). It carries the **"Salvar config.json"**
  dev leftover (`Footer` `:505-512` + `saveConfig` `:192-220`), a button zoo
  (`.b`/`.bsm`/`.bsec`/`.bd`, `.ex-input`, `.settings-*`), a `window.confirm` delete
  (`:168`), and click-`<div>`s with no keyboard path (type rows `:233,246`, ex rows
  `:287`, type tags `:376`).
- **`Config.jsx` (134 lines)** is small: one `.b bp` save button, `.cfg-input` fields,
  theme buttons. A clean, quick C0 adoption.

**#87** (folded whole) adds to the same Exercícios surface — a **search box**,
**alphabetical-within-category** ordering (the registry orders by insertion + a manual
A→Z button today), and **benchmark WODs as PR-trackable** — plus a **PR-board sub-card
redesign** on me.html. The `PrSection.jsx` header comment already records that the
card-vs-dense-list decision "is a design decision for the Claude Design pass, not a
mechanical one" — this session is that pass.

## Acceptance

**Phase A (Lane A — Exercícios + Configurações + #87 registry half):**
- `Exercicios.jsx` + `Config.jsx`: zero `.b`/`.bp`/`.bsec`/`.bd`/`.bsm` usages, zero
  frozen-palette JS consts, zero non-data hex, zero non-circle `border-radius` literals,
  zero unnamed icon-only buttons, zero keyboard-inaccessible click-`<div>`s. Block-family
  colors (`ECOL`/`blkColor`) stay — data colors, exempt.
- Correct under **all 4 themes** (the frozen-palette bug is gone — verified by switching
  themes on the Exercícios tab).
- The **"Salvar config.json"** button and `saveConfig` are removed. (App.jsx's *read* of
  `config.json` on boot, `:69-137`, is a separate path and stays.)
- Exercícios has a **search box** filtering the exercise list, and exercises render
  **alphabetically within each category** by default.
- The named **benchmark WODs** (`BENCHMARK_GIRLS`/`BENCHMARK_HEROES`, `lib/benchmarks.js`)
  are reachable as PR-trackable entries (see the PR_SKIP note in Approach).

**Phase B (Lane B — PR board redesign):**
- A synced `cone/design/` mockup of the me.html PR board as sub-cards, across 4 themes —
  **run stops at the approval gate.** Build is post-approval.

**Both:** `npm test` green · `npm run build:all` clean · verified at 1280×800 and
390×844 under all 4 themes · `/code-review` before push (L).

## Files

**Phase A**
- `src/components/tabs/Exercicios.jsx` — the bulk: drop `:8-14` consts, adopt
  `Button`/`Input`/`Card`, tokenize inline styles (likely extract a
  `Exercicios.module.css` — the file is 558 lines of inline style objects), a11y on the
  click-`<div>`s, remove `saveConfig`/Footer button, add search + alpha ordering.
- `src/components/tabs/Config.jsx` — `.b bp` → `Button primary`, `.cfg-input` → `Input`,
  theme buttons token-clean.
- `src/public/lib/registry.js` and/or `Exercicios.jsx` — the ordering/search rework
  (#87 asks for a registry-level change, "not just a display-side sort"). Reuse
  `normExName` (already imported) for search matching.
- Primitives (read-only, reuse): `src/components/ui/{Button,Input,Card}.jsx`.
- `src/public/gallery/Gallery.jsx` — add Exercícios/Config states if the tabs expose
  reusable pieces (per #17 the gallery grows as pages are touched).

**Phase B**
- `cone/design/` — the PR sub-card mockup (Lane B: inline CSS, `<!-- @dsCard group="…" -->`).
- `src/public/me/PrSection.jsx` (+ `Me.module.css`) — the build target after approval.
  Reuses `TallyBar`, `prBest`/`prPct`/`prDelta` (`lib/goals.js`) — already wired.
- `src/public/me/meHelpers.js` — the benchmark-PR decision touches `PR_SKIP`.

## Approach

### Phase A — Lane A (gallery-first, no static mockup)

1. **Kill the frozen palette (the #15 core).** Delete `Exercicios.jsx:8-14`. Move the
   component's inline styling to token-based CSS — an `Exercicios.module.css` is the
   clean home given the volume; map `BG→--bg`, `STONE→--stone`, `DIV→--divider`,
   `CREAM→--cream`/`--text`, `SUB→--sub`, `MUTED→--muted`, `DIM→--dim`. Raw hex:
   `#e05848` (add-error) → `--err`/`--red`; `#4ac8c0` (published/video) → `--teal`;
   `#1a1410` (drag-over) → a token wash (`color-mix(--stone2 …)`); `#000` on the video
   iframe backdrop is deliberate (video letterbox) — **keep, comment it**. `ECOL`
   block-family colors are **data colors, exempt** (same as `blkColor`).
2. **C0 adoption.** `.b bsm`/`.b bsec`/`.b bd` → `Button` variants (sm/secondary/
   destructive); `.ex-input`/`textarea`/`select` → `Input` (+ `as="textarea"`); the
   video `.settings-overlay`/`.settings-modal` → the C0 modal/`Card` shell. Per C0's
   recorded decision this **replaces** the globals, not wraps them.
3. **Confirms.** `deleteEx`'s `window.confirm` (`:168`) → a destructive `ConfirmReview`
   (or the C0 lightweight destructive-confirm pattern — settle in-session; it's a
   simple "remove from N types?" yes/no, not a read-back). Same for the `saveConfig`
   `window.prompt` — which is being **deleted** anyway (step 4).
4. **Remove "Salvar config.json".** Delete the `Footer` export button (`:508-510`) and
   `saveConfig` (`:192-220`). The Footer's count line (`N tipos · N exercícios`) stays.
   Confirm App.jsx's `fetch('./config.json')` (`:69`) is untouched — it's a *read* of a
   deploy artifact, independent of this SPA-side *export*.
5. **#14 a11y.** Type rows (`:233,246`), exercise rows (`:287`), and type-tag toggles
   (`:376`) are click-`<div>`/`<span>` → `role="button"` + `tabIndex={0}` + a keyboard
   handler (reuse the `onKey` pattern from `schedule/scheduleHelpers.js`, as
   `PrSection` does). Icon-only buttons (A→Z sort `:269`, video play `:435`, delete
   `:473`, ON/OFF `:424`) get `aria-label`.
6. **#87 search + alpha.** Add a search input over the exercise list (`normExName`
   match, so accent/case/whitespace-insensitive — the registry's own comparison key).
   Make **alphabetical-within-category the default order**: the "Todos" pane already
   sorts (`allEx`, `:78`); apply the same to the per-category pane and make it the
   stored/canonical order rather than insertion order. Decide in-session what happens to
   manual drag-reorder (`reorderExs`/`sortAZ`) — likely alpha-canonical with drag
   retired, or drag kept as an explicit override. This is the "rework how exercises are
   registered … to support ordering + search efficiently" #87 calls for.
7. **#87 benchmarks — note the real blocker.** `PR_SKIP` (`meHelpers.js:19`) =
   `['-','Aquecimento','Descanso', ...WOD_TYPES]`, and `WOD_TYPES` **includes
   `Benchmark`** — so today `PrSection` filters the Benchmark category *out* of the PR
   board. Making Fran/Grace PR-trackable is therefore **not** a registry seed; a
   benchmark's "PR" is its **completion time** (a time-type PR), a different surface
   from per-movement load/reps PRs. **This rides Phase B's redesign** (a dedicated
   benchmark/time-PR area), not Phase A's registry list.
8. **#35 / font-weights — mostly N/A here.** Exercícios/Config have no mm:ss inputs
   (IntensityInput is shared, #54 territory), and the weights in use (700, 900) are
   already loaded in `src/fonts.js` — no `@fontsource` addition, no `MaskedTimeInput`
   rollout in this session.
9. **Gate:** adjust real components → review every state in `gallery.html` across 4
   themes × both widths → `npm run design:cards` + DesignSync → **stop at the approval
   gate** for the Exercícios/Config visual changes.

### Phase B — Lane B (mockup-first, then build)

1. **Ideation mockup** of the me.html PR board as **sub-cards** (the `PrSection` comment's
   deferred decision). Cover the state axes: block with 0 PRs / some / all; an exercise
   with a PR (bar + best + delta + target) / without; the **benchmark time-PR** surface;
   overflow (long exercise names); all 4 themes. Build on the real primitives it already
   uses (`TallyBar`, `blkColor`).
2. **Self-contained card** in `cone/design/` (`<!-- @dsCard group="Me" -->`) → DesignSync
   → **STOP at the approval gate.** Do not build, do not self-certify approved.
3. **After approval (may be a follow-up session):** build the sub-card layout in
   `PrSection.jsx` + `Me.module.css`, add the benchmark time-PR path (removing `Benchmark`
   from the PR-board skip *only* for the new time-PR surface, keeping WOD-score types
   skipped), regenerate the gallery card, ship.

## Verification

1. `npm test` green; `npm run build:all` clean.
2. `npm run dev`, on the **Exercícios** and **Configurações** tabs at 1280×800 and
   390×844 **under all 4 themes**:
   - Switch themes → Exercícios colors track the theme (the frozen-palette bug is gone).
   - Search filters the list; exercises are A→Z within each category.
   - Add / edit / delete an exercise; the delete confirm fires; save flash works.
   - "Salvar config.json" is gone; the type/exercise counts still render.
   - Keyboard: tab to a type row / exercise row / type tag → Enter/Space activates it.
   - Config: edit gym fields + switch theme + Salvar → flash + persistence.
3. Token/radius/a11y greps over `Exercicios.jsx` + `Config.jsx` return zero for each
   acceptance category (block-family `ECOL` hex expected to remain — data colors).
4. `npm run dev:public` → `gallery.html` across 4 themes × both widths → `design:cards`
   + DesignSync (Phase A visual states; Phase B mockup).
5. `/verify` before committing; `/code-review` before pushing (L).
6. **Docs are part of Done:** move #55 (and the folded #87) to Done in `BACKLOG.md`,
   record the Agenda→C5 deferral on the #59 row, and update `CLAUDE.md` if the Exercícios
   registry ordering/search or the PR-board layout changes any recorded contract.

## Notes

- **Size/model.** Folding #87 whole makes this **L** (was M · Sonnet): Phase A is
  mechanical-with-judgment (Sonnet-suitable once the registry-ordering call is made);
  the **registry-ordering architecture** and the **Lane-B PR mockup** are the Opus-grade
  judgment calls. Tagged Opus for the planning/mockup spine.
- **Sequencing.** Phase A ships independently (it's the C1 program slice). Phase B's
  build is gated on a mockup approval and can be a follow-up execution session — but both
  live under #55/#87 per the fold-in directive.

Model: Opus · Size: L
