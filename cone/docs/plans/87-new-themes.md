# 87 — #43 · Two new themes: Halo Reach + "Common"

> **The design-pass program's last row** ([plans/16](./16-design-pass-program.md)). Shipping this
> closes that umbrella doc, which should get its own Done marker in the same commit.
> **Lane B — mockup-first is mandatory** (plans/16 rule 1: C0 and #43 are the only Lane-B sessions
> because both define something net-new).

## Context

Four themes exist (`totk-dark`, `totk-light`, `spirit-blossom`, `spirit-blossom-light`). #43 adds
**two themes × dark+light = 4 new `html.theme-*` classes**. The "Common" one is the point: a
neutral, non-Zelda skin so Cone can be shown to a box that isn't this gym —
[plans/16](./16-design-pass-program.md)'s own Context names it as the program's goal.

Three corrections to the original row, all measured 2026-09-05:

1. **`--theme-accent` is no longer this plan's problem** — [plans/84](./84-blockers-batch.md) ships
   it (#175). It was #43's real premise: an inline `#00b8d4` on `<html>` beat every theme class, so
   *adding* four themes would have added four more broken ones. Confirm it landed before starting.
2. **The `lb_colors` fold-in is smaller than the row says.** It reads "drop the table + `App.jsx`
   sync plumbing (`:128-132`, `:173`)" — **that plumbing is already gone.** What remains is the DB
   table (`0001_init.sql`) and two script lists (`backup-supabase.mjs:37`, `seed-dev.mjs:41`), so it
   is a `DROP TABLE` migration plus two lines. `lb_colors` has **zero** `.from()` call sites
   anywhere in `src/`.
   ⚠️ **Migration-number collision, resolved 2026-09-13.** Three rows had pre-claimed numbers against
   a disk whose highest is **`0009`**: this row and BACKLOG **#102** both claimed `0010`, and **#194**
   claimed `0011`. Resolution — **this row takes `0010`** (it is the one actually being written;
   `0010` is simply the next free number at ship time), **#194 keeps `0011`**, and **#102 moves to
   `0012`**; #102's row was corrected in the same commit. 🔴 **A backlog row must not pre-claim a
   migration number** — ship order is not knowable in advance, so the number belongs to whoever
   writes the file. #102's and #194's rows now say "next free at ship time" alongside the figure.
3. **plans/16's acceptance — *"#43 can add a theme by touching only `themes.css` +
   Configurações"* — becomes true only once [plans/86](./86-tv-timer-surface-pass.md) lands.** The
   sole violation is `tv/tvController.module.css`'s ~22 bare literals (`AppChrome.module.css`'s 21
   hex are all `var(--token, #fallback)` pairs and theme correctly — a first reading gets this wrong).
   **Do not start this plan before 86 ships**, or the two new light themes inherit a broken tab.

## Acceptance

- **Both designs mockup-approved by the user before any implementation** (plans/16 rule 1 + the
  standing approval gate: in auto mode the run *stops* at "states ready for your review").
- 4 new `html.theme-*` classes in `CrossFit-Apps/themes.css`, each defining **all 29 tokens** plus
  `--podium-1/2/3`. Token count per theme stays exactly 29 — verified programmatically, the way
  every other 29-token claim in `CLAUDE.md` is.
- Registered in `public/lib/theme.js`'s `THEMES` and selectable in Configurações **and** on
  `tema.html`.
- 🔴 **Contrast measured, not assumed**, for every new theme against #14's standing table — the same
  9 pairs the 2026-09-05 pass re-measured. ⚠️ **Do not repeat the known failures**: `--dim` is below
  3:1 in all four existing themes and `--muted` on `--stone2` drops to 2.96 in spirit-blossom. The
  new themes should clear the bar where the old ones don't; if a palette can't, say so explicitly
  rather than shipping a fifth and sixth failing `--dim`.
- Every gallery group (**108 items across 16 groups** — re-measured 2026-09-13 via
  `GROUPS.reduce((s,g)=>s+g.items.length,0)` against `.design-build/design-cards-entry.js`; the
  "103 across 14" this line used to carry predates [plans/86](./86-tv-timer-surface-pass.md) adding
  the **TV** and **Timer** groups) renders with no unstyled element in the new themes, at 390 and 1280.
- `lb_colors` dropped (migration `0010`, applied to prod per the standalone-SQL workflow, then
  `migration repair --status applied 0010`) and removed from the two script lists.
- `plans/16` carries a Done marker; `npm run design:cards` re-run (it inlines `themes.css`, so every
  card changes) and committed.

## Files

- `CrossFit-Apps/themes.css` — the 4 new class blocks
- `src/public/lib/theme.js` (`THEMES`) · `src/public/lib/theme.test.js`
- `src/components/tabs/Config.jsx` (selector) · `src/public/tema/Tema.jsx` + `Tema.module.css`
  (the 4 preview cards and their `--pv-*` values)
- `cone/design/` — the Lane-B mockups (palette swatches + in-context cards), synced
- `cone/supabase/migrations/0010_drop_lb_colors.sql` (new) ·
  `scripts/backup-supabase.mjs:37` · `scripts/seed-dev.mjs:41`
- `docs/plans/16-design-pass-program.md` — the closing marker

## Approach

1. **Confirm the two prerequisites shipped**: #175 (so `--theme-accent` follows the theme) and
   plans/86 (so `tvController` is tokenised). Both are stated above; neither is optional.
2. **Lane B, mockup first.** Palette swatches + in-context component cards in `cone/design/`, synced
   to the Cone Design System. ⚠️ **`plans/82` cited `design/mockups/64-publicador-WIP.html` as an
   approved record and that file is not in the repo** — the 2026-09-05 pass flagged it. Commit these
   mockups to `cone/design/` so this doesn't recur.
3. **Stop at the gate.** Do not implement until the user approves both palettes.
4. Add the 4 blocks to `themes.css`. `--border` is **derived per palette** (plans/65: the point on
   that palette's own `--div → --muted` ramp measuring 1.50:1 against `--divider`) — derive it, don't
   copy a literal. Two of the four new classes are light themes, where "stronger" means *darker*.
5. Register in `THEMES`, the Configurações selector and `tema.html`'s cards.
6. Drop `lb_colors`: migration `0010` + the two script lines. Additive-free and reversible only by
   restore, so confirm with the user that nothing wants that data first.
7. Re-run `npm run design:cards` and commit. Mark `plans/16` done.

## Verification

- **Measure contrast** for all 9 pairs × 4 new themes and record the table in the Done marker, so
  #14 inherits real numbers rather than a claim.
- Drive **every public page + every SPA tab** in each new theme at 390 and 1280 — including
  `Quadro ao Vivo` (the surface plans/86 just fixed) and `tema.html` itself.
- Confirm the pre-paint FOUC script still resolves for the new classes on all 10 built pages: a
  repeat visit must not flash. All 10 carry the identical inline script today (verified 2026-09-05).
- Confirm a `?box=` visitor with a box default set to a new theme gets it, and that a visitor's own
  `cone_theme_user` pick still wins — the whole point of #143's two-key model.
- `npm test` · `npm run lint` · `npm run build:all` · `/verify` live · `/code-review` (L).

## Measured at the Lane-B gate (2026-09-13) — awaiting approval

Mockups committed and synced: `design/mockups/65-halo-reach-theme.html` ·
`design/mockups/66-common-theme.html` (numbered **65/66**, skipping 64 on purpose — plans/82 cites a
`64-publicador-WIP.html` that was never committed, and reusing the number would make that dead
reference ambiguous). Each card carries the palette swatches, the measured table, the derived
`--border`, the in-context components and the exact `themes.css` block it proposes.

**Prerequisites confirmed by commit, not re-derived:** #175 in `efcbb50` (plans/84) · plans/86 in
`748e826`.

**Token count** — all four blocks are exactly **29**, no duplicates, verified programmatically
against the emitted blocks.

**`--border`, derived per palette** (plans/65's `--div → --muted` ramp at 1.50:1 vs `--divider`;
the derivation script reproduces all four *existing* themes' shipped values to within 1–2 hex units,
which is what makes it trustworthy here):

| theme | `--divider` | `--border` | vs divider | vs `--bg` |
|---|---|---|---|---|
| halo-reach-dark | `#1f2630` | `#39424e` | 1.50 | 1.91 |
| halo-reach-light | `#c8d2db` | `#a0adb8` | 1.49 | 1.93 |
| common-dark | `#23282e` | `#3e444b` | 1.51 | 1.94 |
| common-light | `#d5dade` | `#adb3b9` | 1.50 | 1.89 |

Existing four measure 1.80–1.98 vs `--bg`; surface elevations (`--div`/`--bg` 1.26–1.29,
`--stone`/`--bg` 1.07–1.12, `--stone2`/`--bg` 1.05–1.15) were tuned into the existing 1.18–1.33 /
1.05–1.14 bands rather than left wherever the first draft landed.

**Contrast — #14's 9 standing pairs, plus 3 cells later passes made load-bearing.** Bar is 4.5:1,
except `--dim` at 3:1 (non-text use: borders and focus).

| pair | halo-reach-dark | halo-reach-light | common-dark | common-light |
|---|---|---|---|---|
| `--cream`/`--bg` | 16.66 | 15.60 | 16.39 | 16.06 |
| `--sub`/`--bg` | 10.22 | 7.33 | 9.75 | 7.57 |
| `--muted`/`--bg` | 6.41 | 5.05 | 6.13 | 5.21 |
| `--dim`/`--bg` | 4.32 | 3.36 | 3.96 | 3.48 |
| `--gold`/`--bg` | 9.55 | 5.01 | 9.08 | 5.20 |
| `--teal`/`--bg` | 8.77 | 5.05 | 6.75 | 5.22 |
| `--green`/`--bg` | 8.66 | 5.01 | 8.09 | 5.24 |
| `--red`/`--bg` | 5.93 | 5.03 | 5.69 | 5.23 |
| `--accent-text`/`--accent` | 8.99 | 5.99 | 7.07 | 5.85 |
| `--muted`/`--stone2` | 5.57 | 4.82 | 5.33 | 4.79 |
| `--dim`/`--stone2` | 3.75 | 3.21 | 3.44 | 3.20 |
| `--accent-text`/`--green` | 8.87 | 5.95 | 8.47 | 5.87 |

🔴 **Every cell passes in all four new themes — no exception had to be taken.** The acceptance
allowed for declaring a palette that genuinely could not clear `--dim`; none of them needed it. For
comparison, `--dim` fails 3:1 in **all four existing** themes (2.27 / 2.49 / 1.75 / 3.60), `--gold`
fails on both existing light themes (3.79 / 4.49), and `--muted`/`--stone2` is 2.96 in
spirit-blossom. The last three rows are the cells outside #14's original table that plans/65,
plans/86 and the 2026-09-05 pass each turned into real bugs; they are measured here so the new
themes cannot reintroduce one.

**Typography — a proposal inside the gate, not a decided fact.** Both families use **system stacks
only** (Halo Reach: system mono for `--font`, system sans for body/`--sc-font`; Common: system sans
throughout). No `@fontsource` package, no new weights, no `src/fonts.js` change — which is what
keeps plans/16's acceptance (*"#43 can add a theme by touching only themes.css + Configurações"*)
literally true rather than nearly true. If the user wants a loaded display face instead, that is a
font-loading change and re-opens that acceptance.

**Also confirmed at the gate (removes a verification item):** the pre-paint FOUC script is an
unconditional `document.documentElement.classList.add('theme-' + t)` — **no whitelist** — identical
on all 9 themed entry pages (`athletes.html` is the redirect stub and carries none). New ids
therefore resolve with **zero per-page edit**; only `THEMES` in `theme.js` gates them.

**Open decisions for the review** (both cards end on these): class naming
(`halo-reach-dark`/`-light`, `common-dark`/`-light` — explicit suffix on both, unlike
`spirit-blossom`'s bare dark), the pt-BR selector labels, and the typography call above.

---

Model: **Opus** · Size: **L**
