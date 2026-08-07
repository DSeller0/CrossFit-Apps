# 71 — #149 + #104(c) · The billing pair: extract and test `calcTotal`, then snapshot the rate

> ✅ Done: `pending` · 2026-08-06 — see BACKLOG.md
>
> ⚠️ **The plan's "drive the real thing" live-verification steps were not run** — Docker (needed
> for the local Supabase stack) wasn't available in the execution environment. Unit tests, lint,
> format and build all pass; run the Verification section's checklist against the local stack
> before treating this as fully proven in the browser.

*Planned 2026-08-05 alongside plans/69 and plans/70. **Not executed in that session** — its own
session. **Sonnet · S.** Tier 4 rank 5. Independent of 69 and 70.*

## Context

`calcTotal` — **the only money arithmetic in the app** — is an untested closure at
`publicador/events.jsx:647-658`, inside a **1630-line** `React.createElement` file.

It was **changed on 2026-08-05** by [plans/68](./68-tier3-closeout.md), twice, with **no test able to
pin either change**: #104(a) made `per_hour` bill fractional hours (a 90-minute class had been billed
as one hour flat, so the PDF disagreed with its own `fmtDur` two lines up), and #104(b) replaced a
single meaningless cross-currency grand total with per-currency subtotals. Meanwhile
`publicador/exportHelpers.js` — the file that exists *precisely* to hold this component's pure helpers
— has no test file either.

[reviews/2026-08-05-full-pass.md](../reviews/2026-08-05-full-pass.md) found the reason those two could
ship unpinned and filed it as **#149**. **#104(c) (retroactive rates) rides this row rather than
preceding it**: a rate snapshot is arithmetic layered on arithmetic, and putting it on top of an
untestable function is exactly how (a) and (b) got shipped unpinned in the first place.

## Findings that shape the plan (measured 2026-08-05)

- 🔑 **`calcTotal` closes over NOTHING.** It lives inside `ReportModal` (`:569`), whose scope holds
  `locations`, `coach`, `gymCfg` and 15 `useState` pairs — but its body references **only its two
  parameters** (`evs`, `loc`) and `ev.durationMin` / `loc.rate` / `loc.rateUnit` / `loc.currency`.
  **The extraction is a cut-and-paste plus an `export`**, with zero call-site rewiring beyond an
  import. Its neighbours `filteredEvents` (`:591`, 8 state values), `groupByLocation` (`:616`) and
  `generatePDF` (`:669`, everything) are genuinely entangled and are **not** candidates.
  `fmtDate` (`:640`) and `fmtDur` (`:644`) are also closure-free, and `fmtDur` is load-bearing on
  #104(a)'s correctness comment — move the pair with it.
- 🔴 **#104(b) fixed the PDF only.** `events.jsx:1570-1585`, the **on-screen preview** grand total,
  still does the pre-#104(b) naive sum: `if (t) acc += t.total`, with **no currency key and no
  currency label at all**. So a report mixing `R$` and `US$` prints a correct per-currency footer in
  the generated PDF and a meaningless unlabelled number in the modal directly above it. This is the
  class of defect #149 exists to prevent, and a shared `sumByCurrency` fixes it **by construction**.
- 🔴 **`exportHelpers.js` cannot be tested as-is.** Line 6 reads `window.SpeechRecognition` at
  **module-evaluation time**; `vite.config.js` sets `environment: 'node'` with no `setupFiles`; and
  **jsdom is not a devDependency**. So `import … from './exportHelpers.js'` throws `ReferenceError:
  window is not defined` before any test runs — and ESM import hoisting makes the repo's existing
  workaround (assigning `globalThis.document`/`localStorage` in `beforeEach`, per `theme.test.js` and
  `storage.test.js`) useless here, because the module body evaluates first.
- **`calcTotal` is at `:647-658`**, not `:651` as the row says. `events.jsx` is **1630** raw lines
  (the row is exact); `exportHelpers.js` is **122**.
- **Four call sites**, all inside `ReportModal`: `:736` (PDF summary table → feeds `grandTotals` and
  the "Valor" cell), `:823` (PDF per-group detail → the italic subtotal **and the Pix QR amount**),
  `:1475` (on-screen preview row → the gold per-group amount + preview Pix payload), `:1581`
  (on-screen preview grand total).
- ⚠️ **The `locForCalc` resolution differs between call sites.** `:731-735`, `:818-822` and
  `:1576-1580` use `athGroup2 ? find(personal loc) : loc`; **`:1468-1474` inverts it** to
  `loc || (athGroup ? find(…) : null)`. Equivalent today **only** because an `__ath__`-prefixed key
  can never match a `uid()`-generated `location.id` — which nothing asserts.
- **The rate lives on a location row**, not on a service or on `coach_profile` ("Serviço" in the UI
  *is* a location row): `{ id, name, type:'box'|'personal', color, rate:number,
  rateUnit:'per_session'|'per_hour', currency:string, coachName, athleteIds[] }`. **One rate per
  location, full stop** — a `personal` location's rate is shared by every athlete in its
  `athleteIds[]`, so two athletes at different prices means two location rows. `currency` is a
  **free-text input** with no validation (`Servicos.jsx:183-195`), so `'R$'` and `'R$ '` are distinct
  buckets in any per-currency grouping.
- **An event carries no rate/currency field of any kind.** It reaches its rate two different ways:
  `type:'aula'` → `ev.locationId` → `locations.find(l => l.id === …)`; `type:'personal'` → **no
  `locationId`**, reverse-looked-up from the athlete via `l.type === 'personal' &&
  l.athleteIds.includes(athId)`.
- **`Servicos.jsx` contains zero billing arithmetic** — `rateLabel` (`:793-796`) is display-only.
  Its writes go straight from the mutators (`saveLoc`/`deleteLoc`/`toggleAthlete`) per CLAUDE.md's
  "a load/read path never writes" rule; **any rate change must preserve that shape** — no `useEffect`
  on `locs`.

## Decision taken (user, 2026-08-05): snapshot on the event, history deferred

**#104(c) is an event-level rate SNAPSHOT, not a versioned rate history.**

The alternative considered and deferred: `loc.rateHistory = [{rate, rateUnit, currency, from}, …]`
resolved by the event's date. It is the only thing that can **re-price events already booked** —
which a snapshot categorically cannot — but it reaches into `Servicos.jsx`'s `saveLoc`/`startEdit`/
`rateLabel` and every rate reader, and puts date-resolution logic into a tab that has none today.

🔑 **The versioned-history half is deferred to that tab's own design pass (#59, Agenda/Publicador)**,
and must be recorded as a **code comment at the snapshot site** plus an Icebox row — not dropped.

## Scope

**New:** `src/components/tabs/publicador/billing.js` + `billing.test.js`.
**Changed:** `src/components/tabs/publicador/events.jsx`.

## Approach

### 1. `billing.js`, NOT `exportHelpers.js` — deliberately contradicting the row's wording

#149 says *"extract into `exportHelpers.js` and test them there"*. **Do not**, for the hard technical
reason above: that module throws on import under vitest. Landing there would mean guarding line 6 with
`typeof window !== 'undefined'` or adding a `vi.hoisted` shim — i.e. touching a browser global to make
a money module testable.

A **dependency-free money module gets a genuinely clean test**. `billing.js` imports nothing: no
React, no client, no storage. **Record this reasoning in the file's header comment** so a future
session doesn't "correct" it back.

### 2. Move `calcTotal` (+ `fmtDur`, `fmtDate`) verbatim, then export

Pure cut-and-paste; the four call sites gain an import and change nothing else. Keep #104(a)'s
explanatory comment with the code it explains.

### 3. Invent `sumByCurrency` — the one real refactor here

#104(b)'s reduction is **welded inline** into `generatePDF`'s `forEach` (`:714-754`: `grandTotals`
accumulated at `:738`, then `grandCurrencies`/`grandLabel` derived at `:751-754`), so this is a small
genuine extraction, not a move:

```js
sumByCurrency(groupTotals) → { totals: {[currency]: number}, currencies: string[], label: string }
```

**Both** the PDF footer (`:751-754`) and the on-screen preview total (`:1570-1585`) adopt it — which
closes the live bug in finding 2 by construction rather than by a second hand-written fix.

### 4. Pin the behaviour that shipped unpinned

Tests must cover the edges nobody has asserted, and pin **current** behaviour rather than improve it:

- `per_hour` · `durationMin: 90` → **1.5h**; `30` → clamped to **1h** (`Math.max(1, …)` is
  deliberate — a sub-hour session bills an hour minimum); `0` → falls to `|| 60` → **1h**; missing →
  same.
- `per_session` ignores `durationMin` entirely.
- `rate: 0` short-circuits to **`null`** at `:648`, so a genuinely free service yields *no total row*
  rather than a zero. **Pin the current behaviour and flag it as arguably wrong — do not change it
  here.**
- `sumByCurrency` with one currency, with two, with `'R$'` vs `'R$ '` (the free-text hazard), and
  with an empty set.

⚠️ **Normalise the `locForCalc` precedence inversion at `:1468-1474`** to match the other three sites
while you are in the file, and pin it.

### 5. #104(c) — the snapshot

At booking time write `ev.rateSnapshot = { rate, rateUnit, currency }` in `EventFormInner`'s save
(`events.jsx:32-52`), resolved from `selSvc` (`:22`) for `aula` and from the personal reverse-lookup
(`:210-212`) for `personal`.

🔑 **`calcTotal`'s reduce is already per-event**, so the change is `ev.rateSnapshot ?? loc` **inside**
the loop body — which means the per-group return `{ total, currency }` becomes ill-defined for a mixed
group and must return per-currency buckets: **exactly the `sumByCurrency` shape step 3 already
builds.** The two changes want the same primitive; that is why they are one plan and not two.

Three things the plan must not lose:

- ⚠️ **`events.jsx:803`** — the per-event PDF "Valor" cell — reads `loc.rate` **directly** and would
  silently disagree with a snapshot-aware total. Change it in the same pass.
- ⚠️ **The fallback-to-live-rate path is permanent**, not transitional: every existing event has no
  snapshot. Test it explicitly.
- ⚠️ **Recurrence:** `events.jsx:38-51` clones one `base` into N dated events, so all N freeze
  *today's* rate even for dates months out. That is defensible — it is the quoted price — but **state
  it in a comment** rather than leaving it implicit.

### 6. Record the deferred half at the snapshot site

A comment naming what a snapshot **cannot** do (re-price events booked before it shipped), what would
(`loc.rateHistory` resolved by event date), and where that belongs (**#59**, the Agenda/Publicador
design pass). **Also file the Icebox row** — the comment is the handoff, the row is what puts it on
the board.

## Acceptance

- `billing.js` exports `calcTotal`, `sumByCurrency`, `fmtDur`, `fmtDate` and **imports nothing**.
- `billing.test.js` pins every edge in step 4, including both #104(a) and #104(b)'s 2026-08-05
  changes, which have no test today.
- The on-screen preview grand total and the PDF footer produce the **same** per-currency label for the
  same report — verified on a report mixing two currencies.
- A newly booked event carries `rateSnapshot`; an event booked before this ships still prices via the
  live rate; the PDF's per-event "Valor" cell agrees with the total in both cases.
- `events.jsx`'s four `calcTotal` call sites all resolve `locForCalc` the same way.
- The deferred rate-history handoff exists both as a code comment and as a board row.
- `npm test` green · `npm run lint` **clean at `--max-warnings 0`** · `npm run build` clean.

## Verification

**Test conventions — match the repo exactly:** colocated as `<subject>.test.js` (**never `.test.jsx`**
— `vite.config.js` includes only `src/**/*.test.js`); `import { describe, it, expect } from 'vitest'`
first, then the subject with an **explicit `.js` extension**; one flat top-level `describe` per
exported function; test names as full lowercase sentences describing the *invariant*; a 3–8 line
header comment naming the row and stating what the tests pin. **Follow
`resultados/resultadosHelpers.test.js`** — same story (pure functions extracted out of a large tab,
tests pinning existing behaviour) and it uses **`it`**, not `test`. ⚠️ The repo is genuinely split 6
`it` / 14 `test`, so pick by proximity, not by majority.

**Then drive the real thing** (local stack, `npm run dev`):
- Create two locations with **different currencies** and events against both; generate a Relatório and
  confirm the on-screen preview total and the PDF footer now agree and are both labelled.
- Book a new event → confirm `rateSnapshot` is written (check the `events` blob in Studio).
- Change that location's rate in Serviços, regenerate the report → the new event holds its snapshot
  price; a **pre-snapshot** event re-prices at the new live rate (the documented, tested fallback).
- Confirm the Pix QR amount (`:832-871`) and the per-event "Valor" cell still match the group subtotal.

Update **CLAUDE.md's test inventory line** (748 tests / 21 files, re-measured 2026-08-05) with the new
counts.

## Risks

1. 🟠 **`currency` is free text** — `'R$'` vs `'R$ '` are different buckets. `sumByCurrency` should
   key on the raw string (pin current behaviour), but the test should *document* the hazard; trimming
   is a behaviour change and belongs to the Serviços design pass with the rest of the input work.
2. 🟠 **`generatePDF` is a large async closure** — extracting `sumByCurrency` must not disturb the
   `summaryRows` build it shares a `forEach` with.
3. 🟡 **`events.jsx` is `React.createElement`, not JSX**, and CLAUDE.md records that as deliberate so
   #59's rewrite is the *first* JSX pass over this markup. **Do not convert anything here.**

## Docs (part of Done)

`CLAUDE.md` — the test inventory line. `BACKLOG.md` — #149 → Done, **#104 closes fully** (it stayed
open for (c) only), plus the new deferred-rate-history Icebox row pointing at #59. This file gets its
`> ✅ Done: <commit> · <date>` marker.

Model: **Sonnet** · Size: **S**
