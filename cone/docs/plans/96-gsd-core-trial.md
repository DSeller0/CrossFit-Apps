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
| Isolation | recorded in the worktree's `.claude/settings.local.json`, which is **globally gitignored**; `git status` there is clean. Nothing committed — but **not** nothing global, see Cleanup. |

⚠️ **A local-scope install is keyed to the exact directory `claude` was launched from, not to
the repo.** The install ran at the worktree **root**, so `installed_plugins.json` recorded
`projectPath: ...\CrossFit-Apps-gsd-trial` and the `enabledPlugins` key landed in that root's
`.claude/settings.local.json`. Launching from `...-gsd-trial\cone` — which step 1 below tells
you to do — reads a *different* settings file, so the plugin was **disabled** there, with no error
and no `gsd` commands. `claude plugin list` is the oracle: it printed `✘ disabled` in `cone\` and
`✔ enabled` one level up. Fixed 2026-09-21 by adding the same `enabledPlugins` key to
`...-gsd-trial\cone\.claude\settings.local.json` (also gitignored — both trees still clean). If
the worktree is ever recreated, run the install **from `cone\`**, not from the root.

⚠️ **`/plugin` does not exist in the VSCode extension** — that is an environment limitation, not
session state, so opening a new session there will not produce it. The `claude plugin …` **CLI**
subcommands do the same job from any terminal.

### 🔴 The measured cost, before a single command runs

`claude plugin details gsd-core` reports **~10 700 tokens always-on, added to every session** —
144 skills, 64 agents, 7 hooks. Two things about that number:

- It is **more than the entire `CLAUDE.md` core** (~6 500 after #224). Installed as-is, gsd-core
  would undo 1.6× of what plans/95 just saved, on every session, forever.
- It is far above gsd-core's own documented **~1 200 description tokens** for a full install,
  because the plugin ships each capability **twice** — as a command `/gsd-core:add-tests` (72 files
  under `commands/gsd/`, each carrying `name: gsd:<cmd>`) *and* as a skill `gsd-add-tests` (72
  dirs under `skills/`) — so 72 commands surface as 144 skills.

**Trim it before judging the loop, or the trial measures the wrong thing:** `/gsd-core:surface
profile standard` (or `/gsd-core:surface list` first) cuts the surface to the core loop plus the
everyday management commands. Re-run `claude plugin details gsd-core` afterwards and record both
numbers — before and after — in the report. This is itself a rubric answer.

### Step 2 · `/gsd-core:surface list` — run 2026-09-21 13:06, output recorded

**It ran clean. No error, no stack trace** — the freshly compiled Windows engine was the plausible
failure point and it was not one. `ensure-runtime-build.cjs` fired on first use as predicted
(`bin/lib/` 10 → ~200 `.cjs`, `surface.cjs` 41 KB, built 13:06), and the run minted
`~/.claude/gsd-core/` — 5 symlinks (`bin` `contexts` `references` `templates` `workflows`) into the
plugin cache, 614 files behind them. `rm -rf` unlinks without touching the targets, so the Cleanup
step already covers it. Nothing else moved: no `.gsd-surface.json`, no `.gsd-profile`, and
`~/.claude/skills/` is still `app-review` + `synced`. `list` is read-only, as documented.

🔑 **The invocation is `/gsd-core:<cmd>` — namespaced by PLUGIN name, not by the command's own
frontmatter.** Every file under `commands/gsd/` carries `name: gsd:surface`, and that `gsd:` prefix
is *not* what the harness registers; `/gsd:surface` and `/gsd-surface` both match nothing. This is
what the "commands not found" session was hitting. Corrected in step 1 below.

**The two token figures do not measure the same thing, and the gap is the finding:**

| Source | Reports | Counts |
|---|---|---|
| `/gsd-core:surface list` | **72 skills, ~1363 tok** (vs its own ~500 budget cap, 2.7×) | the 72 command **stems** and their descriptions |
| `claude plugin details gsd-core` | **~10 700 tok always-on** · 144 skills · 64 agents · 7 hooks | both halves of the double registration **+ the 64 agents** |

🔴 **~7.8× apart.** The 64 agents are absent from `surface`'s model entirely, and the double
registration is counted once by `surface` and twice by the harness. So `profile standard` trimming
`1363 → n` says **nothing** about where 10 700 lands — only the second `claude plugin details`
reading settles it. That is exactly what the must-have was for; do not substitute surface's own
number for it. (Re-measured after the `list` run: still ~10 700 / 144 / 64 / 7. Unchanged, as
read-only implies.)

⚠️ **Header count 72, enumerated rows 67 — 5 unaccounted.** The missing stems are
`mempalace-recall` `mvp-phase` `phase` `pr-branch` `profile-user`. All five exist under
`commands/gsd/`, all five are in `CLUSTERS.utility` in `src/clusters.cts`, and all five are
`utility`-only (no second cluster), so they should have printed. They are also **consecutive in
alphabetical order**, landing exactly at a line wrap between `mempalace-capture` and `progress` in
the utility block. Either `list` drops a run of entries at a wrap, or the transcription lost a line
— **the output was read from a screenshot, so this is not settled.** Worth settling: if `list`
under-reports, the surface it shows is not the surface you get.

⚠️ **Driving the engine standalone to settle it does not work — tried 2026-09-21, don't retry.**
`bin/lib/surface.cjs` is a module, not a CLI (`node bin/lib/surface.cjs list` prints nothing), and
its export `listSurface(runtimeConfigDir, manifest, clusterMap, registry)` returns
`enabled: 0, disabled: 0, tokenCost: 0` when called with just `~/.claude` — the **manifest is
supplied by the slash command**, not discovered from the config dir. To capture raw output, re-run
`/gsd-core:surface list` in the worktree session and have that session `Write` the result to a
file; a screenshot is what created this ambiguity in the first place.

Cluster sizes as printed (de-duplicated — an overlapping stem prints under its first cluster only,
which is why `utility` shows 21 rows against 32 members in `clusters.cts`): core_loop 8 ·
audit_review 11 · milestone 4 · research_ideate 6 · workspace_state 7 · docs 2 · ui 2 · ai_eval 1 ·
ns_meta 5 · utility 21. Disabled: none.

**No install-profile marker exists** — `~/.claude/.gsd-surface.json` and `~/.claude/.gsd-profile`
are both absent, so `readActiveProfile` returns null and the resolver falls through to the whole
manifest. The full surface is the *absence* of a choice, not a chosen profile.

## Must-haves

- A fresh session started **in the worktree's `cone/`** lists the `/gsd-core:*` commands — if it does
  not, the plugin did not load and nothing else in this plan is valid.  [`/help` or tab-complete]
- `claude plugin details gsd-core` recorded **twice**: at the installed surface ✅ (~10 700 / 144 /
  64 / 7, re-confirmed 2026-09-21 after the `list` run) and after `/gsd-core:surface profile
  standard`.
- **#207 is actually fixed and driven in the worktree** — a visitor with no stored
  `cone_athlete_filter` opens the Apresentar QR and lands on that session. A trial that produces
  artifacts but no working fix answers nothing.
- The report answers **all five** rubric rows below, including any that read "no".
- `main` is untouched: `git -C ../CrossFit-Apps status` clean, no `.planning/` anywhere in it.
- Cleanup ran **and was verified** against the `~/.claude` baseline in Cleanup below, or the
  report states plainly why it did not.

## Approach

0. ⚠️ **The worktree needs its own `node_modules`** — a git worktree shares history, not
   installed packages. `npm install` was run there on 2026-09-21, so it is ready; re-run it if the
   worktree is ever recreated. (`.env.development` **is** present — it is committed. `.env.local`
   is not, and is not needed for this row.)
1. Open a terminal in `C:\Users\ze_do\repos\CrossFit-Apps-gsd-trial\cone` and run `claude`.
   🔑 **The commands are namespaced by PLUGIN name: `/gsd-core:<cmd>`** — `/gsd-core:surface`,
   `/gsd-core:onboard`, `/gsd-core:map-codebase`, `/gsd-core:new-project`. ⚠️ **Not `/gsd:…`**,
   even though every file under `commands/gsd/` declares `name: gsd:<cmd>` in its frontmatter —
   the harness ignores that prefix and uses `plugin.json`'s `"name": "gsd-core"`. `gsd-surface` is
   the *skill* half of the double registration above, not what you type either. Confirmed by a
   live run 2026-09-21; an earlier session lost time to `/gsd-surface` and `/gsd:surface` both
   matching nothing, which looks identical to the plugin not being loaded — run `claude plugin
   list` before assuming either.
2. `/gsd-core:surface list` ✅ **done 2026-09-21, recorded above**, then `/gsd-core:surface profile
   standard`. **Restart the session** — surface changes only take effect next session. Record the
   new always-on figure from `claude plugin details`, not from surface's own count (see above).
3. `/gsd-core:onboard` → it will ask for `/gsd-core:map-codebase`. Run it. 🔴 **Keep the 7 generated files in
   the worktree — never merge them.** Then diff them against `cone/CLAUDE.md` + `docs/arch/*.md`:
   does a generated map surface anything the hand-written notes lack? That answer feeds rubric row 5
   and is worth having whichever way the trial goes.
4. `/gsd-core:new-project` scoped to one row, then the full loop on **#207** — discuss → plan → execute →
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

### Baseline — `~/.claude` before the trial (recorded 2026-09-21, pre-`/gsd-core:`)

| | |
|---|---|
| `~/.claude` | `.credentials.json` `.last-cleanup` `.last-update-result.json` `backups` `cache` `file-history` `history.jsonl` `ide` `plans` `plugins` `projects` `session-env` `sessions` `settings.json` `shell-snapshots` `skills` `telemetry` |
| `~/.claude/skills` | `app-review` · `synced` — **and nothing else** |
| `~/.claude/.gsd*` | none |

⚠️ **The worktree isolates the *repo*, not the CLI's home directory** — so "nothing global"
was already false before a single `/gsd-core:` command ran: `claude plugin marketplace add` wrote
`extraKnownMarketplaces.gsd-core` into `~/.claude/settings.json`, and the 1.14.0 payload sits in
`~/.claude/plugins/cache/gsd-core/`. Both are reversible (step 2 below); the point is that the
blast radius is the home dir, and it has to be checked rather than assumed.

🔴 **`/gsd-core:surface` is the one to watch.** Its own spec writes `~/.claude/.gsd-surface.json`
(sibling to `~/.claude/.gsd-profile`) and re-stages skill dirs at `~/.claude/skills/gsd-*/` —
all home-dir paths, outside the worktree, and **none of them `plugin uninstall`'s job**. It also
compiles its engine on first run (`src/surface.cts` → `bin/lib/surface.cjs`, via
`ensure-runtime-build.cjs`), which may mint `~/.claude/gsd-core/`. **Run `ls -A ~/.claude`
immediately after step 2** and add anything new to step 3 — that diff is also rubric evidence,
since a framework that plants global state is a different adoption cost than one that does not.

### The steps

```
# 1. the repo
git -C C:/Users/ze_do/repos/CrossFit-Apps worktree remove ../CrossFit-Apps-gsd-trial --force
git -C C:/Users/ze_do/repos/CrossFit-Apps branch -D gsd-trial

# 2. plugin + marketplace (takes the cache and the settings.json entry with them)
claude plugin uninstall gsd-core
claude plugin marketplace remove gsd-core

# 3. what the plugin leaves behind - not covered by uninstall
ls -d ~/.claude/skills/gsd-*          # LOOK at the glob before the rm below
rm -f  ~/.claude/.gsd-surface.json ~/.claude/.gsd-profile
rm -rf ~/.claude/skills/gsd-*
rm -rf ~/.claude/gsd-core
```

🔴 **`app-review` lives in `~/.claude/skills/` too.** It is yours, it is not gsd's, and nothing in
this plan may touch it. The `ls -d` line above exists so the glob is read before it is run.

### Verify the cleanup — don't assume it

```
ls -A ~/.claude | tr '\n' ' '                                  # matches the baseline row
ls -A ~/.claude/skills                                         # app-review, synced. nothing else
grep -c gsd ~/.claude/settings.json                            # 0
ls ~/.claude/plugins/cache                                     # no gsd-core
cat ~/.claude/plugins/installed_plugins.json                   # no gsd-core entry
git -C C:/Users/ze_do/repos/CrossFit-Apps status --porcelain   # empty
git -C C:/Users/ze_do/repos/CrossFit-Apps worktree list        # main only
```

If the trial **does** convince, do not adopt wholesale — file a follow-up row naming *which* pieces
are worth taking, measured against the ~10 700-token always-on cost.

## Verification

Drive the must-haves above. `main` must end the row exactly as it started unless the report is the
only thing added to it.

Model: Opus · Size: M
