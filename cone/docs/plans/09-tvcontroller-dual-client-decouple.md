# 09 — TvController ↔ public-client decoupling (#41)

## Context
Found in the [2026-07-04 full pass](../reviews/2026-07-04-full-pass.md) (dim 4). The SPA's `TvController.jsx:2` imports the **SPA** Supabase client (`../../utils/supabase`); it then static-imports the slide components at `TvController.jsx:5` from `src/public/tv/TV.jsx`, whose module top-level runs `import { sb } from '../supabaseClient.js'` — and `supabaseClient.js:6` calls `createClient` at module eval. So loading TvController pulls the **public** client into the same bundle, instantiating a second GoTrueClient — exactly the "never import both clients in the same bundle" hazard CLAUDE.md documents (the "Multiple GoTrueClient instances" console warning). The 4 slides TvController uses (`WodSlide/TimerSlide/ResultsSlide/QrSlide`) don't reference `sb` at all — only `TV.jsx`'s default `TV()` export (the public tv.html page) does — so this coupling is needless and cleanly separable.

Model: Sonnet · Size: S

## Acceptance
- Opening the "Quadro ao Vivo" (TvController) tab no longer logs a "Multiple GoTrueClient instances detected" warning.
- The TvController module graph no longer includes `src/public/supabaseClient.js`.
- `tv.html` (the public display page) is unaffected — still renders and receives realtime `tv_state` updates.

## Files
- **new** `src/public/tv/slides.jsx` — the client-free presentational slides moved out of TV.jsx.
- [src/public/tv/TV.jsx](../../src/public/tv/TV.jsx) — remove the slide definitions, re-import them from `./slides.jsx` for the default `TV()` export; keep `sb`/realtime here.
- [src/components/tabs/TvController.jsx](../../src/components/tabs/TvController.jsx) — change the `:5` import to `../../public/tv/slides`.

## Approach
1. Move `WodSlide`, `TimerSlide`, `ResultsSlide`, `QrSlide` (and any pure helpers they need — e.g. `BlockCard`, formatting inline in TV.jsx that they depend on) into `slides.jsx`. These must import **no** Supabase client. Watch for shared bits currently defined at TV.jsx module scope that the slides close over — move or export them too.
2. In `TV.jsx`, `import { WodSlide, TimerSlide, ResultsSlide, QrSlide } from './slides.jsx'` and keep the `sb`/subscription/default-export logic.
3. Point `TvController.jsx` at `slides.jsx`.
4. Grep the new `slides.jsx` to confirm it imports neither `supabaseClient` nor `utils/supabase`.

## Verification
- `/verify`: `npm run dev` (SPA) → open the TvController tab, DevTools console shows **no** GoTrueClient-instances warning; push a slide/timer/QR and confirm it drives the display. Separately `npm run dev:public` → open tv.html, confirm slides still render and update live (realtime intact).
- Build-graph check: `npm run build` and confirm the TvController chunk no longer pulls `supabaseClient`.
- Both builds (`npm run build:all`) succeed; `npm test` green.
