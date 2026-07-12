# Cone — Design cards

Source for the **"Cone Design System"** project on claude.ai/design. Replaces the loose `design-*.html` files at the repo root (those are frozen legacy — never add new ones).

> **Role (2026-07-10):** Claude Design is **token/palette canon + Lane-B ideation + a screenshot archive of the real components** — NOT a hand-maintained mirror of shipped UI. The all-states source of truth for existing components is the **in-app component gallery** (`gallery.html`, dev-only) that renders the real code. Static cards here are only ever ideation for things that don't exist yet (Lane B); once a component is built, the gallery is the truth. See `docs/WORKFLOW.md` → "Design work" for the two-lane process + coverage standard.

## Rules

- One self-contained HTML file per card: inline CSS, no external requests (CSP blocks them).
- First line must be the card marker: `<!-- @dsCard group="Tokens" -->` (groups: `Tokens`, `Components`, `Mockups`).
- Match the app's rules: TotK vars, no border-radius on public-page components, pt-BR strings.
- Token values must mirror `themes.css` (repo root) — if themes change, update `tokens/palette.html`.

## Mockup-first flow (per WORKFLOW.md)

1. ASCII sketch in-session.
2. New card here under `mockups/NN-slug.html`, built on the token/component cards.
3. Sync to claude.ai/design (DesignSync), user reviews the card.
4. Implementation follows the approved card.

## Current cards

| Card | Group |
|---|---|
| `tokens/palette.html` | Tokens — all 4 themes, 13 core vars each |
| `tokens/type.html` | Tokens — Cinzel/Crimson Pro/Amarante scale |
| `components/block-cards.html` | Components — RED/AMBER/BLUE/GREEN families |
| `components/schedule-card.html` | Components — 65/35 block card canon (design-d) |
| `components/pills.html` | Components — buttons, chips, tabs |
| `components/tv-block-card.html` | Components — screenshot archive: `BlockCard` (`src/public/tv/slides.jsx`), reference for the register redesign |
| `mockups/02-tv-desktop-refinement.html` | Mockups — TV controller desktop layout (#2) |
| `mockups/07-tv-countdown-pill.html` | Mockups — TV timer final-10s countdown pill (#12) |
| `mockups/20-result-card-exerciselist.html` | Mockups — result card using real ExerciseList shape (builds on #19, notes removed) |
