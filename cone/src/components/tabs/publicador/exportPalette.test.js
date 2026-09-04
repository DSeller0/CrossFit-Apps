import { describe, it, expect } from 'vitest'
import { THEMES, DEFAULT_THEME } from '../../../public/lib/theme.js'
import {
  EXPORT_ROLES,
  resolveExportThemeId,
  resolveExportPalette,
  legacyColorsToCustom,
  hasNonDefaultLegacyColors,
} from './exportPalette.js'

describe('EXPORT_ROLES', () => {
  it('is the 8-role table', () => {
    expect(EXPORT_ROLES).toHaveLength(8)
    expect(EXPORT_ROLES.map(r => r.role)).toEqual([
      '--a-bg',
      '--a-div',
      '--a-hdr',
      '--a-name',
      '--a-int',
      '--a-note',
      '--a-sub',
      '--a-on-accent',
    ])
    expect(EXPORT_ROLES.every(r => typeof r.token === 'string' && r.token.startsWith('--'))).toBe(
      true,
    )
  })
})

describe('resolveExportPalette', () => {
  it('returns literal hex for every role, never var(--…)', () => {
    const palette = resolveExportPalette({ themeId: 'totk-dark' })
    expect(Object.keys(palette)).toHaveLength(8)
    Object.values(palette).forEach(v => {
      expect(v).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })

  it('matches the measured totk-dark defaults (29/37 sites were exactly these)', () => {
    const palette = resolveExportPalette({ themeId: 'totk-dark' })
    expect(palette['--a-bg']).toBe('#0d0b09')
    expect(palette['--a-hdr']).toBe('#4ac8c0')
    expect(palette['--a-name']).toBe('#c8b090')
    expect(palette['--a-int']).toBe('#d8a840')
    expect(palette['--a-note']).toBe('#554a3a')
  })

  it('differs across all 4 themes — the theme test this pass inverts', () => {
    const seen = new Set(THEMES.map(t => JSON.stringify(resolveExportPalette({ themeId: t.id }))))
    expect(seen.size).toBe(4)
  })

  it('an unknown theme id falls through to DEFAULT_THEME rather than being applied', () => {
    expect(resolveExportPalette({ themeId: 'retired-theme' })).toEqual(
      resolveExportPalette({ themeId: DEFAULT_THEME }),
    )
  })

  it('custom overrides win per-role, and only for the roles actually set', () => {
    const palette = resolveExportPalette({
      themeId: 'totk-dark',
      custom: { '--a-hdr': '#ff00ff' },
    })
    expect(palette['--a-hdr']).toBe('#ff00ff')
    expect(palette['--a-bg']).toBe('#0d0b09') // untouched role still the theme's value
  })
})

describe('resolveExportThemeId precedence — box preset then coach theme', () => {
  it('falls back to the coach-wide theme with no box scoped', () => {
    expect(resolveExportThemeId({ settings: { theme: 'totk-light' } })).toBe('totk-light')
  })

  it('a box preset beats the coach-wide theme when a box is the Origem', () => {
    const settings = { theme: 'totk-light', boxThemes: { b1: 'spirit-blossom' } }
    expect(resolveExportThemeId({ settings, box: 'b1' })).toBe('spirit-blossom')
  })

  it('a box preset applies only under its own box', () => {
    const settings = { theme: 'totk-light', boxThemes: { b1: 'spirit-blossom' } }
    expect(resolveExportThemeId({ settings, box: 'b2' })).toBe('totk-light')
  })

  it('falls through an unknown box preset to the coach theme', () => {
    const settings = { theme: 'totk-light', boxThemes: { b1: 'retired-theme' } }
    expect(resolveExportThemeId({ settings, box: 'b1' })).toBe('totk-light')
  })

  it('falls all the way to DEFAULT_THEME with nothing set', () => {
    expect(resolveExportThemeId()).toBe(DEFAULT_THEME)
  })
})

describe('legacy colour migration', () => {
  it('maps each role from the first legacy key present', () => {
    const legacy = { dvDate: '#111111', wkHeader: '#222222', dvBg: '#333333' }
    const custom = legacyColorsToCustom(legacy)
    expect(custom['--a-hdr']).toBe('#111111') // dvDate wins over wkHeader (listed first)
    expect(custom['--a-bg']).toBe('#333333')
  })

  it('omits a role with no legacy key set at all', () => {
    expect(legacyColorsToCustom({})).toEqual({})
  })

  it('reports false for a profile that never touched the drawer', () => {
    expect(hasNonDefaultLegacyColors({})).toBe(false)
  })

  it('reports false when every legacy key equals its totk-dark default', () => {
    expect(hasNonDefaultLegacyColors({ dvBg: '#0d0b09', dvDate: '#4ac8c0' })).toBe(false)
  })

  it('reports true when a legacy key diverges from totk-dark', () => {
    expect(hasNonDefaultLegacyColors({ dvDate: '#9b59b6' })).toBe(true)
  })
})
