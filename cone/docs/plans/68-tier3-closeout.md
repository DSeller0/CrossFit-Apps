# 68 — #89 + #97 + #114 + #104(a)(b)(d) + #71 · Tier 3 closeout

*Planned 2026-08-05 alongside [plans/67](./67-per-box-theme.md). **Not executed in that session** —
its own session.*

🔴 **This is the last Tier 3 plan.** The five rows below are everything left in the housekeeping
program after plans/63–67. They are batched into one plan **at the user's request** and each stays a
separate row on the board. Step 6 — a full `/app-review` pass — is part of this plan, not a follow-up:
it is the gate that closes Tier 3 and produces Tier 4's run order.

Batching is safe here because the five touch five disjoint areas (`Schedule.jsx`/`Results.jsx` ·
`tv/` · `gallery/` · `publicador/events.jsx` · `class_checkin`) and none blocks another. Every claim
below was re-verified against live code 2026-08-05 — **several backlog line numbers were stale and the
corrections are recorded inline.** Do not re-derive them from the board.

---

## 1 — #89 · the index's session links don't open the session

**Widened 2026-08-05** beyond the original row, which covered only the Agenda button: the user reported
the same bug on the **Resultados** button and added a **"and on top"** requirement. One code path, one
row.

`rail.jsx:94-95` (the row says `:59` — stale):
```js
const agendaUrl = `schedule.html?date=${sess._dk || ''}&session=${encodeURIComponent(sess.id)}${qs}`
const regUrl    = `results.html?session=${encodeURIComponent(sess.id)}`
```

**(a) `Schedule.jsx` never reads `session`.** It reads 8 params — `checkin` (`:108`), `id` (`:118`),
and `date`/`openLog`/`blockId`/`athlete`/`prefill`/`prefillRounds` (`:241-246`). *(The row says the
handling is at `:164-166` and counts 6 — both stale; 6 counts only the `sp` block.)* `date` does
exactly one thing, `:250`: `setWeekOffset(dateToWeekOffset(pDate))`.

🔴 **The real symptom is worse than the row's "falls back to the day's first session".** The
today-autoselect effect (`:143-158`, the row says `:103-109`) is guarded on **`weekOffset === 0`**, so
an off-week deep link makes `weekOffset !== 0` and the autoselect never fires — the page lands on the
right week with **nothing selected at all**.

Fix: read `sp.get('session')` beside `pDate`, `setSelSess({ dateKey: pDate, sessId })`, suppress the
autoselect when a deep link is present, and scroll to top.

**(b) `Results.jsx` does read it, and mostly works** (`:170-180` expands the session and sets
`selWod`). Two gaps against "on top": `:219-230` scrolls with `block: 'nearest'`, and there is no
`scroll-margin-top` for the sticky `Header` (`Header.module.css:1-7`, `top:0`), so `'start'` would slide
the card under it. Fix both.

**(c) `regUrl` drops `date` and `box`** while `agendaUrl` carries them. Results recovers the scope from
`getBoxScope()`'s localStorage fallback (`Results.jsx:96`) — i.e. **by accident**, not from the link.
Add both, so a shared link works for someone who has never set a scope.

---

## 2 — #97 · the TV timer ring is frozen to the dark palette

Public-facing, on the gym wall, wrong in both light themes. The Tier 3 row's line numbers are exact;
the Icebox row's (`:38-40`, `:227`) are stale.

| Site | Literal | Token |
|---|---|---|
| `tv/slides.jsx:50` | `#48b860` | `--green` |
| `tv/slides.jsx:51` | `#d8a840` | `--gold` |
| `tv/slides.jsx:52` | `#c84038` | `--red` |
| `tv/slides.jsx:309` | `#4878d8` (resting ring) | `--blue` |
| **`tv/slides.jsx:354`** | `#c84038` on the SVG **`stroke` attribute** | ⚠️ not named by the row |
| **`tv/slides.jsx:363`** | `#c84038` in an inline **`color`** | ⚠️ not named by the row |
| `TV.module.css:141` | `background:#c84038` beside a `color: var(--cream)` | half-tokenized on one line |
| `TV.module.css:147-149` | `rgba(200,64,56,…)` ×3 in `@keyframes countdownPulse` | same red, third form |

Use **#85's method**: colour via the CSS `stroke`/`background` **property** with a `var()`, which
resolves where an SVG *attribute* can't, and needs no per-tick `getComputedStyle`. `:354` is exactly the
site that method exists for.

🔴 **Resolve a live contradiction before writing code.** `TV.module.css:137-140` carries a comment
arguing the **opposite** of the backlog row — it calls `#c84038` a data colour, exempt from
tokenization, on the grounds that *"tokenizing to `var(--red)` would drift the pill from the ring on
light themes."* That argument dissolves once the ring is tokenized too (they drift only while one side
is frozen), but the comment must be **updated or refuted in the commit**, not silently overwritten.
Note also that plans/65 moved `--red` on both dark themes, so the pill's current literal no longer
matches `var(--red)` anywhere.

**Out of scope, deliberately:** `TV.module.css:14`'s `background:#000` on the blank slide
("screen-off on every theme" — intentional), and `slides.jsx:65-66`'s `'#f0e8d0'`/`'#0d0b09'`, which
are **fallbacks after a `getComputedStyle` read**. Also present but unnamed by the row:
`slides.jsx:278`'s `bColor` default `'#d8a840'` — decide it explicitly.

---

## 3 — #114 · `design:cards` isn't idempotent day-to-day

⚠️ **The row says "two gallery fixtures". It is materially larger, and it misattributes one file.**
Verified 2026-08-05.

**In the fixtures:**
- `gallery/groups/index.jsx:22` — `new Date()`. The only literal one, and the only one the row names.
- `gallery/groups/index.jsx:14` — `getWeek(0)`, which reads `new Date()` at `week.js:81`. This drifts
  the **whole grid**, not just the highlight.
- `gallery/groups/index.jsx:16-21`, `:28`, `:32` — session keys derived from `idxWeek`.
- `gallery/groups/criador.jsx:127` — `getWeek(0)`, feeding `WeekImportModal` at `:334`/`:352`.

🔴 **Pinning the fixtures is NOT sufficient.** The components read the clock themselves:
- `index/rail.jsx:38` — `todayISO()` inside `WeekGrid`; `:78` — `dayTitle()` appends `' — Hoje'`.
- `index/rail.jsx:40` — `(dates || getWeek(0))`, and the gallery renders `WeekGrid` with **no `dates`
  prop** (`gallery/groups/index.jsx:106`, `:112`), so the card's day numbers come from the wall clock
  regardless of what the fixture says.

**The `26 Jul → 27 Jul` drift is `me/BodySheet.jsx:42`** (`new Date().toISOString()`), rendered at
`gallery/groups/me.jsx:288` — **not `HeroCard`**, which contains no date read at all and whose fixture
`mePd` is already pinned. Correct the row when closing it.

`scripts/build-design-cards.mjs` has no `Date` reference and no clock mock, so there is no harness-level
pin to lean on — decide between passing explicit props from the fixtures (preferred: it fixes the
components' *testability*, not just the cards) and freezing the clock in the build script.

---

## 4 — #104 (a)(b)(d) · billing

⚠️ **The row says "all in `Servicos.jsx` / `publicador/events.jsx`". `Servicos.jsx` contains no billing
arithmetic at all** — only the rate form and a display-only `rateLabel` (`:793-796`). All line numbers
below are 2026-08-05; every one in the row is stale.

**(a) `per_hour` truncates** — `publicador/events.jsx:651-653` (row says `:213`):
```js
const hrs = loc.rateUnit === 'per_hour' ? Math.max(1, Math.floor((ev.durationMin || 60) / 60)) : 1
```
A 90-minute class bills as **one hour**. Note `fmtDur` two lines above (`:645-647`) renders "1h30min"
correctly — so the PDF already prints 1h30 of time next to 1h of money.

**(b) mixed-currency grand total** — `events.jsx:714` declares `grandCurrency`, `:733-736` overwrites it
unconditionally per group, `:751` prints it. Two locations with different `currency` strings sum into
one meaningless number. Decide: per-currency subtotals, or refuse to total across currencies.

**(d) `pixClean` duplicated byte-identical** — `utils/pix.js:12-17` (module-private) and
`publicador/exportHelpers.js:7-12` (exported). `events.jsx:6` imports the exportHelpers copy while
`pix.js:20` uses its own. Collapse to one; `pix.js` is the natural home.

**(c) stays in #104** — retroactive rates (`calcTotal` reads the location's *current* rate, so
regenerating February's report in July bills February at July's price) is a feature needing a rate
snapshot or rate history, not a bugfix.

Worth folding in while here: `pix.test.js` (13 tests) validates the CRC's **format** but never against a
known-good reference payload, and asserts none of the EMV field truncations (25/15/72/25).

---

## 5 — #71 · `class_checkin` guest branch

🔑 **The decision this row was blocked on was taken by the user 2026-08-05. Do not re-litigate it.**

The athlete branch guards with `IF NOT (v_athlete_ids ? p_athlete_id)`; the guest branch appends
unconditionally (`0003_anon_write_rpcs.sql:43-46`). Five taps → five `"Fulano"` on the gym-wall roster,
and `anon_names` is an unbounded, anon-callable JSONB.

**Resolution — a cap plus a name-collision prompt, never blind dedupe** (two real guests can share a
first name and both must survive):

- **Server:** new migration `0008` recreating `class_checkin` with `anon_names` **capped at 20**.
  ⚠️ Preserve `SECURITY DEFINER`, `SET search_path = ''` (`:23-24`), the `anon, authenticated` grants
  (`:51`) and the `REVOKE UPDATE … FROM anon` (`:53`).
- **Client:** before submitting, read the class's existing `anon_names` (`class_executions` is
  anon-readable via `ce_select_anon`) and compare the typed name. On a match, open a **confirmation
  modal in the `ConfirmReview` family** — the same shape the athlete already meets when registering a
  result — asking the guest to distinguish themselves and **suggesting an initial derived from what
  they typed**: *"Fulano da Silva"* → *"Fulano S."*. They can accept the suggestion or type their own.
- **Reuse `normExName`** (`public/lib/registry.js`) for the comparison rather than writing a third name
  normalizer — it already does trim/casefold/accent-strip/whitespace-collapse.
- **Add the missing re-entrancy guard.** `submitCheckin` (`Schedule.jsx:172-183`) has no
  `if (checkinSubmitting) return` early-return; `submitLog` (`:588`) has had the #50 guard since then.
  The `disabled` prop on `CheckinSheet.jsx:94-99` is not a substitute — it doesn't survive a same-tick
  double-fire, and a reload re-arms the whole flow.

⚠️ **BACKLOG:319 records that #102 absorbs #71** — its migration recreates this same RPC. Record in the
Done entry that **`0008` is now the baseline #102 must build on**, so #102 doesn't reintroduce the
uncapped version.

---

## 6 — Full `/app-review` pass, then Tier 4

Run the portable `/app-review` skill over the whole app → `docs/reviews/2026-08-<dd>-full-pass.md`,
same shape as `reviews/2026-07-04-full-pass.md`. Then:

- audit every Tier 1–3 row and confirm it really is closed (⚠️ the board has twice carried **stale
  open markers** — #125 and #131 both read as available picks after shipping; check, don't assume);
- file the review's findings as new rows;
- re-rank the icebox into a **Tier 4 run order**, and confirm **#95** is genuinely plannable cold, which
  is what the board claims makes it the first design-program pick.

---

## Acceptance

- Tapping either index button opens that session, expanded, at the top of the target page — including
  on a different week and from a link opened with no prior box scope.
- No hardcoded ramp colour left in `tv/slides.jsx`; the countdown pill and the ring agree in all 4
  themes; `TV.module.css:137-140`'s comment reflects reality.
- `npm run design:cards` run twice on different days produces byte-identical cards.
- A 90-minute `per_hour` class bills 1.5×; a mixed-currency report no longer prints a single total; one
  `pixClean`.
- Five identical guest taps produce one roster entry with an explicit disambiguation prompt; `anon_names`
  cannot exceed 20.
- `npm test` · `npm run lint` clean at `--max-warnings 0` · `npm run build:all` · `npm run format`.

## Verification

**Live**, local stack, at 1280 and 390 (clear the service worker first):

1. index → Agenda **and** Resultados, for a session **on a past week** and a **multi-session day**.
2. `tv.html` on all 4 themes, timer running through green → gold → red, plus the resting ring and the
   countdown pill.
3. `npm run design:cards`, `git diff` → empty. Then again with the system clock moved a day.
4. A `per_hour` location with a 90-minute event, and a report spanning two currencies.
5. Guest check-in: tap Confirmar 5× fast; then a genuine second guest with the same first name.
6. TV controller roster reflects both.

## Ritual

BACKLOG: Done entry; close #71, #89, #97, #114, and #104's (a)(b)(d) — **#104 itself stays open for
(c)**. Done marker on this plan. The review's own findings get filed as new rows. Commit + push.

Model: Sonnet (steps 1–4) · Opus (step 5's modal + step 6's review) · Size: L
