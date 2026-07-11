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
5. Mark the plan file done: prepend `> ✅ Done: <commit> · <date> — see BACKLOG.md` under its title (see "Plan lifecycle" below).

One item per session for size **S/M**. Large items (e.g. SPA standardization) get a dedicated *planning* session first, then *execution* session(s).

**Plan lifecycle.** Shipped plans stay in `plans/` with a `> ✅ Done: <commit>` marker under the title, rather than being moved or deleted — the plan's rationale lives next to its outcome, and the marker is the one-glance signal that separates live plans from history. So `plans/` without a Done marker = actionable (Ready or In Progress); with one = archived-in-place. The BACKLOG `Done (recent)` entry holds the shipped *summary*; the plan file holds the original *intent* — keep both. Revisit archiving into a `plans/done/` subdir only if the unmarked-vs-marked ratio ever makes the directory hard to scan.

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

## Design work — component-driven, two lanes (mandatory)

The **all-states source of truth is the in-app component gallery** (`gallery.html`, dev-only — see below), which renders the *real* components in every state so it cannot drift. Static mockups are only ever ideation for things that don't exist yet. **The rule that kills drift: the moment code exists, the gallery (real code) is the truth** — never maintain a hand-built mirror of shipped UI.

Which lane a change is in:

- **Lane A — changing an existing component:** work **gallery-first**. Adjust the real component → review every state in the gallery across **all 4 themes + both widths** → screenshots go into the Cone Design System (claude.ai/design) `uploads/` for the record. **No hand-built static mockup.**
- **Lane B — net-new component/surface (no code yet):** ideation mockup first — an ASCII sketch, then a self-contained preview card in `cone/design/` (inline CSS, first line `<!-- @dsCard group="…" -->`) synced to the Design System via DesignSync. User reviews/adjusts → **approves** → build the real component → it enters the gallery → the static card is archived (never maintained as a mirror).

### State-coverage standard (the acceptance bar for a Lane-B mockup *and* a component's gallery entry)

Enumerate the axes that apply to the component and show one instance of each:
- **Content:** empty · single · many · overflow/truncation (long names) · loading + error where they exist.
- **Data variants:** the real shape variants — e.g. exercise = standard / progression / complex / gender-intensity / legacy-cardio; block = WOD / Força / Estações / rounds.
- **Interaction:** default · hover · focus-visible · selected/active · disabled · done/checked.
- **Responsive:** mobile 390 · desktop 1280.
- **Theme:** all 4 (totk dark/light, spirit-blossom dark/light).

Not every component has every axis; cover the ones that apply.

### Approval gate

The human review is a gate, not a formality. In **auto/non-interactive mode the run stops** at "states ready for your review" — Lane A: gallery states built/screenshotted; Lane B: mockup synced — and hands back. It does **not** continue into implementation, and never calls a card "approved" the user hasn't seen.

### The component gallery

`gallery.html` (repo root) + `cone/src/public/gallery/` mounts a `Gallery` component: a theme `<select>`, a stage-width toggle, and sections that import the **real** components (`ExerciseList`, `Nav` today) rendering each state from small hardcoded fixtures. **Dev-only:** it is deliberately *not* in `vite.public.config.js` `rollupOptions.input`, so `npm run dev:public` serves it at `/CrossFit-Apps/gallery.html` but it is never built or deployed. It grows page-by-page: each design-program session that touches a page extracts that page's reusable pieces into components (this is #17) and adds their state entries. Full Storybook was deferred; the gallery is a strict subset of its groundwork.

Claude Design's role is now: **token/palette canon, Lane-B ideation, and a screenshot archive of the real components** — not a mirror. The old loose `design-*.html` files at the repo root are **frozen legacy** — never add new ones.

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
