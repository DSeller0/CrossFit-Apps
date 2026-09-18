# 89 — `backup-supabase.mjs` reads 4 of its 9 tables as empty and exits 0 (#199)

> ✅ Done: `99402c7` · 2026-09-18 — see BACKLOG.md
>
> **First complete backup since 2026-06-24: `backups/2026-09-18_16-05-25/`** — 9 of 9 `ok`,
> `manifest.complete: true`, `auth: service-role`. Without the key the run exits 1 and names
> `events, locations, coach_profile, templates` (the regression test, run first).
>
> **Two additions the plan didn't list.** (1) `assertServiceRole` rejects a `SUPABASE_SERVICE_ROLE_KEY`
> whose JWT `role` isn't `service_role` (or isn't a recognisable key) — a wrongly pasted anon key would
> otherwise put the run in service-role mode over tables that read back null, re-creating the exact
> silent-empty this plan ends. (2) A no-key run still writes the tables it *can* read, but flags the
> manifest `complete: false` and exits 1, rather than writing nothing.
>
> **Verification step 4's expectations were wrong about the data, not the script.** The plan expected
> a Pix key in `coach_profile` and a `rateHistory` on `locations`. Prod has neither: `coach_profile` is
> `{name, phone:'', contact:''}` — byte-for-byte the same shape as the June backup, last touched
> 2026-07-27 — and all four locations carry `rate: 0` with no `rateHistory` (`locations` last written
> 2026-08-31, four days *before* #154 shipped, so nothing has ever minted a version). So nothing was
> lost to the blind backup on those two; the rates simply have never been entered in prod. Recovered
> content: `events` 281 (65 days, 2026-06-01 → 2026-09-30; 13 carry a `rateSnapshot`; June's backup
> had 102), `templates` 3, `sessions` 152 (June: 15), `athletes` 23 (June: 9) — every June session
> and athlete id is still present.
>
> **Hand-off to #88:** `seed-dev.mjs` has the same anon-key blindness; the pattern here (merge
> `.env.local` over the env file, pick the key by mode, classify `ok`/`empty`/`unreadable`, fail
> non-zero) transfers directly. Left alone deliberately — it writes to the local stack and needs its
> own verification. ⚠️ Not covered by this or any backup: **`results_v2`** (the normalized results
> table, where athletes' logged results live) is not in `TABLES` — filed as **#201**.

## Context

**There has been no complete backup of this app since 2026-06-24.**

`scripts/backup-supabase.mjs` authenticates with `VITE_SUPABASE_ANON_KEY`. Migrations `0006` (#81)
and `0009` (#150) revoked the anon `"public read"` on **`coach_profile`**, **`locations`**,
**`events`** and **`templates`** — deliberately, and correctly. RLS answers a forbidden read with
**zero rows, not an error**, so `.maybeSingle()` yields `null`, the script logs `EMPTY`, continues,
and **exits 0**. A green run and a catastrophic run are indistinguishable.

Measured against prod 2026-09-13 — readable: `sessions`, `athletes`, `settings`,
`exercise_registry`, `goals_data`; silently empty: `events`, `locations`, `coach_profile`,
`templates`. So the **Pix key**, the **service rates and their whole `rateHistory`**, the **entire
agenda** and **every session template** are in no backup taken since 2026-08.

`ls backups/` returns exactly one directory: **`2026-06-24_13-17-42`**, which predates both locks
and is therefore the last complete backup that exists. That is also the snapshot
[plans/87](./87-new-themes.md) had to reach for to prove `lb_colors` had never held a row — this
file is load-bearing, not just insurance.

The script's own header already documents the whole failure (added when #199 was filed). This plan
closes it.

**User decision, 2026-09-14 — authenticate with a service-role key from `cone/.env.local`.** The
pattern already exists and is safe: `cone/.gitignore:4-5` covers `.env` and `.env.local`, and
`.env.development` already carries a `SUPABASE_SERVICE_ROLE_KEY` for the **local** stack. Only the
two `VITE_`-prefixed public values live in the tracked `.env.production`. The prod service-role key
is pasted into `cone/.env.local` once, by the user, and is never committed.

## Acceptance

- With `SUPABASE_SERVICE_ROLE_KEY` present in `cone/.env.local`, a run writes **9 non-empty** table
  files, `coach_profile` / `locations` / `events` / `templates` included.
- 🔴 **Without it, the run FAILS — non-zero exit, naming every table it could not read.** This is
  the half that matters most: the bug was never that the reads failed, it was that failure was
  indistinguishable from success. An empty table must never again pass silently.
- A table that is *genuinely* empty is distinguishable on screen from one that was *refused*. A
  service-role read that returns no row is a real empty; an anon read of a locked table is not.
- The script header's 🔴 #199 block is replaced by a short note on how it authenticates.
- `.env.local` stays untracked — `git status` clean after a run. ⚠️ Verify before finishing.
- `backups/` stays gitignored and no key value is ever printed to the console or into a backup file.

## Files

- `scripts/backup-supabase.mjs` — auth selection, per-table result classification, exit code, header.
- `cone/.gitignore` — confirm `backups/` is covered; add it if not. **Do not** touch the `.env` lines.
- `cone/.env.local` — **the user creates this**, not the session. Document the one key it needs.
- `docs/plans/89-backup-auth.md` — this file's Done marker records the first complete backup's date.

## Approach

1. **Read env with precedence**: `.env.local` (if present) over `.env.production`, merging rather
   than replacing — the URL stays in `.env.production`. Reuse the existing `readEnv()` shape; it
   already parses `KEY=value` lines, so this is a second call plus a spread.
2. **Pick the key**: `SUPABASE_SERVICE_ROLE_KEY` if present, else `VITE_SUPABASE_ANON_KEY`. Print
   which mode it is running in (`service-role` / `anon — 4 tables will be unreadable`), never the key.
3. **Classify each table** as `ok` / `empty` / `unreadable` instead of today's `ok` / `empty`. In
   anon mode the four locked tables are **`unreadable` by construction** — that is a known static
   fact from `0006`/`0009`, so name them from a constant rather than inferring it from a null.
4. **Exit non-zero** if any table is `unreadable`, printing the list and the one-line remedy (add
   the key to `.env.local`). A genuine `empty` stays a warning, not a failure.
5. **Rewrite the header** — the 🔴 block describes a bug that no longer exists once this ships.
6. **Take the backup.** The first complete one since 2026-06-24 is the actual deliverable; the code
   change is only what makes it possible. Record its directory name in the Done marker.

⚠️ **Out of scope, filed separately:** `seed-dev.mjs` has the *same* anon-key blindness (#88 —
it can no longer seed `locations`/`coach_profile`, so the billing surfaces are developed against
empty local data). It is the same one-line auth fix and it is tempting to fold in — but it writes
to the local stack and needs its own verification pass, so it stays #88. Note in the Done marker
that this plan hands it a working pattern.

## Verification

1. Run **without** `.env.local` → must exit non-zero and name the four tables. This is the
   regression test for the actual bug; run it first.
2. User adds the prod service-role key to `cone/.env.local`.
3. Run again → 9 tables `ok`, non-zero byte counts on all four previously-empty files.
4. Spot-check the recovered content: `coach_profile` carries a Pix key; `locations` carries `rate`
   **and `rateHistory`** (#154's versioned history — the part that cannot be reconstructed from
   anywhere else); `events` row count is plausible; `templates` is non-empty.
5. `git status` → clean. Confirm `.env.local` and `backups/` are both ignored.
6. Diff the new backup's `sessions`/`athletes` against the 2026-06-24 one as a sanity check that the
   script still reads the five it could always read.

Model: Sonnet   ·   Size: S
