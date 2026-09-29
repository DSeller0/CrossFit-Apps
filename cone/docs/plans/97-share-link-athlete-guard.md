# 97 — #207 · The Apresentar share link opens its session, and no `?id=` can corrupt the athlete filter

## Context

#113's fix never worked (#207). `Publicador.jsx:480` sends a **session** id as `schedule.html?id=`;
`Schedule.jsx:393` only opens a session on `date` **and** `session` together, so the link falls
through to the athlete-lock branch, which writes the session id into
`localStorage.cone_athlete_filter` **unvalidated** — the session never opens, the rail renders
`● —`, and the bad value persists.

The #225 gsd trial (`plans/96`, report `docs/reviews/2026-09-29-gsd-trial.md`) already built and
reviewed a fix for the `Schedule.jsx` half on branch **`gsd-trial`**, kept alive for this plan:
`buildSessionShareUrl` (producer, `date`+`session`) and `findAthleteById` (the one validator every
`?id=`/`?athlete=` read goes through), with 24 unit tests. Its code review then found the same
defect in a second file — **`Results.jsx:151-154`** writes a raw `?id=` into the same shared key
(CR-01) — which nothing upstream had caught. This row ports the first and closes the second.

⚠️ **Printed QR codes already carry the bad `schedule.html?id=<sessionId>` URL and cannot be
recalled.** The URL fix alone does nothing for them; the reader guard is what protects every
visitor who scans one after this ships.

## Acceptance

#207 closed: the Apresentar link opens its session, and no `?id=` value — from a new link, a printed
QR or a hand-typed URL — can put an unrecognised id into `cone_athlete_filter` on any public page.
A valid athlete lock (kiosk mode) behaves exactly as before.

## Must-haves

Drive each on the local stack, fresh browser context unless stated. Query the rail by its
`deskAthRow` class — the week strip's empty days also render `—`, so a page-wide text search
false-positives.

- The Apresentar share URL reads `schedule.html?date=<dateKey>&session=<sessionId>` — both params,
  **no** bare `id=`.                                              [Publicador → Apresentar]
- Opening that URL lands on that session (card selected, blocks rendered) **and**
  `cone_athlete_filter` stays absent.                             [schedule.html, DevTools]
- A stale printed-QR URL `schedule.html?id=<sessionId>` opens **no** lock — the selector bar
  renders, the Atletas pane is the full list, no `● —` — **and** writes nothing to
  `cone_athlete_filter`.                                          [schedule.html, DevTools]
- The same stale URL with a valid `cone_athlete_filter` already stored leaves that value exactly as
  it was — not cleared, not overwritten.                         [schedule.html, DevTools]
- A valid `schedule.html?id=<athleteId>` still locks: selector bar hidden, the pane shows that one
  athlete, and Nav's tab links carry `?id=`.                     [schedule.html]
- The three stale/pre-set/valid cases above hold on **`results.html`** too.   [results.html]

## Files

- Ported from `gsd-trial`: `components/tabs/Publicador.jsx`, `components/tabs/publicador/exportHelpers.js`
  (+ `.test.js`), `public/schedule/Schedule.jsx`, `public/schedule/scheduleHelpers.js` (+ `.test.js`)
- Written here: `public/results/Results.jsx`
- Docs: `cone/CLAUDE.md`, `cone/docs/arch/publicador.md`

## Approach

0. **Local stack** (all down as of 2026-09-29): Docker, `supabase start`, then inside `cone/`
   `npm run dev` (SPA) and `npm run dev:public` (public pages). Probe with `localhost`, not
   `127.0.0.1` — the dev servers bind IPv6 only (plans/96 step 4 · EXECUTE).

1. **Port the trial's code, not its commits.** From the repo root:
   ```
   git diff cee12ca gsd-trial -- cone/src | git apply
   ```
   6 files, +177/−14 — `Publicador.jsx` (producer + the corrected `// #113` rationale comment,
   i.e. DOCS-01), `publicador/exportHelpers.js` (+`buildSessionShareUrl`), `schedule/Schedule.jsx`
   (the guard), `schedule/scheduleHelpers.js` (+`findAthleteById`), and both test files.
   `git apply --check` was clean against `main` on 2026-09-29. Commit it natively — the trial's
   `feat(01-01)` messages point at a `.planning/` that does not exist on `main`. `npm test` should
   now read **1137** (1113 + 11 + 13).

2. **Close CR-01 in `results/Results.jsx`, mirroring the ported `Schedule.jsx` guard:**
   - `:19` — add `findAthleteById` to the existing `import { onKey } from
     '../schedule/scheduleHelpers.js'` (precedent: Results already imports from there; promote it
     to `public/lib/` only if a third page ever needs it).
   - `:90` — give `lockedId` a setter.
   - `:92-97` — stop seeding `selAth` from the raw `?id=`; seed from storage only, as
     `Schedule.jsx:84` does, and let `load()` set it from the validated lock.
   - `:151-158` — inside `load()`, after `aD` is loaded: `const lockedAth = findAthleteById(aD,
     lockedId)`; if `lockedId && !lockedAth` → `setLockedId('')`; write and select **only**
     `lockedAth.id`.
   - Narrowing `lockedId` to `''` is what makes its other readers behave — `:190-191`
     (`lockedAthName`), `:657` and `:796` (the lock guards), `:1016` (`Nav`) — the same way it
     fixes the six `Schedule.jsx` kiosk sites. Don't touch them individually.

3. **Sibling sweep — name every writer and raw reader, per WORKFLOW.md's rule:**

   | Site | Disposition |
   |---|---|
   | `Schedule.jsx` `?id=` + `?athlete=` reads, lock write | guarded by the port (step 1) |
   | `Schedule.jsx` `changeAth` write | trusted — fed by a real `<option value={ath.id}>` |
   | `Results.jsx:90`, `:92-97`, `:151-158` | guarded by step 2 |
   | `Results.jsx:250` `changeAth` write | trusted — user-clicked option |
   | `Me.jsx:119`, `:139` `?id=` reads | not vulnerable — resolved with `athletes.find` before use; its only writer `selectAthlete(ath)` takes a matched object |
   | `Nav.jsx:84` carries `?id=` across tabs | safe once every reader validates |

   Re-run `grep -rn "setItem('cone_athlete_filter'" src/public` and `grep -rn "get('id')"
   src/public` before committing; any site not in this table is a finding. ⚠️ The literal grep
   cannot see `Me.jsx`, which keys the same storage through a constant — also run `grep -rn
   ATHLETE_KEY src/public/me` and `grep -rn "setItem(" src/public | grep -v "setItem('"`.
   (Run 2026-09-29: nothing unlisted — `Me.jsx:185` `selectAthlete(ath)` takes a matched roster
   object, `:194` only removes.)

4. **Docs are part of Done:**
   - `cone/CLAUDE.md` "Tests:" — the new total, with a clause: `#207/plans/97 added 24:
     exportHelpers.test.js +11 (buildSessionShareUrl), scheduleHelpers.test.js +13 (findAthleteById)`.
   - `cone/CLAUDE.md` "Never-built legacy HTML" — rewrite the **#113 is REOPENED as #207**
     sentence to past tense: fixed by #207/plans/97 — `date`+`session` URL, every `?id=` reader
     validated through `findAthleteById`. Keep the two-conventions and `lockedId`-is-not-dead notes.
   - `cone/docs/arch/publicador.md:83` — the same, past tense.

5. **Drive the must-haves** (Playwright recipe from plans/96 step 4 · EXECUTE: fresh context,
   `localStorage.clear()`, navigate, read `localStorage` + query by class). Get real ids from the
   local stack: `sessions?id=eq.1&select=value` and `athletes?id=eq.1&select=value` over REST with
   the anon key from `cone/.env.development`.

6. Commit + push, then the Done ritual (WORKFLOW.md steps 5–6). **Last:** `git branch -D
   gsd-trial` — the port was its only reason to exist.

## Verification

The must-haves above, driven. Plus: `npm test` passes at the new total, `npm run lint` and
`npm run format:check` clean, `git branch --list gsd-trial` empty at the end, and
`node scripts/audit-backlog-markers.mjs` (from `cone/`) at zero findings.

Model: Sonnet · Size: S
