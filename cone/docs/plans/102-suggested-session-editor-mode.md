# 102 — #235 · Suggested session, Phase 3: the ✦ Sugerido editor mode

*Planned and executed 2026-11-05 (Sonnet). Phase 3 of 5: [plans/100](./100-suggested-session-engine.md)
shipped the engine, [plans/101](./101-suggested-session-mockup.md) the approved mockup
(`design/mockups/67-criador-sugerido.html`). This builds that card on the real editor. The engine is not
touched; the only write path is the one that already exists — Salvar.*

## Context

A third `sessionMode` — **▤ Detalhado · ¶ Texto · ✦ Sugerido** — in `SessionEditor`. The pane shows the
controls (LPO lift · movement pattern · class time · block list), the engine's preview with a "por quê"
and a "↻ Outra" per block, the thin-data and empty states, and **Aplicar** (replaces the session's blocks,
with a confirm when there are some). Saving writes `session.suggestion` — the provenance snapshot
`suggestionRecord` already builds — and the editor title shows **✦ Sugerida**. All of it is JSON on the
session blob: no migration.

**Decided with the card (2026-11-05, the user's "the design is approved"):** Aplicar *replaces* · "por quê"
inline per block · "↻ Outra sessão" *and* the per-block ↻ Outra · the ✦ Sugerida tag visible in the
title · the ×3 focus weight shown beside the field · the block list shows the box's whole structure
with the day's usual blocks ticked. Don't re-litigate.

## Acceptance

`SessionSuggestPane` renders the approved design on real data at 1280 and 390: it calls `suggestSession`
with the open session's box and date, the editor's `sessions` blob and registry; Aplicar hands the blocks
**and** a `suggestionRecord` up; `SessionEditor` puts the record on `form.suggestion`, which `saveS`
already spreads onto the saved session. Nothing is written by opening the pane, touching a control,
pressing ↻ Outra or Aplicar. The pane is **client-free** (it renders in the gallery) and its logic is a
pure module with tests.

## Must-haves

- In the SPA, a session with no blocks dated a Monday of the main box: **✦ Sugerido** opens the pane, the
  preview lists the engine's blocks, each with a working **por quê** and **↻ Outra**. **Zero write
  requests** to Supabase from opening the pane through pressing Aplicar.   [SPA, requests panel]
- **Aplicar** on a session that already has blocks opens a confirm naming current → suggested counts;
  *Substituir blocos* replaces them and returns to ▤ Detalhado with the editor dirty (`●`); on an empty
  session it applies with no confirm.                                                     [SPA]
- After **Salvar**: the saved session carries `suggestion` (`engine:'synth'`, `version`, `seedKey`,
  `options`, `variants`, `at`, `text`) **and the title shows ✦ Sugerida · motor v1**; reopening it still
  shows the tag; editing a block and saving again **keeps** it.                       [SPA + localStorage/DB]
- **LPO = Clean** changes the LPO block's family **and the themed WOD** (the WOD reads the day's LPO family)
  — Core, Força, Acessórios and Cardio stay identical; **↻ Outra** on one block changes that block's text
  only; a class time below the estimate shows the warning and **keeps every block**.
                                                                                      [SPA]
- A box with one session on that weekday shows the **thin banner with both fallbacks**; a box with none
  shows the empty state with **Aplicar disabled**.                                       [SPA]
- At **390** the page has no horizontal scroll and Aplicar stays on screen; the gallery entry renders the
  same states.                                                             [SPA, gallery.html]
- `node scripts/audit-suggest.mjs --edits --sessions <blob.json>` on a blob holding a saved suggestion
  prints **kept / edited / replaced / removed** per block and the field tally.        [terminal]

## Files

New: `criador/suggest/paneModel.js` (+ `.test.js`) — pure: controls ⇄ engine options, the block toggle,
variants, the box scope of a session, the mobile summary line, the over-budget message ·
`criador/SessionSuggestPane.jsx` + `SessionSuggestPane.module.css`.
Edited: `criador/SessionEditor.jsx` (third mode button, the pane, the tag in both header layouts) ·
`tabs/Criador.jsx` (hands `sessions` and the box locations down) · `criador/PreviewBlock.jsx` (an optional
`footer`) · `criador/criador.module.css` (`.editorTagSug`) · `gallery/groups/criador.jsx` ·
`scripts/audit-suggest.mjs` (`--sessions <file>`, so `--edits` can be driven before prod holds a
suggestion) · docs: `arch/criador.md`, `CLAUDE.md`, the board · `npm run design:cards` (the gallery's
Criador group changed).
Reused, not copied: `suggest/index.js` (`suggestSession`, `suggestionRecord`) · `PreviewBlock` · `ConfirmReview`
· `Button` · `useIsMobile` via `SessionEditor`'s `isMobile` · `sessionBoxIds`, `SEM_BOX`.

## Approach

1. **`paneModel.js` first, with tests** — the pane stays thin, like `SessionTextPane`. Scope: no tag →
   `SEM_BOX`; one tag → it; two or more → the first (no prod session carries two, measured 0 of 197 —
   the pane names the box it used). `optionsOf(controls)` drops every empty control, so an untouched pane
   sends `{}` and the engine's own defaults decide; the first toggle in the block list materialises
   `blockTypes` from the day's usual types, after which the list is the user's.
2. **The pane:** `useMemo` over `suggestSession({ sessions, registry, locations, scope, date, options,
   variants })` — synchronous (≈ 60 ms), so there is **no loading or error state** (the card said so).
   `PreviewBlock` renders each block through its new `footer` slot (por quê · ↻ Outra), so the preview
   cannot drift from the Texto pane's. Aplicar: `ConfirmReview` when `blocks.length`, else straight through;
   `onApply(blocks, record)` with `at = new Date().toISOString()` built in the click handler, never in render.
3. **`SessionEditor`:** the third button; `onApply` = `setBlocks` · `markDirty` · `setForm(f ⇒ ({…f,
   suggestion}))` · collapse reset · `setSessionMode('detalhado')`. `form` already round-trips through
   `startEdit` (`{...s, …}`) and `saveS` (`{...form, …}`), so **`saveS` is not touched**.
4. **Gallery + `design:cards`** (WORKFLOW "Build artifacts are part of Done").
5. **Drive it** on the local stack (Docker Desktop is down at planning time — start it, per the
   live-verify note), then `/code-review` (an M item), commit, push, the Done ritual.

**Traps**

- ⚠️ A load path never writes (CLAUDE.md): opening the pane, a control, ↻ Outra, even Aplicar only touch
  editor state. `suggestion` reaches storage through Salvar alone.
- ⚠️ The pane must stay **client-free** — no `utils/storage`; `registry`, `sessions` and `locations` are
  props (the gallery cannot load a Supabase client).
- ⚠️ A re-roll is **per block type**: `variants[type]`. "↻ Outra sessão" bumps every present type.
- ⚠️ `Criador.jsx` is a container: `SessionEditor` takes new props, nothing new is *fetched* there.

**Out of scope:** a per-box "Estrutura" override · the AI-written WOD (Phase 6) · an in-app "Precisão das
sugestões" view · tagging in the week grid (the card shows the tag in the editor title only).

## Verification

The must-haves, driven. `npm test` at the new total · `npm run lint` · `npm run format:check` ·
`npm run design:cards` committed · `node scripts/audit-backlog-markers.mjs` clean · `/code-review`
before the push.

Model: Sonnet · Size: M
