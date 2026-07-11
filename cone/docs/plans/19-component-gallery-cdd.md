# 19 — Frontend design process: component-driven + in-app gallery

> ✅ Done: `<pending-commit>` · 2026-07-10 — see BACKLOG.md

## Context

The mockup-first workflow had a structural flaw surfaced during #50: `cone/design/` held a **hand-built static HTML mirror** of the UI, synced to the Cone Design System on claude.ai/design. For a *change* to an existing page it only covered the delta (e.g. #50's mobile mockup was near-empty because the real cards — exercise rows, RM chips, progression, Estações — were never in `design/`); the real markup lived only in `Schedule.jsx`. Two copies that drift = the single-source-of-truth anti-pattern, and the reason "the reference lives somewhere else."

**Decision (user, planning session 2026-07-10):** adopt Component-Driven Development with a **lightweight in-app component gallery** as the all-states source of truth. Full Storybook was considered and **deferred** — the gallery is a strict subset of its groundwork, so graduating later (prop-knobs / a11y panel / Chromatic visual-regression) is never wasted.

## The process (primary deliverable — in WORKFLOW.md "Design work")

**Two lanes.** The moment code exists, the gallery (real code) is the truth; static mockups are only ever ideation for things that don't exist yet.
- **Lane A — changing an existing component:** gallery-first. Adjust the real component → review every state in the gallery across all 4 themes + both widths → screenshots into the Design System `uploads/`. No static mockup.
- **Lane B — net-new (no code):** ASCII → Claude Design ideation card → user **approves** → build → the component enters the gallery → the static card is archived.

**State-coverage standard** (acceptance bar for a Lane-B mockup *and* a gallery entry): cover the axes that apply — content (empty/single/many/overflow/loading/error) · data variants · interaction (default/hover/focus/selected/disabled/done) · responsive (390/1280) · theme (all 4).

**Approval gate:** in auto mode the run stops at "states ready for your review" and hands back; never self-certifies "approved" (the #50 miss; memory `feedback-mockup-approval-gate`).

## What shipped

- `gallery.html` (repo root) + `cone/src/public/gallery/{main.jsx,Gallery.jsx,Gallery.module.css}`: theme `<select>` + stage-width toggle + sections importing the **real** `ExerciseList` (full data-variant matrix) and `Nav` from mock fixtures.
- **Dev-only:** deliberately NOT in `vite.public.config.js` `rollupOptions.input` → `npm run dev:public` serves `/CrossFit-Apps/gallery.html`, but the production build emits nothing, so `deploy.yml` (copies `public-dist/` wholesale) never ships it. `deploy.yml` unchanged.
- Docs: WORKFLOW.md (two-lane process + standard + gate), CLAUDE.md (design bullets + gallery structure), design/README.md (Claude Design role), BACKLOG.md (#17 reframed as the extraction vehicle).

## Incremental growth

The gallery accretes page-by-page: each design-program session (#51–#59) extracts its page's reusable pieces into components (#17) and adds their state entries as Lane-A work. No big-bang.

## Verification

- `npm run dev:public` → `/CrossFit-Apps/gallery.html`: every seeded state renders across all 4 themes + both widths, 0 console errors.
- Playwright screenshot pass → Design System `uploads/`.
- `npm run build:all` succeeds and emits **no** gallery chunk (confirms dev-only).
