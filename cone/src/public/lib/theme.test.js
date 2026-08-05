import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  THEMES,
  DEFAULT_THEME,
  isTheme,
  resolveTheme,
  applyTheme,
  syncTheme,
  getUserTheme,
  setUserTheme,
  clearUserTheme,
  getAppliedTheme,
} from './theme.js'

// resolveTheme is the whole per-box theme policy (#143). It is the piece with four
// precedence branches and an unknown-id fallthrough at every level, so it is where the
// tests live — the DOM-touching helpers around it are thin.

// vitest runs in the `node` environment (vite.config.js), so localStorage and document are
// stubbed by hand — same approach boxScope.test.js takes for its own URL/storage tests.
let store
let classes

const rootClasses = () => [...classes]

beforeEach(() => {
  store = {}
  classes = new Set()
  globalThis.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: k => {
      delete store[k]
    },
  }
  globalThis.document = {
    documentElement: {
      classList: {
        add: c => classes.add(c),
        remove: c => classes.delete(c),
        contains: c => classes.has(c),
      },
    },
  }
})

afterEach(() => {
  delete globalThis.localStorage
  delete globalThis.document
})

describe('THEMES', () => {
  it('is the canonical list of the 4 palettes in themes.css', () => {
    expect(THEMES.map(t => t.id)).toEqual([
      'totk-dark',
      'totk-light',
      'spirit-blossom',
      'spirit-blossom-light',
    ])
    expect(THEMES.every(t => typeof t.label === 'string' && t.label.length > 0)).toBe(true)
  })

  it('recognises only its own ids', () => {
    expect(isTheme('totk-light')).toBe(true)
    expect(isTheme('nope')).toBe(false)
    expect(isTheme(null)).toBe(false)
    expect(isTheme(undefined)).toBe(false)
  })
})

describe('resolveTheme precedence', () => {
  it('falls back to the default with nothing set anywhere', () => {
    expect(resolveTheme()).toBe(DEFAULT_THEME)
    expect(resolveTheme({ settings: {}, box: null })).toBe(DEFAULT_THEME)
  })

  it('4 — uses the gym-wide default when there is no box and no user pick', () => {
    expect(resolveTheme({ settings: { theme: 'totk-light' } })).toBe('totk-light')
  })

  it('3 — a box theme beats the gym-wide default when that box is scoped', () => {
    const settings = { theme: 'totk-light', boxThemes: { b1: 'spirit-blossom' } }
    expect(resolveTheme({ settings, box: 'b1' })).toBe('spirit-blossom')
  })

  it('3 — a box theme applies ONLY under its own scope', () => {
    const settings = { theme: 'totk-light', boxThemes: { b1: 'spirit-blossom' } }
    expect(resolveTheme({ settings, box: 'b2' })).toBe('totk-light')
    expect(resolveTheme({ settings, box: null })).toBe('totk-light')
  })

  it('1 — the visitor pick beats both the box default and the gym default', () => {
    const settings = { theme: 'totk-light', boxThemes: { b1: 'spirit-blossom' } }
    setUserTheme('spirit-blossom-light')
    expect(resolveTheme({ settings, box: 'b1' })).toBe('spirit-blossom-light')
    expect(resolveTheme({ settings, box: null })).toBe('spirit-blossom-light')
  })

  it('hands control back to the box default once the pick is cleared', () => {
    const settings = { boxThemes: { b1: 'spirit-blossom' } }
    setUserTheme('totk-light')
    expect(resolveTheme({ settings, box: 'b1' })).toBe('totk-light')
    clearUserTheme()
    expect(resolveTheme({ settings, box: 'b1' })).toBe('spirit-blossom')
  })
})

// The fallthrough is the guard that keeps a retired theme id, or a hand-edited blob, from
// putting a `theme-<garbage>` class on <html> and silently dropping the page onto the
// :root fallback.
describe('resolveTheme ignores unknown ids at every level', () => {
  it('falls through a bad user pick to the box theme', () => {
    const settings = { boxThemes: { b1: 'totk-light' } }
    expect(resolveTheme({ settings, box: 'b1', userTheme: 'retired-theme' })).toBe('totk-light')
  })

  it('falls through a bad box theme to the gym default', () => {
    const settings = { theme: 'totk-light', boxThemes: { b1: 'retired-theme' } }
    expect(resolveTheme({ settings, box: 'b1' })).toBe('totk-light')
  })

  it('falls through a bad gym default to DEFAULT_THEME', () => {
    expect(resolveTheme({ settings: { theme: 'retired-theme' } })).toBe(DEFAULT_THEME)
  })

  it('survives a settings blob with no theme keys at all', () => {
    expect(resolveTheme({ settings: { gymName: 'X' }, box: 'b1' })).toBe(DEFAULT_THEME)
  })
})

describe('getUserTheme', () => {
  it('is null until the visitor picks — that null is what enables the box default', () => {
    expect(getUserTheme()).toBe(null)
  })

  it('rejects a stored id that is no longer a real theme', () => {
    localStorage.setItem('cone_theme_user', 'retired-theme')
    expect(getUserTheme()).toBe(null)
  })

  it('refuses to store an unknown id in the first place', () => {
    setUserTheme('retired-theme')
    expect(localStorage.getItem('cone_theme_user')).toBe(null)
  })
})

describe('applyTheme', () => {
  it('swaps the root class and caches the applied id', () => {
    applyTheme('totk-light')
    expect(classes.has('theme-totk-light')).toBe(true)
    expect(getAppliedTheme()).toBe('totk-light')

    applyTheme('spirit-blossom')
    expect(classes.has('theme-totk-light')).toBe(false)
    expect(classes.has('theme-spirit-blossom')).toBe(true)
  })

  it('coerces an unknown id to the default rather than applying it', () => {
    expect(applyTheme('retired-theme')).toBe(DEFAULT_THEME)
    expect(classes.has('theme-retired-theme')).toBe(false)
    expect(classes.has('theme-' + DEFAULT_THEME)).toBe(true)
  })

  it('leaves unrelated root classes alone', () => {
    classes.add('some-app-class')
    applyTheme('totk-light')
    expect(rootClasses()).toEqual(['some-app-class', 'theme-totk-light'])
  })
})

describe('syncTheme', () => {
  it('applies the box theme for a scoped visitor with no pick of their own', () => {
    const settings = { boxThemes: { b1: 'spirit-blossom-light' } }
    expect(syncTheme(settings, 'b1')).toBe('spirit-blossom-light')
    expect(classes.has('theme-spirit-blossom-light')).toBe(true)
  })

  it('leaves the visitor pick alone', () => {
    setUserTheme('totk-light')
    applyTheme('totk-light')
    expect(syncTheme({ boxThemes: { b1: 'spirit-blossom' } }, 'b1')).toBe('totk-light')
    expect(classes.has('theme-totk-light')).toBe(true)
  })
})
