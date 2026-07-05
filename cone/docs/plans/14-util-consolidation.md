# 14 — Util / formatter consolidation (#16)

> ✅ Done: 993cb79

## Context
The same small helpers are reimplemented across the app instead of importing the canonical copies in `src/public/lib/` (`wod.js`, `week.js`). The census re-run in [reviews/2026-07-05-full-pass.md](../reviews/2026-07-05-full-pass.md) dim 3 gives current counts and line refs. This debt keeps growing (every TV/feature addition adds another inline copy), and one instance is a **latent bug** (missing NaN guard). Consolidating shrinks the surface every future review re-counts and removes the bug.

Precedent that this is safe: pure `lib/` utilities are already imported *across* the SPA↔public boundary (e.g. `Publicador.jsx:10` imports `exVolStr`/`fmtIntensity` from `../../public/lib/wod.js`); dim 4 confirmed `src/public/lib/**` pulls in no Supabase client, so SPA files importing them is fine.

Model: Sonnet · Size: M

## Acceptance
- Each family collapses to **one** canonical implementation, imported everywhere; no behavior/visual regression.
- The `toSecs` NaN-guard bug is fixed at the source (canonical) and both call sites use it.
- Unit tests cover the consolidated helpers (`toSecs` incl. malformed input, `fmtSecs`, `fmtDate`).
- `npm test` green; `npm run build:all` both builds succeed.

## Targets (file:line from the 2026-07-05 census)
- 🔴 **`toSecs` missing `||0` NaN guard** — `Atletas.jsx:22` and `Me.jsx:30` reimplement mm:ss parsing without the per-part guard the canonical `wod.js:35` has (malformed time → `NaN`). Replace both with canonical `toSecs`.
- **`fmtSecs` (mm:ss) ×7 non-canonical** vs `wod.js:41`: `Atletas.jsx:27` (`fmtTime`), `Me.jsx:31` (`fmtTime`), `Timer.jsx:16` (`fmt`), `slides.jsx:43` (`fmt`), `Athletes.jsx:115` (inline), `TvController.jsx:375` (inline), `Criador.jsx:103` (inline "Cap m:ss" variant — check its format before swapping).
- **`fmtDate` ×5**: `Me.jsx:27`, `Timer.jsx:17`, `slides.jsx:47`, `Publicador.jsx:849`, `Publicador.jsx:1644` (+ variants `Me.jsx:28` `fmtEvDate`, `Schedule.jsx:64` `fmtDeskPerf`). Pick a canonical `fmtDate` home in `week.js`; keep genuinely-different variants as named exports rather than forcing one signature.
- ⚠️ **`DAY_PT` ×6 non-canonical** (`Atletas.jsx:560`, `TvController.jsx:23`, `Athletes.jsx:12`, `slides.jsx:9`, `Me.jsx:10`, `Timer.jsx:9`, + `MON_PT` twins). **HAZARD:** the local copies are **Titlecase** `['Dom','Seg',…]` while canonical `week.js:2` is **UPPERCASE** `['DOM','SEG',…]` — NOT drop-in. Either export a Titlecase variant from `week.js` or update each call site's display/CSS to uppercase. Do not blind-swap.
- **`rankResults` ×2** — local `Resultados.jsx:91` vs canonical `wod.js:46`. Delete the local, import canonical (ClassPanel already uses the canonical one).
- **`storage.js` dual `uid`/`toISO`/`todayISO`** (SPA side) — decide one canonical home; the dual-canonical debt is the root of several of the above.
- **`useIsMobile`** — one hook + 2 divergent inline copies; unify to one.
- **duplicate `BlockTypePicker`** — rename/dedupe.
- **Dead code:** unused `tvRef` param at `useLiveRegistration.js:9` (still passed from `TvController.jsx:118`) — remove param + argument. (NOTE: `_presenterLogUrl` is **no longer dead** — now consumed at `Publicador.jsx:1754`; drop it from this list.)

## Approach
1. **Time/date first (highest value, has the bug).** Make `wod.js` `toSecs`/`fmtSecs` and a `week.js` `fmtDate` the canonical exports; replace the 7 `fmtSecs` + 2 `toSecs` + 5 `fmtDate` sites with imports. Verify `Criador.jsx:103` and the `fmtEvDate`/`fmtDeskPerf` variants actually match before collapsing — keep a distinct named export if a variant differs.
2. **DAY_PT/MON_PT** — resolve the casing hazard explicitly (add `DAY_PT_TITLE` or normalize call sites). Test a rendered week strip after (Sunday-start per the recorded calendar decision).
3. **rankResults / useIsMobile / BlockTypePicker** — mechanical dedupe.
4. **Dead code** — drop the `tvRef` param.
5. Add/extend `wod.test.js`/`week.test.js` for the consolidated helpers (esp. `toSecs` malformed-input regression).

## Verification
- `npm test` green with new coverage for `toSecs` (malformed input returns a number, not `NaN`), `fmtSecs`, `fmtDate`.
- Local stack: spot-check a rendered week strip (DAY_PT casing unchanged on screen), a timer mm:ss display, and a results date — no visual diff.
- `/code-review` before pushing (M, touches many files). No `/security-review` (pure utils, no RLS/auth surface).
- `npm run build:all` both builds succeed.
