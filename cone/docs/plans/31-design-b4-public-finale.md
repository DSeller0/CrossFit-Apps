# 31 — Design pass B4: index + timer + tv + recover (#53)

> 🟡 **Part A shipped: `1ae207b`** (all 7 mechanical items — Nav timer double-render,
> Index→`blkColor`, TV white-alpha→tokens, hex/token/radius sweep, theme-aware QR +
> `index.html` theme-color, Benchmark color). **Part B pending the mockup-approval gate.**

Backlog: **#53** (Icebox → Ready). The last public-page design debt — #50/#51/#52 swept the
other five clean, so these four hold essentially all of it. Unblocked now that **#69** (tv
webfont) shipped. Program umbrella: [plans/16](./16-design-pass-program.md).

## Context

Two parts. **Part A** is mechanical Lane-A debt (tokens/hex/radius + confirmed bugs — just fix,
no mockup). **Part B** carries genuine design decisions that hit the **mockup-approval gate**
(WORKFLOW "Design work": in auto mode, stop after syncing the mockup; never self-certify).

## Acceptance

- All 4 pages render correctly across **all 4 themes** at 390 + desktop, 0 console errors, no
  dark/white bands on light themes.
- Nav Timer destination appears **once** per surface.
- The landing page paints block families with the **same** colors as every other page.
- QR codes scan on a light theme.
- Part A ships independently; Part B stops at the approval gate with a synced mockup.
- `npm test` + `build:all` green; affected Design cards regenerated + synced.

## Files (Part A)

`src/public/Nav.module.css`, `src/public/index/Index.jsx` + `Index.module.css`,
`src/public/tv/TV.module.css` + `tv/slides.jsx`, `src/public/timer/Timer.module.css`,
`src/public/recover/*`. (Censuses per the #53 backlog row.)

## Approach — Part A (mechanical, no gate)

1. **Nav Timer double-render bug** (confirmed): `.desktopTab {display:none}`
   (`Nav.module.css:44`) and `.btn {display:flex}` (`:53`) are equal specificity (0,1,0) and
   `.btn` is later in source, so the Timer tab (`btn desktopTab`) renders in the mobile bar
   **and** again in the "Mais" overflow (`Nav.jsx:41-44`). Fix: raise both hide/show rules to
   `.btn.desktopTab` (0,2,0) — base `display:none`, `min-width:768px` block `display:flex`.
2. **`Index.jsx` divergent block-family taxonomy**: `BLOCK_COLORS` paints WOD teal / Força
   `#c87850`, misses `Cardio`/`LPO`/`HIIT`/`MetCon`/`Acessórios` — replace with canonical
   `blkColor` (`wod.js`; `Index.jsx` already imports canonical `WOD_TYPES`).
3. **TV white-alpha overlays** break both light themes (`TV.module.css:77/268/272`
   `rgba(255,255,255,.0x)`) → tokens. **Keep** `:14`'s deliberate `background:#000` blank slide.
4. **Hex/token/radius sweep**: decimal-`rgb()` frozen tokens → vars (`Timer.module.css:63/65/92/134`,
   `Index.module.css:8/30`, `TV.module.css:127/133/134/135/196`); `color:#000` →
   `var(--accent-text)` (`Timer.module.css:80/81/82`); square non-circle radii (keep `50%`
   circles) across TV/Timer/Recover/Nav/Index.
5. **QR palette** hardcoded to dark (`slides.jsx:56/412`, cream-on-transparent → unscannable on
   light): read the theme via `getComputedStyle` for QR fg/bg (canvas can't take a CSS var).
6. **BlockTypePicker Benchmark color** conflict (`#d05878` here vs amber in `wod.js`) — decide
   canonical, record, align.
7. **`index.html` `<meta theme-color>`** hardcoded to teal — document / make theme-aware.

## Approach — Part B (design decisions → mockup + approval gate)

- **index.html dead right-half** (#18 — content stops ~790px of 1280): a layout decision.
- **TV single-block font-scale** idea; **icon-language** decision (emoji vs Tabler in Nav);
  `'Courier New'` ×5 in `TV.module.css` → pairs with #54's `--font-mono` decision.

Produce a Claude Design ideation mockup in `cone/design/`, sync it, and **stop for user
approval** before implementing (do not self-certify). Part A can ship first.

## Verification

Drive all 4 pages at desktop + 390 across all 4 themes on the local stack (Playwright): 0
console errors, no light-theme banding, Nav Timer once per surface, index colors match other
pages, QR scans on a light theme. `npm test` + `npm run build:all` green; regenerate + sync
affected Design cards.

## Sizing note
Heaviest of the current trio (M→L, Opus). Part B may spill into a follow-up session after the
mockup gate; Part A is a complete shippable slice.

Model: Opus · Size: M→L
