# 44 — #74-B · `Resultados.jsx` decomposition (no behavior change)

> Planned 2026-07-26 from the housekeeping pass. Run order:
> [43 lint floor + CI gate](./43-lint-floor-ci-gate.md) → **44 (this)** →
> [45 effect-write sweep](./45-effect-write-sweep.md).
> **43 runs first** because it decides the `react-refresh/only-export-components` policy, and this plan
> creates exactly the module shape that trips it — plans/41 took that rule from 6 → 20 by not having one.

## Context

`Resultados.jsx` is **912 raw lines** — the largest file in the repo now that plans/39 took
`Publicador.jsx` to 660. **#57 (design pass C3) is queued to touch it**, and the same argument that
justified plans/39 and plans/41 applies: a design pass over a 912-line file is strictly more expensive
than one over an already-split file, and the split is only reviewable as a pure move if it happens first.

**New finding, 2026-07-26 — this row is the over-800 *watch*, not "Resultados only":**

| File | Raw lines |
|---|---|
| `Resultados.jsx` | **912** |
| `Criador.jsx` | **840** |
| `Atletas.jsx` | 789 |
| `Timer.jsx` | 786 |
| `Publicador.jsx` | 660 ✓ (was 2125) |
| `Gallery.jsx` | 94 ✓ (was 1790) |

`Criador.jsx` is back over the line after [plans/35](./35-criador-decomposition.md) took it from 2063 —
so **decomposition alone does not hold a file down.** Decide explicitly: include it here, or defer it with
a stated reason. Do not silently leave it unmentioned, which is how it got to 840.

*(All counts are RAW lines including blanks — the board's standard since 2026-07-26. Earlier figures in
#74 mixed raw and non-blank, which is why they wobbled.)*

## The seams are already in the file

`Resultados.jsx` is section-commented and the boundaries are clean:

| Lines | Contents | Destination |
|---|---|---|
| 14–17 | `PRESENCE`, `LEVEL_CLS`, `SCALE_CLS` | `resultados/resultadosHelpers.js` |
| 19–29 | `getWeeksInMonth`, `weekLabel` | ″ |
| 31–80 | `calcKPIs`, `calcSessionKPIs`, `getPerformanceStr` | ″ |
| 82–107 | `SparkLine`, `KpiCard` | `resultados/cards.jsx` |
| 108–568 | **`RegistroView`** (460 lines) | `resultados/RegistroView.jsx` |
| 569–713 | `HistoryView` (144) | `resultados/HistoryView.jsx` |
| 714–721 | `LB_IMG` | with `LeaderboardView` |
| 722–891 | `LeaderboardView` (169) | `resultados/LeaderboardView.jsx` |
| 892–912 | `ResultadosTab` (root, ~20 lines) | stays in `Resultados.jsx` |

## ⚠️ One real bug found while reading — do NOT fix it in this commit

`getPerformanceStr` (`:74-80`) is a **live fork of canonical `perfStr`** (`public/lib/wod.js:197`):

```js
// Resultados.jsx:74  — no DNF branch
if (isTimeBlock(blockType)) return r.perfTime || '—';
```

Canonical `perfStr` renders a capped For Time athlete as `"N rds (DNF)"`; this returns `—`. So **the same
result shows the athlete's work on every public surface and a dash in the SPA Resultados tab.** This is
exactly the divergence class #51 and #70 closed elsewhere, surviving in this one file.

**Keep the move pure.** Extract `getPerformanceStr` verbatim, land the decomposition, then replace it with
canonical `perfStr` in a **separate follow-up commit** so the behavior change is reviewable on its own.
A pure move whose diff also changes what renders is neither reviewable nor revertable.

Adjacent but **not** a duplicate — verify before touching: `calcKPIs`/`calcSessionKPIs` here are
*per-athlete / per-session* calculators, while `public/results/resultsHelpers.js`'s `calcKpis` is
*per-block-entries*. Different shapes, overlapping outputs. Both already carry the plans/22 null-handling
rules. Leave them alone in this session.

## Acceptance

- `Resultados.jsx` is the shell only; no extracted file over ~470 lines.
- **Zero behavior change** — the diff is imports + moves, nothing else.
- `npm test` 530/530.
- **No new `react-refresh/only-export-components` errors** vs the plans/43 floor. This is the gate that
  plans/41 lacked, and it is now enforced by CI.
- `Criador.jsx` is either split or explicitly deferred **in writing** in the #74 row.

## Approach

1. Re-measure first (`(Get-Content f).Count`) — do not trust the numbers above if time has passed.
2. Create `src/components/tabs/resultados/`, mirroring `publicador/` (plans/39) and `criador/` (plans/35).
3. **Extract pure helpers first** and give them tests — `resultadosHelpers.js` is the payoff of this split:
   `calcKPIs`/`calcSessionKPIs`/`getWeeksInMonth`/`weekLabel` are pure, currently **untested**, and cannot
   be tested while they live inside a tab. This mirrors `results/resultsHelpers.js` and
   `schedule/scheduleHelpers.js`.
4. Then the three views, largest last. Move verbatim; resist tidying.
5. Re-point imports. `App.jsx:25`-ish lazy-loads `Resultados` — check whether any view is worth loading
   separately (plans/39 got a real chunk win doing this for `AgendaView`; here it is unlikely, so verify
   with the build chunk list rather than assuming either way).
6. Decide `Criador.jsx` (840) and record the decision in #74.

## Verification

- `npm test` → 530/530, plus new tests for the extracted helpers.
- `npx eslint . -f json` → total not above the plans/43 floor.
- `npm run build` → compare the chunk list before/after; note any change in the commit message.
- **Drive the tab live** on `npm run dev` against the local stack (`supabase start` first): all three views
  — Registro, Histórico, Leaderboard — render, a result logs and persists, the month/week navigation works.
  There are no tests over these views, so this is the only real check.
- ⚠️ If a change does not appear, check for **service-worker poisoning first** (CLAUDE.md): `sw.js` registers
  at scope `/CrossFit-Apps/` and on localhost covers the SPA dev server, serving precached production assets
  with no console error.

Model: Sonnet · Size: M
