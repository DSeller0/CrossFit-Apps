# 07 — Quick-wins batch (#33 · #11 · #13 · #9 · #12)

> ✅ Done: e943716 · 2026-07-03 — see BACKLOG.md "Done (recent)" for the shipped summary. #33's rounding rule was corrected pre-implementation (round-down to half-hour, not nearest-hour — see plan history); code review (8-angle, medium effort) caught one real CLAUDE.md violation (countdown badge `border-radius` on a public page — fixed) and one real staleness bug (`classLabel` never refreshed across multiple classes — fixed).

## Context
Five small, independent S items batched into one session for momentum after three infra/security-heavy sessions (#4, #7, #34). Each touches a different file, so they don't interfere. Four are pure code/behaviour; **#12 alone needs a mockup-first design card** (new visual element) — do that card at the top of the session and gate #12's code on approval, so the other four can ship regardless of design iteration.

Model: Sonnet · Size: S each (batch ≈ M). Order below is low-risk → design-gated.

---

## #33 — Turma default-name auto-fill
**What:** `useClassTracking.js:6` defaults `classLabel` to plain `'Turma'`; default instead to `Turma_HH:MM` rounded **down to the nearest half-hour** — minutes 00–30 → `:00`, minutes 31–59 → `:30`, hour never changes (09:25 → `Turma_09:00`; 19:32 → `Turma_19:30`; 10:05 → `Turma_10:00`).
**Files:** [src/hooks/useClassTracking.js](../../src/hooks/useClassTracking.js)
**Approach:** add a small helper and use it as the `useState` initializer:
```js
function defaultTurmaLabel(d = new Date()) {
  const mm = d.getMinutes() <= 30 ? '00' : '30'
  return `Turma_${String(d.getHours()).padStart(2, '0')}:${mm}`
}
// ...
const [classLabel, setClassLabel] = useState(defaultTurmaLabel)
```
Computed at mount (controller is opened near class time; field stays editable). Hour is never bumped, so there's no midnight-wrap edge case. Keep the `classLabel.trim() || 'Turma'` fallback at `startClass` (line 32).
**Verify:** open TvController → the turma name field pre-fills `Turma_HH:00` (minute ≤ 30) or `Turma_HH:30` (minute ≥ 31). Optional: add a unit test for `defaultTurmaLabel` (pairs with backlog #23) — fixed `Date`s for :00→`:00`, :25→`:00`, :30→`:00`, :31→`:30`, :59→`:30`.

## #9 — Round-counter tap-flash fix
**What:** on mobile, tapping LAP repeatedly selects/flashes the adjacent "RD N" text blue (native text-selection / tap highlight). Round/clock text has no `user-select` guard.
**Files:** [src/public/timer/Timer.module.css](../../src/public/timer/Timer.module.css) (`.ringInner` ~L44, or the `.clock`/`.round`/`.clockLbl` trio ~L47-51)
**Approach:** the timer display text is never meant to be selectable — add to `.ringInner` (wraps clock + label + round counter):
```css
user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
```
**Verify:** dev server + mobile emulation (or a phone) on timer.html, start a For Time, tap LAP rapidly near the round counter → no blue selection/highlight flash. Confirm text is still readable and the ring/clock unaffected.

## #13 — tv.html outbound links hide nav
**What:** pages reached via a QR/link from tv.html should hide the bottom/side nav so a scanned-in athlete stays focused on check-in/logging. Nothing reads `?from=tv` today — add both ends.
**Files:** [src/public/Nav.jsx](../../src/public/Nav.jsx) (honor the param) · [src/public/tv/TV.jsx](../../src/public/tv/TV.jsx) (emit it — `QrFooter` base ~L58, `QrSlide` base ~L407)
**Approach:**
- Nav: early-return `null` when `new URLSearchParams(window.location.search).get('from') === 'tv'` (central — every page that mounts Nav honors it with one change).
- TV: append `&from=tv` to both QR URL builders (they both point at `schedule.html?date=…&session=…`).
**Verify:** `schedule.html?date=…&session=…&from=tv` renders with no nav; the same URL without `from=tv` still shows nav. Scan/inspect a TV QR → URL carries `from=tv`. Sanity-check the page has no awkward empty gap where the fixed nav was (schedule reserves `padding-bottom` for it — confirm it looks fine, trim if needed).

## #11 — Reposition Sets/Reps before exercise name (Criador)
**What:** in the Criador exercise editor, put the Sets + Reps number inputs **before** the exercise-name text field, matching how coaches think (quantity first).
**Files:** [src/components/tabs/Criador.jsx](../../src/components/tabs/Criador.jsx) — TWO editor render paths that must stay in sync: the inline editor (name ~L556, sets ~L565/576, reps ~L582) and the sheet/expanded editor (name variant + sets ~L629/645, reps ~L654 with `sheet-qty-lbl`). Leave complex-movement rows (~L479-485, per-movement name+reps) as-is — out of scope.
**Mockup:** trivial reorder — an ASCII in this plan is enough calibration (no design card needed):
```
before:  [ Nome do exercício............ ]  [Séries] [Reps]
after:   [Séries] [Reps]  [ Nome do exercício............ ]
```
**Approach:** move the sets/reps input group ahead of the name `<input>` in both variants; adjust the flex row so the name still flexes to fill and the two number inputs keep their fixed width. Check any `sheet-qty-lbl`/row CSS still aligns.
**Verify:** dev server, Criador → add a block → exercise row shows Séries + Reps then Nome, in both the inline row and the expanded sheet; @390px and @1280px both align; existing saved sessions still load/edit correctly.

## #12 — TV timer slide: final-10s countdown pill  ⚠️ design-gated
**What:** on the TV timer slide, when the capped count-up is within its last 10s (`cap − elapsed ≤ 10`), show a counting-down pill (10→1). Not during AMRAP (its ring already counts remaining down).
**Files:** [src/public/tv/TV.jsx](../../src/public/tv/TV.jsx) `TimerSlide` (~L209-243) · `TV.module.css` (new `.countdownPill`) · new design card `cone/design/tv-countdown-pill.html`
**Mockup FIRST (mandatory — new visual element):** ASCII → `cone/design/` card (inline CSS, `<!-- @dsCard group="TV" -->`) → DesignSync to "Cone Design System" → approve, THEN implement. Open design questions to settle in the card:
- Placement (overlaid on the ring vs. a pill above/below the clock) and whether the big ring clock also turns red/pulses.
- EMOM: include the per-minute last-10s, or For Time / Benchmark / Estações only? (Recommend For-Time-family only to start; EMOM already shows seconds-to-next-minute.)
**Approach (after approval):** in `TimerSlide`, `const remaining = cap - e; const showCountdown = !isResting && bt !== 'AMRAP' && bt !== 'EMOM' && cap && remaining > 0 && remaining <= 10` → render `<div className={s.countdownPill}>{Math.ceil(remaining)}</div>` per the approved card. Reuse existing `e`/`cap`/`bt`; the 250ms tick already re-renders.
**Verify:** drive tv.html on the local stack with a short cap (e.g. push a For Time with a 15s cap), watch the pill appear at 10s and count to 1, then `TIME!`; confirm it does NOT appear for AMRAP.

---

## Batch verification / gate
- `npm test` green (add the optional `defaultTurmaLabel` unit test if done).
- `/code-review` on the batch diff before pushing (M-sized batch).
- No `/security-review` needed (no RLS/auth/user-input-rendering surface).
- Commit + push. #12 may land in a follow-up commit if its design card needs iteration — ship the other four rather than block on design.
