# 101 — #234 · Suggested session, Phase 2: the ✦ Sugerido mockup (Lane B)

> ✅ Done: `1581458` · 2026-11-05 — see BACKLOG.md · closes #234. **Approved by the user on 2026-11-05,
> as drawn** — the six open decisions in the card's section 8 stand (Aplicar replaces, with a confirm ·
> "por quê" inline per block · "↻ Outra sessão" and the per-block ↻ Outra · the ✦ Sugerida tag visible
> in the title · the ×3 weight shown · the block list shows the whole structure). Synced to Claude Design
> on 2026-11-06 (`/design-sync`, after the approval and the build of #235) — see plans/102.
>
> **Must-haves: 6/6 driven.** The card served over localhost and driven in Chromium. (1) 1280: the six
> engine blocks for Monday 09/11, the por quê toggling (`aria-expanded` false → true, list `none` →
> `block`), ↻ Outra on every block, controls and preview side by side. (2) Thin: a banner carrying
> `thinReason` ("Só 1 terça no histórico deste box (mínimo 2).") with both fallbacks over 2 blocks and
> a skipped-LPO notice; empty: "Nenhuma sessão no histórico deste box." with Aplicar disabled.
> (3) Contrast: 1386 text nodes per theme measured against the surface they sit on, transitions off —
> Halo and Common clean; the dark palettes' `--muted` informational text (3.0–3.6:1) moved to `--sub`,
> the gold numbers (3.6:1 on the light palettes) to the body colour; the page's own gold headings
> (3.8–4.5:1 on two light themes) stay, as in mockup 29. No external reference, no duplicate id, no
> unnamed button. (4) 390: `scrollWidth` = `clientWidth`, Aplicar in a sticky bar. (5) **Caught a real
> bug:** the card has no doctype, so it renders in quirks mode, where class names are
> case-insensitive — a new `.ctlS` helper rule (`display:block`) also matched the `.ctls` container and
> collapsed its flex gaps; found only in the second theme screenshot. Renamed; a scan of every class
> in the file for case-only collisions is clean. (6) The user's review — done, approved.

*Planned and executed 2026-11-05 (Sonnet). Phase 2 of 5 of the suggested-session program —
[plans/100](./100-suggested-session-engine.md) shipped the engine (Phase 1); this decides how it
appears. **No code in `src/`.** It ends at the approval gate: #235 (the editor mode) is built from
the card the user approves, not before.*

## Context

✦ Sugerido is a net-new surface — a third `sessionMode` next to ▤ Detalhado and ¶ Texto — so it is
**Lane B** ([WORKFLOW.md](../WORKFLOW.md) "Design work"): an ideation card in `cone/design/mockups/`,
reviewed by the user in Claude Design, approved, *then* built and entered into the gallery. The engine's
API is fixed by plans/100 (`suggestSession` → `{ blocks, why, meta }`, `options`, per-block `variants`,
`session.suggestion`), so the card shows what that API can drive and nothing it cannot. Prior art, same
shape: `mockups/29-criador-text-mode.html`.

## Acceptance

`design/mockups/67-criador-sugerido.html` — one self-contained card, first line `<!-- @dsCard
group="Mockups" -->`, whose every number, name and "por quê" is **real engine output** (the 2026-11-05
prod run, commands in the card's header), covering the controls (LPO lift · movement pattern · class
time · block list), the por quê and the per-block ↻ Outra, the thin-data banner with its two
fallbacks, the empty box, the over-budget warning, Aplicar's confirm and the saved-session tag — at
**1280 and 390, in all 8 themes** — plus the state-coverage standard's interaction axis.

## Must-haves

- At **1280** the default pane shows the engine's six blocks for Monday 09/11, each with a working
  **por quê** toggle and its own **↻ Outra**; the controls column and the preview sit side by side.
                                                                     [card, local server, Chromium]
- The card shows **both thin states**: a banner carrying `thinReason` and the two fallbacks (todos os
  dias do box · todos os boxes) over a suggestion with a skipped block listed, **and** the empty box
  with **Aplicar disabled**.                                                              [card]
- **No product-UI text falls below 4.5:1 in any of the 8 themes** (every text node measured against
  the surface it sits on, transitions off); the card makes **no external request** and has no
  duplicate id or unnamed button.                                            [card, DevTools]
- At **390** the page has **no horizontal scroll** and Aplicar sits in a bar that stays on screen.
                                                                                          [card]
- The card renders the same under **quirks mode** (it has no doctype, like every card) — no class
  differs from another only by case.                                                      [card]
- *Not driven by the builder:* **the user's review.** Never called "approved" until they have seen it.

## Files

New: `cone/design/mockups/67-criador-sugerido.html`. Edited: `cone/design/README.md` (the card-index
row — the one line `npm run design:cards` would write; running it would regenerate 20 unrelated
cards). The generator that wrote the card from an engine snapshot lives in the session scratchpad and
is **not** committed: a hand-authored card is edited by hand, and after approval it is archived, never
maintained as a mirror.

## Approach

1. Run the engine read-only against prod for each state (default · focus + budget · a re-roll ·
   thin box · thin → all boxes · empty box) and keep the JSON snapshot; every string in the card comes
   from it, so nothing is illustrative except one labelled example (the confirm dialog's "3 blocks").
2. Build the card on mockup 29's shell and the 8 palettes copied verbatim from `themes.css`; text
   glyphs for icons (the `ti` webfont is CDN-loaded and CSP blocks it); fonts fall back to serif.
3. Verify in Chromium: 1280 and 390 · all 8 themes · contrast · interaction · quirks mode.
4. **Stop** — hand the card to the user; the sync to Claude Design is `/design-sync`, which they start.

## Verification

The must-haves above, driven. The card is not in the gallery and not in `vite.public.config.js`: it is
ideation, not shipped UI.

Model: Sonnet · Size: S
