# 67 — #142 + #143 · Per-box theme + a public Tema page

> ✅ Done: `7f09fcc` · 2026-08-05 — see BACKLOG.md
>
> **#142 was reproduced live before being fixed**, which is what turned it from a code-reading
> claim into a measurement: with the pre-fix file restored, opening Publicador took the local
> settings blob from **54 keys to 48** and deleted `theme`, `boxThemes`, `gymSub`, `logo`,
> `customBenchmarks` and `boxWarnings` outright. It also **blanked `gymName` and `label` to `''`**
> — a facet the row didn't name: Publicador doesn't only drop keys it doesn't know, it overwrites
> ones it does with its own possibly-empty local state. Fixed with the `...loadSettings()` spread
> plus a `useRef` mount guard; re-run with the fix in place, all six keys survived.
>
> **#143** shipped as planned, with one structural addition: `ThemeCards.jsx` was split out of
> `Tema.jsx` so the gallery could render it — `Tema.jsx` imports `supabaseClient` and the gallery
> has no backend. **The preview design changed during execution:** the plan assumed each preview
> could carry its own `theme-*` class, but themes.css scopes every palette to **`html.theme-*`**,
> so a nested preview cannot inherit the theme it previews. Resolved with fixed-hex preview
> classes — the same exemption `Config.module.css`'s swatches already carry, recorded in both
> files.
>
> Verified live end to end against the local stack (SW cleared first) at 390 and 1280: the
> coach set Eagles → Spirit Blossom Dark in Config, saved, and `me.html?box=<eagles>` rendered
> in it; `?box=` on two other boxes resolved to their own themes; a visitor pick beat both and
> survived navigation; "Usar o tema do box" cleared it and returned to the box default; the
> Nav sheet showed three tiles carrying `?box=`. `public-dist/tema.html` confirmed built.
>
> ⚠️ **Observed, not filed:** `Me.jsx` `replaceState`s to `me.html?id=<athlete>` on load, dropping
> `?box=` from the URL. Benign — `getBoxScope()` has already persisted the scope by then, so the
> theme and the filter both survive, including for a first-time visitor following a shared link.

*Planned 2026-08-05. Executed in the same session (the user asked to tackle it immediately).*
🔴 **#142 runs first and is not optional** — it is a live data-loss bug that would silently eat
`#143`'s new `settings.boxThemes` key on the coach's next Publicador visit.

## Context

The theme is **per-device** today: a bare `cone_theme` localStorage string, applied by an inline
pre-paint script duplicated byte-for-byte in all 11 HTML entries, with exactly **one** shipped
switcher (`Config.jsx`'s 2×2 grid in the SPA's Configurações tab). A box that wants its own look has
no way to get one, and an athlete on a public page has no way to change the theme at all.

The user wants two things, decided 2026-08-05:
- the coach assigns a **default theme per box**, so a `?box=X` visitor lands on that box's look;
- any visitor can **override it for themselves**, from a new **Tema** page reached from the Nav
  overflow sheet — the sheet that today holds exactly Timer and Coach.

Two findings from the planning research shape the whole design.

---

## #142 — opening the Publicador tab deletes five keys from the `settings` blob

`saveSettings` (`storage.js:174-177`) is `cacheLS` + `dbSaveSettings` — **a blind overwrite, no
merge**. Every other caller compensates by read-merging at the call site (`Config.jsx:36`,
`useBoxWarnings.js:18` — whose comment even says *"mirrors Config.jsx so theme/gymName survive"*,
`BlockEditor.jsx:158-163`, `App.jsx:196`, `LeaderboardView.jsx:154`).

**`Publicador.jsx:138-188` does not.** It lists its own 45 export-styling keys and nothing else, and
it is a **mount-firing effect** seeded from `loadSettings()`. So merely opening the tab writes a
settings blob missing `gymSub`, `logo`, **`boxWarnings`** (#53, a shipped feature), `customBenchmarks`
and `theme`.

**Fix:** spread `...loadSettings()` into the object, **and** add a `useRef` mount guard so the effect
skips its first run. Both halves are needed — this is the #109/#111 class CLAUDE.md documents at
length ("a load/read path never writes"); the spread alone stops the *loss* but still re-upserts the
whole blob on every tab open, stamping a fresh `updated_at` for nothing.

⚠️ **Do not "fix" this by making `saveSettings` itself merge.** That changes semantics for every
caller and makes deleting a key impossible. The convention here is read-merge at the call site.

---

## #143 — per-box theme + the Tema page

### Storage — it must be `settings`, not `locations`

`settings.value.boxThemes = { [locationId]: themeId }`, mirroring `settings.value.boxWarnings`.

🔴 `0006_lock_business_reads.sql:28-29` dropped anon read on `locations`, so **public pages cannot read
a location object at all** — a theme stored on the box row would be invisible to every page that needs
it. `useBoxWarnings.js:6-7` already records exactly this reasoning for #53. `settings` keeps its
`"public read"` (`0001_init.sql:127`). **No migration** — both are JSONB blobs.

The gym-wide default goes in **`settings.value.theme`**, which finally gives that key a writer:
`Index.jsx:51-61` has been *reading* it since forever and nothing in the repo has ever written it.

### The two localStorage keys

| Key | Meaning | Written by |
|---|---|---|
| `cone_theme` | **the theme currently applied** — unchanged contract | `applyTheme`, i.e. every resolution |
| `cone_theme_user` | **the visitor explicitly picked this** — new | the Tema page only |

🔑 **The 11 HTML entries' inline boot script does not change.** It reads `cone_theme`, which keeps its
exact current meaning; `cone_theme` simply becomes a *cache* of the last resolved answer. Keeping the
visitor's pick in a **separate** key is what lets the server-side default apply to a first-time visitor
without ever overriding someone who has chosen.

### `src/public/lib/theme.js` — new, pure, client-free, unit-tested

Same convention as `boxScope.js` (which it sits beside and pairs with). Exports:

- **`THEMES`** — the 4 `{ id, label }`. **Canonical.** The list exists in three shapes today
  (`Config.jsx:7-12` with a `swatch` field, `gallery/fixtures.js:8-13` as `{v,label}`, and the design
  mockups); Config and the gallery re-import from here.
- **`applyTheme(id)`** — remove all 4 classes, add one, write `cone_theme`. Replaces `Config.jsx:18-23`
  **and** `Index.jsx:56-59`'s regex root-class rewrite (which is the more fragile of the two — it
  string-replaces `\btheme-\S+` on `className`, so it would also eat any future `theme-`-prefixed
  utility class).
- **`getUserTheme()` / `setUserTheme(id)` / `clearUserTheme()`** — `cone_theme_user`.
- **`resolveTheme({ settings, box })`** — the whole policy in one pure function:
  1. `cone_theme_user` — an explicit visitor pick **always wins**
  2. `settings.boxThemes?.[box]` — when a `?box=` scope is active
  3. `settings.theme` — the gym-wide default
  4. `'totk-dark'`
- **`syncTheme(settings, box)`** — `resolveTheme` then `applyTheme` if it differs. One call per page.

⚠️ `resolveTheme` must **ignore an unknown id** (a theme deleted from `THEMES`, or a hand-edited blob)
and fall through to the next rule — otherwise a bad value adds a `theme-<garbage>` class and the page
renders on the `:root` fallback with no explanation.

### Wiring — 6 public pages

Replace `Index.jsx:51-61`'s inline block with `syncTheme(settings, box)`, and add the same one-liner to
the existing settings fetch in `Schedule.jsx` · `Results.jsx` · `Me.jsx` · `Leaderboard.jsx` ·
`Timer.jsx`. All five already fetch `settings` (for `gymName`) and already hold `box` from
`getBoxScope()`, so this is one line each, not plumbing.

**`tv.html` is deliberately out of scope** — the gym wall has no box scope, is driven by TvController
rather than a `?box=` link, and its colour work is #97. Stated, not left ambiguous.

**A first-ever scoped visit still flashes once** before the settings fetch lands, because the boot
script is synchronous and the settings are not. That flash exists on `index.html` today; it
self-corrects from the second load, since `cone_theme` now caches the resolved answer. Accepted.

### The Tema page

`tema.html` at the **repo root** (entries live there, not in `cone/` — `vite.public.config.js` sets
`root: '..'`) + `src/public/tema/{main.jsx,Tema.jsx,Tema.module.css}`. Head copied verbatim from
`timer.html:1-15` (boot script + `themes.css`).

Content: the 4 themes as cards that apply **instantly on tap** (writing `cone_theme_user`), plus a
**"Usar o tema do box"** reset that clears the key and re-runs `syncTheme`. `<Nav box={box} />` at the
bottom. The reset is only offered when a user pick is actually in effect — otherwise it is a button
that does nothing.

🔴 **Three registration steps, all mandatory, all silent when missed:**
1. `vite.public.config.js:25-35` — add to `rollupOptions.input`. A missing entry produces **no build
   error**, just a 404 on the deployed site.
2. `sw.js:6-16` — add `'./tema.html'` to `PRECACHE_URLS`.
3. `sw.js:1` — bump `CACHE_VERSION` `'cone-v7'` → `'cone-v8'`.

⚠️ **`cache.addAll` rejects atomically on a 404**, so steps 1 and 2 must land in the same deploy —
a `sw.js` entry for a page that isn't built stops the service worker installing **for every user, on
every page**. This is precisely why the retired `athletes.html` stub is still in the repo.

### The Nav tile

`Nav.jsx:100-109` — a third `<a className={s.ovTile}>` with `IconPalette` from `@tabler/icons-react`
(**never** the `ti` webfont: `leaderboard.html` doesn't load it and Nav is shared by every page).
Route it through the existing `hrefFor` so `?box=` and `?id=` propagate, as #124/plans/59 established
for the other two tiles. `.ovGrid` is a hardcoded `repeat(2,1fr)` → `repeat(3,1fr)`.

Add the same link to the desktop `.sideExtra` block (`Nav.jsx:147-153`) — the sheet is mobile-only
(`Nav.module.css:85`), so without this desktop has no way to reach the page.

### The coach UI

`Config.jsx`'s **Tema** section, not `Servicos.jsx`. Deliberate: all theme state stays in one section
under one storage key, and `Servicos.jsx`'s `LocFormModal` is a 340px hardcoded-hex modal predating the
`ui/` primitives — the wrong surface to extend.

- The existing 4-button grid stays exactly as it is, relabelled **"Meu tema"** — device-local, instant,
  bypasses Salvar. Unchanged behaviour, just named now that it is one of three things.
- New **"Tema por box"** beneath it: a *Padrão da academia* row writing `settings.theme`, then one row
  per `type:'box'` location (from `loadLocations()`) writing `settings.boxThemes[id]`. Both persist
  through the existing `save()`, which already read-merges.

---

## Acceptance

- A `?box=X` visitor with no pick of their own sees box X's theme on all 6 public pages.
- A visitor's own pick survives navigation and reload, and is never overridden by the server.
- "Usar o tema do box" returns them to the box default.
- `public-dist/tema.html` exists after `npm run build:all`; the SW installs at `cone-v8`.
- **Opening Publicador no longer deletes `boxWarnings`/`gymSub`/`logo`/`customBenchmarks`/`theme`.**
- `npm test` · `npm run lint` clean at `--max-warnings 0` · `npm run build:all` · `npm run format`.

## Verification

**Live**, local stack, at 1280 and 390. ⚠️ Clear the service worker + `cone-v*` cache **first** —
CLAUDE.md's SW-poisoning trap makes edits silently not appear, with no console error.

1. `index.html?box=<id>` with a theme set on that box → renders in it.
2. Mobile Nav sheet → **three** tiles; tap Tema → opens with `?box=` intact.
3. Pick another theme → applies instantly, survives navigation to `schedule.html`/`me.html`, and
   survives a reload of the scoped index.
4. "Usar o tema do box" → back to the box default.
5. Unscoped visit with `settings.theme` set → gym default applies.
6. **#142 regression, the one that matters:** set a box warning in Criador → open Publicador → return
   to Criador. The warning must still be there. **This fails on `main` today.**

**Gallery:** the Tema cards render as a case; `fixtures.js`'s `THEMES` re-points at the canonical
export. Open `gallery.html` — dev-only, never built, **no CI gate catches a broken import there**.
Regenerate `npm run design:cards`.

## Ritual

BACKLOG: Done entry; close #142 and #143. Done marker on this plan. Commit + push.

Model: Opus · Size: M
