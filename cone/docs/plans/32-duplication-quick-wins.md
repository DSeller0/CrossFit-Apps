# 32 — #83 · Duplication quick-wins (byte-identical forks)

## Context
The 2026-07-18 code sweep found three families of byte-identical constant forks
whose canonical already exists in `src/public/lib/**`. All mechanical, no decision —
each fork is character-for-character the canonical value, so adoption is provably
inert (no render change). Same house move as #70 (plans/24): import the canonical,
delete the fork. Client-safety is a non-issue — `week.js` and `wod.js` import
nothing, so an SPA file importing them cannot breach the dual-client rule (precedent:
`Resultados.jsx:9-10`, `TvController.jsx:4-5`).

## Acceptance
1. Zero inline forks remain of `MONTH_PT`, `DAY_PT`, or `MODE_LBL`.
2. `npm test` green; `npm run build:all` clean.
3. **No render change anywhere** — every swap is a byte-identical value; a grep +
   a build is the whole verification (this is why it's S, not M).

## Files
- `src/components/tabs/Publicador.jsx` — 4× `monthNames`, 1× inline `['DOM'…]`
- `src/utils/config.js` — `DSHORT`
- `src/components/tabs/Criador.jsx` — `WEEK_DAYS`
- `src/public/timer/Timer.jsx` + `src/public/tv/slides.jsx` — `MODE_LBL`
- `src/public/lib/wod.js` — new home for `MODE_LBL`

## Approach
1. **`monthNames` ×4 → canonical `MONTH_PT`.** `Publicador.jsx` already imports it
   (`:11`) and even re-aliases it twice (`:815`, `:1102` `const MONTHS_PT = MONTH_PT`).
   Delete the four inline `const monthNames = ['Janeiro'…]` (`:287`, `:364`, `:620`,
   `:1729`) and point the call sites (`:308`, `:365`, `:642`, `:1817`) at `MONTH_PT`.
   Optionally fold the two `MONTHS_PT` aliases into direct `MONTH_PT` use.
2. **`DAY_PT` uppercase forks** (canonical `week.js:3` = `['DOM','SEG',…,'SAB']`):
   - `config.js:2 DSHORT` → one-line re-export: `export { DAY_PT as DSHORT } from
     '../public/lib/week.js'`. Only consumer is `Publicador.jsx:252` — zero call-site
     churn. (`config.js` importing the client-free `week.js` is safe.)
   - `Publicador.jsx:578` inline `['DOM',…][date.getDay()]` → `DAY_PT[date.getDay()]`
     (import already lands via step 2's config re-export, or add DAY_PT to the
     `week.js` import at `:11`).
   - `Criador.jsx:1418 WEEK_DAYS` → import `DAY_PT`, `const WEEK_DAYS = DAY_PT` (keeps
     `:1931`/`:1947` untouched) or inline. Criador has no `week.js` import yet — add it.
3. **`MODE_LBL` twin → `wod.js`.** `timer/Timer.jsx:11` and `tv/slides.jsx:10` are
   byte-identical (`{ 'For Time':'FOR TIME', AMRAP:'AMRAP', EMOM:'EMOM',
   Benchmark:'BENCHMARK', 'Estações':'ESTAÇÕES' }`). Export it from `wod.js` (the
   block/timer vocabulary home — sits with `TIMER_TYPES`/`blkLabel`); both files
   already import from `wod.js`. Delete both locals.
4. **While in these two files, sweep for sibling forks** the row didn't name:
   `Publicador.jsx:1404 DAYS_PT_SHORT` and `:815/:1102 MONTHS_PT` — confirm casing
   before collapsing (`DAY_PT` UPPERCASE vs `DAY_PT_TITLE` Titlecase — CLAUDE.md's
   casing hazard). **Leave `DAY_EN`** (`:1641`,`:1678`) — English filename slugs, not
   a `DAY_PT` fork.

**Ordering note:** if #59 (Publicador design pass) lands first it absorbs the
Publicador share of steps 1–2 — coordinate so this isn't done twice.

## Verification
1. `grep -rn "monthNames\|'DOM'.*'SAB'\|MODE_LBL = {" src/` → only the canonical
   definitions remain.
2. `npm test` green; `npm run build:all` clean.
3. Spot-open Publicador export views + the public timer/TV in the gallery/dev server
   under one theme — confirm month/day/mode strings render identically (they must —
   the values are byte-identical). No 4-theme sweep needed (no styling touched).

Model: Sonnet · Size: S
