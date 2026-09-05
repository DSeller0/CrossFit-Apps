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
4. Replace the row with its one-line **Done** row in `BACKLOG.md` (see “Board row grammar”).
5. Mark the plan file done: prepend `> ✅ Done: <commit> · <date> — see BACKLOG.md` under its title (see "Plan lifecycle" below). Then run **`node scripts/audit-backlog-markers.mjs`** (from `cone/`, #151/plans/70) — it cross-references every row's marker against its plan's Done marker and flags the four drift shapes steps 4–5 exist to prevent. Advisory only (not a CI gate): a clean table confirms 4–5 landed correctly; any hit is something to fix inline before ending the session, same as the check that follows it.

One item per session for size **S/M**. Large items (e.g. SPA standardization) get a dedicated *planning* session first, then *execution* session(s).

**Plan lifecycle.** Shipped plans stay in `plans/` with a `> ✅ Done: <commit>` marker under the title, rather than being moved or deleted — the plan's rationale lives next to its outcome, and the marker is the one-glance signal that separates live plans from history. So `plans/` without a Done marker = actionable (Ready or In Progress); with one = archived-in-place. The BACKLOG `Done (recent)` entry holds the shipped *summary*; the plan file holds the original *intent* — keep both. Revisit archiving into a `plans/done/` subdir only if the unmarked-vs-marked ratio ever makes the directory hard to scan.

**Board row grammar.** Every row in `BACKLOG.md` is **one line**, in one of four shapes:

```
Ready        - 🟢 **[→ Ready · plans/NN](./plans/NN-slug.md)** — **#N Title** · size · model · why-now
In Progress  - 🔵 **[→ In Progress · plans/NN](./plans/NN-slug.md)** — **#N Title** · size · model
Icebox       - **#N Title** · size · model · one-sentence note            (lead ⏸ if blocked)
Done         - ✅ **[plans/NN · `commit` · YYYY-MM-DD](./plans/NN-slug.md)** — **#N Title** · closed #N. · outcome
```

**≤400 characters per row** (a Ready row may reach 600 — it gets picked up cold). **No blockquote
commentary in any column.** Detail belongs in `plans/NN`: `## Context` holds the intent, the
`> ✅ Done:` marker holds the outcome. If a fact doesn’t fit the row, it goes in the marker, not
on the board. Two shapes the parser depends on: a Done row’s leading bracket names the plan that
**shipped** it (never a program or decision doc — `plans/16`, `22` and `42` legitimately have no
marker), and a `closed #…` clause contains **no `.`** but its terminator.

⚠️ `scripts/audit-backlog-markers.mjs` parses exactly these four shapes — a row written any other
way is **invisible** to ritual step 5. That is not hypothetical: the board drifted into blockquote
refill banners during 2026-08, and the audit printed “Zero drift found” for five weeks while the six
most recent shipped plans carried no Done marker at all.

New bug or feature → add a row to **Icebox**. Batch trivial ones; don't spin a session per typo.

**Built-in skills in the ritual:**
- `/verify` before committing any nontrivial change — drive the affected flow, don't just build.
- `/code-review` before pushing M/L items.
- `/security-review` for anything touching RLS, auth, or user-input rendering.

**Docs are part of Done.** Shipping an item includes correcting any `CLAUDE.md` note or `BACKLOG.md` row the change invalidated. Stale docs cost every future session.

⚠️ **This rule and ritual steps 4–5 were skipped three sessions running** (plans/39, 40, 41 — 2026-07-26). The board then claimed three shipped items were still Ready, In Progress pointed at a closed plan, and no Done entries existed. Cleaning that up cost a whole session. Steps 4–5 are ~5 minutes at the end of the session that has the context; they are not optional.

**Build artifacts are part of Done too.** If a change touches `themes.css`, `index.css`, or any component the gallery renders, finish with **`npm run design:cards`** and commit the regenerated cards. plans/40 dropped `--lb-font` from `themes.css` and left all **9** design cards carrying the deleted token, because the cards inline `themes.css` at generation time. They are a build artifact — **never hand-edit one**; change the source and re-run.

## Review cadence

The backlog gets *refilled* by running **`/app-review`** (portable skill in `~/.claude/skills/app-review/`) — a 9-dimension audit (UX walk, design consistency, code quality, architecture/contracts, security, performance, accessibility, testing/gates, docs hygiene) whose output is a dated report in `docs/reviews/` plus triaged Icebox rows. The review never changes code.

- **Full pass:** when Ready empties, after any L item ships, or ~quarterly.
- **Targeted pass:** one dimension anytime it feels off.

This closes the loop: plan → execute → **review** → replan.

## Design work — component-driven, two lanes (mandatory)

The **all-states source of truth is the in-app component gallery** (`gallery.html`, dev-only — see below), which renders the *real* components in every state so it cannot drift. Static mockups are only ever ideation for things that don't exist yet. **The rule that kills drift: the moment code exists, the gallery (real code) is the truth** — never maintain a hand-built mirror of shipped UI.

Which lane a change is in:

- **Lane A — changing an existing component:** work **gallery-first**. Adjust the real component → review every state in the gallery across **all 4 themes + both widths** → **`npm run design:cards`** to regenerate the Cone Design System's component cards from the changed code, and sync (screenshots may also go into `uploads/` for the record). **No hand-built static mockup.**
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

`gallery.html` (repo root) + `cone/src/public/gallery/` mounts a `Gallery` component: a theme `<select>`, a stage-width toggle, and sections that import the **real** components rendering each state from small hardcoded fixtures. **Dev-only:** it is deliberately *not* in `vite.public.config.js` `rollupOptions.input`, so `npm run dev:public` serves it at `/CrossFit-Apps/gallery.html` but it is never built or deployed. It grows page-by-page: each design-program session that touches a page extracts that page's reusable pieces into components (this is #17) and adds their state entries. Full Storybook was deferred; the gallery is a strict subset of its groundwork.

### Claude Design (claude.ai/design)

Its role is **token canon, generated component cards, Lane-B ideation, and a screenshot archive** — not a mirror. The old loose `design-*.html` files at the repo root are **frozen legacy** — never add new ones.

**`npm run design:cards`** SSRs the gallery's `GROUPS` into self-contained cards in `cone/design/` (real markup, real CSS, real tokens, 4-theme switcher) so Claude Design can *read and reuse* actual component markup when composing a layout — that's why the cards are generated rather than screenshotted, and why they're readable rather than a compiled bundle. They are a build artifact of the gallery: **never hand-edit a generated card**, change the component and re-run. Setup, limitations (the `ti` webfont doesn't render in a card) and the sync flow: `cone/design/README.md`.

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
