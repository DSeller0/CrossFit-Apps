// Theme resolution — which of the 4 palettes a page renders in (#143).
//
// The theme used to be purely per-device: a bare `cone_theme` localStorage string, applied
// by an inline pre-paint script duplicated in all 11 HTML entries, with exactly one shipped
// switcher (the SPA's Configurações tab). #143 adds two more sources — a per-box default the
// coach sets, and an explicit pick any visitor can make from tema.html — without changing
// that boot script.
//
// TWO KEYS, and the split is the whole design:
//   cone_theme       the theme CURRENTLY APPLIED. Unchanged contract — this is what the
//                    inline boot script reads, so it stays a plain cache of the last
//                    resolved answer and every HTML entry keeps working untouched.
//   cone_theme_user  the visitor EXPLICITLY PICKED this. New, and separate on purpose: it
//                    is what lets a box default apply to a first-time visitor while never
//                    overriding someone who has already chosen.
//
// Pure + client-free (no Supabase import, direct or transitive) — the gallery renders
// against it, same rule as boxScope.js beside it.

const KEY_APPLIED = 'cone_theme'
const KEY_USER = 'cone_theme_user'

export const DEFAULT_THEME = 'totk-dark'

// The 4 palettes, canonical. This list used to exist in three divergent shapes (Config.jsx
// with a `swatch` field, gallery/fixtures.js as {v,label}, and the design mockups) — both
// live consumers now re-import from here. Ids match themes.css's `html.theme-*` classes.
export const THEMES = [
  { id: 'totk-dark', label: 'TotK Dark' },
  { id: 'totk-light', label: 'TotK Light' },
  { id: 'spirit-blossom', label: 'Spirit Blossom Dark' },
  { id: 'spirit-blossom-light', label: 'Spirit Blossom Light' },
]

export const isTheme = id => THEMES.some(t => t.id === id)

// Swap the root class and cache the answer. Replaces Config.jsx's own copy AND Index.jsx's
// regex rewrite of `documentElement.className` — the latter matched `\btheme-\S+`, so it
// would also have eaten any future `theme-`-prefixed utility class.
export function applyTheme(id) {
  const theme = isTheme(id) ? id : DEFAULT_THEME
  try {
    const root = document.documentElement
    THEMES.forEach(t => root.classList.remove('theme-' + t.id))
    root.classList.add('theme-' + theme)
    localStorage.setItem(KEY_APPLIED, theme)
  } catch {
    /* ignore — a page with no DOM/storage still renders on themes.css's :root fallback */
  }
  return theme
}

export function getAppliedTheme() {
  try {
    return localStorage.getItem(KEY_APPLIED) || DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

// The visitor's own pick, or null if they've never made one. Null is meaningful — it is
// what hands control back to the box/gym default.
export function getUserTheme() {
  try {
    const v = localStorage.getItem(KEY_USER)
    return isTheme(v) ? v : null
  } catch {
    return null
  }
}

export function setUserTheme(id) {
  try {
    if (isTheme(id)) localStorage.setItem(KEY_USER, id)
  } catch {
    /* ignore */
  }
}

export function clearUserTheme() {
  try {
    localStorage.removeItem(KEY_USER)
  } catch {
    /* ignore */
  }
}

// The whole policy, in one pure function. Precedence, highest first:
//   1. the visitor's own pick          — always wins; the server never overrides a choice
//   2. settings.boxThemes[box]         — the coach's default for the active ?box= scope
//   3. settings.theme                  — the gym-wide default
//   4. DEFAULT_THEME
//
// ⚠️ An unknown id at any level falls THROUGH to the next rule rather than being applied.
// A theme retired from THEMES, or a hand-edited blob, would otherwise add a `theme-<garbage>`
// class and drop the page onto themes.css's :root fallback with nothing on screen saying why.
export function resolveTheme({ settings = {}, box = null, userTheme } = {}) {
  const pick = userTheme === undefined ? getUserTheme() : userTheme
  if (isTheme(pick)) return pick

  const boxTheme = box && settings.boxThemes ? settings.boxThemes[box] : null
  if (isTheme(boxTheme)) return boxTheme

  if (isTheme(settings.theme)) return settings.theme

  return DEFAULT_THEME
}

// One call per public page, from wherever that page already fetches `settings`. Applies
// only on a change, so the common case (the boot script already got it right) touches
// nothing. Returns the resolved id.
//
// A first-ever scoped visit still flashes once — the boot script is synchronous and the
// settings fetch is not. That flash already existed on index.html, and it self-corrects
// from the second load now that cone_theme caches the resolved answer.
export function syncTheme(settings, box) {
  const next = resolveTheme({ settings, box })
  if (next !== getAppliedTheme()) applyTheme(next)
  return next
}
