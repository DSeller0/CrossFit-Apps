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
   is a `DROP TABLE` migration (**`0010`** — `0008` is taken by #71, and #194 claims `0011`) plus two
   lines. `lb_colors` has **zero** `.from()` call sites anywhere in `src/`.
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
- Every gallery group (**103 items across 14 groups**) renders with no unstyled element in the new
  themes, at 390 and 1280.
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

Model: **Opus** · Size: **L**
