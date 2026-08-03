# 59 — #124 · Coach is unreachable from Perfil and Agenda (`lockedId` carries two meanings)

> ✅ Done: e7ff679 · 2026-08-03 — see BACKLOG.md

## Context

From the user's 2026-08-03 report: *"Agenda and Perfil pages do not show Coach when the slide sheet
shows, mobile issue. Coach is not reachable from any public facing pages. Expected: Timer and Coach
must be reachable from any public facing page."*

**This is not a CSS or overflow problem.** `Nav.jsx:98` (mobile "Mais" sheet) and `:139` (desktop
sidebar) both gate the Coach link on `{!lockedId && …}`, and `lockedId` means two different things
depending on which page passes it:

- **`results.html`** (`Results.jsx:94`) and **`schedule.html`** (`Schedule.jsx:118`) read it from the
  **URL `?id=`** — a genuine shared-link / kiosk lock.
- **`me.html`** (`Me.jsx:630`) passes **`selAthlete?.id`** — the *in-page selected athlete*, set by
  the ordinary picker (`Me.jsx:179`). `Me.jsx:40-43`'s own comment states the intent: remember who
  you are across all three pages, *"and Nav's lockedId keeps it in every tab link."* That is
  **identity propagation**, not a device lock.

So on the completely ordinary path — open Perfil, tap your own name — `lockedId` becomes truthy and
Coach vanishes. Worse, `hrefFor` (`Nav.jsx:77-83`) writes `?id=` into every `lockable` tab's href, so
the lock then propagates to Agenda and Resultados. **One tap on Perfil removes Coach from all three
pages for the rest of the session.**

**The gate protects nothing anyway.** `cone/` is the SPA behind `AuthContext`'s 8-digit OTP plus the
`is_allowed_user()` allowlist. Hiding the link is tidiness, not access control — and CLAUDE.md's
standing rule is that view-level hiding is never treated as a security boundary (same reasoning as
`?box=` scope, which is documented as "a view filter, NOT access control").

⚠️ **Timer does not reproduce and must not be "fixed".** The user's report pairs Timer with Coach,
but #53's `.btn.desktopTab` specificity fix is present and commented (`Nav.module.css:43-47` and
`:177-178`), so Timer renders **exactly once** at every width — hidden from the mobile bar and shown
in the sheet, sidebar-only on desktop. Verify it, report it, change nothing.

## Acceptance

- **Coach is reachable from every page that renders `Nav`**, at both widths, regardless of whether
  an athlete is selected or `?id=` is in the URL.
- The overflow sheet's **Timer and Coach links carry `?box=`** when a box scope is active.
- `timer.html` resolves and propagates the box scope like every other public page.
- Timer still renders exactly once at 390 (#53 intact, not re-broken).
- The `?from=tv` decision below is recorded in code, whichever way it goes.
- 645 tests pass · lint clean at `--max-warnings 0` · `build:all` clean.

## Files

| File | Change |
|---|---|
| `src/public/Nav.jsx` | Drop the `!lockedId` gates at `:98` and `:139`. Route the sheet tiles (`:94` `href="timer.html"`, `:99` `href="cone/"`) through `hrefFor` instead of raw strings. |
| `src/public/timer/Timer.jsx` | Import `getBoxScope` and pass `box` to its five `<Nav>` renders (`:728,925,990,1041,1120`). |

## Approach

### 1 · Remove the gate, keep the prop

`lockedId` still does its real job — `hrefFor` (`:77-83`) uses it to carry `?id=` across tabs, and
that behaviour is correct and stays. Only the **visibility gate** on the Coach link goes.

Do **not** try to split `lockedId` into two props (`lockedId` + `kioskMode`) as a first move. There
is no surface that sets a kiosk mode today, so a second prop would ship with zero writers — the
`locations[].coachName` mistake CLAUDE.md records under #103 ("shipping a second decorative field
without labelling it is how that one happened"). If a real kiosk mode is wanted later it is its own
row. Write a short comment at the removal site saying the gate was dropped because the SPA is
OTP-gated, so the next reader doesn't restore it as "hardening".

### 2 · Route the sheet through `hrefFor`

`Nav.jsx:94,99` are raw strings, so both tiles **drop `?box=` and `?id=`** — the only two things
`hrefFor` exists to carry. In-session this is masked by `cone_box_scope` localStorage
(`lib/boxScope.js:13-28`), but a link **copied or shared** from the sheet loses the scope for
whoever receives it, which is the exact use case `?box=` was built for (#80: links handed to a
specific box's members).

`hrefFor` takes a tab-shaped object (`{href, lockable}`), so the two tiles need that shape. Timer is
already in `TABS` (`:63-67`) — reuse that entry rather than re-declaring its href. Coach is not, and
should **not** be added to `TABS`: `TABS` drives the tab row, and Coach must not appear there.
Give it a small local `{ href: 'cone/', lockable: false }` descriptor, or pass `hrefFor` the pieces
directly — either is fine, but Coach's `lockable` must be **false** so `?id=` is not appended to an
SPA URL that has no use for it.

⚠️ **`?box=` must survive every link** (CLAUDE.md `boxScope.js` rule) and **the scope stays
invisible** — no banner, no indicator. A visible indicator was built and reverted on 2026-07-19; its
silence is intentional.

### 3 · Timer's missing box scope

`Timer.jsx` has no `getBoxScope` import at all and passes no `box` prop, so **every link out of
Timer drops `?box=`**. Same one-line fix as the other public pages use:
`const [box] = useState(() => getBoxScope())`, then `box={box}` on each `<Nav>`.

### 4 · Decide `?from=tv` — record the call either way

`isNavHidden()` (`Nav.jsx:13-15`) returns true on `?from=tv`, and `tv/slides.jsx:78,594` build the
gym-wall QR that way. So **a QR-scanned Agenda has no nav at all** — no Timer, no Coach, no way back.

Two readings, and this plan does not pre-judge which:
- **Intentional** — the QR is a scan-and-log flow; chrome would just get in the way mid-class.
- **A fourth instance of this bug** — the user said "any public facing page", and this is one.

⚠️ **`Schedule.jsx:787` reuses `isNavHidden()` to zero the bottom padding**, so changing the nav's
visibility here has a layout consequence on the same page. If the call is "keep it hidden", write
that reason at `Nav.jsx:13` — right now the function explains *what* it does and not *why*.

### 5 · Out of scope, note only

`tv/slides.jsx:78,594` bake `${window.location.origin}/CrossFit-Apps/schedule.html` literally rather
than deriving from `import.meta.env.BASE_URL`. Same lines, unrelated bug (it breaks the QR under any
non-Pages base). **Don't fix it here** — file it if it isn't already tracked.

Also unchanged: `tv.html` and `recover.html` render no `Nav` at all. `tv.html` is deliberate (wall
display, CLAUDE.md records it as having no nav by design).

## Verification

Drive it against the seeded local stack (`supabase start` + `node scripts/seed-dev.mjs`), at **390
and 1280**. ⚠️ **Check for a stale service worker first** — `sw.js` scopes over the dev server and
serves precached prod assets with *no console error* (CLAUDE.md).

⚠️ **The Coach link will not work in local dev, and that is expected.** `href="cone/"` is relative:
on GitHub Pages `/CrossFit-Apps/me.html` → `/CrossFit-Apps/cone/`, which is correct. But `npm run
dev:public` and `npm run dev` are two servers on **different ports**, so `cone/` resolves to the
source directory on the public server, not the SPA (CLAUDE.md records this). **Verify the link is
present and correctly formed** (right href, `?box=` attached); do not chase its 404 in dev.

**The bug, in order:**
1. `me.html` at 390 → tap the pill handle → "Mais" sheet. Coach and Timer both present.
2. Pick an athlete. Re-open the sheet. **Coach must still be there** — this is the regression.
3. Navigate to Agenda from the tab row (its href now carries `?id=`), open the sheet: Coach present.
4. Repeat at 1280: Coach present in the desktop sidebar on `me.html` with an athlete selected.
5. Direct-load `schedule.html?id=<athleteId>` and `results.html?id=<athleteId>` → Coach present at
   both widths.

**Box scope:**
6. Load any page with `?box=<locationId>`, open the sheet, and inspect both tiles' hrefs — each
   carries `box=<locationId>`. Confirm Coach's does **not** carry `id=`.
7. From `timer.html?box=<locationId>`, confirm every nav link out now carries the box. Then clear
   `cone_box_scope` from localStorage and re-check, so you are testing the URL and not the cache.

**#53 regression:**
8. At 390 on `results.html`, count visible Timer entries: **exactly one** (in the sheet, not the
   bar). At 1280: one, in the sidebar. This is the check that #53 was not re-broken.

**Gates:** `npm test` · `npm run lint` · `npm run build:all` · commit + push.
`Nav` is gallery-rendered (`gallery/groups/shared.jsx:469`), so if the diff touches its markup,
finish with `npm run design:cards` and commit the regenerated cards.

Model: Sonnet · Size: S
