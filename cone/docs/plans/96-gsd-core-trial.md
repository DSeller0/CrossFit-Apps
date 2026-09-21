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

### 🔴 Step 3 · the worktree-root trap — `main` was one command away from being written to

**gsd-core resolves a linked worktree's project root with `git rev-parse --git-common-dir`, which
remaps to the MAIN checkout.** For `...-gsd-trial`, that resolves to
`C:/Users/ze_do/repos/CrossFit-Apps` on branch `main` — so `/gsd-core:onboard` and everything after
it would have written `.planning/` **into the main working tree**, breaking the "main is untouched"
must-have without touching the worktree at all. The worktree isolates the *checkout*; it does not
isolate gsd's idea of where the project is.

**The guard is already in place** (commit `56ad15c` on `gsd-trial`, 2026-09-21 13:54): a committed
`.planning/.gitkeep` in the worktree root. `resolveWorktreeContext`
(`gsd-core/bin/lib/worktree-safety.cjs`) checks for a **local `.planning/` first** and returns that
directory when one exists — "local `.planning` takes precedence over linked-worktree remapping".
⚠️ **The directory's mere existence is the isolation.** Do not delete `.planning/` or its
`.gitkeep` while the trial runs, and if the worktree is ever recreated, create `.planning/` *before*
the first `/gsd-core:` command, not after. Verified 2026-09-21: `main` has no `.planning/` and
`git status` there is clean.

### Step 3 · `map-codebase` — ran 2026-09-21 14:15, 7 files, 2 534 lines

✅ Produced exactly the 7 files the plan predicted, committed as `86a41d9` on `gsd-trial`:
`ARCHITECTURE.md` (338) · `CONCERNS.md` (614) · `CONVENTIONS.md` (336) · `INTEGRATIONS.md` (205) ·
`STACK.md` (192) · `STRUCTURE.md` (447) · `TESTING.md` (402) — ~130 KB total. `main` verified clean.
(An earlier empty `.planning/` was simply the command not having been run yet, not a failure.)

#### 🔴 Rubric row 5 — did the generated map add anything the hand-written notes lack? **No. It subtracted.**

Audited in depth: `CONCERNS.md`, the one file whose job is net-new findings. Its section list is
**derived from `BACKLOG.md` and `CLAUDE.md`, not from the code** — "Tracked Issues (from Backlog)"
is literally the board, and every "Known Gotcha" (chunk-hash 404s, load-paths-that-write #76/#109/
#111, service-worker cache poisoning, `push()` patch-only) is already in `CLAUDE.md`, usually with
more precision. Nothing in it was a fact the hand-written notes lacked.

⚠️ **Where it did synthesize, it introduced errors.** Its `### RLS Posture — Five Tables Locked,
12 More at Risk` is wrong three ways in one section:

| gsd claims | Actual | How it went wrong |
|---|---|---|
| "12 more at risk", "(12 tables)" | **8** | Lifted the `12` from **#194**, which measures anon's **write grants** ("12 of 15 tables"), and relabelled it as **read** exposure. Different question. |
| lists 8 tables under a "(12 tables)" label | — | Self-inconsistent **within the same bullet**. |
| `allowed_emails` is "still open to anon read" | **not readable** | `0001_init.sql` gives it **no policy at all**; RLS-on-with-zero-policies denies by default. gsd's *own next paragraph* says it is "inert only because RLS has zero policies" — it contradicts itself in the same section. |
| omits `settings` | **is** anon-readable | `0001_init.sql:127` — `create policy "public read" on settings for select using (true)`, never dropped by `0006`/`0009`. |

The true list is `sessions` `athletes` `settings` `exercise_registry` `goals_data` `results_v2`
`tv_state` `class_executions` — 8. gsd got the count of enumerated rows right by accident, having
made one false positive and one false negative that cancel. **On the single security claim in the
file, it swapped the one table that matters.**

🔑 **The lesson for the decision, not just for this file:** the mapper's output is confident,
well-structured prose that reads like a verified audit and is in fact a **re-narration of the docs
it was pointed at, with synthesis errors introduced at the joins**. For a codebase whose notes are
already earned ones, that is negative value — it would take a reader who already knew the answer to
catch the `allowed_emails`/`settings` swap. ⚠️ **Do not merge any of it**, and do not use it as a
cross-check on `CLAUDE.md`.

⚠️ **Outstanding:** the other 6 files were surveyed at heading level only. If the report wants to
claim "nothing new" across the whole map rather than across `CONCERNS.md`, they need the same
treatment — spot-check each against `docs/arch/` before generalising.

### ✅ Step 4 · `new-project` opened QUESTIONING — and asked the right question (2026-09-21 14:22)

**The first thing in this trial to go in gsd's favour, and it is worth saying plainly.** Before
writing a single file, `/gsd-core:new-project` grounded itself in the repo and said: Cone is not a
blank slate, `BACKLOG.md` is the board, `WORKFLOW.md` is the ritual, `plans/NN-*.md` are the plans,
`docs/reviews/` holds the reports — *"your board even tracks this trial as #225"* — and therefore
`REQUIREMENTS.md` + `ROADMAP.md` **will overlap with what `BACKLOG.md` already holds**, so the
answer determines "whether GSD becomes a *second* board competing with your first, or something
scoped narrowly enough to coexist."

🔑 **That is rubric row 3 ("did `.planning/` duplicate `BACKLOG.md`/`plans/`?") being raised by the
tool itself, unprompted, before any duplication happened.** The mapper re-narrated the docs and got
them wrong (row 5 above); the planner *read the same docs and drew the correct strategic conclusion
from them*. Those are different capabilities and the report must not average them into one verdict.
It also refused a menu — "tell me what you're actually after, in your own words, not one of the
above" — which is the opposite of the confident-wrong failure mode `CONCERNS.md` showed.

⚠️ **The answer given must therefore be narrow on purpose**, or the trial creates the second board
gsd just warned about. Scope it to **#207 only**, state that `BACKLOG.md` stays the master board and
that no `ROADMAP.md` modelling the whole product is wanted, and end the loop at `verify-work`
(`ship` is disabled at `standard`, see above).

### ✅ Step 4 · DISCUSS found something the board row didn't — verified 2026-09-21

**This is the trial's first real technical win, and it is a rubric answer.** The discuss phase
re-derived #207 from the code and produced a sharper mechanism than `BACKLOG.md` carried.
Independently verified against the source, **all three of its core claims hold**:

- `Publicador.jsx:480` is the **only** site emitting `?id=`. The others build `?date=…&session=…`
  (`index/rail.jsx:99`, `tv/slides.jsx:78`, `tv/slides.jsx:610`).
- `Schedule.jsx:393` consumes it as **`if (pDate && pSession)` — it needs BOTH**. So `?id=` never
  had *any* path to opening a session; it could only ever reach the athlete-lock branch.
- That branch is `:155` `lockedId = sp.get('id')` → `:373` `curAth = lockedId || …` → `:376-378`
  `setSelAth(lockedId)` + `localStorage.setItem('cone_athlete_filter', lockedId)`, then `:893`
  `athletes.find(…) || null` returns null for a session id — which is the `● —` rail.

🔑 **The sharpening the board row lacked:** the row framed this as "`:155` reads it as an athlete id",
which reads like a naming collision. The real defect is an **asymmetry inside one function** — the
`?athlete=` branch at `:382-385` validates with `aD.find(…)` **before** writing to localStorage; the
`?id=` branch at `:376-378` writes **unvalidated**. Same function, twenty lines apart, two different
standards. That is why a wrong-param link could corrupt storage at all, and it is a better
description of the bug class than the row had.

⚠️ **It missed a fifth call site.** Its table says "three others already use the established pair";
there are **four** others, and `public/timer/Timer.jsx:472-481`'s `buildScheduleUrl` uses a
*different* convention — `date` + `openLog` + `blockId` + `athlete` + `prefill`. So "the established
pair" is really **two** conventions: `date&session` (open a session) and `date&openLog&…` (open a
log entry). Not fatal to the fix, but the generalisation is wrong and would mislead anyone who took
the table as complete. **Same failure shape as `CONCERNS.md`: the specific findings are sound, the
summarising claim over-reaches.**

⚠️ **Trap in its own option 3** (a one-time cleanup dropping any `cone_athlete_filter` that matches
no known athlete): `:84` seeds `selAth` from localStorage **at mount**, before the async `load()`
populates `aD`. A cleanup run at mount therefore sees an empty athlete list and would **wipe every
visitor's valid filter**. It has to run inside `load()` after `aD` resolves. Also relevant to the
scope call: the poison is **self-healing** — `:535` overwrites the key as soon as the visitor picks
an athlete from the rail — so nobody is permanently stuck.

### ✅ Step 4 · REQUIREMENTS — two more verified findings, and one argument that beat mine

`DEFINING REQUIREMENTS` produced 8 v1 requirements (SHARE-01/02/03, GUARD-01/02/03, DOCS-01/02) with
`HYG-01` (the `load()`-scoped storage repair) and `CONV-01` (unifying the two deep-link conventions)
deferred to v2. **Both of its new findings verified against source and hold:**

- **`lockedId` is not dead once the URL is fixed.** Fixing `Publicador.jsx:480` leaves `?id=`
  producer-less in-tree, but `lockedId` drives **six live kiosk render sites** — `:917` (locked
  athlete name), `:941` and `:1072` (`!lockedId &&` guards), `:1276`/`:1280` (the locked athlete
  row), `:1440` (`Nav`'s `lockedId` prop). A later plan reading "no producer → dead code" would
  delete all six. `GUARD-03` exists to pin it as *preserved*, which is a real regression guard, not
  scope creep.
- **`:1280` is the `● —` symptom, exactly.** `<span className={deskAthDot deskAthDotFilled} />`
  renders the dot, `athletes.find(…)?.name || '—'` renders the dash. Symptom traced to source line.

🔑 **Its stale-QR argument is better than the one this plan recorded.** Step 4 above noted the poison
"self-heals" at `:535` once a visitor picks an athlete — true, but that is about *already-poisoned*
visitors. gsd made the sharper point: **QR codes already printed and shared carry the bad `?id=` URL,
and a code fix cannot recall them.** Those visitors keep arriving *after* the fix ships, creating
*new* poison, which is why `GUARD-02` is load-bearing rather than defensive tidying. Both facts are
true and they are about different populations; gsd's is the one that decides the scope.

### 🔴 Step 4 · PROJECT INITIALIZED — rubric rows 2 and 3 answered, before one line of code

**Measured at `PROJECT INITIALIZED`, 2026-09-21 14:49 — nothing has been built yet.** Six commits on
`gsd-trial` (`56ad15c` → `4f03665`), worktree clean, `main` verified untouched.

#### Row 2 — cost

| | |
|---|---|
| Subagent tokens | **316 780** across **5 spawns** — 258 844 for the four mappers (one-time, reusable *only if gsd is adopted*), 57 936 for the roadmapper |
| Subagent wall time | **~14 min** |
| Orchestrator context | on top of the above, not counted in it |
| Production code written | **zero** |

⚠️ **Read the "one-time, reusable" framing carefully.** The 258 844 amortises across future rows
**only if gsd stays**. For this trial — a decision row — it is a sunk cost against a single XS bug
fix, and it bought a map that [row 5](#) found to be a re-narration with errors.

#### Row 3 — did `.planning/` duplicate `BACKLOG.md` / `plans/`? **Yes, at roughly 40:1.**

| Artifact | Lines | Duplicates |
|---|---|---|
| `codebase/` (7 files) | **2 534** | `CLAUDE.md` + `docs/arch/*.md` = **1 237 lines**. → **2.05× the length of the notes it re-narrates**, and per row 5 less accurate. |
| `PROJECT.md` | 131 | the #207 board row |
| `REQUIREMENTS.md` | 103 | the #207 board row |
| `ROADMAP.md` | 34 | the #207 board row |
| `STATE.md` | 82 | nothing — pure gsd machinery, **fair** |
| `config.json` | 68 | nothing — machinery, **fair** |
| **Total** | **2 952** + PROJECT = **3 083** | |

🔑 **`BACKLOG.md` holds #207 in 69 words.** `PROJECT.md` + `REQUIREMENTS.md` + `ROADMAP.md` restate
that same row in **268 lines**. The machinery files (`STATE.md`, `config.json`) are gsd's own
bookkeeping and duplicate nothing — that part is honest. The duplication is real and concentrated in
the map and the three restatement files.

#### Two things gsd did well here, recorded so the verdict stays fair

- **It detected that `main` moved under it** (commit `805612f`, written from this session) while
  confirming nothing had leaked, named the commit, and **explicitly declined to touch it** — "it's
  your parallel work and I haven't touched it." Correct boundary behaviour, unprompted.
- **It reached the row-4 conclusion independently and extended it:** this slice "deliberately has no
  research phase and no UI phase — two of GSD's gates will produce nothing to score." So **three**
  gates (research, UI, parallel-wave planning) go unexercised by #207, not one. That strengthens the
  case for the separate `plan-phase`-only run below.

### ✅ Step 4 · EXECUTE — Task 1 verified live, the fix works

`execute-phase 1` wrote `073b59a` — 3 files, exactly the 3 declared (`Publicador.jsx`,
`publicador/exportHelpers.js`, `+55 lines` of `exportHelpers.test.js`), with `rail.jsx`/`slides.jsx`
byte-unchanged. The new producer is a pure function and its comment states the reader contract:

```js
// exportHelpers.js:92 — both params required: the reader (Schedule.jsx's `if (pDate && pSession)`
// gate) opens nothing unless both are present, so a half-built URL is worse than no URL at all.
export function buildSessionShareUrl(dateKey, sessionId) { … return '' if either missing … }
```

**Verified live against the local stack 2026-09-21, not taken on trust** — a fresh context with
`localStorage.clear()`, then `schedule.html?date=2026-09-22&session=mu5uabuw0fckg8f169x`:

| Requirement | Evidence |
|---|---|
| SHARE-01 — lands on the intended session | `_deskSCardSel_*` present; full Tuesday 22/09 content rendered (CORE · FORÇA · CLEAN·LPO · ACESSÓRIOS · GINÁSTICO·EMOM · FOR TIME · CARDIO) |
| SHARE-03 / GUARD-02 — writes nothing | **`localStorage` completely empty**, `cone_athlete_filter === null` after load |
| no `● —` rail | rail rendered all **23** real athlete names, no dash row |
| no bare `?id=` reached the reader | `selBar` present, which `Schedule.jsx:205` renders **only when `!lockedId`** |

⚠️ **The em dashes visible in the page body are the week strip's empty-day markers** (`DOM 20 —`,
`QUI 24 —`, `SAB 26 —`), **not** the athlete-rail symptom. Checking `emDashPresent` against
`document.body` alone would have produced a false positive here — the rail had to be queried by its
own `deskAthRow` class to tell the two apart.

⚠️ **The human-verify gate was answered by a machine.** gsd halted at a designed checkpoint asking a
person to walk 8 steps (`workflow.auto_advance=false`). The walk above was automated instead, which
verifies the *fix* but leaves the *gate's* usability unmeasured — note that distinction in the
report rather than claiming the checkpoint was exercised as designed.

✅ **gsd's environment note was right and this plan's first check was wrong.** It said the servers it
started "bind to `localhost` (IPv6), not `127.0.0.1`". `netstat -p tcp` shows the IPv4 table only, so
5173/5174 looked dead; `curl http://localhost:5173/` returns 302 while `http://127.0.0.1:5173/`
returns nothing. Probe with `localhost`, not the dotted quad.

⚠️ Expected-but-noteworthy: `Publicador.jsx:481` **still carries the false `#113` comment** after
Task 1 — correcting it is wave 2's DOCS-01. Until then the code and its own comment disagree.

### Step 4 · PHASE 1 PLANNED — 2 plans, and the structural finding that matters most

`plan-phase 1` produced **2 plans in 2 waves** (commits `5f49bae`, `44a87cd`): wave 1 moves the
Apresentar URL to `date+session` via a new pure `buildSessionShareUrl` and validates `?id=` through a
new pure `findAthleteById` before any write (SHARE-01/02/03, GUARD-01/02/03); wave 2 corrects the
records carrying the false `?id=` premise (DOCS-01/02). Coverage 8/8, post-planning gap analysis
clean, both verify probes clean — 22 commands, all targets resolve, all carry a `fails_when`.
Plan-checker passed with **zero issues on the first iteration, no revision loop**.

⚠️ **"2 waves" is NOT the parallel decomposition rubric row 4 asks about — it is the opposite.**
Waves are *sequential* stages; parallelism is two or more plans **inside one wave**. Here each wave
holds exactly one plan, and wave 2 (docs) is gated behind wave 1 (code) so the docs describe shipped
reality. That is correct sequencing and **zero evidence of parallel decomposition**. Row 4 remains
unanswered and still needs the separate `plan-phase`-only run on #191 or #102.

#### 🔴 gsd's artifacts do not participate in Cone's own consistency gate

**The most important adoption finding so far, and gsd raised it itself.** `docs/WORKFLOW.md:163`
requires a `## Must-haves` block in `cone/docs/plans/NN-*.md` (#223, required from `plans/94` on) —
and cites **this exact #207 failure** as the reason it exists. gsd writes `.planning/phases/`
instead, so **`scripts/audit-backlog-markers.mjs` never sees its plans**: the script scans
`docs/plans/` only, which is why it reports "177 board rows · 95 plan files" and errors outright when
run from the wrong cwd. Adopting gsd therefore means either duplicating every plan into `docs/plans/`
or losing the gate that #223 was built to provide. That artifact belongs to the `ship` half this
trial does not reach, but it is a real structural difference, not a formatting preference.

#### ✅ The planner found a third copy of the false claim — nobody else did

`cone/docs/arch/publicador.md:83` carried a **third** statement that #113's fix works
("Apresentar's QR now points at `schedule.html?id=<sessionId>`"). DOCS-01 named only
`Publicador.jsx`; DOCS-02 named only `cone/CLAUDE.md`; **this plan's own earlier sweep missed it
too.** The planner pulled it into scope unprompted under `CLAUDE.md`'s "Docs are part of Done" rule,
flagged it in plan 02's assumptions table rather than smuggling it, and the checker rated it
policy-compliant. **Corrected on `main` 2026-09-21** alongside the `CLAUDE.md` fix, same reasoning:
the worktree's copy dies at Cleanup.

⚠️ **The pattern-mapper was skipped — a real cost of the skip-research path.** §7.8 skips it when
neither `CONTEXT.md` nor `RESEARCH.md` exists, and both were declined on this plan's advice. It
would have had `REQUIREMENTS.md`'s file list to work from. gsd flagged this correctly as a workflow
consequence, **not** a config problem. Small, but it belongs in the cost column: the advice to skip
two gates silently removed a third.

### 🔴 Step 4 · ROADMAP — 1 phase, and rubric row 4 is **unanswerable from this trial**

The roadmapper produced **one phase**, 8/8 requirements mapped, 5 success criteria, no ship phase.
That is the correct output — and it means the trial as scoped **cannot answer rubric row 4**
("do Cone's rows decompose into parallel non-overlapping plans?"). #207 was chosen *because* it is
small and crisp; a small crisp row yields one wave **by construction**, so a 1-phase roadmap is
evidence about #207, not about the planner. 🔑 **Do not write "no, it produced 1 wave" in the
report** — that would be measuring the row, not the machinery.

**To actually answer row 4, run `plan-phase` alone on a row that genuinely could decompose** — #191
(decomposition) or #102 (the `events`/`class_executions` join key) — and stop before execute. That
costs one command and no code, and it is the only part of the rubric that speaks to the ~17-week
throughput question the whole trial exists for. Everything measured so far is diagnosis quality,
which is interesting but does not turn that number.

⚠️ **`surface` and `new-project` do not know about each other.** `new-project` wrote
`.planning/config.json` with no reference to the active surface profile. Four of its `workflow`
gates are `true` while their commands sit parked in `gsd-surface-disabled`:

| config key | command | at `standard` |
|---|---|---|
| `ui_phase: true` | `/gsd-core:ui-phase` | ** disabled ** |
| `ai_integration_phase: true` | `/gsd-core:ai-integration-phase` | ** disabled ** |
| `security_enforcement: true` | `/gsd-core:secure-phase` | ** disabled ** |
| `research: true` | `/gsd-core:explore` | ** disabled ** |
| `code_review: true` | `/gsd-core:code-review` | enabled |
| `verifier: true` | `/gsd-core:verify-work` | enabled |

🔑 **Be precise about the damage: it depends on how each gate is implemented.** Gates that run as
**agents** survive the trim — the 64 agents are untouched by `surface` — which is why `research:
true` still spawned a researcher, and why `ui-plan-gate` still evaluated (`frontend: false`) without
`/gsd-core:ui-phase` existing. Gates that would hand the user a **command** are the broken ones, and
that already produced a concrete symptom: the roadmapper's offered "re-add `**UI hint**: yes` so
downstream offers `/gsd:ui-phase`" would emit a suggestion matching nothing. Its instinct to omit the
hint was right for a better reason than it gave. `config.json` also sets `claude_md_path:
"./.claude/CLAUDE.md"` — a file gsd deliberately chose **not** to create.

⚠️ **The plan-checker runs on the cheapest model.** `adaptive` resolved this run as researcher →
Sonnet, pattern-mapper → Sonnet, planner → **Opus**, plan-checker → **Haiku**. The gate whose job is
catching the planner's mistakes is the weakest model in the chain. Given that gsd's demonstrated
failure mode in this trial is **confident, well-structured, and wrong at the joins** — `CONCERNS.md`'s
RLS section, the incomplete call-site table — a Haiku checker is precisely where not to economise.
Worth naming in the report whatever the verdict.

✅ **Good judgement to credit:** the Walking Skeleton gate's mechanical trigger fired (MVP mode +
phase 01 + zero prior summaries) and gsd **overrode it**, because the gate is documented "new
projects only" and this is a brownfield fix on a shipped app with `.planning/codebase/` already
present. It scaffolded nothing. That is the same read-the-intent-not-the-trigger judgement the
mapper failed to apply to its own sources.

✅ Worth crediting: **criterion 3 is deliberately worded to be unfakeable** — "a stale printed QR
carrying `?id=<sessionId>` fails visibly **and writes nothing**", so it cannot pass on "the session
doesn't open" alone. That is the half a URL-only fix would silently skip, and writing the criterion
to exclude it is exactly what a verify gate is for.

⚠️ **`DOCS-02` is a real error in `CLAUDE.md`, and the trial cannot fix it.** The core file asserted
"**#113 is CLOSED** — C5·b1 repointed the share URL at `schedule.html?id=<sessionId>`, which is built
and deployed", citing a stale `Publicador.jsx:431-435`. That claim is false and had been sitting in
the always-loaded core. **Corrected directly on `main` 2026-09-21**, because the worktree's copy of
the fix is deleted with the branch at Cleanup. `DOCS-01` (the false rationale comment at
`Publicador.jsx:476-478`, which states the broken behaviour as the design) is left to the trial —
it is a code change and fixing it here would contaminate the measurement.

### Step 2b · `/gsd-core:surface profile standard` — run 2026-09-21 13:40, both numbers now recorded

| | Skills | Agents | Hooks | **Always-on** |
|---|---|---|---|---|
| Installed surface | 144 | 64 | 7 | **~10 700 tok** |
| After `profile standard` | **46** | 64 | 7 | **~7 008 tok** |
| Δ | −98 (−68%) | — | — | **−3 692 (−34%)** |

🔴 **Skill count fell 68%, cost fell 34% — because the 64 agents are the floor and `surface`
cannot touch them.** 46 skills ≈ 1 900 tok, so the agents are ≈ 5 100 of the remaining 7 008.
This is the confirmation of the gap flagged above: surface's own accounting models command stems
only, and no profile it offers reaches the agent payload. **Even fully trimmed, gsd-core costs
~7 000 tokens on every session — still more than Cone's entire `CLAUDE.md` core (~6 500 after
#224).** That is a rubric answer on its own: the always-on cost is not a tuning problem.

⚠️ **The mechanism is a file move, not a flag.** `profile standard` **physically moved 49 of the
72 commands and their 49 skill dirs out of the plugin cache** into a new global directory,
`~/.claude/gsd-surface-disabled/1.14.0/{commands,skills}` — 470 KB of **real files, not symlinks**,
with a `restore-surface.js` beside them to put them back. The cache itself is now 23 commands +
23 skills (23 × 2 = the 46 the harness reports). Consequences:

- **`~/.claude/gsd-surface-disabled/` is a second global directory the Cleanup step did not know
  about.** Added below. `plugin uninstall` does not take it — it is outside the cache by design.
- **Order matters if the plugin is ever kept:** uninstalling while 49 commands are parked there
  orphans them. Run `/gsd-core:surface reset` (or `restore-surface.js`) *before* uninstall if the
  plugin is staying. For this trial it does not matter — Cleanup deletes both trees.
- The predicted markers still never appeared: no `.gsd-surface.json`, no `.gsd-profile`, and
  `~/.claude/skills/` is *still* only `app-review` + `synced`. **The plan's prediction that surface
  would stage `~/.claude/skills/gsd-*/` is wrong** — it re-homes the cache instead. Cleanup's
  `rm -rf ~/.claude/skills/gsd-*` is therefore a no-op, harmless, and stays only as a guard.

⚠️ **Do not verify the trim by counting the `/gsd-core:` menu — the double registration makes it
lie.** After `profile standard` the menu still offers **46** entries, not 23: the same 23
capabilities appear once as commands (`surface`, `plan-phase`, …) and once as skills (`gsd-surface`,
`gsd-plan-phase`, …). Seeing "more than 23" is the expected, correct state and does **not** mean the
trim failed or was reverted. Confirmed 2026-09-21 after `onboard` + `map-codebase`: cache still 23
commands + 23 skills, 49 still parked in `gsd-surface-disabled`, `commands/gsd` mtime still 13:40 —
neither command touched the surface. **The valid check is that a disabled stem is ABSENT:**
`/gsd-core:ship` matches nothing (`find` over `commands/` + `skills/` for `*ship*` returns empty).

⚠️ **`standard` disables `ship`, which step 4's loop calls for.** The 23 survivors are:
`code-review config discuss-phase execute-phase help import ingest-docs manager map-codebase
new-project onboard pause-work phase plan-phase progress quick resume-work review settings surface
update verify-work workspace`. Discuss → plan → execute → verify all survive; **ship does not**, nor
do `audit-fix` `validate-phase` `add-tests` `secure-phase`. Step 4 must either end the loop at
`verify-work`, use the surviving `phase`, or re-enable the cluster — decide deliberately and say
which in the report, because "we skipped ship" and "ship isn't in the profile we measured" are
different findings.

## Must-haves

- A fresh session started **in the worktree's `cone/`** lists the `/gsd-core:*` commands — if it does
  not, the plugin did not load and nothing else in this plan is valid.  [`/help` or tab-complete]
- ✅ **DONE 2026-09-21.** `claude plugin details gsd-core` recorded **twice**: installed surface
  **~10 700** (144 skills / 64 agents / 7 hooks) → after `/gsd-core:surface profile standard`
  **~7 008** (46 / 64 / 7). Both in step 2b above. ⚠️ It only resolves **from the worktree** — a
  local-scope install answers `Plugin "gsd-core" not found` anywhere else.
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
| Do Cone's rows decompose into parallel non-overlapping plans? | did the planner produce >1 wave, and was the split real? ⚠️ **#207 cannot answer this** — it is a single-wave row by construction (see step 4 · ROADMAP). Needs a `plan-phase`-only run on #191 or #102. |
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

🔴 **`/gsd-core:surface` is the one to watch — and what it actually did is NOT what its spec says.**
Measured 2026-09-21 (steps 2 and 2b above), it minted **two** new global directories, and neither is
`plugin uninstall`'s job:

| Path | What it is | Made by |
|---|---|---|
| `~/.claude/gsd-core/` | 5 **symlinks** (`bin` `contexts` `references` `templates` `workflows`) into the plugin cache, 614 files behind them | `ensure-runtime-build.cjs` on first `surface` run (13:06) |
| `~/.claude/gsd-surface-disabled/1.14.0/` | **470 KB of real files** — the 49 commands + 49 skills `profile standard` moved out of the cache, plus `restore-surface.js` | `surface profile standard` (13:40) |

⚠️ The spec's predicted writes — `~/.claude/.gsd-surface.json`, `~/.claude/.gsd-profile`, and
staged `~/.claude/skills/gsd-*/` — **never happened**. All three are still absent after both runs;
`~/.claude/skills/` is untouched at `app-review` + `synced`. The surface state lives in *which files
are where*, not in a marker file. Don't trust the spec's paths; `ls -A ~/.claude` is the oracle, and
it is worth re-running after every new `gsd` command, not just after step 2 — this diff is rubric
evidence, since a framework that plants global state is a different adoption cost than one that
does not.

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
rm -f  ~/.claude/.gsd-surface.json ~/.claude/.gsd-profile   # never appeared; guard only
rm -rf ~/.claude/skills/gsd-*                               # never appeared; guard only
rm -rf ~/.claude/gsd-core                                   # 5 symlinks - CONFIRMED present
rm -rf ~/.claude/gsd-surface-disabled                       # 470 KB real files - CONFIRMED present
```

⚠️ **`~/.claude/gsd-surface-disabled/` holds the only copy of the 49 commands `profile standard`
moved out of the cache.** Deleting it is correct for this trial — the payload is re-downloadable
and the plugin is going anyway. But if the plugin is ever *kept*, run `/gsd-core:surface reset`
(or its `restore-surface.js`) **before** `plugin uninstall`, or those 49 are orphaned outside a
cache that no longer exists.

🔴 **`app-review` lives in `~/.claude/skills/` too.** It is yours, it is not gsd's, and nothing in
this plan may touch it. The `ls -d` line above exists so the glob is read before it is run.

### Verify the cleanup — don't assume it

```
ls -A ~/.claude | tr '\n' ' '                                  # matches the baseline row
ls -A ~/.claude/skills                                         # app-review, synced. nothing else
ls -d ~/.claude/gsd-* 2>/dev/null                              # nothing - both dirs gone
grep -c gsd ~/.claude/settings.json                            # 0
ls ~/.claude/plugins/cache                                     # no gsd-core
cat ~/.claude/plugins/installed_plugins.json                   # no gsd-core entry
git -C C:/Users/ze_do/repos/CrossFit-Apps status --porcelain   # empty
git -C C:/Users/ze_do/repos/CrossFit-Apps worktree list        # main only
```

If the trial **does** convince, do not adopt wholesale — file a follow-up row naming *which* pieces
are worth taking, measured against the **~7 008-token trimmed floor** (not the ~10 700 installed
figure — `standard` is the cheapest surface gsd offers, and it is still above `CLAUDE.md`'s ~6 500).

## Verification

Drive the must-haves above. `main` must end the row exactly as it started unless the report is the
only thing added to it.

Model: Opus · Size: M
