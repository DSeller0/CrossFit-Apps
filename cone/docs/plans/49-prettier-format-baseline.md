# 49 — #24 · Prettier format baseline (big-bang, JS/JSX only)

> ✅ Done: `56b73db` (config) → `9b82015` (reformat) → `d9b1b45` (blame-ignore) — 2026-07-27.
> **Two corrections found at execution, both fixed before the reformat commit landed:**
> 1. **This plan's own Approach step 1 specified `"format": "prettier --write ."`** — that is NOT
>    scoped to JS/JSX. Prettier's `.` target processes every extension it supports by default, filtered
>    only by `.prettierignore` (which excludes directories, not file types). Running it reformatted every
>    Markdown doc (BACKLOG.md, CLAUDE.md, every `docs/plans/*.md`, every `docs/reviews/*.md`), every
>    `.css`/`.module.css` file **including `index.css`** (whose ownership comments are load-bearing per
>    CLAUDE.md #99), and the root HTML — none of which "JS/JSX only" intended to touch. Caught before
>    committing; reverted in full. Fixed scripts: `prettier --write "src/**/*.{js,jsx}"
>    "scripts/**/*.{js,jsx,mjs,cjs}" "*.js"` (same fix in `format:check`).
> 2. **The census undercounted `scripts/`** — it globbed only `*.js`/`*.jsx`, missing the 6 `.mjs` files
>    that make up most of that directory. True reformatted count: **165 files** (49 `.js`, 110 `.jsx`,
>    6 `.mjs`) + the corrected `package.json` = **166 changed**, same total the plan predicted, for a
>    partly different reason.
>
> `npm run design:cards` regenerated two cards (`index.html`, `me.html`) with a one-line diff each —
> both confirmed to be **pre-existing wall-clock artifacts** in gallery fixtures (`new Date().getDay()`
> for "today" in the index fixture; a relative date label in the me fixture), unrelated to the reformat
> and present on any regen regardless of it. Reverted rather than committed, so as not to misattribute
> unrelated date drift to this change. Filed as a minor Icebox finding (design-card generation isn't
> perfectly idempotent day-to-day) rather than fixed here — out of scope for a JS-only Prettier item.
>
> **Live-verified** on the reseeded local stack (Docker + `supabase start` + `seed-dev.mjs`, real
> prod-shaped data): logged in via the real OTP flow, opened Criador, opened a session with 6 diverse
> blocks (Core/Acessórios/Força/LPO/a complex-movement block/Cardio) — all exercise rows, intensity
> chips, and controls rendered and were editable. Also drove `timer.html` standalone: started, ticked
> (confirmed elapsed time advancing across two snapshots), paused, and resumed correctly — the most
> heavily reformatted file (14 lint findings, `statusRef`/`cfgRef` ref-mirroring). Zero console errors
> beyond the expected Supabase-unreachable noise before the stack was started.
>
> `git blame`/`ignoreRevsFile` verified working as designed: with the config genuinely unset, a
> reformatted line blamed to `9b82015` (wrong); with `blame.ignoreRevsFile=.git-blame-ignore-revs` set,
> the same line correctly blamed to `60dbcf19` (2026-06-21, its real last content change).
>
> `npm test` 580/580, `npm run lint` 84/84, both builds succeed (9 public pages) — all unchanged from
> pre-reformat baseline, confirming the AST-equivalence guarantee held in practice, not just in theory.

> Planned 2026-07-27, opening **Tier 2** of the housekeeping program. Run order:
> **49 (this)** → [50 taxonomy single source](./50-taxonomy-single-source.md) →
> [51 react-hooks triage](./51-react-hooks-triage.md).
> **This runs FIRST in the tier on purpose:** a repo-wide reformat invalidates every `file:line` in a
> plan written before it, and plans/51 is 84 findings each anchored to one. Reformat first, then plan
> against stable line numbers.

## Context

There is no Prettier config in this repo and there never has been. The result is real, systemic style
divergence — re-measured 2026-07-27: **162 JS/JSX files in `src/` + `scripts/`, 24,265 raw lines, 48
semicolon-style vs 114 semicolon-free.** *(The #24 row's "~21 vs ~41" is the 2026-07-05 census of a
62-file tree; correct it.)*

The user's call (2026-07-26) was **big-bang repo-wide reformat**, over format-on-touch. The board held it
behind Tier 1 because a reformat rewrites `git blame` and Tier 1 depended on archaeology. Tier 1 has
shipped, and the archaeology tool CLAUDE.md actually cites — `git show <commit>:<file>` — is unaffected by
a reformat anyway; `.git-blame-ignore-revs` (below) covers `git blame` on top.

### What this item is, and is not

Prettier parses each file to an AST and re-prints it from scratch. It reads almost nothing of the old
formatting — it preserves blank lines between statements (capped at one) and keeps an object literal
multi-line if the author put a newline after `{`. Everything else is a function of the config, not of
taste. **Same AST in, same AST out, so behavior cannot change.** That is exactly why this is safe
big-bang while #108 is not.

So: **full coverage, near-zero judgment.** It is *not* a code-quality pass — it fixes no bug, renames
nothing, restructures nothing, deletes no dead code. Those are #98 / #108 / #74-C, separate on purpose.
**Do not let this item grow into them.**

## The config, and why each setting

`cone/.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "arrowParens": "avoid",
  "trailingComma": "all"
}
```

| Setting | Why (decided with the user 2026-07-27) |
|---|---|
| `semi: false` | 114 of 162 files already omit semicolons vs 48 that use them (newer `public/lib` + `shared` code is semicolon-free; the older SPA tabs are not). Uniform either way, so pick the smaller diff. **Not a footgun** — Prettier still emits a *leading* `;` on lines starting with `(`, `[`, `` ` ``, `+`, `-`, `/`, which is exactly where ASI bites. |
| `printWidth: 100` | The highest-impact setting: it decides whether JSX props stay on one line or explode one-per-line. It cuts **both** ways — Prettier also *joins* short lines up to the width, so multi-line JSX that fits collapses. Measured: 20.7% of lines over 80, **10.4% over 100**, 6.4% over 120. Prettier's default 80 would explode a fifth of the codebase vertically; 120 reads closest to today but is worse in a split pane. |
| `singleQuote: true` | Matches the repo. Note JSX attributes are governed by the **separate** `jsxSingleQuote` (default `false`), so `className="foo"` keeps its double quotes, as today. Prettier also auto-flips to whichever quote needs fewer escapes (`"it's"` stays double). |
| `arrowParens: 'avoid'` | As consequential as `semi` here. Prettier's default `'always'` rewrites **every** single-arg arrow (`s => s.id` → `(s) => s.id`), and this codebase is saturated with them (`boxFilter = s => …`, `.filter(l => l.type === 'box')`). `'avoid'` matches what is written today. |
| `trailingComma: 'all'` | Prettier 3's default. Adding an item to a multi-line list becomes a one-line diff instead of two. |

**Do NOT add `eslint-config-prettier`.** It exists to switch off stylistic ESLint rules that fight the
formatter, and `eslint.config.js` has none — `js.configs.recommended` + react-hooks + react-refresh are
all correctness rules.

## Scope — exactly 166 files

Every tracked `.js`/`.jsx` under `cone/`: the 162 in `src/` + `scripts/`, plus `eslint.config.js` and the
three `vite*.config.js`. **JS/JSX only.**

`cone/.prettierignore`:

```
node_modules
dist
public-dist
.design-build
.design-build-mockup
design/
supabase/
```

Why the non-JS exclusions matter:

- **`index.css` is excluded by the JS-only scope, and must stay excluded.** Its per-selector
  `GLOBAL` / `TAB-OWNED → <tab> #NN` / `DEAD` ownership comments are load-bearing (#99/plans/40) — future
  C-sessions read them to know what they own. Churn there costs; it buys nothing.
- **`design/`** holds generated cards (`npm run design:cards`) that inline `themes.css`. A JS-only pass
  needs no regeneration — **prove it** by running `design:cards` and confirming the cards are
  byte-identical *before* committing, not after.
- **The 9 root HTML entry pages** are outside `cone/` and hand-authored; reformatting them buys nothing.

🔴 **The three repo-root JS files stay untouched:** `cone-client.js`, `cone-utils.js`, `sw.js` live
outside `cone/`, so a `cone/`-rooted run never reaches them. Leave it that way — `sw.js` is the service
worker CLAUDE.md flags as a dev-poisoning hazard, and reformatting a deployed SW only to trigger an
update cycle for every user buys nothing. (`deploy.yml:48` copies all three verbatim.)

## Known cost, accepted

Prettier collapses the aligned-`=` columns this codebase uses deliberately — `Criador.jsx:37-84`'s
useState block, `blockModel.js:73-94`'s `TYPE_CONFIG` table, `exerciciosHelpers.js`, `wod.js`'s dense
one-liners. This was surfaced to the user and accepted. **Do not hand-restore alignment afterwards, and
do not sprinkle `// prettier-ignore` to preserve it** — one style, no exceptions, or the next session
inherits an argument instead of a rule.

## Approach — three commits, in this order

1. **Config only, no reformat.** `prettier` as a devDependency, `.prettierrc`, `.prettierignore`, and two
   scripts in `package.json`:
   ```
   "format":       "prettier --write \"src/**/*.{js,jsx}\" \"scripts/**/*.{js,jsx,mjs,cjs}\" \"*.js\"",
   "format:check": "prettier --check \"src/**/*.{js,jsx}\" \"scripts/**/*.{js,jsx,mjs,cjs}\" \"*.js\""
   ```
   ⚠️ **Do not use `prettier --write .` / `--check .`** — that is NOT scoped to JS/JSX. Prettier's `.`
   target processes every extension it supports, filtered only by `.prettierignore` (directories, not
   file types), and will reformat every Markdown doc and every `.css` file including `index.css`. This
   was this plan's own original mistake, caught and fixed at execution — see the Done marker above.
   Add `npm run format:check` to `.github/workflows/deploy.yml` **after the lint step** (`:31-33`),
   same `working-directory: cone`. **CI enforcement is what makes this a baseline rather than a one-off**
   — without it the repo drifts back within a few sessions.
2. **The reformat alone, nothing else in the commit.** `npm run format`. This commit must be
   re-derivable: checking out commit (1) and running `npm run format` reproduces it exactly.
3. **`.git-blame-ignore-revs` at the repo ROOT** (not `cone/`) with commit (2)'s SHA and a comment line:
   ```
   # 2026-07-27 — repo-wide Prettier reformat (#24, plans/49). No behavior change.
   <sha of commit 2>
   ```
   Then `git config blame.ignoreRevsFile .git-blame-ignore-revs` locally. GitHub honours the file
   automatically in its blame view. **This is the mitigation the #24 row never recorded** — it is what
   makes the "reformat destroys blame" objection cost nothing.

## Acceptance

- `npm test` — **580/580 across 17 files**, green and unchanged. A single changed test outcome means the
  formatter did something it is not supposed to be able to do; stop and investigate rather than accept.
- `npm run lint` — **exactly 84**. Formatting changes line numbers, not warning counts. Only touch
  `--max-warnings` in `package.json` if the number *actually* moved; **do not pre-emptively bump it.**
- `npm run build` and `npm run build:public` both succeed; the built page list is still 9.
- `npm run design:cards` — no diff.
- `git diff --stat` on commit (2) touches **166 files**. A materially different number means
  `.prettierignore` is wrong in one direction or the other — check before committing.
- `npm run format:check` passes on a clean tree (i.e. the reformat was complete).

## Verification

1. Run all four gates above **before** commit (2) is pushed.
2. **Live smoke on the local stack** — the formatter cannot change behavior, but the point of a smoke test
   is to catch the case where it did something unexpected: `npm run dev` (SPA loads, Criador opens a
   session, blocks render) and `npm run dev:public` (schedule.html + results.html render, the timer runs).
   ⚠️ If a change appears not to show up, check the **service worker** first (CLAUDE.md's dev-poisoning
   note) — do not chase it in `src/`.
3. Confirm `git blame` on a reformatted file with `blame.ignoreRevsFile` set attributes lines to their
   original authoring commits, not to commit (2). This is the acceptance test for step 3.

Model: Sonnet · Size: S→M
