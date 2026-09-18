# 90 — Quick-wins batch (#183 · #180 · #189 · #193 · #200)

> ✅ Done: `6dcc7da` · 2026-09-18 — see BACKLOG.md · closes #183, #180, #189, #193, #200.
>
> **Deviation on #200 — Approach step 1 as written would have been wrong.** It says to swap
> `Date.now() - 95000` for a fixed epoch minus 95 s. But `slides.jsx:38-41`'s `elapsedSecs` computes
> `Date.now() - timer_started_at` itself, so *any* `timer_started_at` makes the ring read the wall clock;
> a fixed epoch makes "elapsed" years, `isFinished` flips true, and the card changes from `01:35` to
> `TIME!` while still passing "two runs, no diff". Shipped instead: the case is a **paused** state
> (`timer_started_at: null`, `timer_paused_elapsed: 95`), which `TimerSlide` draws identically — the only
> running-vs-paused difference is the live 250 ms tick, and SSR never runs effects. `tvTimerRunning` →
> `tvTimerAt95s`; the case label no longer says "rodando".
>
> **The acceptance test was too weak, so it was strengthened.** "Twice in a row → no diff" also holds for
> anything that drifts once a day. Regenerating with the system clock shifted +40 d 7 h changes exactly two
> things: `README.md`'s `regenerated <date>` stamp (deliberate) and `afiliados.html`'s "enviada" date
> (`afiliados.jsx:193`'s `Date.now()`, deliberate too — filed **#202**). `tv.html` is identical across the shift.
>
> **Also in the diff, not in the plan:** `DSHORT` (`utils/config.js`) deleted — `WeeklyExportView` was its
> last importer; `exportHelpers.test.js` loses its `vi.mock` of `utils/storage` (importing without it is now
> the guard); `publicador.html` moved by two `--a-*` props that #195a's commit never regenerated; the other
> 14 changed cards are purely the 12 deleted classes leaving the inlined CSS bundle.
>
> **Verified live against HEAD, not just built:** #180 — with a session of two real results + one "não fez"
> (intercepted network), HEAD's caption read `3 resultados`, now `2`. #189 — holding a card's DOM node across
> three keystrokes: destroyed on HEAD, same node after. Publicador — all five formats render and produce a
> real html2canvas PNG (965 KB · 1.4 MB · 543 KB · 913 KB · 2.5 MB), 0 page errors; gallery — all 12
> Publicador items render. Filed **#203**: the session card's `countFor` still says `3` beside the ranking's `2`.

> Five XS rows, batched on the [plans/79](./79-post-162-cleanup.md) / [plans/84](./84-blockers-batch.md)
> precedent: small rows ship safely together when **none blocks another**. Every one was
> re-verified against the current tree on 2026-09-14 before this plan was written — two of the five
> board rows needed correcting as a result, noted per row below.

## Context

All five come from the [2026-09-05 full pass](../reviews/2026-09-05.md) except #200, filed during
[plans/87](./87-new-themes.md). Two are user-visible defects, three are hygiene with a real cost.

- **#183 — `WeeklyExportView` is dead code.** `exportViews.jsx:394-461`. **Verified: zero
  importers.** The only repo-wide matches are its own definition, two comments in that file, and a
  comment at `Publicador.module.css:867`; `MobileWeeklyExportView` is a different, live component.
  C5·b1 deleted the on-screen grid it fed and left the component. It is the sole consumer of 12
  classes / 16 rules at `Publicador.module.css:869-971`, which therefore read as **live** to any
  dead-CSS sweep — so this row's real cost is that it corrupts the evidence for #184. Pure deletion.
- **#180 — `index.html` counts skipped entries.** `index/Index.jsx:169` correctly filters `skipped`
  through `rankResults` for the podium, but `:170`'s `const n = blockRes.length` is taken from the
  **unfiltered** array and feeds the `"N resultado(s)"` caption at `:173`. An athlete marked
  *"não fez"* is counted as a result on the athlete landing page. Invariant 7's only gap.
- **#189 — `ExCard` is declared inside `ExerciciosTab`'s render body.** `Exercicios.jsx:411`,
  rendered at `:497` / `:529` / `:543` (container opens at `:107`). Its function identity changes
  every render, so React unmounts and remounts **the whole card grid** on every keystroke in the
  search box. No hooks inside, so no state is lost — the DOM churn and focus loss are real. The only
  in-render component definition in `src/`.
- **#193 — 5 gallery-rendered Publicador files pull the SPA Supabase client.** `exportHelpers.js:3`,
  `exportViews.jsx:4`, `mobileExportViews.jsx:4`, `publisher/PreviewPane.jsx:2`,
  `publisher/WhenPicker.jsx:2` all import `toISO` from `utils/storage` instead of
  `public/lib/week.js`. Dev-only (no production bundle contains both clients) but it is the same
  rule CLAUDE.md states for `WeekImportModal`, broken at five sites. One word each.
  ⚠️ `AgendaView.jsx:3` and `events.jsx:2` also import from `utils/storage` — **leave them.** They
  pull `loadLocations`/`getTargets`/`loadAthletes`/`loadCoach`, i.e. they are real client consumers,
  not a `toISO` slip.
- **#200 — `npm run design:cards` is not deterministic.** ⚠️ **The board row misattributes this.**
  It is **not** the Timer group — `gallery/groups/timer.jsx` renders only `BlockTypePicker`, which
  has no clock. The live read is **`gallery/groups/tv.jsx:216`**, `timer_started_at: Date.now() -
  95000`, feeding the `TimerSlide` progress ring at `slides.jsx:370`; the SSR bakes the resulting
  `stroke-dashoffset` into **`design/components/tv.html`** (`626.9749297222222` on the latest run).
  Every regeneration produces a one-line diff nobody intended, so a real card change hides in noise.

## Acceptance

- `WeeklyExportView` and its 12 CSS classes are gone; `grep -rn "WeeklyExportView" src/` matches only
  `MobileWeeklyExportView`. Publicador still exports all 5 formats.
- `index.html`'s caption counts only entries that survive the `skipped` filter. A session with one
  skipped and two real entries reads **"2 resultados"**.
- `ExCard` is a module-scope component; typing in the Exercícios search box no longer remounts the
  grid (React DevTools, or a `key`-stable DOM node check).
- Zero `utils/storage` imports remain in the 5 named files; `gallery.html` still renders the
  Publicador group.
- `npm run design:cards` run twice in a row produces **no diff**. This is the acceptance test.
- `npm test` + `npm run lint --max-warnings 0` + `npm run format:check` clean.

## Files

- `src/components/tabs/publicador/exportViews.jsx` (:394-461) · `publicador/Publicador.module.css`
  (:867-971) — #183
- `src/public/index/Index.jsx` (:169-173) — #180
- `src/components/tabs/Exercicios.jsx` (:411, hoist above :107) — #189
- the 5 import lines — #193
- `src/public/gallery/groups/tv.jsx` (:216) + regenerated `design/components/*.html` — #200

## Approach

Order matters in one place only — **#200 first**, so the end-of-session `design:cards` regeneration
is clean rather than carrying the very noise being fixed. The other four are independent.

1. **#200** — replace `Date.now() - 95000` with a fixed epoch constant. `gallery/groups/tv.jsx`
   already imports `FIXED_WEEK` from `../fixtures.js` and derives `SEL_DATE` from it (`:21`), so the
   fixture file is the natural home: add a fixed timestamp there and subtract the 95 s offset from
   it. Same `todayKey`-injection discipline `atletasHelpers` uses. Then regenerate and confirm the
   `stroke-dashoffset` is now stable across two runs.
2. **#183** — delete the component, then the 12 classes. Delete the CSS in the same commit: leaving
   it is what created the false-positive problem in the first place. Check the file-header comment
   at `exportViews.jsx:38` and the one at `Publicador.module.css:867`, both of which describe the
   deleted component — remove them too, don't orphan them.
3. **#180** — count from the filtered array. `rankResults` already returns it; take the length
   before `.slice(0, 3)` rather than re-filtering, so there is exactly one filter.
4. **#189** — hoist `ExCard` to module scope and pass what it closed over as props. Verify the
   closure list first; it is the whole risk in this row.
5. **#193** — repoint 5 imports to `public/lib/week.js`.
6. **Regenerate `design:cards`** and commit the cards (WORKFLOW: "Build artifacts are part of Done").

⚠️ **#192 is NOT in this batch.** Its sub-items were not re-verified at planning time and one of
them (`agendaHelpers.js:74`'s `toISO` fork) is adjacent to #193 — do them together and it becomes
unclear which change fixed what. It stays in Icebox as the natural follow-up.
⚠️ **#184 cannot be measured until #183 lands** — those 12 classes are its worst false positives.

## Verification

1. `npm test`, `npm run lint`, `npm run format:check`, `npm run build:all` — the four CI gates.
2. `npm run design:cards` twice; `git diff --stat design/` must be empty on the second run.
3. `npm run dev` → Publicador: export **all five** formats (#183 deleted a sibling of the live
   views — the guard is that nothing else regressed).
4. `npm run dev:public` → `index.html` on a day with a skipped entry; read the caption.
5. Exercícios: type in the search box and confirm the grid no longer remounts per keystroke.
6. `gallery.html` → Publicador group renders (#193's files are the ones it imports). ⚠️ The gallery
   is never built and **no CI gate can catch a broken import there** — open it.

Model: Sonnet   ·   Size: S
