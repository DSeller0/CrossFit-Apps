# 95 — #224 · Split `CLAUDE.md` into a lean core + on-demand `docs/arch/`

> ✅ Done: `2a9ced2` · 2026-09-20 — see BACKLOG.md · closes #224.
>
> **Auto-loaded per session: ~39 080 → ~6 503 tokens (83% smaller).** Nine files under
> `docs/arch/`; the total across all ten files is ~41 900, slightly more than before — the point
> was never to write less, it was to stop loading all of it on every item.
>
> **Must-haves: 6/6 driven**, by script over old-vs-new rather than by eye:
>
> | # | Must-have | Result |
> |---|---|---|
> | 1 | every heading + every content line still present | **28/28 headings, 997/997 lines** — 0 missing, 0 duplicated |
> | 2 | core ≤ 10 000 tokens | **6 503** (was 39 080) |
> | 3 | the two-clients rule and the data-colour exemption still in the core, in full | both verbatim, `## Supabase clients` and `## Data colours` |
> | 4 | every index pointer names a trap its file really holds | **12 of 12** spot-checked by `grep -F`, all found |
> | 5 | audit + gates unchanged | zero drift · format:check clean · lint clean · 1113 tests |
> | 6 | no link left pointing at something that moved | **52 relative links resolve**; 3 repointed, 1 dangling prose reference fixed |
>
> 🔑 **The index is the whole risk control, and it is written to a rule:** each line names the
> **traps** its file holds, not its subject — *"`WeekGrid` returns a fragment, not a wrapper div"*,
> *"`push()` is patch-only"*, *"`var(--card)` is not defined"*. A pointer that only said "Criador
> stuff" would leave a session to discover the trap by hitting it.
>
> ⚠️ **Two paragraphs are the only ones summarised anywhere**: the 880-token load-path case
> history and the 805-token RLS narrative. Both are stated in full force in the core, held verbatim
> in `docs/arch/supabase.md`, and say so at the site with a 📖 link. Nothing else was condensed.
>
> 🔴 **Found while moving, pre-existing:** `cone/README.md` linked `../CLAUDE.md` — the repo
> root — twice, and said the file lives there. It has always lived in `cone/`. Both links were dead
> before this row touched anything.
>
> **What this does NOT do:** it does not make the notes any more current. The 2026-09-20 review found
> several stale claims inside this file; they moved stale. What it changes is that each file is now
> small enough to actually proof-read when its area is touched (WORKFLOW.md, "Docs are part of Done").

## Context

`cone/CLAUDE.md` is **159 KB / ~39 000 tokens** and is injected into the system prompt of **every
session**, whatever the item is — roughly 20% of a 200k context spent before the first prompt, on a
board the 2026-09-20 estimate puts at ~17 weeks of work. A session fixing a `results_v2` upsert
carries 5 100 tokens of Publicador export-renderer history it will never read.

The review also found several claims inside it stale (the registry count, two contradictory
unresolved rates, a `Criador.jsx:187` "hand-rolled read" that was a false positive) — a file this
large stops being proof-read, and WORKFLOW.md's "Docs are part of Done" rule can't hold a 1 100-line
file in one session's head.

🔴 **This is a cut, never a regeneration.** `CLAUDE.md` is not an architecture map a tool could
rebuild — it is an earned trap list: *"rejected 2026-07-22"*, *"do not fix `fmtIntensity`"*,
*"caught live against real prod data, not by a test"*. That is precisely why gsd-core's
`/gsd-map-codebase` (which *generates* `CONVENTIONS.md`/`CONCERNS.md` from source) was rejected for
this job in the #225 assessment. Every byte moves verbatim; nothing is summarised away.

## Acceptance

- The always-loaded `CLAUDE.md` is **≤10 000 tokens**, down from ~39 000.
- **Every `#`/`###`/`####` heading in today's file lands somewhere**, accounted for one-for-one.
- The moved prose is byte-identical to what it replaced — extraction is done by line-range slicing,
  not by retyping.
- The index is good enough that a cold session knows *which* file to open *before* it needs it.

## Must-haves

- `python` accounting over old-vs-new: every heading present, and the concatenated body of the new
  core + the 9 `docs/arch/*.md` files reproduces every moved line.      [script output]
- New `CLAUDE.md` measures ≤10 000 tokens; the number goes in the Done marker with the before figure.
- The two rules that must never be one click away are still **in the core, in full**: which Supabase
  client a `src/` vs `src/public/` component imports, and the data-colour tokenization exemption.
- Every `docs/arch/*.md` pointer line in the index **names a trap that file holds**, not just its
  subject — spot-check by opening three at random and confirming the named trap is really in there.
- `node scripts/audit-backlog-markers.mjs` zero drift; `npm test`, `npm run lint`,
  `npm run format:check` all clean (this row touches no application code, so they must be unchanged).
- `grep` finds no surviving link to a heading that moved without its file also moving.

## Files

**Edited:** `cone/CLAUDE.md` (reduced to core + index).
**Created:** `cone/docs/arch/{criador,publicador,agenda-resultados,atletas-afiliados,tv,shared-utils,design-system,supabase,code-policy}.md`.

## Approach

Slice by line range with a script, so the moved text cannot drift from the original.

| → file | from CLAUDE.md |
|---|---|
| `criador.md` | Criador layout (#58) + Criador text format (#92) |
| `publicador.md` | the tab · the export renderer · Relatório + rate history |
| `agenda-resultados.md` | Agenda editor / event filter / recurring series + Resultados one surface |
| `atletas-afiliados.md` | Atletas+Afiliados C2 · Fichas · painéis · Fechamento · Histórico |
| `tv.md` | TV system, the C6 pass, `tv_state` columns, the three render paths |
| `shared-utils.md` | `src/public/shared/` components + `src/public/lib/` utilities |
| `design-system.md` | AppChrome · the `--theme-accent` trap · tokens, themes, `index.css`, gallery |
| `supabase.md` | the load-path case history · local dev · migrations · prod divergence · RLS |
| `code-policy.md` | `react-refresh` and react-hooks policies |

**Stays in the core:** app overview · structure + the 10-page whitelist · the SPA tab list · the
two-clients rule · the load-path rule (stated; its case history moves) · env/schema/RLS summaries ·
data colours · exercise data shapes · build + deploy + the chunk-hash 404 · commit-and-push · Key
decisions · the index.

⚠️ Two paragraphs are **stated in the core and held in full in `supabase.md`** — the 880-token
load-path case history and the 805-token RLS narrative. Those are the only two summarised anywhere;
both say so at the site and link onward.

## Verification

Drive the must-haves above, then read the new `CLAUDE.md` end to end as if cold.

Model: Opus · Size: M–L
