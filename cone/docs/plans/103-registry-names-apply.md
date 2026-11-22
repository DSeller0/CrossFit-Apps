# 103 — #211 · The exercise-names pass, applied: 92 entries, the alias change set, five resolver rules

> ✅ Done: `e9a03e7` · 2026-11-22 — see BACKLOG.md · closes #211. The user ran the SQL on prod first;
> the code followed. Honest unresolved rate on prod **25.6% → 10.73%** (331 of 3 085; sessions since
> 09-19: 34.9% → 15.13%), against the ≤ 13.0% acceptance.
>
> **Must-haves: 5/5 driven**, two of them at module level (see 3 and 5).
> (1) **The SQL, on prod.** Read-only anon read afterwards: Acessórios 52 → 69, Aquecimento 20 → 28,
> Cardio 20 → 24, Core 37 → 45, Força 33 → 46, LPO 36 → 62, Mobilidade 18 → 19, Skill 44 → 59 (260 →
> 352); all 92 entries present once, in the right category, with text identical to the file; `DUal`
> gone, `Dual KB Overhead Walking` present; Devil Press reads *um halter*; `Low Hang Snatch` present,
> `Low Snatch` absent. ⚠️ **The second run was proven on the LOCAL stack** (byte-identical md5 after
> run 2; 258 of the 260 existing entries field-for-field unchanged, the two exceptions being the
> intended edits), not on prod: the user ran it there once.
> (2) **The detail page, driven on schedule.html** (public dev server, prod's post-SQL registry and one
> fabricated session fed through `context.route`; nothing written anywhere). 15 rows opened their Demo:
> `DU Crossover` → the crossover text, not Double Under; `HSPU` and `Handstand Push Up` → the general
> entry; `21-15-9 S Hspu` → Strict HSPU; `Squat Clean`, `Hang Squat Celan`, `Low Squat Snatch` → their
> own entries; `Devil Press` → one dumbbell, `Dual DB Devil press` → two; `Strict T2B` → Strict Toes to
> Bar; `RMU / 12 Pull Up` → Ring Muscle-up; `Thruster 60/45` → Thruster; `LOW SQUAT` and `Plate Overhead
> Lunge` → Demo disabled. **It can fail:** with HEAD's `registry.js` swapped in, `DU Crossover` showed
> Double Under, `21-15-9 S Hspu` the general HSPU, `Strict T2B` plain Toes to Bar, and `RMU / 12 Pull
> Up` and `Thruster 60/45` had no demo.
> (3) **¶ Texto's warnings, at module level.** The SPA could not sign in (below), so this drove
> `parseBlock(text, { knownType, registry })` with prod's registry, which is what BlockTextEditor
> calls. `Squat Clean`, `Strict T2B`, `Thruster 60/45`, `RMU / 12 Pull Up`, `8/8 Military Press`, `DU
> Crossover` and `HSPU` raise no `unknown-exercise`, alone or together; `LOW SQUAT` and `Plate
> Overhead Lunge` still do. **Not driven in the SPA's UI.**
> (4) **Rate, danglers, alias diff.** 297 imported = 297 planned (0 missing, 0 wrong, 0 extra);
> `audit-session-registry.mjs`: 0 dangling. Against HEAD's resolver on the same prod data: **0
> prescriptions lost**, 367 newly resolved, 36 moved to another entry, each one a decision.
> (5) **The catalog's groups, at module level** (`groupByRoot` over prod's LPO list): the *Clean* group
> lists Squat Clean, Hang Squat Clean and Low Hang Clean beside Clean and Hang Clean; `Low Hang Snatch`
> is listed and `Low Snatch` is not. **Not driven in the SPA's UI.**
>
> **Per rule, measured on prod:** R2 42 prescriptions (12.09% without it) · R3 22 (11.44%) · R4 2 ·
> **R5 0** (September's `echo bike` alias already covered the one spelling in use; kept because
> `Assault Bike` would otherwise miss) · R7 2 moved, 0 gained (`8 S T2B` → Strict Toes to Bar,
> `21-15-9 S Hspu` → Strict HSPU).
>
> **✦ Sugerido backtest, HEAD resolver vs this one** (72 strength days, same prod data): main lift 54% →
> 52% (38/71 → 37/71), top-set load 55% → 53%, LPO family 55% → 57%; block set, order, theme,
> movements, cap, meta and warnings identical. Cause: Strict Press is now a known lift, so one day's
> suggestion changed. Reported, not gated.
>
> **Found while driving.** (a) The SQL's `DUal` → `Dual KB Overhead Walking` rename left the old deployed
> code's three aliases dangling (about 8 prescriptions lost their detail) between the SQL and this push.
> The plan had the right order but did not foresee that; the shared-utils note now says so. (b) R3's first
> draft peeled only the `10` of `3 x 10`; the unit test caught it and the scheme pattern now runs first.
> (c) Three `suggest/` suites used "Shoulder Press" as their unresolved example; swapped for a fictional
> lift. (d) **The local Supabase stack was unreachable**: Windows reserves TCP ports 54329–54428, which
> contains the gateway's 54331, so Docker publishes nothing (`seed-dev.mjs` printed `fetch failed`).
> That is why (3) and (5) were not driven in the SPA. Fix, if wanted: `net stop winnat` and `net start
> winnat` in an elevated shell, then restart the stack. (e) **`/code-review` (medium) ran after the push,
> not before, because of (a):** 5 findings. Two were fixed in the follow-up commit: R4 now runs the noise
> stripper on what follows the label (`B Jerk Balance 3" pausa`), and R7's keep-unit form still consumes
> an `x`, so `3 x 10 S Pull Up` stays strict. One went to the docs: aliases are code and entries are data,
> so a registry that predates the SQL (the dev seed, an old backup) loses every alias retargeted to a new
> entry. Two were not findings: `Hip to bar en bar turnover` is the real prod entry name, and R2 taking
> only the first alternative is the accepted trade-off. No prod resolution changed (10.73% before and
> after).

*Planned 2026-11-22 (Opus), from the user's answers in
[2026-11-22-exercise-names-decisions.md](../reviews/2026-11-22-exercise-names-decisions.md).
Execution: **Sonnet**. There is one hand-off: **the user runs the SQL on prod** (step 1) before any
code is pushed.*

## Context

#211 is the naming pass started on 2026-09-20 and left unfinished. The user answered it on
2026-11-22, in the decision doc above. Its *Resolved* section records:
- how the answers were read;
- the four follow-up calls;
- the **rules the answers set**, which now override #94's defaults;
- the text for every new entry (Batch E).

Read that section first. In short:

1. **A variant is its own entry.** That covers position (floor · hang · high hang · low hang ·
   block), grip, receive (squat vs plain), deficit, seated, walking, step-over and step-down, dual
   vs single, and target. A spelling, a language or an implied implement is not a variant.
2. **A plain name means any form, and a spelled-out "Strict" means the strict entry.** Toes to Bar,
   Pull-up and now *Handstand Push-up (HSPU)* each have a general entry.
3. **"Squat" is not the plain lift.** This retires `registry.js:142-143`.
4. **"Low" means low hang.** September's *Low Snatch* is renamed **Low Hang Snatch**. A bare
   `LOW SQUAT` stays unresolved.
5. **Devil Press is one dumbbell in this box.** *Dual DB Devil Press* is the two-dumbbell entry.
6. **`8/8` before a press means single-arm.**

**Measured at planning** (prod, read-only, 3 085 prescriptions): the honest unresolved rate goes
from **25.6% to 12.9%**, and from 34.9% to 18.0% on sessions since 09-19. That is before the resolver
rules in step 3, which only lower it further. "Honest" means the 09-20 audit's rate, which
excludes noise lines and #210's pasted article.

**Order matters: entries first, code second.** `lookup` (`registry.js:293-298`) checks the index
before `ALIASES`, and an alias whose target doesn't exist resolves to nothing. If the code shipped
first, the repoints (`du crossover`) and the removals (`squat clean`, `hspu`) would leave those
prescriptions with no detail page on the live site until the SQL ran.

**What changes for each consumer of `resolveExercise`:**
- **The exercise detail** (`DemoPanel.jsx:34`, `ExRow.jsx:137,186`). This is the point of the pass.
- **¶ Texto's `unknown-exercise` warning** (`textFormat.js:1093`). Fewer warnings.
- **Criador's Cardio flag and ghost defaults** (`blockModel.js:88,93`). New entries carry no
  `defaults`, and the flag follows the entry's category.
- **✦ Sugerido** (`suggest/history.js`, `stats.js:516`, `synth.js:77`). Squat Clean and Clean
  become separate movements in its pools. This is intended, so it is measured (step 5), not gated.
- **Atletas' PR categories** (`Atletas.jsx:140`).

**Not affected:** the RM autofill and PRs. They match the *typed* name, not the entry
(`Schedule.jsx:59-62`, `PrSection.jsx:258`).

## Acceptance

1. Prod `exercise_registry` gains the **92 entries**, with these per-category gains:
   Acessórios +17 · Aquecimento +8 · Cardio +4 · Core +8 · Força +13 · LPO +26 · Mobilidade +1 ·
   Skill +15.
2. Three edits land on prod: *Low Hang Snatch* is created under that name, the *Devil Press*
   description changes, and *DUal* is renamed *Dual KB Overhead Walking*.
3. The SQL can be re-run, and a second run changes nothing.
4. `ALIASES` equals the Appendix exactly:
   - 126 today;
   - −12 removed (D);
   - +183 new (A + B);
   - 20 retargeted (C);
   - = **297**.
5. Rules R2, R3, R4, R5 and R7 are in place as **fallbacks**. Each has tests for its examples and
   for the cases where it must not fire.
6. On prod, the honest unresolved rate is **≤ 13.0%** on the day, and there are **0 dangling**
   aliases.
7. Tests:
   - every test pinning a superseded decision is updated, not deleted, and cites #211;
   - `npm test`, `npm run lint` and `npm run format:check` pass.
8. These docs are corrected: `shared-utils.md` (the registry paragraph), the decision doc's status
   line, BACKLOG (the Done row, and #237's "71%" figure).

## Must-haves

- **The SQL lands exactly once.** [Supabase SQL editor on prod, then a second run]
  - The verify SELECT shows the eight per-category gains from Acceptance 1, measured against the
    counts before the run.
  - `Dual KB Overhead Walking` is spelled that way.
  - Devil Press's description says *um halter*.
  - Running the whole file a second time leaves every count and both edits unchanged.
- **The detail page shows the new entry, not the old target.** [schedule.html exercise detail,
  local stack re-seeded from prod after the SQL]
  - `DU Crossover` opens *Double Under Crossover*.
  - `HSPU` opens *Handstand Push-up (HSPU)*.
  - `Squat Clean` opens *Squat Clean*, not *Clean*.
  - `21-15-9 S Hspu` opens *Strict HSPU*.
  - *Devil Press* reads one dumbbell.
- **¶ Texto stops flagging what this pass resolves, and still flags what it holds back.** [Criador ›
  ¶ Texto, local stack] Paste these lines into a block:
  - `Squat Clean`, `Strict T2B`, `Thruster 60/45`, `RMU / 12 Pull Up` and `8/8 Military Press`
    raise **no** `unknown-exercise` warning;
  - `LOW SQUAT` and `Plate Overhead Lunge` **still** raise it.
- **The rate, the danglers and the alias diff, on prod.** [read-only refresh +
  `node scripts/audit-session-registry.mjs`]
  - The honest rate is ≤ 13.0% on the day's occurrences.
  - 0 dangling aliases.
  - The scratchpad diff between this plan's Appendix and the imported `ALIASES` is empty.
- **The catalog groups the new variants.** [SPA › Exercícios › LPO, local stack]
  - The *Clean* variation group lists Squat Clean, Hang Squat Clean and Low Hang Clean beside Clean
    and Hang Clean.
  - *Low Hang Snatch* is listed, and *Low Snatch* is not.

## Files

- `docs/reviews/2026-11-22-registry-additions.sql`: **new**, generated in step 1.
- `src/public/lib/registry.js`:
  - `ALIASES` (Appendix A–D);
  - the rule comments at `:142-143`, `:168-169`, `:211` and `:244-248`;
  - R2 to R7 in `stripVolumeNoise`, `derivedKeys` and `resolveExercise`.
- `src/public/lib/registry.test.js`: the pinned tests listed in step 4, plus the new `#211` suites.
- `docs/arch/shared-utils.md`: the `registry.js` paragraph.
- `docs/reviews/2026-11-22-exercise-names-decisions.md`: the status line becomes "applied at
  `<commit>`".
- `docs/BACKLOG.md`: the Done row, and the figure in #237.

## Approach

### 0 · Pre-flight (read-only)

1. **Check that the catalog hasn't changed.** Read prod's `exercise_registry` with the anon key, as
   `scripts/audit-session-registry.mjs` does. Its `updated_at` was `2026-08-23T21:53:07` at
   planning.
   - If it has changed, someone edited the catalog. Diff its names against this plan's entry list
     before going on: a name the coach has since added must not be inserted twice under a different
     spelling.
2. **Re-measure today's rate.** Use the decision doc's method, which its closing footnote describes:
   - the walk of `audit-session-registry.mjs:30-49`;
   - the taxonomy at `:72-91`, **imported, never retyped**, because the shell eats a backslash level
     (`\b` becomes a backspace; see the 2026-09-20 audit §3).

   Expect about 25.6%. Write the scripts to the scratchpad with the Write tool.

### 1 · The SQL: ⏸ hand-off to the user

- **Generate it; don't type it.** A scratchpad script builds
  `docs/reviews/2026-11-22-registry-additions.sql` from:
  - the September SQL's `$json$` blocks for B1, with *Low Snatch* renamed to *Low Hang Snatch* and
    given Batch E's new description;
  - the decision doc's **B2** and **Batch E** tables, for the text.

  The doc's tables are the source of truth: if the user edited a cell, the SQL carries the edit.
  Check the generated JSON parses, and that there are exactly 92 names with no duplicate
  `lower(name)`.
- **Use the September file's shape** (`2026-09-20-registry-additions.sql`):
  - the title on line 1;
  - per category, `DISTINCT ON (lower(name))` that keeps the **existing** row;
  - each category sorted by `lower(name)`, the registry's canonical order (#55/#87).
- **Two in-place edits, as separate statements:**
  - the *Devil Press* description (Skill);
  - the rename *DUal KB Overhead Walking* → *Dual KB Overhead Walking* (Core).

  Rebuild the category with `jsonb_agg(CASE … END ORDER BY ord)` over
  `jsonb_array_elements(…) WITH ORDINALITY AS t(e, ord)`, so that the order and every other field
  survive (`videoUrl`, `notes`, `defaults`, `videoPublished`). Both edits are idempotent: they match
  on the old value.
- **A verify block** that reads:
  - the per-category counts (the gains are in Acceptance 1);
  - the renamed name;
  - Devil Press's description.
- **Run it on the local stack first** (`supabase start`, then `node scripts/seed-dev.mjs`). Check
  the gains, then run it a second time and check that nothing moves.
- **⏸ Hand it to the user** with a short title (the user's standing rule for SQL), for example
  *"#211 — 92 exercise entries + 2 fixes"*. The user runs it in the prod SQL editor. **Don't push
  code before the user confirms it ran.** Then verify with an anon read: the gains, the rename and
  the description.

### 2 · `ALIASES`

- **Apply the Appendix:** A and B are new keys, C retargets in place, D deletes.
  - Group the new keys under a `// #211 (2026-11-22)` comment, per source: the answers, September's
    table, the BOB family. Each group names the decision doc.
  - Leave the existing entries where they are.
- **Correct the rule comments:**
  - `:142-143`: a squat clean or snatch is its own entry since #211;
  - `:168-169`: in this box Devil Press is one dumbbell, and *Dual DB Devil Press* is the
    two-dumbbell entry;
  - `:211`: a bare HSPU means any form and resolves to the general entry through its derived key,
    while Strict and Kipping apply when spelled out;
  - `:244-248`: `s t2b` → *Strict Toes to Bar*.
- **Check it.** A scratchpad script parses the Appendix tables from this file and diffs them
  against the imported `ALIASES`. It must report 0 missing, 0 wrong targets, and nothing beyond the
  297.

### 3 · Resolver rules: fallbacks only, tried after every existing form misses

The decision doc's *Already settled* section accepted the rules September measured (§3 of
`2026-09-20-exercises.md`: R2 18 names/19 occurrences, R3 13/13, R5 1/4, R4 1/1). R7 is new, and
the HSPU decision requires it.

| Rule | What it does | Examples (must resolve) | Must not fire on |
|---|---|---|---|
| **R2** · `A / B` | When the key has a `/` with a letter on **both** sides, resolve the first segment (one recursive `resolveExercise`) | `RMU / 12 Pull Up` → Ring Muscle-up · `Legless / RC` → Legless Rope Climb · `HSW / 5 Wall Walk` → Handstand Walk · `C2B /Pull Up` → Chest-to-Bar · `Sandbag Carry/Farm carry Heavy` → Sandbag Carry | `8/8 Búlgaro`, `Thruster 60/45` (no letters both sides) · `DB/KB Deadlift`, `Stiff Dual DB/KB` (exact entry first) · `du/su crossover` (exact alias first) |
| **R3** · trailing prescription | Peel a trailing load list (`60/45`, `40/30 30/25`, `22/15`, optional `kg`/`lb`), `N% (do) RM`, `N x M`, `unbrk`/`unbroken`/`leve` | `Thruster 60/45` → Thruster · `Back Squat 60% Rm` → Back Squat · `Hummer Curl 3 x 10` → Hammer Curl · `Power Snatch Unbrk` → Power Snatch · `Wall Balls Unbroken` → Wall Ball | `Hip 90/90` (exact entry first) |
| **R4** · leading step label | One letter a–e + a space before a word | `A Jerk Balance` → Jerk Balance | `C Skips` / `A Skips` (the plural fallback runs earlier and must still win) |
| **R5** · multi-alt parenthetical | `Bike (Assault/Echo)` is also indexed as `assault bike` and `echo bike` (`derivedKeys`; only when the inner text has a `/` and isn't a SHORTHAND) | `Echo Bike`, `Assault Bike` → Bike (Assault/Echo) | `Remo (Ergômetro)` and `(banded)` add nothing |
| **R7** · "S" is strict, not seconds | Also try the stripping that **keeps** a single-letter unit (`s`/`x`/`m`/`k`) in place, **before** the unit-stripping form | `21-15-9 S Hspu` → Strict HSPU (via `s hspu`) · `5 S Pull Up` → Strict Pull-up | `800m Run`, `30 s Plank`, `10 x Burpee`: each misses as `m run`/`s plank`/`x burpee` and falls through to today's form |

- **Every fallback's output goes through the same hyphen and plural variants as today's forms.**
  For example, `Wall Balls Unbroken` → `wall balls` → `wall ball`.
- **Why R7.** Today `LEADING_VOLUME`'s unit `s` eats the coach's "S" (`registry.js:31`), so
  `21-15-9 S Hspu` is read as `hspu`. It only resolved right because `hspu` pointed at Strict HSPU,
  and this pass moves `hspu` to the general entry.
- **List every resolution R7 changes on prod** in the Done marker. Strict for "S" is the intended
  kind of change; anything else, stop and ask.
- **Measure each rule's recovery on its own** (rule on/off) and record the five numbers.

### 4 · Tests (`registry.test.js`)

- **Pinned tests that encode a superseded decision.** Update each one to the new decision with a
  one-line `// #211:` comment; don't delete it.

  | Line | Today | After |
  |---|---|---|
  | `:25` | `ALIASES.hspu` | gone, so assert `resolveExercise('HSPU', …)` returns the general entry |
  | `:42-48` | `'HSPU '` → Strict HSPU | the fixture gains *Handstand Push-up (HSPU)*, and the result is that entry |
  | `:153-154` | HSPU rows → Strict HSPU | the general entry |
  | `:272` | `21-15-9 S Hspu` → Strict HSPU | the expectation stays, but it now holds because of R7 |
  | `:282` | `5 Strict Pull Up supinada` → Strict Pull-up | Supinated Strict Pull-up |
  | `:337` | `Squat clean 30" entre as reps` → Clean | Squat Clean |
  | `:352-353` | `Squat Celan` → Clean, `Hang Squat Celan` → Hang Clean | Squat Clean, Hang Squat Clean |
  | `:420-426` | `Bbjo step down` → Box Jump Over · `Box jump step down` → Box Jump Over · `dB bench press inclinado` → DB Bench Press · `Remada curvada peg supinada` → Barbell Row | Burpee Box Jump Over · Box Jump Step Down · DB Incline Press · Supinated Barbell Row |
  | `:510-516` | the squat batch | the squat entries |

  Each fixture registry gains the entries its rows now need. Name every changed line in the commit
  message.
- **New suites, `describe('#211 · …')`:**
  - a sample of 15 new entry names, across categories, resolves by its own name;
  - a table test over a representative sample of A, B and C;
  - D: each removed key now resolves to the new entry, not the old target;
  - the five rules, with the examples and the must-not-fire cases from the table above;
  - **must not move:** `Clean`, `Snatch`, `Hang Clean`, `Power Clean`, `Toes to Bar`, `Pull-up`,
    `Deadlift`, `Strict Press`, `Bench Press`, `Thruster`, `Hip 90/90` and `Bike (Assault/Echo)`
    each resolve to themselves, while `LOW SQUAT`, `Plate Overhead Lunge` and `Jerk` resolve to
    nothing.

### 5 · Measure on prod (read-only), and the engine

- **Re-run the refresh** with the shipped code, against prod's registry after the SQL. Record the
  honest rate (≤ 13.0%; the rules should take it lower) and run
  `node scripts/audit-session-registry.mjs` (0 dangling).
- **Run ✦ Sugerido's backtest before and after:** `node scripts/audit-suggest.mjs --backtest`,
  once at HEAD before step 2 and once after. Record both. Its scores shift because Squat Clean
  and Clean stop being one movement. A drop is reported to the user, not gated and not silently
  accepted.

### 6 · Drive the Must-haves

Re-seed the local stack from prod **after** the SQL ran (`node scripts/seed-dev.mjs`; the dev stack
is a snapshot). Then follow the live-verify recipe:
- reload before you trust a pixel (`sw.js` serves stale content);
- open schedule.html for a date that has the prescriptions.

### 7 · Docs (part of Done)

- **`shared-utils.md`'s `registry.js` paragraph.** It records:
  - 346 names / 352 slots;
  - the variant rule and the plain/strict rule as **the naming convention**;
  - R2 to R7;
  - the new rate, superseding the 2026-09-20 figures it quotes.
- **The decision doc's status line** becomes "applied at `<commit>`".
- **BACKLOG:**
  - the Done row;
  - #237's row says "Only 71% of movement occurrences resolve today". Replace it with the measured
    figure;
  - #250 stays open, holding the 27 held aliases and `pause bench press`.

## Verification

- `npm test` · `npm run lint` · `npm run format:check`. ⚠️ Run vitest from `C:\…`, not `c:\…`.
- Run the Appendix-vs-`ALIASES` diff, the prod re-measure, `audit-session-registry.mjs` and the
  before and after `audit-suggest.mjs --backtest`.
- `/code-review` before pushing (M).

Model: Sonnet · Size: M

---

## Appendix · the alias change set

Keys are `normExName`-normalized (lower-case, no accents). Every target must be an exact entry name
on prod once the SQL has run. This change set was generated from the user's answers and measured on
prod at planning. It does not include the **27 held September aliases**: those are in the decision
doc's *Held back* table and go to #250.

### A · New aliases from the answers (96)

| Key | → Target |
|---|---|
| `wb` | Wall Ball |
| `t2r` | Toes to Ring |
| `bjo` | Box Jump Over |
| `shoulder press` | Strict Press |
| `military press` | Strict Press |
| `militar press` | Strict Press |
| `8/8 military press` | DB Strict Press |
| `kb military press` | KB Strict Press |
| `kb militar press` | KB Strict Press |
| `db military press` | DB Strict Press |
| `db militar press` | DB Strict Press |
| `kipping` | Kipping Swing |
| `kb swing` | Russian KB Swing |
| `kettlebell swing` | Russian KB Swing |
| `pike up` | Pike up Row |
| `power balance` | Power Snatch Balance |
| `su crossover` | Single Under Crossover |
| `du/su crossover` | Double Under Crossover |
| `kangoo squat` | Kang Squat |
| `saltos na anilha` | Plate Jump |
| `hws com obstaculos` | Handstand Walk |
| `low squat snatch` | Low Hang Squat Snatch |
| `low snatch` | Low Hang Snatch |
| `cruxifico` | Crucifixo |
| `glute brigde` | Glute Bridge |
| `burpess to plate` | Burpee to Plate |
| `russain twist` | Russian Twist |
| `touch hell` | Touch Heel |
| `rind dips` | Ring Dip |
| `l sir barra` | L-Sit Barra |
| `pike op row` | Pike up Row |
| `forward rools to suport` | Forward Roll to Support |
| `stric t2b` | Strict Toes to Bar |
| `remada curcada` | Barbell Row |
| `defict deadlift` | Deficit Deadlift |
| `ru` | Run |
| `farm` | Farmer's Carry |
| `dumbbell snatches` | DB Snatch |
| `snatches` | Snatch |
| `dumbbell thruster` | DB Thruster |
| `dumbbell hip thrust` | DB Hip Thruster |
| `dumbbell reverse lunge` | DB Back Lunge |
| `db elevacao lat` | DB Lateral Raise |
| `elevacao lateral 2 db` | DB Lateral Raise |
| `elevacao frontal plate` | Front Plate Raise |
| `dip paralela` | Bar Dip |
| `remada curvada pegada supinada` | Supinated Barbell Row |
| `remada unil` | Dumbbell Row |
| `isometria em posicao cadeirinha` | Wall Sit |
| `dead march 2 db` | Dual DB Dead March |
| `double kb front rack carry` | Dual KB Front Rack Carry |
| `dual kb front rack` | Dual KB Front Rack Carry |
| `dual kettlebell front rack walking lunge` | Dual KB Front Rack Walking Lunge |
| `single arm dumbbell overhead walking lunge` | DB OH Walking Lunge |
| `box step up over` | Box Step Over |
| `box jump desce step down` | Box Jump Step Down |
| `box jump over step down` | Box Jump Step Down |
| `burpees target` | Burpee to Target |
| `low power clean` | Low Hang Power Clean |
| `power snatch saida do bloco` | Block Power Snatch |
| `deadlift pegada de snatch` | Snatch Deadlift |
| `defict strict hspu` | Deficit Strict HSPU |
| `eccentric hspu deficit` | Eccentric Deficit HSPU |
| `strict pull supinada` | Supinated Strict Pull-up |
| `strict pull up pronado` | Pronated Strict Pull-up |
| `strict pull up com carga` | Weighted Pull-up |
| `strict pull up supinado com carga` | Supinated Loaded Strict Pull-up |
| `strict handstand push-up` | Strict HSPU |
| `shoulders press sentado` | Seated Strict Press |
| `ab anilha` | Plate Sit-up |
| `ab kb unilateral` | Abs KB Unilateral |
| `wind mill` | KB Windmill |
| `plank drag slide` | Plank Drag |
| `superman` | Arch Hold (Superman) |
| `superman hold` | Arch Hold (Superman) |
| `gdh` | GHD Sit-up |
| `kb step` | KB Step-up |
| `kb oh walking 2kb` | Dual KB Overhead Walking |
| `single leg kb` | Single Leg RDL |
| `sit-up` | AbMat Sit-up |
| `back lever on rings` | Back Lever |
| `tricipes banco com carga` | Tríceps no Banco |
| `moutain climber` | Mountain Climber |
| `db c&j` | DB Clean & Jerk |
| `db c& j` | DB Clean & Jerk |
| `db hang c&j` | DB Hang Clean & Jerk |
| `kb sdhp` | KB Sumo Deadlift High Pull (SDHP) |
| `hallo kb` | KB Halo |
| `halo` | KB Halo |
| `dual dumbbell row` | Dual DB Row |
| `prancha lat dinamica` | Prancha Lateral Dinâmica |
| `prancha lat e dinamica` | Prancha Lateral Dinâmica |
| `prancha lateral dinamica d` | Prancha Lateral Dinâmica |
| `prancha lateral dinamica e` | Prancha Lateral Dinâmica |
| `burpees step up` | Burpee Box Step-up |
| `dual kb walking` | Farmer's Carry |

`8/8 military press` is keyed on the full typed text on purpose. It is the user's per-side reading
(rule 6) for the two prescriptions written that way, and the exact key is tried before any stripping.

### B · September's aliases as shipped (87): changed targets in bold

| Key | → Target |
|---|---|
| `ab infra` | Abs Infra |
| `abs infra banco` | Abs Infra |
| `remador + vups` | Abs Remador |
| `vups + remador` | Abs Remador |
| `reverse lunge` | Back Lunge |
| `dip pararelo` | Bar Dip |
| `dip paralelo` | Bar Dip |
| `remada curvada supinada` | **Supinated Barbell Row** (was Barbell Row) |
| `remada curvada peg pronada` | Barbell Row |
| `echo bike` | Bike (Assault/Echo) |
| `cal bike` | Bike (Assault/Echo) |
| `bulgarian squat` | Bulgarian Split Squat |
| `burpee target` | **Burpee to Target** (was Burpee) |
| `burppes broad jump` | Burpee Broad Jump |
| `farm carry caitic` | Chaotic Farmer's Carry |
| `chest to bar pull up` | Chest-to-Bar |
| `high pull clean` | Clean High Pull |
| `db incline bench press` | **DB Incline Press** (was DB Bench Press) |
| `hang db snatch alt` | DB Hang Snatch |
| `elevacao pelvica db` | DB Hip Thruster |
| `db elevacao lateral` | DB Lateral Raise |
| `db overhead lunge` | DB OH Lunge |
| `db step up over` | **DB Box Step Over** (was DB Step Box Up) |
| `db deadlift` | DB/KB Deadlift |
| `dead march dual db` | **Dual DB Dead March** (was Dead March) |
| `dual devil press` | **Dual DB Devil Press** (was Devil Press) |
| `drop split` | Drop Split Jerk |
| `dual kb oh walk` | **Dual KB Overhead Walking** (the renamed spelling) |
| `kb oh walking` | **Dual KB Overhead Walking** (the renamed spelling) |
| `double kb oh walking` | **Dual KB Overhead Walking** (the renamed spelling) |
| `remada unilateral` | Dumbbell Row |
| `farmer carry` | Farmer's Carry |
| `farm cary` | Farmer's Carry |
| `back extension` | GHD Back Extension |
| `gluteo brigde` | Glute Bridge |
| `good mornind` | Good Morning |
| `golira row` | Gorila Row |
| `rosca martelo` | Hammer Curl |
| `db hammer curl` | Hammer Curl |
| `push up hr` | Hand Release Push-up |
| `hs hold` | Handstand Hold |
| `hs walking` | Handstand Walk |
| `power clean hang` | Hang Power Clean |
| `power clean high hang` | **High Hang Power Clean** (was Hang Power Clean) |
| `low high pull` | **Low Hang High Pull** (was High Pull) |
| `hip to bar end bar turnover` | Hip to bar en bar turnover |
| `hollowrock hold` | Hollow Hold |
| `hollow body rocks` | Hollow Rock |
| `inverted hollow rock` | Hollow Rock |
| `sdhp kb` | **KB Sumo Deadlift High Pull (SDHP)** (was KB Deadlift) |
| `kb oblique crunch` | KB Oblíquo |
| `kipping uma puxada` | Kipping Pull-up |
| `l sit pararelo` | **L-Sit (parallettes)** (was L-Sit) |
| `lsit parelete` | **L-Sit (parallettes)** (was L-Sit) |
| `lsit barra` | L-Sit Barra |
| `muscle celan` | Muscle Clean |
| `overhead squat c` | Overhead Squat |
| `power clean floor` | **Floor Power Clean** (was Power Clean) |
| `cal row` | Remo (Ergômetro) |
| `db reverse fly` | Reverse Fly |
| `easy jog` | Run |
| `russian swing` | Russian KB Swing |
| `kb russian swing` | Russian KB Swing |
| `scap pull` | Scapular Pull-up |
| `scap pull up` | Scapular Pull-up |
| `scap pull-up` | Scapular Pull-up |
| `alt single leg good mornings` | Single Leg RDL |
| `skierg` | Ski Erg |
| `calories ski` | Ski Erg |
| `box step up` | Step-up |
| `ball step up` | Step-up |
| `step up over` | **Box Step Over** (was Step-up) |
| `triceps band` | Tricep Extension |
| `triceps extension` | Tricep Extension |
| `wall wall` | Wall Walk |
| `burpees over the bar` | Burpee Over the Bar (BOB) |
| `burpees over bar` | Burpee Over the Bar (BOB) |
| `burpee over rower` | Burpee Over the Bar (BOB) |
| `burpees over rower` | Burpee Over the Bar (BOB) |
| `burpees over the db` | Burpee Over the Bar (BOB) |
| `burpee over the db` | Burpee Over the Bar (BOB) |
| `lat burpees over the db` | Burpee Over the Bar (BOB) |
| `burpees over the erg` | Burpee Over the Bar (BOB) |
| `burpees over the row` | Burpee Over the Bar (BOB) |
| `burpee over the line` | Burpee Over the Bar (BOB) |
| `burpees over ball` | Burpee Over the Bar (BOB) |
| `burpees box step up` | **Burpee Box Step-up** (was Burpee Over the Bar (BOB)) |

Some of September's keys are not shipped:
- **They are now an entry's own name, or redundant:** `walking lunge` · `walking lunges` ·
  `dual db walking lunge` · `high hang clean` · `kb sumo deadlift high pull` · `db incline press` ·
  `block deadlift` · `hang muscle clean` · `db strict press` · `block snatch high-pull` ·
  `burpee box step up` · `box step-up`.
- **They are already in `registry.js` with the same target:** `farm carry` · `hsw`. Don't add them
  again, because a duplicate key in the object literal fails lint.

### C · Existing aliases that change target (20)

| Key | Today | → New target |
|---|---|---|
| `du crossover` | Double Under | Double Under Crossover |
| `strict pull up argola` | Strict Pull-up | Ring Strict Pull-up |
| `strict t2b` | Toes to Bar | Strict Toes to Bar |
| `s t2b` | Toes to Bar | Strict Toes to Bar |
| `strict pull up supinado` | Strict Pull-up | Supinated Strict Pull-up |
| `strict pull-up supinado` | Strict Pull-up | Supinated Strict Pull-up |
| `strict pull up supinada` | Strict Pull-up | Supinated Strict Pull-up |
| `strict pull-up supinada` | Strict Pull-up | Supinated Strict Pull-up |
| `deadlift deficit` | Deadlift | Deficit Deadlift |
| `strict press sentado` | Strict Press | Seated Strict Press |
| `low squat clean` | Clean | Low Hang Squat Clean |
| `squat celan` | Clean | Squat Clean |
| `hang squat celan` | Hang Clean | Hang Squat Clean |
| `high squat clean` | Clean | High Hang Squat Clean |
| `remada curvada peg supinada` | Barbell Row | Supinated Barbell Row |
| `bbjo step down` | Box Jump Over | Burpee Box Jump Over |
| `db bench press inclinado` | DB Bench Press | DB Incline Press |
| `kh oh walking` | DUal KB Overhead Walking | Dual KB Overhead Walking |
| `dual kb oh walking` | DUal KB Overhead Walking | Dual KB Overhead Walking |
| `oh walking 2kb` | DUal KB Overhead Walking | Dual KB Overhead Walking |

### D · Existing aliases removed (12)

| Key | Today | Why |
|---|---|---|
| `hspu` | Strict HSPU | *Handstand Push-up (HSPU)* derives this key |
| `handstand push up` | Kipping HSPU | the general entry derives it |
| `handstand push-up` | Kipping HSPU | the general entry derives it |
| `deficit deadlift` | Deadlift | a new entry has this exact name |
| `squat clean` | Clean | a new entry has this exact name |
| `floor squat clean` | Clean | a new entry has this exact name |
| `hang squat clean` | Hang Clean | a new entry has this exact name |
| `high hang squat clean` | Hang Clean | a new entry has this exact name |
| `squat snatch` | Snatch | a new entry has this exact name |
| `hang squat snatch` | Hang Snatch | a new entry has this exact name |
| `low hang clean` | Hang Clean | a new entry has this exact name |
| `box jump step down` | Box Jump Over | a new entry has this exact name |

D's keys would be dead even if they stayed, because the index is checked before `ALIASES`. They are
removed so that the table says what the code does.
