# 55 — #117 · Goal badge (mark results that beat the coach's `Meta:`)

> ✅ Done: 7e853ba · 2026-07-29 — see BACKLOG.md "Ready" for the shipped summary.

> Step 4 of the **result fidelity chain** ([plans/52](./52-result-fidelity-chain.md)).
> Run order: #115 ✅ → #118 ([plans/53](./53-block-entry-durability.md)) →
> #112 ([plans/54](./54-dnf-checkpoint.md)) → **#117 (this)** → #116.
> ⚠️ **Runs after #112**: `goalOutcome` must classify a DNF as `missed`, which needs the checkpoint
> shape to exist. Running it first means writing that branch twice.

## Context

`block.goal` shipped with #10 and renders everywhere through `goalStr` — `WodBlockCard`,
`schedule/BlockDetail`, TV `BlockCard` and `TimerSlide`. But **nothing has ever compared a logged
result against it.** The coach writes `Meta: 11–12'` and the app treats it as decoration.

The user's ask, in their words: *"If an athlete finishes before it I would like an icon (badge) in
his row in the leaderboard showing he beat the goal time, for that specific WOD."*

This is a scoped-down version of their original "badge for beating the leaderboard": Cone has **no
cross-session WOD identity** — both leaderboards key on `dateKey|sessId|blockId` — so an all-time
record badge needs #21 first. Comparing against the block's own goal needs none of that.

⚠️ **Only 3 of 294 prod blocks carry a goal** (all `kind:'time'`, 2 with a logged result)
— [reviews/115-results-audit.md](../reviews/115-results-audit.md). The badge is as much an
invitation for the coach to start filling `Meta:` as it is a feature. **Size the UI accordingly;
do not build for a full board.**

## Decisions (user, 2026-07-27)

**Two marks:** filled = beat the fast end, outline = landed inside the coach's range.

| goal | rule |
|---|---|
| time, both ends (`11:00`–`12:00`) | `t < min` → **beat** · `t <= max` → **met** · else missed |
| time, one end (`14:00`) | `t <= min` → **beat**. No window, so no `met` state |
| time, max only (`sub 12'`) | `t <= max` → **beat** — hitting "sub 12" *is* the goal |
| rounds (AMRAP) | `(roundsDone, perfReps)` compared lexicographically against `(goal.min, goal.reps)` |
| `kind: 'text'` | `null` — not comparable |

A **DNF is `missed`, never `null`** — it is a judgement, not an absence of one.

## Acceptance

- New pure **`goalOutcome(entry, bl)`** in `wod.js` → `'beat' | 'met' | 'missed' | null`.
  `null` whenever it cannot honestly judge: no goal, `kind:'text'`, or no logged score. Every
  branch unit-tested.
- Badge rendered in **`RankList`**, the **results success modal**, and the **TV podium**.
- **MetCon + HIIT added to `isTimeBlock`.** `goalKindFor` (`blockModel.js:275-281`) already gives
  them a **time** goal while `isTimeBlock` (`wod.js:95`) counts only `For Time` and `Benchmark` —
  so today a MetCon shows the coach a time target while the athlete is given a rounds/reps form and
  the result is ranked by rounds. Blast radius measured: **1 prod entry** re-ranks (it is
  rounds-scored with no time, so it sorts last). **State that in the commit message.**
- **`goalStr`'s degenerate `min === max` renders the single value** (`14'`), not `"14–14'"`.
  (Note for the user: a fixed goal is normally expressed by leaving *até* blank — `goalStr:143-144`
  already renders `min` alone as `14'` — but both-ends-equal must not look broken.)
- `npm test` green · lint **0** · `format:check` clean · `build:all` clean.

## Files

`src/public/lib/wod.js` (`goalOutcome`, `isTimeBlock`, `goalStr`) + `src/public/lib/wod.test.js` ·
`src/public/shared/RankList.jsx` + `RankList.module.css` · `src/public/results/Results.jsx`
(success modal) · `src/public/tv/slides.jsx` · gallery `groups/shared.jsx` + fixtures, then
`npm run design:cards`.

## Approach — rendering notes, all measured

- **`RankList` already takes `blType`** — add a sibling **`goal`** prop so the call reads
  `goalOutcome(e, { type: blType, goal })`. Entry shaping stays untouched; `blockEntries` spreads
  `...br` already, so nothing upstream changes.
- **Add a trailing `.badgeCol` after `<span className={s.perf}>`, `flex: 0 0 auto`.** Both fixed
  columns exist so their **left** edges align down the list (`RankList.module.css:45-48`); a
  trailing column moves neither. Under the `@container (max-width:400px)` two-line rule it flows
  onto line 2 after `.perf` — which is already `flex:0 0 auto` there — with no extra CSS.
  - Do **not** put it inside `.name`: that is `flex:1; overflow:hidden; text-overflow:ellipsis`,
    so the badge is ellipsised away on long names (the gallery has an overflow case).
  - Do **not** put it inside `.perf`: 108px, `white-space:nowrap`, no slack.
  - Podium tinting (`:72-74`) targets `.rank`/`.perf` only — add `.podN .badgeCol` if the badge
    should take medal colour.
- ⚠️ **Icons from `@tabler/icons-react`, never the `ti` webfont.** `leaderboard.html` does not load
  the webfont (`results.html`/`tv.html` do), so a `ti` class in shared code renders nothing there.
  `RankList` has **no icon import today** — this adds the first one. Precedent: `AccordionCard.jsx`,
  `ScoreFields.jsx`. Suggested glyphs: filled `IconTargetArrow` (beat) / outline `IconTarget` (met).
- **TV podium** — `slides.jsx` renders the podium twice with identical markup (`:457-483`
  banter, `:525-552` default); both need it. `.podiumCard` (`TV.module.css:204`) is a
  `min-width:240px` column flex with `gap:8px`, so a badge is just another child — no reflow risk.
  `.restRow` is a row flex where `.restName` is `flex:1`, so a badge eats into the give.
  `slides.jsx` imports no icon library and may legally use `ti` (tv.html loads it) — but keep the
  glyph choice consistent with the shared one.

## Verification

- A block with `Meta: 11–12'` and three results at **10:45 / 11:30 / 12:40** → filled icon /
  outline icon / nothing.
- A block with `Meta: 14:00` (one end) and a 13:50 → filled; 14:10 → nothing.
- A `kind:'text'` goal and a goal-less block → **no badge at all**, on every surface.
- A capped/DNF result on a block with a time goal → no badge (it is `missed`).
- **Confirm the icons render on `leaderboard.html`**, which does not load the `ti` webfont — that
  page is the one that catches a wrong icon import, and no CI gate can.
- The TV wall, both the single-class podium and the ≥2-class banter columns.
- Gallery: `RankList` cases across 4 themes × 390/1280, including the two-line container mode.

Model: Sonnet · Size: S→M
