# 01 — Schedule block-card redesign (65/35)

## Context
The schedule.html block card is a single vertical stack: header row (title left, buttons top-right), exercise rows, notes at the bottom. The user wants a two-region card — **information on the left, interactive actions on the right** — so the card reads at a glance and actions are grouped. Split ratio **65/35** (info column wider; a WOD card is information-dense and action-light).

## Acceptance
- Desktop: block card is two columns — left 65% (all builder info), right 35% (block-level actions).
- Block **observations/notes move to the top** of the left column, reframed as instructions.
- Exercise rows show **Sets × Reps + name** (sets prefixed).
- RM **calculated value renders below the progression pill**, not beside it.
- Demo remains **one button per exercise**.
- Mobile (<768px) collapses to a single column (right rail stacks under info).
- No behavior change to timer launch, leaderboard link, registration, RM calc, round counters, demo — only layout/placement.

## Files
- `src/public/schedule/Schedule.jsx` — `BlockDetail` component (~lines 474-574) and `ExRow`.
- `src/public/schedule/Schedule.module.css` — `.detailBlock`, `.detailBlockHdr`, `.detailBlockNotes`, `.detailEx*`, `.rmVolRow`, plus new two-column wrappers.

## Mockup first (mandatory — see WORKFLOW.md)
1. ASCII (below) → 2. standalone HTML mockup (`design-b.html`/`design-c.html` convention) → 3. user review → 4. implement.

```
┌─────────────────────────────────────┬──────────────┐
│ LEFT 65% — info                      │ RIGHT 35%    │
│ WOD · AMRAP / rounds · cap           │ [▶ Timer]    │
│ ▸ instructions (notes moved to top)  │ [🏆 Leader]  │
│ 🎯 goal (when set — gated on #5)     │ [Registrar→] │
│ 3×10  Thrusters          43kg        │              │
│ 5×3   Clean    75% (RM ▢)            │              │
│                ↳ 60kg  (below pill)  │              │
└─────────────────────────────────────┴──────────────┘
```

## Approach
- Introduce a two-column flex inside `.detailBlock`: `.cardInfo { flex: 0 0 65% }` / `.cardActions { flex: 0 0 35% }` (mobile: both `flex: 1 1 100%`, actions wrap below).
- Move `.detailBlockNotes` render from the bottom of the block to the top of `.cardInfo`; relabel styling as an instructions block (keep the muted/italic treatment or lift it — decide in mockup).
- `ExRow`: prefix the volume display with sets — render `Sets × Reps` (today reps lead). Coordinates with Icebox **#6** (builder input order); the render change here is independent of the builder change.
- RM: keep the inline `.rmChip` / `.rmInput` with its exercise in the left column; move the **calculated load pill** so it renders on its own line **below** the progression/percentage pill (adjust `.rmVolRow` to stack rather than inline-wrap for the computed value).
- Move block-level actions (Timer, Leaderboard link, Registrar/Editar resultado) into `.cardActions`. Per-exercise **Demo**: mockup decides row-end-left vs per-row-right; default keep at exercise row-end in the left column to stay attached to its exercise.
- Reserve a goal render slot in `.cardInfo` (renders only when the #5 Goals field exists — no-op until then).
- Reuse `blkLabel` and existing intensity/RM rendering — no new formatting utils.

## Verification
- `npm run dev`, open schedule.html at ≥1280px: card splits 65/35; instructions at top; Sets×Reps shown; RM computed value sits below the pill; Timer/Leaderboard/Registrar grouped right; one Demo per exercise.
- Resize to 390px: single column, actions stacked under info, nothing clipped.
- Click each action — timer launches, leaderboard opens, registration opens, RM calc + round counter unchanged.

Model: Sonnet · Size: M
