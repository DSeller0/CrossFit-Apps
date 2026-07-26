# 40 — #99 · index.css triage (dead / tab-owned / global)

> Planned 2026-07-26 from the [full review pass](../reviews/2026-07-26.md).
> Run order: [39 Publicador](./39-publicador-decomposition.md) → **40 (this)** → [41 gallery](./41-gallery-decomposition.md).
> Absorbs the CSS half of **#73**. The Serviços (#56) and Agenda (#59) design passes are held
> behind this — it is what stops each of them re-deriving the same answers.

## Context

`src/index.css` is **892 lines**: **244 hex lines**, **101 literal `border-radius`** against
only **2** tokenised, and 26 decimal `rgb()`. It is the single largest design-debt file in the
repo, and **no session owns it** — C1–C5 are per-*tab* passes and this is the global SPA
stylesheet, so it has fallen between them for the whole program.

It is also not really one stylesheet. It is a **graveyard of tab-owned CSS** awaiting each
tab's design pass. Line 603 already says so out loud:

```css
/* Config tab styles moved to Config.module.css (#55/C1). */
```

That is the established pattern and the precedent this plan generalises. Without the triage,
C2, C3 and C5 each have to answer "is this rule mine, global, or dead?" from scratch — three
times, inconsistently.

**The output is a classification, plus only the deletions that classification proves safe.**
This is not a blanket tokenize pass; see the bucket rules.

## Acceptance

- Every rule in `index.css` is in exactly one of three buckets, and the file's section
  comments say which.
- **DEAD** rules are gone, each deletion backed by a zero-consumer grep.
- **TAB-OWNED** rules carry a `/* → moves to <Tab>.module.css in #NN */` marker so the
  owning pass inherits the answer.
- **GLOBAL** rules have their hex/radius literals tokenised.
- `src/App.css` deleted; `--lb-font` removed from all five blocks of `themes.css`.
- Zero undefined-token references remain anywhere in the repo (deleting `App.css` achieves
  this outright — it holds all five).
- `npm test` green (530/530), `npm run build:all` clean.
- **Every SPA tab and every public page walked at 1280 and 390 in all four themes** with no
  unstyled element. This is the real acceptance test — see Verification.

## The three buckets

- **DEAD** → delete. Verified by grepping the selector for a consumer across `src/**` **and**
  the root `*.html` files.
- **TAB-OWNED** → **leave in place**, tag with the marker comment. Do **not** move it now:
  moving it is that tab's design pass, and doing it here means touching the tab twice.
- **GLOBAL** → keep, and tokenize its literals. **This is the only bucket worth tokenizing** —
  a TAB-OWNED rule gets deleted when its tab adopts a module during C2/C3/C5, so tokenizing it
  now is work thrown away.

## Section map (already read — use as the starting classification, verify each)

```
6–32     chrome (topbar / tab-bar / sticky)      → GLOBAL — but #95 rewrites it, see below
33–44    themed panes (Resultados + Publicador)  → tab-owned?
45–57    form                                    → the global zoo C0 replaces
58–69    buttons (.b / .bp / .bsec / .bd)        → the global zoo C0 replaces
70–190   session card · block · block colours ·  → nominally Criador-owned — MIXED, see ⚠️
         exercise · intensity · add block ·
         week overview · pill colours
191–288  publisher controls · daily · weekly     → Publicador-owned (#59)
289–389  Resultados tab                          → Resultados-owned (#57)
390–442  Results tab                             → public results.html
443–470  Leaderboard (+ colour variables)        → public leaderboard.html
471–479  scrollbars                              → GLOBAL, already tokenised (63d8394)
480–508  Login screen                            → GLOBAL
509–602  Quick Log tab
603      Config → moved out (#55/C1)             ← the precedent
605–621  sync / conflict                         → GLOBAL
622–892  Criador redesign · block type picker ·  → Criador-owned (moved in #26/#58?)
         benchmark list · locked benchmark
```

⚠️ **The 70–190 block is exactly why this needs evidence, not assumption.** Criador moved to
`criador.module.css` in #26/#58, so these rules *look* dead wholesale. A spot check says
otherwise:

| selector | references in `src/**/*.jsx` |
|---|---|
| `blk-row` | **0** — dead |
| `add-blk` | 1 |
| `sess-card` | 1 |
| `pill-` | 1 |
| `ex-row` | 2 |
| `wk-day` | 4 |
| `intensity` | **57** |

Partially dead. **Delete per-selector on proof, never per-section.**

Carry over #73's standing warnings: dynamic class construction was never ruled out, and
`RankList.module.css`'s `pod1/2/3` plus `TallyBar.module.css`'s `lg`/`sm` are near-certain
false positives — do not touch those.

## Tokenizing — the mechanical rule for the GLOBAL bucket

The four themes define the **same 30 variable names** with different values, so
`color: #f0e8d0` is frozen (right in totk-dark, wrong in the other three) while
`color: var(--cream)` follows the theme. Nothing fails when it's wrong — you only see it by
switching themes, which is why this bug keeps recurring here (`TallyBar`'s baked-in
`rgba(13,11,9,.65)`, the TV ring track #85, the scrollbars `63d8394`, and now #97).

Per literal:

1. Look it up against the **`totk-dark`** block — that is the palette it was authored from.
2. **Exact match → replace**: `#1e1a16` → `var(--stone2)`, `#d8a840` → `var(--gold)`,
   `#f0e8d0` → `var(--cream)`. Decimal `rgb(216,168,64)` is the same colour written
   differently — convert to hex first, then look it up.
3. **Alpha overlay → no token exists** (the 30 are opaque). Use
   `color-mix(in srgb, var(--cream) 5%, transparent)` rather than `rgba(255,255,255,.05)`.
   White-alpha overlays are the family that broke both light themes in `TV.module.css`.
4. **Matches nothing → classify, don't force it.** Either an **exempt data colour** — one that
   identifies a *thing* and must stay stable across all four themes (`blkColor` families,
   `SCALE_COL`, `FAMILY_GROUPS`, `--podium-*`, `TypePicker`'s three benchmark colours) — or a
   genuine one-off needing a judgment call. **Never tokenize a data colour.**
5. **Radius**: literal px → `var(--radius-sm)` (4px) / `var(--radius-md)` (6px); `50%` true
   circles are **exempt**; `999px` pills are rounded rects and get squared.

## Coordinate with #95 (the topbar rework)

Lines 6–32 are the chrome #95 rewrites, and `.tab-bar{top:44px}` is a hardcoded assumption
about the topbar's height that **breaks the moment the topbar wraps** — which is the mobile
bug #95 exists to fix. Whichever ships second inherits the other's shape. **Prefer landing
this triage first** and letting #95 rewrite a clean, already-tokenised block. Do not
restructure the chrome here; just classify and tokenize it.

## Fold in from #73 (its CSS half)

- **Delete `src/App.css`** — imported by nothing (Vite-template leftover) and holds **all five**
  undefined tokens in the repo (`--accent-bg`, `--accent-border`, `--text-h`, `--social-bg`,
  `--shadow`). Deleting the file zeroes that category outright.
- **Remove `--lb-font`** from all five blocks of `themes.css` (`:28,40,52,64,76`) — 0 usages,
  re-confirmed 2026-07-26.

#73 keeps its non-CSS residue: `utils/config.js`'s dead `DAYS`/`DEFAULT_TYPES`/`TYPES`, and the
Crimson Pro 600 font payload.

## Verification

1. `npm test` — 530/530 green. (Tests cannot catch a CSS regression; this only guards the JS.)
2. `npm run build:all` — clean.
3. **The real test — walk everything.** A deleted-but-live rule renders as an unstyled
   element, which nothing automated will catch:
   - **Every SPA tab**: Criador · Atletas · Exercícios · Serviços · Resultados · Agenda ·
     Publicador · Quadro ao Vivo · Configurações.
   - **Every public page**: index · schedule · results · me · leaderboard · timer · tv ·
     recover.
   - At **1280 and 390**, in **all four themes**. The theme switch is what surfaces a wrong
     token; the width switch is what surfaces a deleted layout rule.
4. Re-run the review's census script to confirm the numbers moved: hex lines and literal radius
   in `index.css` should both drop, and repo-wide undefined tokens should be **0**.
5. ⚠️ Service-worker trap: unregister and clear `cone-v*` before concluding a change "didn't
   apply".

Model: Sonnet · Size: M
