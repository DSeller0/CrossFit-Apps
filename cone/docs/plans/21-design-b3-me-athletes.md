# 21 — Design pass B3: me.html + athletes.html (#52)

> ⏸ **Paused at the gallery gate (2026-07-12)** — components built, all states in `gallery.html`, screenshots in [reviews/img/52-gallery/](../reviews/img/52-gallery/). Awaiting the user's Claude Design mockup pass on the me.html **layout** before the page re-layout proceeds. The retirement, extraction, canonical adoption and fold-ins are done.

## Context

Third execution session of the design-pass program ([plans/16](./16-design-pass-program.md)), unblocked by #51 (B2). Each surface gets one session that does design refinement **plus** its slice of #15 (hex→tokens), #14 (mechanical a11y), #18 (scroll-in-panes), and #17 (component extraction that feeds the gallery).

B3's named decision was **retheme athletes.html or retire it**. The evidence is one-sided: nothing links to it (not in `Nav.jsx`'s `TABS`, not from any page or the SPA), it is the **last public page that force-writes colors over the chosen theme** (`Athletes.jsx:332-345` — the bug class #50 deleted from `Schedule.jsx` and #51 from `Leaderboard.jsx`), it uses **zero** shared components, and its picker + PRs + goals are already richer on me.html. #30 (`me.html?id=` + QR codes) supersedes its reason to exist. **Retire it.**

Its one idea worth keeping — the 5 "Desenvolvimento" character-stat bars — is **not ported**. All five are broken, and the data audit showed the *category* of stat they attempt is not currently computable. That became its own item: [plans/22](./22-athlete-character-stats.md).

## ⚠️ Correction to an earlier draft of this plan

An earlier draft called me.html's **Taxa RX** a live 🔴 bug, reasoning that blocks carry per-exercise scales in `exerciseRows[]` that a flat `b.scale` read would miss. **The audit disproved that:** `exerciseRows` is written by **nothing** in `cone/src` (only the retired root-level `schedule_builder_pt.html` ever wrote it), and every current log path always sets a flat `blk.scale`. `deriveScale()` therefore falls through to `blk.scale`, and me.html's number is correct.

Adopting `deriveScale()` is still right — it's the canonical reader and it genuinely changes behavior on *legacy* rows (where `exerciseRows` exists and the weakest scale is the honest one) — but it is a **consistency fix, not a bug fix**.

## Decisions settled with the user (2026-07-12)

1. **Retire athletes.html**, leaving a redirect stub.
2. **me.html remembers the athlete**: adopt the `cone_athlete_filter` localStorage key results/schedule already share, and pass `lockedId` to `Nav`. The picker becomes a *first-visit* screen.
3. **pt-BR**: "Scale" → "Escala", "Streak" → "Sequência". **RPE stays** (used in the box; results/schedule also say RPE).
4. **The stats card does not ship here** — #52 reserves the slot; the capture work comes first (plans/22).

## Lane + approval gate

**Lane A (gallery-first)** — the page exists, so no static mockup up front. Build the real components, render every state in `gallery.html` across **4 themes × 2 widths**, screenshot into the Design System, and **stop**.

> 🛑 **The gate is real.** Hand back at "states ready for your review" and remind the user they want to mock up the layout in Claude Design using the extracted components. The page **re-layout** resumes only on their explicit go-ahead. Mechanical extraction, canonical-code adoption and fold-ins may proceed before the gate; visual re-layout may not.

Judgment calls for the gate:
- **Where the reserved Desenvolvimento slot goes** in `contentGrid` (see §5).
- **The body-metrics sheet.** Since plans/22 guarantees bodyweight persistence lands (#19), *don't* hide it — that would be hide-then-restore churn. Keep the sheet, give it a **real labeled entry point** (today it's an unlabelled avatar click, `Me.jsx:641`), keep the honest "not yet saved remotely" warning.
- **Distribuição/WODs bar colors** — collapsing `ECOL` means 7 labeled rows share 2 family colors instead of 13 bespoke ones.

## 1. Retire athletes.html

**Keep the URL, delete the app.** `athletes.html` becomes a ~10-line file (still in `vite.public.config.js`'s input) mapping `?athlete=<id>` → `me.html?id=<id>`; bare → `me.html`.

Not politeness about bookmarks — it **dodges the sharpest edge of retirement**: `sw.js:12` precaches `./athletes.html`, and `cache.addAll` (`sw.js:21`) **rejects atomically on a 404**, so deleting the file outright means the service worker **fails to install for every user, on every page**. With the stub, `sw.js` needs no edit and no `CACHE_VERSION` bump.

Delete `cone/src/public/athletes/` (541-line `Athletes.jsx` + CSS + main). Nothing imports it.

**Nothing of value is lost.** Unique features: the 5 stat bars (→ plans/22), future sessions + Ausente/Atrasado (→ Icebox), the roster goal-% grid (→ #56/C2), and it is the only consumer of `results_v2.energyLevel` — a field **every athlete-facing path hardcodes to `3`** (`Results.jsx:218`, `Schedule.jsx:368/400`), so it carries no information.

## 2. Design refinement

**a. Remember the athlete.** Seed `selAthlete` from `localStorage['cone_athlete_filter']`, write it back on select — the contract in `Results.jsx:58/153` and `Schedule.jsx:58/282`. Pass `lockedId` to `<Nav>` (`Me.jsx:818`): the `me` tab is **already `lockable: true`** (`Nav.jsx:12`), so **zero Nav changes** — `Nav.jsx:59` appends `?id=` for free. `?id=` still wins. Add a "trocar atleta" affordance (desktop has the `selPane` rail; mobile needs one).

**b. Canonical scale colors (the real 🔴).** `Me.jsx:21` + `Me.module.css:101-105` paint **SC orange, Inter blue**; canonical `SCALE_COL` (`wod.js:24`, reconciled in #51) says **Inter orange, SC purple** — the same result shows a different-colored badge on me.html than on results/leaderboard. Delete `SCLS` and the `bRx`/`bSc`/`bInter`/`bAdp` rules; import `scaleColor`/`scaleLabel`; route block-scale reads through `deriveScale()`.

**c. `ECOL` → canonical `blkColor()`.** `Me.jsx:11-17` is a 13-entry per-*type* color map existing nowhere else, disagreeing with the 4-family system (`wod.js:6-13`) even where they overlap. Collapse onto `blkColor()` — the page's biggest hex pocket.

**d. Native dialogs → the app's own.** `clearPr` uses `window.confirm` (`:332`) / `window.alert` (`:334`). Replace with in-page states. **Do not mint a fourth copy of the confirm block** — shared `ConfirmReview` is **#54 (C0)**'s.

**e. Icon language.** `me.html:11` loads the Tabler **webfont CDN** for exactly two icons (`:866`, `:870`). Convert to `@tabler/icons-react` and **drop the CDN link** — the precondition for using any `shared/` component here (shared/ can't depend on the webfont; #51 learned that on leaderboard).

**f. pt-BR.** "Scale" → "Escala", "Streak" → "Sequência".

## 3. Component extraction (#17 → gallery)

`Me.jsx` is **907 lines**, everything inlined, **no helpers file** — the last public page that never got the #50/#51 treatment. Split `src/public/me/`:

`HeroCard.jsx` · `KpiStrip.jsx` · `AthletePicker.jsx` (picker + desktop rail, one component two layouts) · `SessionList.jsx` · `GoalList.jsx` · `PrSection.jsx` · `PrLogSheet.jsx` · `BodySheet.jsx` · **`meHelpers.js`** (the 9 pure helpers at `Me.jsx:23-97`, today untested).

**Adopt `shared/AccordionCard.jsx`** in `PrSection`, which hand-rolls **two** disclosure levels (`:842-850`, `:864-877`) with text carets, no `aria-expanded`, no keyboard.

**Not applicable:** `RankList`, `ScaleFilter`, `ExerciseList`. **Not built:** `StatBars` — plans/22 owns it.

## 4. Fold-ins

- **hex:** 28 literals + ~12 `rgba()` → **0**. Most die with `ECOL` (13) and the scale badges (3); the rest are the delta good/bad pair `#68d8a0`/`#e05848`, hardcoded in **three** places (`:219-226`, `:860`, `:79`) — `goals.js`'s `prDelta` already returns `{label, good}`, so this becomes one helper + two tokens.
- **radius:** 2 rounded-rects to square (`.retryBtn` 5px, `.lsCatPill` 3px). The 3 `50%` circles are exempt.
- **a11y (#14):** 3 click-divs → `role`/`tabIndex`/keyboard; the 2 sheet scrims get `role="dialog"`/`aria-modal`/Esc/focus-trap and must stop being able to open **simultaneously** (both render unconditionally at `z-index:101`); 3 icon-only buttons → `aria-label`; `:866`'s check/circle icon encodes has-PR/no-PR **purely as an icon** → text alternative. Add `<main>` + `<h1>` — the page has **neither**, and **zero** `aria-*`. `aria-live` on loading/error.
- **#18:** already satisfied (`Me.module.css:12-25`) — verify, don't rebuild.
- **fonts (program rule 4):** `Me.module.css` uses **weight 800** 5× while `src/fonts.js` loads Cinzel 400/600/700/900 → **add `@fontsource/cinzel/500.css` + `/800.css`**. First session to trigger the rule.
- **dead CSS:** 7 unused rules (`.profRow`; `.sessItem`/`.sessInfo`/`.sessName`/`.sessDate`/`.sessBadges`, a superseded card layout; `.bRpe`) + the desktop media query still styling them.
- **dup utils:** `mapResultRow` inlined verbatim at `:177` → `lib/blobTables.js`. `fmtEvDate` (`:26`) + inline `toLocaleDateString` (`:419`) → `week.js`.

**Deliberately not touched:** `BLOB_TABLES` — Me's fetch isn't a drop-in (needs `exercise_registry`, carries retired `lb_colors`). After athletes.html goes it has one consumer; note on #60, don't churn the sync layer in a design session.

## 5. Reserve the Desenvolvimento slot

**Reserve it in the layout, don't render a placeholder.** No empty card, no "em breve". What #52 owes plans/22:
- a decided **home** in `contentGrid` (`colMain` above Objetivos), sized so a 5–6-bar card drops in without a re-layout;
- the extraction (§3) done so `StatBars.jsx` is a one-file addition;
- **the segmented-bar visual settled at the gallery gate** — `Athletes.jsx`'s `BlockBar`/`StatRow` (`:109-135`, 10 segments + a milestone tick) is the one piece of its design worth keeping, and `Atletas.jsx`'s `HpBar` (`:296-353`) is a third copy of the same idea. Design it **once**, in the gallery, as a shared component the stats card and the goal bars both use.

## Acceptance

- **Gallery states built + screenshotted, 4 themes × 2 widths, handed back for the user's Claude Design pass, before the page re-layout proceeds.**
- `athletes.html?athlete=<id>` → `me.html?id=<id>`; the service worker still installs (all 8 `PRECACHE_URLS` 200 from `public-dist/`).
- me.html remembers the athlete across a visit **and** across tabs; `?id=` still overrides.
- A scale badge on me.html is the **same color** as the same scale on results/leaderboard.
- The Desenvolvimento slot has a decided home and a **shared segmented-bar component**.
- Zero hardcoded hex, zero rounded-rects in `me/*`; `<main>` + `<h1>`; every control Tab/Enter/Space reachable; sheets close with Esc and can't both be open.
- 1280×800 + 390×844 under **all 4 themes**, 0 console errors.

## Files

**Retire:** `athletes.html` → redirect stub; delete `cone/src/public/athletes/*`. `vite.public.config.js` + `sw.js` **unchanged** (the point of the stub).
**me.html:** `src/public/me/Me.jsx` (907 → ~300) + `Me.module.css`; new `HeroCard/KpiStrip/AthletePicker/SessionList/GoalList/PrSection/PrLogSheet/BodySheet.jsx` + `meHelpers.js`; `me.html` (drop the `ti` CDN link).
**Shared:** `src/fonts.js` (Cinzel 500 + 800); the segmented-bar component.
**Gallery:** `gallery/Gallery.jsx`. **Tests:** `meHelpers.test.js`.
**Docs:** `BACKLOG.md`, `CLAUDE.md`, `CONE_CONTEXT.md`, `docs/FEATURES.md`, this plan, `plans/22`.

## Verification

Local stack, Playwright, **4 themes × 2 widths**, 0 console errors.

1. `athletes.html?athlete=<id>` → me.html with that athlete; bare → me.html. `npm run build:all` → `public-dist/athletes.html` exists and every `PRECACHE_URLS` entry 200s.
2. Pick an athlete on me.html → results.html → back → same athlete, no picker. Reverse too. `?id=` still overrides.
3. Screenshot a scale badge on me.html vs results/leaderboard — colors match.
4. Keyboard: Tab/Enter/Space through the picker, both PR accordion levels, the sheets; Esc closes; both sheets can't open at once.
5. **Seed fixtures — prod has ~zero results.** Any KPI/session-list verification needs hand-seeded rows in the local stack; revert after.
6. `npm test` · `npm run build:all` · gallery emits no chunk.
7. `/code-review`.

Model: Opus · Size: M→L
