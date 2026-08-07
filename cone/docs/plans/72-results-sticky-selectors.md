# 72 — #144 · `results.html`'s athlete + week selectors scroll away

*Planned 2026-08-07 alongside plans/73 and plans/74, the refill after Tier 4 ranks 1–5 shipped.
**Not executed in that session** — its own session. **Sonnet · S.** Independent of 73 and 74 — no gate
either way. **Run it first of the three**: it is the only one carrying a latent correctness bug.*

## Context

On a phone, `results.html` scrolls its athlete `<select>` and its week arrows off the screen the
moment the results list moves — so changing either means scrolling back to the top of the page.
`schedule.html`, its sibling on the same viewport, solves exactly this. Verified 2026-08-07:
`Results.module.css` contains **zero** occurrences of `sticky`; `.selBar` (`:23`) and `.weekNav`
(`:27`) are plain flow. This is drift between two sibling pages, not a considered difference.

🔴 **This is NOT a copy-paste of #147's Schedule fix, and the board's row does not say why.** Two
structural differences, both measured 2026-08-07:

1. **Schedule renders its own `<header className={styles.hdr}>` inside `.stickyHead`**
   (`Schedule.jsx:938-939`). **Results uses the shared `Header.jsx`**, which is already
   `position:sticky; top:0; z-index:20` on its own (`Header.module.css:4-6`) and is shared with five
   other public pages. So Results starts with *one pinned element and two unpinned ones*, where
   Schedule started with three unpinned ones.
2. **`.weekNav` is not mobile-only here.** `Schedule.jsx`'s two bars are both `.mobileOnly`, which is
   why #147's hoist out of `<main>` was explicitly *"a no-op on desktop"* (its own comment says so).
   `Results.jsx:675` renders `.weekNav` with **no `.mobileOnly`** — Results has no other desktop week
   navigation, so `.weekNav` **is** the desktop control, sitting inside `.main`'s `overflow:hidden`
   flex column as a `flex-shrink:0` row. Hoisting it **is** a desktop layout change here.

🔴 **A latent bug must land in the same edit.** `Results.jsx:222-241` computes its `?session=` deep
link's `scrollMarginTop` from `document.querySelector('header')` — the shared `Header` **alone**. That
is correct today and becomes wrong the instant `.selBar`/`.weekNav` join the pinned block: the card
lands underneath them. That is precisely #147, which was a same-day regression in plans/68 caused by
landing half of a two-part fix. `Schedule.jsx:200-228`'s comment already anticipates this row by name.

**The token question is settled, do not reopen it:** `--spa-sticky-top` is **SPA-chrome-only**, public
pages have no top chrome, and Schedule's fix correctly uses `top: 0`. #144 copies `top: 0`; #95 owns
the token. There is nothing to coordinate (settled while planning plans/69).

## Scope

**Changed:** `src/public/results/Results.jsx` · `src/public/results/Results.module.css`.
Nothing else. No shared component changes, so **no `design:cards` run** unless one creeps in.

## Approach

**1 — One sticky block, not three offsets.** Wrap `<Header/>` + `.selBar` + `.weekNav` in a single
`.stickyHead` div that is a **direct child of `.pageRoot`** (`Results.jsx:648`), i.e. the two bars move
**out of `<main>`**, carrying their `{status !== 'loading' && …}` gate (`:653`) with them. Visual
order is unchanged — they already sit at the top of `<main>`, directly under the header.

```css
.stickyHead { position:sticky; top:0; z-index:20; }
@media(min-width:768px){ .stickyHead { flex-shrink:0; } }
```

Same single-wrapper pattern as `Schedule.module.css:37` and `criador.module.css` — it deletes the
per-bar offsets rather than promoting them, which is the whole lesson of #147.

**2 — Measure the wrapper, not the header.** Add a `stickyHeadRef` and swap
`Results.jsx:236-237`'s `document.querySelector('header')` measurement for
`stickyHeadRef.current.getBoundingClientRect().height + 8`. This is a direct copy of
`Schedule.jsx:157,225-226`, which exists because `.selBar` renders only when `!lockedId` and the
pinned block therefore has two different heights — **the same conditional applies here**
(`Results.jsx:655`), so a literal would be wrong on an athlete's own `?id=` link. Keep the
`requestAnimationFrame` and the `block:'start'`.

**Traps, all worth stating in the code:**
- `Header`'s own `position:sticky` becomes a harmless no-op once nested in the wrapper (its containing
  block is then exactly its own height). **Leave it alone** — it is shared with five other pages.
- `position:sticky` is clipped by an ancestor's box, so the wrapper **must not** land inside `.main`
  (`overflow:hidden` at ≥768px would kill it outright). Same trap CLAUDE.md records for Criador's
  `WeekGrid` fragment and Schedule's `.stickyHead`.
- `.pageRoot` is `display:flex; flex-direction:column` at ≥768px (`:6-8`), so the wrapper is a flex
  item there and needs `flex-shrink:0`; `.main` keeps `flex:1; min-height:0`.

## Acceptance

- On a 390px viewport, scrolling the results list leaves the athlete `<select>` and the week arrows
  pinned at the top; `.selBar`'s bottom divider survives the scroll (the #147 z-index symptom).
- On an athlete's own `?id=` link — where `.selBar` does not render — no gap opens between the header
  and `.weekNav`, and no content scrolls through it.
- A `?session=<id>` deep link at 390px lands the card **below** the whole pinned block: its first
  painted line is the session name, not a mid-session block.
- Desktop 1280 renders the same three regions in the same order, and `.main`'s internal-scroll model
  still works with the two bars hoisted out of it.
- `Results.module.css` contains exactly one `position:sticky` and **no** hand-written `top:` offset
  other than `0`.

## Verification

Drive it; do not infer it. Local stack, `npm run dev:public`, `results.html`.
⚠️ **Clear any `cone-v*` service worker first** — CLAUDE.md's standing warning, and the 2026-08-03
review confirmed a stale one was in fact present on the dev origin.

1. **390×844, no `?id=`** — scroll the list to the bottom. Assert both bars pinned;
   `document.elementFromPoint(195, <stickyHead height> + 4)` returns list content, not chrome.
2. **390×844, `?id=<athlete>`** — repeat. Measure the gap between the header's bottom and
   `.weekNav`'s top: must be **0** (this is the exact `.selBar`-is-conditional hole #147 found on
   Schedule).
3. **390×844, `?session=<id>`** — open a deep link from the index and assert the card's `getBoundingClientRect().top`
   is ≥ the sticky block's height, and that the session name is the first painted line.
   ⚠️ Re-measure the block height rather than trusting Schedule's 193/141 — these are different bars.
4. **1280** — confirm the week arrows still change weeks, the desktop panes still scroll internally,
   and nothing gained a second scrollbar.
5. All four themes at 390 (the wrapper introduces a new background-painting surface — confirm no
   transparent strip appears behind the pinned block on the two light themes).

`npm test` · `npm run lint` (`--max-warnings 0`) · `npm run format:check` · `npm run build:all`.

## Docs (part of Done)

`BACKLOG.md` — row → Done, and correct the row's claim that *"both pages hide these bars via
`.mobileOnly`"*, which is false for Results' `.weekNav`. This file gets its `> ✅ Done: <commit> · <date>`
marker. If the desktop hoist changes anything a future session would trip over, add a line to
CLAUDE.md's public-pages section — otherwise leave it; the `.stickyHead` pattern is already recorded
there for Criador and Schedule.

Model: **Sonnet** · Size: **S**
