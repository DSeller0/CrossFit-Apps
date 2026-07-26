# 48 — #73 + #60 + #100 · Dead-weight sweep (deletion only)

> Planned 2026-07-26 from the housekeeping ranking pass. Run order:
> [46 session-id identity](./46-session-id-identity.md) →
> [47 load-path write-back](./47-load-path-writeback.md) → **48 (this)**.
> **Deletion-only by design.** Every item below was re-verified against the current tree on 2026-07-26.
> If something turns out to have a live consumer, it leaves this plan — it does not get "fixed" here.

## Context

Three separate rows that are one session's work: dead exports, a dead table with live sync plumbing, and
never-built files. Ordered last of the three because it is the lowest-risk and because it also repairs the
board's own accuracy, which the rest of the housekeeping program depends on.

## Part A — dead code (#73, remaining half)

The CSS half shipped in plans/40. What is left, all **re-verified zero-consumer**:

| Target | Evidence |
|---|---|
| `src/utils/config.js:1` `DAYS` | 0 references repo-wide |
| `src/utils/config.js:41` `DEFAULT_TYPES` | 1 reference: `:42` `TYPES`, itself dead. **Delete as a pair** |
| `src/utils/config.js:42` `TYPES` | 0 external references. *(`BlockTypePicker.jsx:5` has its own unrelated local `TYPES` — do not touch)* |
| Crimson Pro **600** in `src/fonts.js:12-14` | `--font-body` has exactly **one** consumer app-wide: `Schedule.module.css:299` `.deskIdleHint`, italic, **no `font-weight`** → 400-italic only. Nothing needs 600 |

⚠️ Keep Crimson Pro **400 + 400-italic**. Only the 600 is dead payload.

## Part B — `lb_colors` + the v1 `results` blob (#60)

**Nothing in `src/` renders from `lb_colors`.** The custom-color *system* retired in #51; the table and
its sync plumbing stayed, carrying dead data. Full leg to remove:

- `src/utils/supabase.js:130-136` — `dbLoadLBColors` / `dbSaveLBColors`
- `src/utils/storage.js` — `:8,11` imports · `:37` `LS_LB_COLORS` · `:53` the legacy-key migration ·
  `:138-139` `loadLBColors`/`saveLBColors` · `:149,153` in the pull · `:175` the write-back
- `src/App.jsx:14` import · `:128-135` seeding · `:173` the state export
- `src/utils/config.js:27-35` `APP_CONFIG.lbColors` — a 20-key default with zero readers
- `src/utils/storage.test.js:13,16` — names in the mock factory

Three findings the #60 row doesn't have, all confirming it is safe:
1. `App.jsx:130-132` writes the **legacy** key `eagles_lb_colors_v1` while `LS_LB_COLORS` is
   `cone_lb_colors_v1`, and `storage.js:53` migrates it straight back. **Pure churn.**
2. `public/config.json` is literally `{}`, so `cfg.lbColors` at `App.jsx:128` is never truthy — the whole
   branch is **unreachable in this deployment**.
3. The export leg (`App.jsx:173`) has **no matching import leg** — `:218-225` never restores `lbColors`.
   Already asymmetric.

**v1 `results` blob** (distinct from `results_v2`): zero `src/` readers. Remaining references are
`scripts/seed-dev.mjs:31` and `scripts/backup-supabase.mjs:27`. Drop it from both so every future dev
stack stops replicating it. *(`scripts/migrate-phase4.mjs:53` is the historical one-time migration — leave it.)*

⚠️ **Naming trap:** `storage.js:30` `LS_RESULTS = 'cone_results_v1'` and the `eagles_results_v1` migration
at `:46` are **localStorage keys caching `results_v2` rows** — not the v1 blob. Do not delete them.

**Leave the Supabase tables themselves in place.** Dropping `lb_colors` / `results` from prod is a
migration with its own prod-apply dance (`0005`–`0007` are local-only; see CLAUDE.md) — this plan removes
the *client* plumbing only. Note the table drop as a follow-up on #60.

## Part C — never-built files (#100)

**33 root-level `.html` files are tracked; 9 are built** (`vite.public.config.js` `input`) **and
`gallery.html` is dev-only but live.** That leaves **23 tracked-but-never-built** files:

`athletes_v1/v2.html` (2) · `design-*.html` (**12**) · `designer.html` · `log.html` · `me-a/b/c.html` (3) ·
`schedule_builder_*.html` (4)

*(The #100 row says "26" and itemizes 22 — both wrong, and its `design-*` count of 11 is off by one.
Correct the row to 23.)*

Plus **5 untracked** working-tree files that violate WORKFLOW.md's "never add new root `design-*.html`":
`design-b`, `design-c`, `design-criador`, `design-d`, `design-hybrid`.

### 🔴 Two hard constraints — read before deleting anything

1. **`athletes.html` is in the whitelist and MUST NOT be deleted.** It is a redirect stub (#52), but
   `sw.js` precaches it and `cache.addAll` **rejects atomically on a 404** — removing it stops the service
   worker installing *for every user, on every page*. CLAUDE.md records this explicitly.
2. **`schedule_builder_pt.html` is the only thing that ever wrote `exerciseRows`** (CLAUDE.md), and
   reviving `exerciseRows` is the keystone of [plans/22](./22-athlete-character-stats.md)/#64. **Check
   whether #64 still wants it as a reference implementation before deleting.** If yes, it moves to
   `legacy/` rather than being removed.

**Decision to make in-session:** delete outright, or move to a `legacy/` folder that is obviously not
live. Recommend **`legacy/`** for `schedule_builder_*` (per constraint 2) and **delete** for the rest —
they are all recoverable from git history, which is what history is for. Record whichever is chosen.

## Part D — board accuracy (found while ranking, 2026-07-26)

- **#83 / #84 shipped 2026-07-19** (`5a3da38` / `e0358ce`) but still carry green "→ Ready" markers at
  `BACKLOG.md:86-87`, and `:13-15` points at them as available picks. Both wrong.
- **`#88` is a duplicate row ID** — `:71` (prod/dev reconcile) and `:131` (DNF per-exercise data).
  Renumber the second to **#112**.
- **`BACKLOG.md:5`'s own worked example is stale** — `Servicos.jsx` is 452 raw / 412 non-blank, not 437/397.
- **A `blkMeta` fork was reintroduced** at `criador/SessionTextPane.jsx:23` by #92 (`2920f57`), two days
  after plan 34 shipped. One-line fix: import `blkMeta` from `public/lib/wod.js`.
  *(`BlockTextEditor.jsx:42` and `textFormat.js:657` are the deliberate re-parseable **serializer** — the
  same split `wod.js:90-93` documents between `goalStr` and `serializeGoal`. **Not** forks, leave them.)*

*(Parts of this may already be done by the session that writes this plan — verify before redoing.)*

## Acceptance

- Every deletion is zero-consumer, **re-verified at execution time, not trusted from this file.**
- `npm test` 551/551 (minus any test lines removed with the `lb_colors` mock names).
- `npm run lint` ≤ **84**. If deletions *lower* it, **re-baseline `--max-warnings` in the same commit** —
  a stale-high ceiling silently stops ratcheting.
- `npm run build:all` succeeds and the built page list is unchanged (still 9).
- `npm run design:cards` — no diff unless a gallery-rendered component was touched.

## Verification

- Grep each deleted symbol name repo-wide → 0 hits (`DAYS`, `DEFAULT_TYPES`, `TYPES`, `lbColors`,
  `LS_LB_COLORS`, `dbLoadLBColors`, `dbSaveLBColors`).
- **Live smoke on the local stack:** SPA loads, leaderboard renders with correct colors (they come from
  tokens now, not `lb_colors`), Schedule's `.deskIdleHint` still renders italic.
- **Service worker:** load a public page, confirm the SW installs and `cone-v*` caches populate — this is
  the `athletes.html` constraint, and it fails silently if broken.
- `node scripts/seed-dev.mjs` still completes after the v1-`results` removal.

Model: Sonnet · Size: S
