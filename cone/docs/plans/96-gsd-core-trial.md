# 96 — #225 · Trial gsd-core's phase loop in isolation, then decide

## Context

[open-gsd/gsd-core](https://github.com/open-gsd/gsd-core) is a spec-driven development framework for
AI coding agents (9.7k★, MIT, v1.14.0, created 2026-05-22, very active). Its loop is
`Discuss → Plan → Execute → Verify → Ship`, with state in `.planning/` and each step run as a
fresh-context subagent.

The 2026-09-20 assessment concluded **Cone already implements ~70% of it independently** —
`BACKLOG.md` ≈ ROADMAP+REQUIREMENTS, `plans/NN-slug.md` ≈ CONTEXT+PLAN,
`audit-backlog-markers.mjs` ≈ their state-consistency gate, `/app-review` an audit loop GSD has no
equivalent for — so it was **not adopted**. Two of its three real ideas were built natively instead:
the must-haves verify gate (#223, plans/94) and the `CLAUDE.md` split (#224, plans/95).

**One question is left, and only a real run answers it:** does the phase loop's parallel-wave
execution actually beat one-row-per-session on rows this size? The 2026-09-20 estimate puts the
board at ~17 weeks; throughput is the lever that number turns on.

🔴 **This row's deliverable is a decision, not a feature.** If the trial does not convince, the
worktree and the plugin go and the report stays.

## Setup — already done (2026-09-21)

| | |
|---|---|
| Worktree | `C:\Users\ze_do\repos\CrossFit-Apps-gsd-trial`, branch **`gsd-trial`** off `cee12ca` |
| Marketplace | `claude plugin marketplace add open-gsd/gsd-core` ✅ |
| Plugin | `claude plugin install gsd-core --scope local -y`, run **inside the worktree** ✅ |
| Isolation | recorded in the worktree's `.claude/settings.local.json`, which is **globally gitignored**; `git status` there is clean. Nothing global, nothing committed. |

⚠️ **`/plugin` does not exist in the VSCode extension** — that is an environment limitation, not
session state, so opening a new session there will not produce it. The `claude plugin …` **CLI**
subcommands do the same job from any terminal.

### 🔴 The measured cost, before a single command runs

`claude plugin details gsd-core` reports **~10 700 tokens always-on, added to every session** —
144 skills, 64 agents, 7 hooks. Two things about that number:

- It is **more than the entire `CLAUDE.md` core** (~6 500 after #224). Installed as-is, gsd-core
  would undo 1.6× of what plans/95 just saved, on every session, forever.
- It is far above gsd-core's own documented **~1 200 description tokens** for a full install,
  because the plugin registers every command **twice** — `add-tests` *and* `gsd-add-tests` — so 72
  commands surface as 144 skills.

**Trim it before judging the loop, or the trial measures the wrong thing:** `/gsd-surface profile
standard` (or `/gsd-surface list` first) cuts the surface to the core loop plus the everyday
management commands. Re-run `claude plugin details gsd-core` afterwards and record both numbers —
before and after — in the report. This is itself a rubric answer.

## Must-haves

- A fresh session started **in the worktree's `cone/`** lists the `gsd-*` commands — if it does not,
  the plugin did not load and nothing else in this plan is valid.  [`/help` or tab-complete]
- `claude plugin details gsd-core` recorded **twice**: at the installed surface and after
  `/gsd-surface profile standard`.
- **#207 is actually fixed and driven in the worktree** — a visitor with no stored
  `cone_athlete_filter` opens the Apresentar QR and lands on that session. A trial that produces
  artifacts but no working fix answers nothing.
- The report answers **all five** rubric rows below, including any that read "no".
- `main` is untouched: `git -C ../CrossFit-Apps status` clean, no `.planning/` anywhere in it.
- Cleanup ran, or the report states plainly why it did not.

## Approach

0. ⚠️ **The worktree needs its own `node_modules`** — a git worktree shares history, not
   installed packages. `npm install` was run there on 2026-09-21, so it is ready; re-run it if the
   worktree is ever recreated. (`.env.development` **is** present — it is committed. `.env.local`
   is not, and is not needed for this row.)
1. Open a terminal in `C:\Users\ze_do\repos\CrossFit-Apps-gsd-trial\cone` and run `claude`.
2. `/gsd-surface list`, then `/gsd-surface profile standard`. **Restart the session** — surface
   changes only take effect next session. Record the new always-on figure.
3. `/gsd-onboard` → it will ask for `/gsd-map-codebase`. Run it. 🔴 **Keep the 7 generated files in
   the worktree — never merge them.** Then diff them against `cone/CLAUDE.md` + `docs/arch/*.md`:
   does a generated map surface anything the hand-written notes lack? That answer feeds rubric row 5
   and is worth having whichever way the trial goes.
4. `/gsd-new-project` scoped to one row, then the full loop on **#207** — discuss → plan → execute →
   verify → ship. #207 is the blocker `Publicador.jsx:480` sends a session id to
   `schedule.html?id=`, which `Schedule.jsx:155` reads as an *athlete* id, persisting a bad
   `localStorage.cone_athlete_filter`. Chosen because it is small, has a crisp demonstrable outcome,
   and is **exactly the bug class the Verify step claims to catch**.
5. Write `docs/reviews/2026-09-NN-gsd-trial.md` **on `main`**, not in the worktree.

## The rubric — write the answers down, not an impression

| Question | What counts as evidence |
|---|---|
| Did Verify catch something a normal session would have shipped? | a named finding, or an explicit "no" |
| Cost of one row end to end | tokens + wall-clock vs. a typical `plans/NN` session, **plus** the always-on figures |
| Did `.planning/` duplicate `BACKLOG.md` / `plans/`? | which files now hold the same fact twice |
| Do Cone's rows decompose into parallel non-overlapping plans? | did the planner produce >1 wave, and was the split real? |
| Did the generated codebase map add anything the hand-written notes lack? | a list, or "nothing" |

## Cleanup

```
git -C C:/Users/ze_do/repos/CrossFit-Apps worktree remove ../CrossFit-Apps-gsd-trial --force
git -C C:/Users/ze_do/repos/CrossFit-Apps branch -D gsd-trial
claude plugin uninstall gsd-core            # and: claude plugin marketplace remove gsd-core
```

If the trial **does** convince, do not adopt wholesale — file a follow-up row naming *which* pieces
are worth taking, measured against the ~10 700-token always-on cost.

## Verification

Drive the must-haves above. `main` must end the row exactly as it started unless the report is the
only thing added to it.

Model: Opus · Size: M
