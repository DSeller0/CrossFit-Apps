# Cone — Working Process

How work on Cone is organized. The goal: each session tackles **one** backlog item with only the context that item needs — no historical sludge, no token bloat.

## Where things live

| What | Where | Loaded |
|---|---|---|
| Architecture north star | `cone/CLAUDE.md` | auto, every session |
| Durable prefs / decisions | `~/.claude/.../memory/` | auto, every session |
| The board | `cone/docs/BACKLOG.md` | **on demand** |
| Per-item plans | `cone/docs/plans/NN-slug.md` | **on demand** |

The backlog and plans deliberately live in the repo (not memory) so a session reads only the one item it's working on — versioned with the code, no per-session cost.

## Status columns

```
Icebox → Ready → In Progress → Done
```

- **Icebox** — captured, prioritized, not yet planned. Just a row in `BACKLOG.md`.
- **Ready** — has a written `plans/NN-slug.md`. Can be picked up cold.
- **In Progress** — actively being worked. Ideally one at a time.
- **Done** — shipped (committed + pushed).

An item enters **Ready** only when its plan file exists. Keep **only 2-3 items in Ready** at a time — plan-execute-replan. Don't pre-plan everything; far-future plans rot as shared code changes underneath them.

## The session ritual

1. Start a session: **"Work item #N, plan at `docs/plans/NN-slug.md`."**
2. Claude reads `CLAUDE.md` (auto) + that one plan + the relevant code.
3. Execute → commit + push.
4. Move the row to **Done** in `BACKLOG.md`.

One item per session for size **S/M**. Large items (e.g. SPA standardization) get a dedicated *planning* session first, then *execution* session(s).

New bug or feature → add a row to **Icebox**. Batch trivial ones; don't spin a session per typo.

**Built-in skills in the ritual:**
- `/verify` before committing any nontrivial change — drive the affected flow, don't just build.
- `/code-review` before pushing M/L items.
- `/security-review` for anything touching RLS, auth, or user-input rendering.

**Docs are part of Done.** Shipping an item includes correcting any `CLAUDE.md` note or `BACKLOG.md` row the change invalidated. Stale docs cost every future session.

## Review cadence

The backlog gets *refilled* by running **`/app-review`** (portable skill in `~/.claude/skills/app-review/`) — a 9-dimension audit (UX walk, design consistency, code quality, architecture/contracts, security, performance, accessibility, testing/gates, docs hygiene) whose output is a dated report in `docs/reviews/` plus triaged Icebox rows. The review never changes code.

- **Full pass:** when Ready empties, after any L item ships, or ~quarterly.
- **Targeted pass:** one dimension anytime it feels off.

This closes the loop: plan → execute → **review** → replan.

## Design / layout items — mockup first (mandatory)

Before any implementation on a visual change:
1. **ASCII** sketch for quick calibration.
2. **Preview card in `cone/design/`** — a self-contained HTML file (inline CSS, first line `<!-- @dsCard group="…" -->`), synced to the **"Cone Design System"** project on claude.ai/design via DesignSync.
3. User reviews the card in the Design System pane (or the local file) and adjusts.
4. Implementation follows the *approved* card.

This is required for design work — it's the cheapest place to change your mind.

The design project also holds the canon: token swatches, type scale, block color families, and shared components. New mockups build on those cards. The old loose `design-*.html` files at the repo root are **frozen legacy** — never add new ones.

## Model guidance (per-item, not per-tier)

Tagged on each backlog row. Priority (the tier) and model are independent — a low-priority item can still need Opus.

- **Sonnet** — scoped work with clear direction: features with acceptance criteria, layout passes with an approved mockup, mechanical refactors, tests.
- **Opus** — defining a new standard/pattern from scratch, cross-system or architectural decisions, broad-judgment passes (e.g. auditing every page), open-ended "what should we do?".

Use **plan mode** for anything with real trade-offs regardless of model.

## Plan file shape

Each `plans/NN-slug.md`:

```
# NN — Title
## Context        — why this, what problem
## Acceptance     — measurable done
## Files          — what to touch
## Approach        — steps; name existing utils to reuse
## Verification   — how to test end-to-end
Model: Sonnet|Opus   ·   Size: S|M|L
```
