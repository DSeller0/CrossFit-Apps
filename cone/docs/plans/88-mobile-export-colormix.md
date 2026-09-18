# 88 — Unbreak the mobile exports: `color-mix()` in the rasterised tree (#195a)

> ✅ Done: `27e27e5` · 2026-09-18 — see BACKLOG.md

> Split out of **#195** at planning on 2026-09-14. #195 filed one row for two different things: a
> *currently broken feature* and a *stale dependency*. This plan is the first half only. The library
> migration (`html2canvas` → `html-to-image`/`modern-screenshot`) stays in Icebox as **#195b**, M ·
> Opus, and is **not** a prerequisite for anything here.

## Context

**Two of the five Publicador export formats fail 100% of the time, today.** Dia mobile and Semana
mobile both throw `Error: Attempting to parse an unsupported color function "color"` and the coach
gets `Não foi possível gerar a imagem`. Dia / Semana / Mês desktop rasterise fine.

First seen while verifying #172 ([plans/84](./84-blockers-batch.md)'s Done marker records it as
"a separate, pre-existing, unrelated html2canvas/`color-mix()` incompatibility, left unfixed"),
reproduced live 2026-09-06, and folded into #195 as one line of an M/Opus dependency row — where it
has been sitting behind a library-swap decision it does not actually depend on.

**Mechanism, verified 2026-09-14.** `html2canvas@1.4.1`'s CSS colour parser has no `color-mix()`
support; it sees the `color` prefix and throws. The rasterised tree contains exactly **7**
`color-mix()` sites, **all** of them inline styles in `mobileExportViews.jsx`:

| Site | Value | Reached by |
|---|---|---|
| `:36`, `:568`, `:886` | `background: color-mix(in srgb, var(--a-hdr) 12%, transparent)` | every mobile block header |
| `:188`, `:248`, `:725`, `:785` | `border: 1px solid color-mix(in srgb, var(--a-int) 25%, transparent)` | every mobile intensity pill |

`:36` is the block-header pill and is **unconditional**, which is why this hits every session rather
than an unlucky one. `exportViews.jsx` — the desktop Dia/Semana tree — contains **zero**
`color-mix()`, which is exactly why desktop still works. The other `color-mix()` hits under
`publicador/` are on-screen chrome that is never rasterised: `agenda/*` and
`Publicador.module.css:631,632,663,664` (`.previewPixBtn`, `.reportError` — ReportModal, and on
`--accent`/`--red`, not on `--a-*`).

🔑 **This is a regression against a discipline the file it breaks already states.**
`exportPalette.js:14-19` opens with: *"Every value here is LITERAL HEX, never `var(--…)`. A
rasterised export must not depend on live custom-property resolution inside html2canvas's cloned
document."* The 8 `--a-*` roles honour that; `ExportFarm.jsx:24` spreads the resolved palette onto
the wrapper (`style={{ ...ctx.palette }}`) so every role reaches the DOM as a literal-hex custom
property. These 7 sites then wrap a compliant literal-hex var in a function the rasteriser cannot
parse. Fixing them **restores** the existing colour model rather than bending it.

## Acceptance

- Dia mobile and Semana mobile both produce a PNG, for an ordinary session, in all 8 themes.
- `grep -rn "color-mix" src/components/tabs/publicador/*.jsx` returns **0** — the rasterised tree
  carries none. (`agenda/` and the `.module.css` chrome keep theirs; they are never rasterised.)
- The on-screen preview is **pixel-identical** to before, at every format. The preview and the
  off-screen farm share `renderArtefact.jsx`, so a tint that changed would change both.
- `EXPORT_ROLES` still has exactly **8** entries, so Aparência → Personalizado still offers 8
  pickers and no more. The derived tints are **not** customisable roles.
- `exportPalette.test.js` covers the tint helper: known hex + pct → exact literal `rgba()`, and the
  derived keys present on every `resolveExportPalette` result.

## Files

- `src/components/tabs/publicador/exportPalette.js` — add the tint helper + derived keys.
- `src/components/tabs/publicador/mobileExportViews.jsx` — the 7 call sites.
- `src/components/tabs/publicador/exportPalette.test.js` — tests.
- No change to `ExportFarm.jsx` / `renderArtefact.jsx`: they spread whatever `palette` holds.

## Approach

1. **Derive the tints in `exportPalette.js`, as literal `rgba()`.** Add a pure
   `hexToRgba(hex, pct)` (module-local; `#rgb` and `#rrggbb`, returns `rgba(r,g,b,a)`), then have
   `resolveExportPalette` append the derived keys to the object it already returns —
   `--a-hdr-tint` (12% of `--a-hdr`) and `--a-int-edge` (25% of `--a-int`).
   🔴 **Derive them inside `resolveExportPalette`, NOT by adding entries to `EXPORT_ROLES`** —
   `EXPORT_ROLES` is what `OrigemCores.jsx` renders as the Personalizado picker list and what
   `legacyColorsToCustom`/`hasNonDefaultLegacyColors` iterate. A derived value is a function of a
   role, never a ninth role. Name them so that is obvious at the call site.
2. **Repoint the 7 sites** to `var(--a-hdr-tint)` / `var(--a-int-edge)`. Mechanical; no structural
   change to either mobile view, so #187's Eagles/MegaMan structural split is untouched.
3. **Tests** in the existing suite — the helper's arithmetic, and that both derived keys appear on
   a resolved palette for a default theme and for a `custom` override (a customised `--a-hdr` must
   move its tint with it, which is the whole reason to derive rather than hardcode).

⚠️ **Do not "while we're here" swap the library.** That is #195b and it re-opens every fit/crop
assumption in `useFitAutoShrink.js` + `fitCheck.js`. This plan must leave the rasteriser untouched
so the fix is attributable.

## Verification

1. `npm test` — the new tint tests plus the existing 16 in `exportPalette.test.js`.
2. `npm run dev`, Publicador, a real seeded session: export **Dia mobile** and **Semana mobile**.
   Both must download a PNG. Before the fix both fail — capture the console error first so the
   change is attributable to it.
3. Re-export **Dia** and **Semana** desktop and confirm no regression (they never used `color-mix`,
   so this is a guard, not a fix).
4. Switch the export Origem to a couple of themes (including a light one and one of #43's new
   families) and re-export mobile — the tint must follow `--a-hdr`, not freeze.
5. Compare the on-screen preview against the downloaded PNG at one format to confirm they agree.

Model: Sonnet   ·   Size: S
