# Cone — Design cards

Source for the **"Cone Design System"** project on claude.ai/design (`d6bf6816-a92e-4800-9a9f-7184d530dfc7`). Replaces the loose `design-*.html` files at the repo root (those are frozen legacy — never add new ones).

> **Role:** Claude Design is **token canon + generated component cards + Lane-B ideation + a screenshot archive** — NOT a hand-maintained mirror of shipped UI. The all-states source of truth is the in-app component gallery (`gallery.html`, dev-only) that renders the real code. See `docs/WORKFLOW.md` → "Design work" for the two-lane process + coverage standard.

The component cards are **generated from the real components** (2026-07-16), so Claude Design can read and reuse the actual markup when composing a layout. They're a projection of the gallery — the same role a Lane-A screenshot plays, but composable. The gallery stays the truth.

## Two kinds of card — don't mix them up

| | Generated | Hand-written |
|---|---|---|
| **Which** | `tokens/palette.html`, `components/{shared,results,leaderboard,me,schedule}.html` | `tokens/type.html`, `components/block-cards.html`, `components/tv-block-card.html`, `mockups/*` |
| **Edit by** | changing the component, then re-running | editing the file |
| **Why** | it mirrors shipped UI → must never be hand-kept | it's canon or ideation → nothing to drift from |

Each generated card carries a `GENERATED … do not edit` banner. Editing one is pointless: the next run overwrites it.

## Regenerating

```
npm run design:cards      # from cone/
```

Re-run after touching any component or `themes.css`, then re-sync. It SSRs the gallery's `GROUPS` (`src/public/gallery/Gallery.jsx`) via `vite.design.config.js` + `scripts/build-design-cards.mjs`, and exits non-zero if any component fails to render.

Each card inlines themes.css + the real component CSS + base64 fonts and carries a 4-theme switcher. Cards are ~350 KB — that's the cost of being self-contained, which is non-negotiable: **Claude Design's CSP blocks every external request** (no CDN, no fonts, no fetch).

### Known gaps in generated cards (by design, don't chase)

- **`ti` webfont icons don't render** in `components/results.html` and `components/schedule.html` — the Tabler *webfont* is CDN-loaded and CSP blocks it. Affected cards say so in their own header. Components on `@tabler/icons-react` inline their SVG and are fine. The icon-language decision is #53/B4's.
- **DemoPanel's YouTube embed** is blank in the card (same reason).
- **Stateful demos** render at their initial state — same coverage a screenshot gives.

## Rules

- One self-contained HTML file per card: inline CSS, no external requests.
- First line must be the card marker: `<!-- @dsCard group="Tokens" -->` (groups: `Tokens`, `Components`, `Mockups`). The pane builds its index from these — no explicit registration needed.
- Match the app's rules: TotK vars, no border-radius on public-page components, pt-BR strings.

## Lane-B flow (net-new surfaces only — per WORKFLOW.md)

Existing UI is **Lane A**: gallery-first, no static mockup. A hand-written card here is only ever for something that doesn't exist yet.

1. ASCII sketch in-session.
2. New card under `mockups/NN-slug.html`, built on the token + component cards.
3. Sync to claude.ai/design (DesignSync), **user reviews and approves** — the gate is real; never self-certify.
4. Implementation follows the approved card → the component enters the gallery → the static card is archived, never maintained as a mirror.

## Syncing

DesignSync: `list_files` → `finalize_plan` (localDir `cone/design`) → `write_files`.

## Current cards

| Card | Group | |
|---|---|---|
| `tokens/palette.html` | Tokens | **generated** — 4 themes × 29 tokens, parsed from `themes.css` |
| `tokens/type.html` | Tokens | Cinzel/Crimson Pro/Amarante scale |
| `components/shared.html` | Components | **generated** — SegBar · ExerciseList · RankList · WodBlockCard · AccordionCard · Nav |
| `components/results.html` | Components | **generated** — SessionCard · WodSummary · KpiGrid · LoggedResult · LogForm |
| `components/leaderboard.html` | Components | **generated** — WodCard · ScaleFilter · WodSelectCard |
| `components/me.html` | Components | **generated** — HeroCard · KpiStrip · AthletePicker · SessionList · EventList · GoalList · BarList · PrSection · sheets |
| `components/schedule.html` | Components | **generated** — RdCounter · DemoPanel · ExRow · BlockDetail · SessionDetail · LogPane · DeskRegPane · CheckinSheet |
| `components/block-cards.html` | Components | data-color canon — RED/AMBER/BLUE/GREEN families (`blkColor`, `lib/wod.js`) |
| `components/tv-block-card.html` | Components | screenshot archive: `BlockCard` (`src/public/tv/slides.jsx`) |
| `mockups/02-tv-desktop-refinement.html` | Mockups | TV controller desktop layout (#2) |
| `mockups/07-tv-countdown-pill.html` | Mockups | TV timer final-10s countdown pill (#12) |
| `mockups/18-schedule-design-b1.html` | Mockups | schedule.html design pass B1 (#50) |
| `mockups/20-result-card-exerciselist.html` | Mockups | result card using the real ExerciseList shape |

Retired 2026-07-16: `components/schedule-card.html` and `components/pills.html` were hand-built mirrors of shipped UI (the anti-pattern WORKFLOW bans) — superseded by the generated `schedule.html` / `shared.html`. Mockup **#19** (`19-result-card-copy-variants`) is cited by #20 but was never committed here; it exists only in the Design project.
