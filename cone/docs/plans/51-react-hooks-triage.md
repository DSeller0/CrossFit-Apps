# 51 — #108 · React-hooks correctness cluster (the whole CI lint floor)

> ✅ **Done 2026-07-27** — `a19615e` (b1) · `030dee2` (b2) · `c3eeaad` (b3) · `f950140` (b4) ·
> `7163abe` (b5a Timer) · `24f6f10` (b5b Schedule) · `953e4e2` (b5c slides).
> **84 → 0.** The five rules are back on `error` in `eslint.config.js`, its explanatory comment
> block is replaced by the outcome, and `--max-warnings` is `0` — the finish line this plan named.
> Re-deriving the table first (as the warning below insisted) confirmed the plan's counts exactly:
> 84 total, same per-rule and per-file mix, only line numbers moved. Three of its predictions did
> **not** survive contact, all recorded in the batch commits: the `immutability` cluster needed
> neither of the two options the plan weighed (the rule identifies refs by a `Ref` name suffix, so
> renaming was the real fix); 3 of those 13 were browser-global assignments, not refs at all, and
> two became `location.assign()`; and `Publicador.jsx`'s finding was a worse bug than filed — the
> mobile preview also went stale on resize. **One item is deliberately left open** — see
> "Follow-up" at the bottom.

> Planned 2026-07-27, **Tier 2** of the housekeeping program. Run order:
> [49 prettier baseline](./49-prettier-format-baseline.md) →
> [50 taxonomy single source](./50-taxonomy-single-source.md) → **51 (this)**.
> ⚠️ Every `file:line` below was measured **before** plans/49's reformat. **Re-run
> `npx eslint . --format json` and re-derive the table before starting** — that is a 30-second command,
> and this plan's own row was corrected for quoting stale figures.

## Context

`npm run lint` reports **84 problems, 0 errors, 84 warnings** — and that is the *entire* CI lint floor.
plans/43 explicitly excluded this cluster: the mechanical half went to zero, and the react-hooks rules
were downgraded `error`→`warn` (`eslint.config.js:27-31`) so `--max-warnings 84` still gates without
blocking every unrelated commit. These 84 are the half that **can change behavior**, which is why they
need judgment rather than a sweep.

**Re-measured 2026-07-27 (the board's row was wrong):**

```
set-state-in-effect 22 · refs 20 · exhaustive-deps 17 · immutability 13 · purity 8 · static-components 4

Timer.jsx 14 · Schedule.jsx 12 · TvController.jsx 7 · slides.jsx 7 · RegistroView.jsx 6 ·
Exercicios.jsx 6 · ExerciseRow.jsx 3 · BlockEditor.jsx 3 · Publicador.jsx 3 · App.jsx 2 ·
AgendaView.jsx 2 · Results.jsx 2 · Criador.jsx 2 · Servicos.jsx 2 · + 13 files with 1 each  = 27 files
```

The #108 row says "concentrated in `Schedule.jsx` (26) and `Timer.jsx` (25)". **Wrong** — actual is
Timer 14 / Schedule 12 (their sum is 26, likely the source of the error). The total and the per-rule mix
are exactly right; the spread is 27 files, not two.

## The rule: classify before touching

Every finding gets one of three verdicts, written down:

- **real-bug** — fix it, and say what the user-visible symptom was.
- **benign-but-flagged** — the pattern is correct here; restructure only if the restructure is cheaper
  than the suppression.
- **suppress-with-reason** — `eslint-disable-next-line <rule> — <one line of why>`. Never a bare disable.

**Findings that overlap the effect-write class (#109/#111) are that class's shape, not a new one.**
plans/45 and plans/47 already fixed it twice: a mount-firing `useEffect` seeded from `useState(load…)`
state. Reuse their fixes (mount-guard `useRef`, or move the write to the mutators) — do **not** invent a
third pattern.

## What the findings actually are (spot-checked 2026-07-27)

Read this before batching — two of the row's assumptions do not survive contact.

- **`immutability` (13) is mostly the drag-ref-as-prop pattern, not state mutation.**
  `BlockEditor.jsx:106,118,119` and `ExerciseRow.jsx:150,161,162` are all `dragBlkIdx.current = …` /
  `dragIdx.current = …` **inside event handlers**, on a ref received as a prop (owned by
  `Criador.jsx:400`). "This value cannot be modified" is the rule objecting to a prop-carried ref being
  treated as mutable. Event handlers are the correct place to write a ref — this is one decision applied
  six times, most likely `benign-but-flagged`.
- **Two `immutability` findings carry a different message and are the interesting ones:**
  `useGroupRotation.js:38` and `Schedule.jsx:96` both report **"Cannot access variable before it is
  declared"** — a TDZ/hoisting shape, not a mutation. Read these two individually.
- **`refs` (20) is uniformly "Cannot access refs during render."** `Timer.jsx:98-101` is the documented
  *"mirror state to refs so tick (setInterval callback) always sees current values"* block — a deliberate
  latest-ref pattern that is genuinely unsafe under concurrent rendering, and whose correct fix (move the
  writes into an effect) **shifts timing in a running-clock component**. That is the whole argument for
  scheduling Timer last.
- **`Publicador.jsx:441`** (3 findings on one line) reads `previewWrapRef.current?.offsetWidth` during
  render to compute a preview scale. Real finding, and **the repo already contains the fix**:
  `Criador.jsx:87-94` measures its TV-preview pane with a `ResizeObserver` into state. Port that shape.

## Approach — five batches, safest first, each its own commit

Ratchet `--max-warnings` down in the **same commit** as each batch, so a landed batch is locked in and a
regression fails CI immediately.

**Batch 1 — `static-components` (4).** All in `Exercicios.jsx:602,603,604,616`: `BackBtn` (`:596`) and
`Footer` are components declared inside the component, so React remounts their subtree every render.
Cheapest correct fix is usually to make them plain render helpers (`{backBtn('Categorias')}`) rather than
hoisting and threading `goBack` through props — the rule only fires on components. *(`{VideoModal}`
`{SaveModal}` `{DeleteConfirm}` are elements, not components; they do not trip it.)* Zero behavior change,
no live-page risk. **Start here** — it proves the ratchet works before any judgment is spent.

**Batch 2 — single-finding hooks and leaf components (≈13).** `useIsMobile.js:11`,
`useClassTracking.js:22`, `useTvSync.js:8`, `useGroupRotation.js:38`, `ConfirmReview.jsx:57`,
`IntensityInput.jsx:15`, `ExerciseCombobox.jsx:38`, `Atletas.jsx:209`, `Me.jsx:100`, `ExRow.jsx:18`,
`Leaderboard.jsx:136`, `PresenterView.jsx:39`, `MobileFrame.jsx:28`. Small surfaces;
`useClassTracking` and `useGroupRotation` already have tests to lean on, and `MobileFrame.jsx` is
gallery-only (dev, never built) so it is free.

**Batch 3 — the drag-ref `immutability` cluster (≈9).** `BlockEditor.jsx` ×3, `ExerciseRow.jsx` ×3,
plus `Timer.jsx:332`, `Schedule.jsx:156,297`, `TvController.jsx:192`. **One decision, applied uniformly:**
either accept the pattern and suppress with a shared reason, or change the contract so the parent passes
`setDragIdx`-style callbacks instead of the ref itself. Pick one and apply it everywhere — a codebase with
both is worse than a codebase with either. Criador is coach-only (not live mid-class), which is what makes
this the right place to spend the judgment.

**Batch 4 — `set-state-in-effect` + `purity` in SPA tabs (≈15).** `TvController.jsx:35,101,137,146`,
`RegistroView.jsx:38,73,86`, `App.jsx:70,138`, `Servicos.jsx:13`, `AgendaView.jsx:61`,
`Criador.jsx:210`, `Results.jsx:135`, `Publicador.jsx:441`. ⚠️ Several are the #109/#111 shape — check
each against plans/45 and plans/47 before designing anything. `Publicador.jsx:441` ports
`Criador.jsx:87-94`'s ResizeObserver.

**Batch 5 — `Timer.jsx` (14), `Schedule.jsx` (12), `slides.jsx` (7). Last, and each in its own commit.**
All three run **live at the gym mid-class**, which makes a careless fix here an outage in a way a lint
sweep never is. Timer's 9 `refs` + 5 `purity` findings are `Date.now()`-during-render and
`ref.current`-during-render inside a running clock; `slides.jsx:221`'s two `purity` hits are the
documented `restRemaining` computation, and `TV.module.css`/`slides.jsx` colour literals there belong to
**#97**, not this item — do not fold them in. Nothing in this batch ships without driving the real flow.

## Not auto-fixable: `exhaustive-deps` (17)

Several deps arrays are **deliberately narrow** — `Criador.jsx:213`'s `[preload]` (the effect consumes a
one-shot preload and calls `onPreloadConsumed`; adding `startEdit`/`openNewSession` would re-fire it),
`Schedule.jsx:100,109`, `slides.jsx:70,196,439`. Adding the missing dep would re-run the effect on every
render. Each of the 17 gets either a real fix or a disable **with a written reason**; never a silent
widening of the array.

## Acceptance

- Every one of the 84 is either fixed or carries a one-line written reason. **Zero bare disables.**
- `--max-warnings` in `package.json` sits at the honest residual, ratcheted down once per batch.
- `npm test` green at every batch (580 baseline, plus any tests added for a real bug found).
- No behavior change that was not deliberately chosen and recorded — for a **real-bug** verdict, the
  commit message states the user-visible symptom that was fixed.
- The `eslint.config.js:21-31` comment block is updated (or removed) to match the new floor. If the
  cluster reaches zero, the rules go back to `error` and that comment goes away — that is the finish line.

## Verification

Per batch: `npm test`, `npm run lint` at the new floor, and a live drive of the touched surface.
Batch-specific:

- **Batch 1** — open Exercícios on desktop **and** at 390px; the mobile 3-pane drilldown's back button
  works and pane state survives a re-render (the remount bug this fixes is exactly a state loss).
- **Batch 3** — drag-reorder a block in Criador, and drag-reorder an exercise inside a block; keyboard
  ↑/↓ reorder still works (`moveByKey`).
- **Batch 4** — SPA startup with a populated local stack: confirm the pull does **not** write back
  (#111's regression test), Agenda opens, TvController pushes a slide.
- **Batch 5** — `/verify` on the real flow: start a For Time timer, pause, resume, hit the cap; run a
  class through TvController with the TV page open and confirm the wall display tracks. This is the batch
  where "the tests pass" is not evidence.

## Follow-up (the one thing this plan found and did NOT fix)

**`Timer.jsx`'s clock has two sources of truth kept in step by hand.** `statusRef`/`cfgRef`/
`splitsRef`/`finSecsRef` are not a latest-ref mirror of state — every action handler writes the ref
*before* the matching `setState`, the 250ms tick reads the refs and pushes nothing into React but
`forceUpdate()`, and the render body reads them too (`const e = elapsedRaw()`). So React state
exists only to trigger renders while the refs carry the values the clock math agrees on.

That is why the mechanical fix (write the refs from an effect) is wrong here: it lands each value
one frame *after* the render that reads it, on a clock projected on the gym wall mid-class. The
rule's objection still stands in principle — a render React discards would have written them anyway
— but discharging it properly means picking ONE source of truth for the clock, which is a rewrite of
this component's state model. Suppressed with that reasoning written at the site (`Timer.jsx`, the
block above `statusRef.current = status`), not papered over.

Not filed as its own backlog row: there is no user-visible symptom today, this app uses no
concurrent React features, and the change is only worth making alongside a Timer redesign.

Model: Opus · Size: M→L
