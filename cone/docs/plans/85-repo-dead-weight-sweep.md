# 85 — Repo dead-weight sweep

> Deletion-only. ~1.9 MB of tracked, unreferenced files, plus two documentation files that actively
> mislead. Filed from the 2026-09-05 planning session; the dead-code half was measured then and
> confirmed by the [2026-09-05 full pass](../reviews/2026-09-05.md).

## Context

Every target below was checked for references across code, HTML, config, the deploy workflow and
`legacy/` — each has **zero**. Two are worse than merely unused: `CONE_CONTEXT.md` is a second,
competing context document that contradicts the real `CLAUDE.md`, and `cone/README.md` is still the
stock Vite scaffold text, so the repo's front door describes a template rather than the app.

The one genuinely load-bearing decision here is `log.html`: it is not in
`vite.public.config.js`'s input, so it 404s in production, it is the sole consumer of the root
`cone-client.js`/`cone-utils.js`, and it writes to the **legacy `results` table** whose anon grants
`0009` revoked. It has been dead in production since before `0009`.

## Acceptance

- `git ls-files` no longer lists `legacy/`, root `fonts/`, `state.json`, `CONE_CONTEXT.md`,
  `Hercules sample training/`, `cone/Test Hercules Training Conversion Semana 08.md`,
  `cone/Coach training week example.txt`.
- `cone/README.md` describes Cone in ~15 lines and points at `CLAUDE.md`, `docs/BACKLOG.md` and
  `docs/WORKFLOW.md`.
- `log.html`, `cone-client.js`, `cone-utils.js` are gone **and** `deploy.yml`'s `cp` line no longer
  names the two JS files.
- 🔴 **The service worker still installs.** `npm run build:all` green, and a real browser load shows
  `cone-v*` activating with a populated cache.
- `npm test` · `npm run lint` · `npm run build:all` all green.

## Files

| Target | Evidence (measured 2026-09-05) |
|---|---|
| `legacy/` (4 files) | 1.17 MB, zero references; `schedule_builder_pt.html` and `_pt_V2.html` are **byte-identical** |
| root `fonts/` (8 faces + a `__MACOSX` folder) | zero references repo-wide — the app loads fonts via `@fontsource/*` in `src/fonts.js` |
| `state.json` | 362 KB tracked, zero code references |
| `CONE_CONTEXT.md` | 378 lines, unreferenced, ~8 weeks stale, contradicts `CLAUDE.md`, lists `log.html` as a live page |
| `cone/README.md` | stock Vite boilerplate, untouched since the folder was created — **rewrite, don't delete** |
| `Hercules sample training/`, `cone/Test Hercules…md`, `cone/Coach training week example.txt` | parser scratch inputs sitting unfiled in package roots |
| `log.html` + `cone-client.js` + `cone-utils.js` | `log.html` 404s in prod, is the sole consumer of the other two, writes to the legacy `results` table |
| `.github/workflows/deploy.yml:52` | drops `cone-client.js cone-utils.js` from the `cp` line |

## Approach

1. Delete the seven unreferenced targets. Nothing imports them; this is `git rm`.
2. Rewrite `cone/README.md`: what Cone is, `npm run dev` / `dev:public` / `test` / `build:all`, the
   `supabase start` prerequisite, and pointers to `CLAUDE.md` + `docs/`. Short — `CLAUDE.md` is the
   real document and the README should say so rather than duplicate it.
3. Retire `log.html` **with its two scripts and the deploy line together**. `Publicador.jsx:431-435`
   already points the presenter QR at `schedule.html?id=` (that was #113), so nothing links it.
4. Re-run `npm run design:cards` if anything it inlines changed (it shouldn't here) and commit the
   regenerated cards if so — build artifacts are part of Done.

🔴 **Two traps, both verified 2026-09-05:**
- **`sw.js` precaches only HTML + manifest** (`sw.js:6-17`), so `cone-client.js`/`cone-utils.js` are
  **not** in `PRECACHE_URLS` and deleting them is safe. **`athletes.html` IS in that list and must
  not be touched** — `cache.addAll` rejects **atomically**, so a single 404 stops the worker
  installing for every user on every page. That is why the retired stub is still in the repo.
- **`config.json` stays.** `App.jsx` and `public/schedule/Schedule.jsx` both read it. Only the two
  `cone-*.js` files leave the `cp` line.

## Verification

1. `npm run build:all` — succeeds, and `public-dist/` still contains all **10** pages.
2. 🔴 **Load a built public page in a real browser** and check DevTools → Application → Service
   Workers: `cone-v*` activates and the cache is populated. A missing precache entry fails
   **silently in the console**, so this cannot be verified from the build output alone.
3. `git ls-files | wc -l` before/after, and confirm the deleted set is exactly the intended one —
   no wildcard over-reach.
4. Confirm nothing regressed on the deployed site after push: `index.html` and `schedule.html` load,
   and the Apresentar QR still resolves.

Model: **Sonnet** · Size: **S**
