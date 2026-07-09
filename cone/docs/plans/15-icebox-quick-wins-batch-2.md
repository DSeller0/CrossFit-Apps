# 15 — Icebox quick-wins batch #2 (#46 · #47 · #48 · #22 · #44 · #45) — #20 and #24 deferred

## Context

The Icebox held 8 S-sized items. Investigated whether they could all batch into one session (3 Explore agents + 1 Plan agent researched the actual code for each, not just the written backlog descriptions — two of which turned out stale or built on a premise that didn't hold). Verdict: **6 of 8** batch cleanly, following the project's own precedent ([plans/07-quick-wins-batch.md](./07-quick-wins-batch.md) — 5 independent S items in one session, one held back for a design gate). **2 of 8 deferred**, per explicit decision:

- **#24 (Prettier + format gate)** — deferred entirely. No Prettier config exists; running it now would produce a large full-repo reformat diff (~41 files no-semicolon style vs ~21 semicolon style) colliding with every other item's diff in this same batch. Also isn't actually mechanical once you account for the real policy question it raises (big-bang reformat vs. format-on-touch). Resized S→M in BACKLOG.md.
- **#20 (Result splits)** — deferred to its own future session. A feature completion (wiring `Timer.jsx`'s captured `splits` through to `results_v2.blocks`), not a bugfix/dedup, and the only one of the 8 touching a live write path. Categorically different in kind/risk from this batch.

Of the remaining 6: 5 are low-risk mechanical fixes/dedups (**#46, #47, #48, #22, #44**) shipped together in commit 1. **#45** is a confirmed real behavior change on a live-at-the-gym printed/exported artifact (the WOD PDF) — ships in its own gated follow-up commit, mirroring how 07's #12 landed separately pending its own verification.

#47 and #48 originated from the `#16` util-consolidation follow-up review (2026-07-05, 4th pass) — same "collapse a reimplemented helper to one canonical `lib/` copy" pattern `#16` already proved out. #46 was also a 4th-pass finding (a live UX-walk bug). #44 and #45 were already-filed items with clarified/corrected scope from this investigation.

Model: Sonnet for all 6 · Size: S each (batch ≈ M, two commits).

**Commit split:**
1. **Commit 1** — #46 → #47 → #48 → #22 → #44. All same low-risk tier, no live-write-path or visible-shipped-artifact concerns. #46 before #44 deliberately: both touch `Schedule.jsx`'s `ExRow` `isProg` block on different lines — doing the trivial removal first means #44's edit lands on already-simplified code.
2. **Commit 2** — #45, isolated, gated on manually verifying the printed/exported WOD PDF with real mixed-unit progression data on the local stack.

## #46 — Schedule.jsx `toTitleCase()` mangles apostrophes and acronyms
**What:** `toTitleCase()` lowercased then title-cased every exercise/movement name, breaking apostrophes (`Farmer's Carry` → `Farmer'S Carry`) and destroying coach-entered acronyms (`GHD`/`T2B`/`KB` → `Ghd`/`T2b`/`Kb`). Removed the function; all 5 call sites now show the name verbatim.
**Files:** `src/public/schedule/Schedule.jsx` — `toTitleCase` def, 5 call sites.
**Verify:** confirmed live on desktop + mobile — apostrophe and acronym names render exactly as typed.

## #47 — toISO-equivalent stragglers under different names
**What:** 3 reimplementations of "YYYY-MM-DD from a `Date`," missed by `#16`'s exact-name search since each used a different function name.
**Files:** `Resultados.jsx` (`dateToDK`), `Leaderboard.jsx` (`toDateKey`) — both replaced 1:1 with canonical `toISO()`. `Index.jsx`'s `dateKey(offset)` kept as a thin wrapper around `toISO()` (takes an offset param `toISO` doesn't have).
**Verify:** grep confirms zero remaining reimplementations outside `week.js`; dates unchanged on Index/Resultados/Leaderboard.

## #48 — prBest()/prPct()/prDelta() PR-progress-helper triplication
**What:** Identical PR-best/progress-%/delta-vs-previous logic hand-rolled in `Atletas.jsx`, `Athletes.jsx`, `Me.jsx`.
**Files:** new `src/public/lib/goals.js` (canonical `prBest`/`prPct`/`prDelta`, imports `toSecs`/`fmtSecs` from sibling `wod.js`) + new `goals.test.js` (16 cases). Kept `Me.jsx`'s more defensive `pr?.results?.length` guard as the canonical form. Also simplified `Athletes.jsx`'s inline `recentPRs` calc (a 4th hand-rolled copy of the same `prBest` logic) to call the canonical function.
**Verify:** `npm test` green (16 new cases); Atletas/Athletes.html/Me.html show identical PR values post-extraction.

## #22 — Startup fetch consolidation (rescoped)
**What:** Investigation showed the backlog's premise ("ad-hoc unbatched fetches") didn't hold — every page already batches via `Promise.all`. Rescoped to the one real S-sized piece: deduped the identical `blobTables` array between `Athletes.jsx`/`Leaderboard.jsx`.
**Files:** new `src/public/lib/blobTables.js` (`BLOB_TABLES` — positional order both files' destructuring depends on).
**Verify:** both pages load identical data, zero console errors. Architectural remainder (server-side merge) noted as a possible separate future item.

## #44 — Schedule.jsx: stepless progression exercise is uncompletable/falsely-complete
**What:** A progression exercise with zero `intensity.steps` was handled 3 disagreeing ways: `ExRow` rendered nothing; the round-badge calc and `blockProgress`'s round branch padded a phantom group; `blockProgress`'s non-round branch auto-credited it as done via a `groups.length===0||` short-circuit.
**Files:** `Schedule.jsx` — new local `progGroups(ex)` helper (pads canonical `groupProgressionSteps()`'s `[]` to `[{reps:'',loads:[]}]`), used at all 4 former call sites; removed the dead auto-credit short-circuit. `wod.js`'s doc comment on `groupProgressionSteps` corrected (no longer documents the inconsistency as intentional). `IntensityInput.jsx`'s `delStep` gained a defense-in-depth internal guard.
**Verify:** **caught a real crash during live verification** — the first padding shape (`{reps:''}`, no `loads` key) crashed `ExRow`'s `g.loads.map(...)` render path. Found by injecting a stepless-progression exercise into the local Supabase stack (Studio SQL editor) and driving `schedule.html`, not just reading code. Fixed to `{reps:'',loads:[]}`, re-verified: checkbox row renders, toggles correctly, zero console errors. Test data reverted after.

## #45 — Publicador.jsx buildProgressionLines() (commit 2, separate)
**What:** `buildProgressionLines()` groups by `(reps, unit)` instead of canonical `groupProgressionSteps()`'s `reps`-only key — confirmed real divergence on mixed-unit sequences (e.g. one canonical group vs. two from `buildProgressionLines`), a visible difference between the printed/exported WOD PDF and the in-app schedule view.
**Files:** `src/components/tabs/Publicador.jsx` — rewrite `buildProgressionLines` as a thin wrapper around canonical `groupProgressionSteps(ex)`, reshaping into Publicador's own `{nameLine, loadStr}[]` shape; keep the existing `if (!steps.length) return null` early-return (print omits empty progressions rather than inheriting #44's checkbox-padding decision).
**Verify:** build the confirmed mixed-unit repro dataset into a real session on the local stack; generate the actual PDF; confirm one merged group (matching Schedule.jsx) instead of two; spot-check a common single-unit progression WOD renders unchanged.

## Deferred
- **#24** — see BACKLOG.md row (resized S→M, needs a reformat-policy decision first).
- **#20** — deferred to its own future session (feature completion, live write path, different in kind).

## Batch verification / gate
- `npm test` green (92 → 108, +16 for `goals.test.js`).
- `npm run build:all` succeeds.
- `/code-review` on the batch diff before pushing (medium+ effort — #44's judgment call, #45's confirmed visible behavior change). Session-limit note: the agent-based reviewer hit the same API rate limit both for `#16` and this batch; fell back to manual diff/grep audit both times.
- No `/security-review` needed — zero RLS/auth/user-input-rendering surface.
- #45 gated on manual PDF verification with real mixed-unit data before its commit.
