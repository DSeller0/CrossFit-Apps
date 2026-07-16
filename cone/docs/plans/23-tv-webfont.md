# 23 — #69 · tv.html renders in Times New Roman

## Context

`tv.html` — the one screen the whole gym looks at — has never rendered in Cinzel.

**Root cause (traced, not guessed):** `src/public/tv/main.jsx` was created in `92d2449` (**2026-06-26**) as a **59%-similarity copy of `src/public/me/main.jsx`** (`git log --follow --name-status` reports `C059`), and the `import '../../fonts.js'` line was dropped in the copy. `git log -S "fonts.js" -- src/public/tv/main.jsx` returns **zero commits** — it was never there. That is why nobody caught it: there was no regression moment, and the page has been fontless for all **20 days** of its life.

**Mechanism:** `TV.module.css:9`'s `.canvas` correctly specifies `font-family: var(--font, 'Arial Black', Arial, sans-serif)` → resolves to `Cinzel, serif`. But with no `@font-face` ever registered, Cinzel is unavailable and the browser falls through to generic `serif` = **Times New Roman** on Windows.

**Measured live (local stack, 2026-07-16):**

| Page | Cinzel faces loaded | Total faces |
|---|---|---|
| `leaderboard.html` | **12** | 23 (Cinzel / Crimson Pro / Amarante) |
| `tv.html` | **0** | 1 (tabler-icons only) |

`html`, `body` and `.canvas` all compute to `"Times New Roman"`.

Found by the 2026-07-16 full pass ([reviews/2026-07-16-full-pass.md](../reviews/2026-07-16-full-pass.md)). **Ship before #53/B4** — restyling a wall that renders in the wrong font measures the wrong thing.

## Acceptance

1. `tv.html` loads **12** Cinzel faces (matching every other public entry) and the wall renders in Cinzel.
2. A regression guard exists so a future public entry cannot ship fontless.
3. No visual regression on the TV at 1920 across all 4 themes.

## Files

- `cone/src/public/tv/main.jsx` — **the fix** (1 line)
- `cone/src/public/tv/TV.module.css:9` — kill the dead fallback
- `cone/src/public/entries.test.js` — **new**, the guard

## Approach

1. **The fix.** Add `import '../../fonts.js'` as line 3 of `src/public/tv/main.jsx` — byte-identical to the line all 8 sibling entries carry at line 3 (verified: index, leaderboard, me, results, schedule, timer, recover, gallery).

2. **Kill the misleading fallback.** `TV.module.css:9` → `font-family: var(--font);`. The `'Arial Black', Arial, sans-serif` fallback is **dead code**: `--font` is defined in all 5 blocks of `themes.css`, so it always resolves and the `var()` fallback can never fire. Remove it precisely because it is what *masked* this bug — the line reads as though it has a safety net.

3. **The guard (new test).** `src/public/entries.test.js`: glob `src/public/*/main.jsx`, assert each source contains `fonts.js`. Feasible as-is — `vite.config.js` runs vitest with `environment: 'node'` over `src/**/*.test.js`, so `fs` is available and no new dep is needed. This is the cheap, permanent answer to a bug class that shipped because a copied entry silently lost a line. Keep it to one focused test; it is not a licence to build an entry-linting framework.

**Do NOT** add a `font-family` declaration to `tv.html`'s inline `<style>`. It is the only public entry without one, but `.canvas` already specifies the font correctly — the bug is the missing `@font-face`, not the missing declaration. Adding one would mask the real fix.

## Verification

1. `npm run dev:public`, open `tv.html`, assert in the console:
   - `[...document.fonts].filter(f => /cinzel/i.test(f.family)).length` → **12** (was 0)
   - `getComputedStyle(document.querySelector('[class*="canvas"]')).fontFamily` → `Cinzel, serif`, and it now *renders* as Cinzel.
2. Screenshot the wall at **1920** across **all 4 themes** — this is a display whose whole job is legibility from across a room; a font change is a visual change and wants eyes on it.
3. `npm test` (137 = 136 + the new guard) · `npm run build:all` clean.
4. Confirm the guard actually guards: temporarily remove the import, watch the test go red, restore.

Model: Sonnet · Size: S
