# Cone — Design cards

Source for the **"Cone Design System"** project on claude.ai/design. Replaces the loose `design-*.html` files at the repo root (those are frozen legacy — never add new ones).

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
