# 84 — Blockers + correctness batch (#172 · #173 · #175 · #176 · #179)

> Five rows from the [2026-09-05 full pass](../reviews/2026-09-05.md), batched on the
> [plans/79](./79-post-162-cleanup.md) precedent (five small rows ship safely together because none
> blocks another). Every one is S or XS. **User decision 2026-09-05:** these jump the three planned
> items (repo sweep → TV/Timer → #43), on this board's standing principle that
> found-in-live-use-and-small-and-visible goes first — the same call #147, #150 and #163 got.

## Context

Two of these publish or destroy real data, and none was in the record before the pass:

- **#172** — every **Estações** block rasterises into a Publicador PNG as a header with no
  movements under it. `wod.js:288`'s `blockExercises(bl)` exists precisely to flatten `stations` for
  that type, and its own header warns that a consumer reading `bl.exercises` directly "renders
  nothing for that type". All six export views read it directly.
- **#173** — a stale `skipped: true` survives a re-log and every reader then correctly drops the
  entry, so a genuinely submitted score disappears from every ranking and KPI with no error.
- **#175** — `--theme-accent`'s inline override measures **1.95:1** as text on both light themes and
  breaks the login page's only focus indicator. Also **#43's premise**, so it ships here rather than
  waiting for the theme work.
- **#176** — `mapResultRow` is forked four times and the two public forks omit `createdAt`, the
  provenance column `0007` was added to recover.
- **#179** — Configurações → Carregar restores session ids without normalising them, reintroducing
  **#110** (a numeric id never `===` its own `results_v2` rows).

🔑 **Order matters in exactly one place: #173's declaration fix comes before its writer fix.** The
rest are independent.

## Acceptance

- An Estações session exported in **all four** formats that render blocks (Dia, Semana, Dia mobile,
  Semana mobile) shows its station movements. `grep -rn "bl\.exercises" src/components/tabs/publicador/`
  → **0**.
- `results/resultsHelpers.js` no longer declares its own athlete-key list; `DEF_INP` is derived from
  `ATHLETE_KEY_DEFAULTS`. A block marked `skipped` then re-logged from `schedule.html` or
  `results.html` ends up with `skipped` **cleared**, and its score ranks.
- `--theme-accent` resolves to the *theme's* accent in all four themes (measured in DevTools, not
  assumed). `grep -rn "setProperty('--theme-accent" src/` → **0**.
- `mapResultRow` has exactly one definition; all four former forks import it. `createdAt` is present
  on rows read by `results.html` and `schedule.html`.
- `parseStateFile` returns sessions whose every `id` is a string.
- `npm test` (≥1075) · `npm run lint` clean · `npm run build:all` green.

## Files

- `publicador/exportViews.jsx:218,341,694` · `publicador/mobileExportViews.jsx:75,612,881` — #172
- `public/lib/resultEntry.js` (export a defaults factory) · `public/results/resultsHelpers.js:20-32`
  · `public/results/Results.jsx:340-361` · `public/schedule/Schedule.jsx:754,836-848` ·
  `hooks/useLiveRegistration.js:39-45` — #173
- `src/App.jsx:71-72,107-113` · `src/utils/config.js:26-27` — #175
- `public/results/Results.jsx:145-156` · `public/schedule/Schedule.jsx:339-350` ·
  `public/tv/TV.jsx:197-205` · `components/tabs/TvController.jsx:127-133` — #176
- `components/tabs/config/stateBackup.js:65-91` — #179

## Approach

1. **#172 — one call, six sites.** Import `blockExercises` from `public/lib/wod.js` and replace each
   `bl.exercises || []` read. ⚠️ **Do not "improve" it into `WodBlockCard`'s flattener** —
   `wod.js:285-288` documents that they are deliberately different contracts (that one keeps rest
   stations and tags `_station`); collapsing them is explicitly forbidden. ⚠️ `:694` and `:881` also
   apply `.filter(e => e.name || e.isComplex)`; keep that filter, applied to the flattened list.
   Do this **before** #187 (the triplicated renderer) or it gets fixed three times.
2. **#173 — fix the declaration, then the writers.** Export a defaults factory from `resultEntry.js`
   (it already owns `ATHLETE_KEY_DEFAULTS` and `ATHLETE_KEYS`) and have `DEF_INP` derive from it, so
   there is one list again. Then make the four writers' patches carry `skipped` explicitly —
   `skipped: inp.skipped ?? null` in the same shape they already use for `finished`/`checkpoint`/
   `exerciseRows`. That is what stops a stale `true` riding through `mergeBlockEntry`'s spread.
   ⚠️ **Do not make `mergeBlockEntry` drop unknown keys** — preserving them is #118's whole point.
3. **#175 — delete the two `setProperty` pairs** (`App.jsx:71-72` and `:107-113`) so
   `index.css:3`'s `var(--accent, #4ac8c0)` alias resolves. Then decide `APP_CONFIG.themeAccent`'s
   fate: it has no consumer left once the writes go, so **delete both keys from `utils/config.js`**
   and the `cfg.themeAccent`/`cfg.themeAccentText` branches that set them. 🔑 The three module-CSS
   files that carry a written ban on the token (`Afiliados`/`Atletas`/`Agenda`) can keep it — the
   ban is still right, it just stops being load-bearing. Fix `Agenda.module.css`'s one surviving
   `var(--theme-accent)` while here (CLAUDE.md's claim of zero was corrected 2026-09-05).
4. **#176 — import the canonical.** Public forks import `mapResultRow` from `public/lib/blobTables.js`;
   the SPA fork imports `rowToResult` from `utils/resultMappers.js` (the same function, already
   re-exported for that seam). ⚠️ `TV.jsx`/`TvController.jsx` used a **5-field subset** — adopting
   the full mapper is a superset and safe, but check nothing iterates the row's keys.
   While here, the 14-line `normalizeSessionIds` + destructure preamble at `Results.jsx:143` /
   `Schedule.jsx:337` is byte-identical; leave it to **#185**, which owns that loader.
5. **#179 — one call.** `normalizeSessionIds` from `public/lib/sessions.js`, beside the existing
   `normaliseType`/`normaliseZone` pass in `parseStateFile`. It is pure and idempotent, so applying
   it to both the v2 and bare-v1 branches is safe.

## Verification

- **#172 is the one that needs real data.** Seed the local stack, open Criador and build (or find) a
  session with an **Estações** block, then export it in Dia, Semana, Dia mobile and Semana mobile and
  confirm the station movements appear in the rasterised PNG — not just in the on-screen preview,
  which is a different code path. Prod has 5 blocks carrying both `stations` and `exercises`
  (CLAUDE.md's "type decides which side is live"), so also check one of those renders the **live**
  side only.
- **#173 end-to-end, both directions:** mark a block "não fez" in Resultados → log a real score for
  the same athlete/block from `schedule.html` → confirm it appears in the class ranking and in
  `results.html`. Then re-check the original direction still works (marking skipped clears the score).
- **#175:** switch all four themes in Configurações and confirm the login focus ring, the Criador
  drag-over outline and the checkbox `accent-color` all follow the theme. Measure one pair in
  DevTools rather than eyeballing it.
- **#179:** export state (Configurações → Dados → Salvar), hand-edit one session `id` to a number,
  re-import via Carregar, and confirm the id comes back a string and its results still resolve.
- `npm test` · `npm run lint` · `npm run build:all` · `/code-review` before pushing (M overall).

Model: **Sonnet** · Size: **M** (five S/XS rows; #172 and #173 carry the risk)
