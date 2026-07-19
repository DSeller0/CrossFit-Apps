# 34 — #84 · Promote block-meta + session-name formatters (single canonical)

## Context
The block-meta "rounds · CAP" string is hand-rolled at ~11 sites and session-name
resolution at ~9 sites, each with casing/order/fallback drift. Both already have a
**folder-scoped** near-canonical in `src/public/results/resultsHelpers.js`
(`blkMeta:20`, `sessName:16`) that other folders can't reach. **Decision (user):
single canonical everywhere** — one format at every site, accepting the visible
render changes on the TV wall and index landing page. Same house move as #70
(plans/24): promote to a client-free `lib/` module, re-export from `resultsHelpers.js`
so its in-folder consumers need no edits, swap every other site.

**The drift being collapsed:**
| Surface | Today | Canonical |
|---|---|---|
| Publicador ×5 (`:189,:339,:425,:504,:598`) | `5 RDS · CAP 12'` | `5 rounds · CAP 12'` |
| Resultados (`:749`) | `5rds · CAP 12'` | `5 rounds · CAP 12'` |
| BlockDetail (`:69`) | `5 RDS · CAP 12'` | `5 rounds · CAP 12'` |
| WodBlockCard (`:23-24`) | `5 rounds · CAP 12'` | (already canonical) |
| **TV wall** (`slides.jsx:147,:204`) | `12' · 5 rds` (duration-first) | `5 rounds · CAP 12'` |
| **index** (`rail.jsx:83`, `Index.jsx:145`) | `Cap 12'` | `CAP 12'` |

Session-name fallbacks today: `'Sessão'` / `'Treino'` / `'–'` / `'—'` / `''` /
`dayNameFull` — six variants; several sites check `mainTraining`, several don't.

## Acceptance
1. One canonical `blkMeta(bl)` in `lib/wod.js` and one `sessName(sess, dateKey)` in
   `lib/sessions.js`; **zero** hand-rolled copies of either remain.
2. The single canonical format renders at **every** site — including the TV wall and
   index (the two deliberate visible changes; screenshot before/after).
3. `resultsHelpers.js` keeps exporting both names (re-export) so `Results.jsx` /
   `SessionCard.jsx` are byte-unchanged; `npm test` green.
4. `BLOCK_C` decision recorded; the month-grid builders share one canonical.

## Files
- `src/public/lib/wod.js` — new canonical `blkMeta`
- `src/public/lib/sessions.js` — new canonical `sessName` (imports `dayNameFull` from
  `week.js` — both client-free)
- `src/public/lib/week.js` — new `monthGridCells(year, month)` (fold-in)
- `src/public/results/resultsHelpers.js` — becomes a re-export of both
- Block-meta call sites: `Publicador.jsx:189,339,425,504,598`, `Resultados.jsx:749`,
  `schedule/BlockDetail.jsx:69`, `shared/WodBlockCard.jsx:23-24`, `tv/slides.jsx:147,204`,
  `index/rail.jsx:83`, `index/Index.jsx:145`
- Session-name call sites: `TvController.jsx:25`, `Resultados.jsx:19`, `me/Me.jsx:331`,
  `index/rail.jsx:23,65`, `tv/slides.jsx:121`, `Criador.jsx:1986`,
  `Publicador.jsx:751,1210,1265,1416`, `schedule/Schedule.jsx:546,607`
- Month-grid: `Publicador.jsx:52,1120`, `Resultados.jsx:21`

## Approach
1. **`blkMeta` → `wod.js`.** Canonical format: `[bl.rounds && \`${bl.rounds} rounds\`,
   bl.duration && \`CAP ${bl.duration}'\`].filter(Boolean).join(' · ')` — rounds-first,
   full word "rounds", "CAP" prefix (matches today's `resultsHelpers.js:20`). Move it
   there, re-export from `resultsHelpers.js`. Swap all block-meta sites.
   - **Two semantic branches are NOT plain formatting — handle explicitly:**
     - `index/rail.jsx:83` gates on `isWodBlock` (non-WOD blocks show `"12'"` with no
       "CAP"/rounds). Keep that branch at the call site; `blkMeta` covers only the WOD
       case. (Or give `blkMeta` a `wod:boolean` param — decide, don't silently drop.)
     - `index/Index.jsx:145` appends a results count (`"CAP 12' · 3 resultados"`). The
       count stays at the call site; only the meta fragment uses `blkMeta`.
   - **Accept the TV + index render changes** (the single-canonical decision). Do not
     preserve the duration-first wall form.
2. **`sessName` → `sessions.js`.** Canonical, superset fallback:
   `sess.sessionName || sess.name || mainTrainingStr(sess) || dayNameFull(dateKey)`
   where `mainTrainingStr` handles the legacy `mainTraining` (string OR array →
   first/joined). Reasons: `dayNameFull` beats a static "Sessão"/"Treino" (an unnamed
   Monday reads "Segunda-feira", not a placeholder), and including `mainTraining`
   stops legacy sessions that only set that field from regressing. Signature
   `sessName(sess, dateKey)`; where a call site has **no** `dateKey` handy
   (some Publicador `<option>` lists), pass what's available and let it fall back to a
   `'Sessão'` default when `dateKey` is absent. Move it, re-export from
   `resultsHelpers.js`, swap all ~9 sites.
   - **Visible change:** sites that showed `'Sessão'`/`'Treino'`/`'–'`/`''` for an
     unnamed session now show the weekday (when `dateKey` is available). Intended —
     verify on results/leaderboard/schedule/me.
3. **`BLOCK_C` (`Publicador.jsx:1104`) — verify then leave.** It is a **deliberate
   per-type rainbow** for the mini-calendar dots (`:1273`,`:1318`) — a distinct color
   per block *type*, NOT the 4-family `blkColor` taxonomy (it paints WOD orange, Força
   gold, Cardio blue…). **Record the decision: intentional, do not collapse into
   `blkColor`.** Its hardcoded hex belongs to **#59** (Publicador design pass), not
   this canonicalization item.
4. **Month-grid builders (fold-in).** Promote `monthGridCells(year, month)` to
   `week.js` — **Sunday-start**, returns a null-padded flat cell array (the shape
   `Publicador.jsx:1120-1124` builds). Adopt at `Publicador.jsx:52`, `:1120`, and
   `Resultados.jsx:21`. **Preserve Sunday-start** (project rule — calendars start Dom).
   `Publicador.jsx:243`'s `toLocaleString` month title is separate; leave it or fold
   into `MONTH_PT` if trivially equivalent.

## Verification
1. **The two deliberate visible changes:** screenshot the **TV wall** (`tv.html`) WOD
   + timer slides and the **index** landing ranking **before/after** — confirm
   `5 rounds · CAP 12'` renders and looks right at wall scale.
2. Drive results.html + leaderboard.html + schedule.html + me.html — block-meta and
   session names render correctly; unnamed sessions show the weekday, not a placeholder.
3. Confirm a **legacy `mainTraining`-only** session still shows its main-training name
   (not the weekday) — the superset fallback's reason for existing.
4. `grep` proves zero forks of block-meta / session-name / month-grid remain.
5. `npm test` — `resultsHelpers` consumers stay green byte-unchanged (proof the
   re-export is transparent). `npm run build:all` clean.
6. `/code-review` (M item) before push.

Model: Sonnet · Size: M
