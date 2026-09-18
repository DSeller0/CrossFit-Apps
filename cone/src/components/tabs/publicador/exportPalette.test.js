import { describe, it, expect } from 'vitest'
import { THEMES, DEFAULT_THEME } from '../../../public/lib/theme.js'
import {
  EXPORT_ROLES,
  resolveExportThemeId,
  resolveExportPalette,
  legacyColorsToCustom,
  hasNonDefaultLegacyColors,
  hexToRgba,
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
    // 8 roles + the 2 derived tints (#195a) — not var(--…) either, see below.
    expect(Object.keys(palette)).toHaveLength(10)
    EXPORT_ROLES.forEach(({ role }) => {
      expect(palette[role]).toMatch(/^#[0-9a-fA-F]{6}$/)
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

  it('differs across every theme — the theme test this pass inverts', () => {
    const seen = new Set(THEMES.map(t => JSON.stringify(resolveExportPalette({ themeId: t.id }))))
    // THEMES.length, not a literal count: #43/plans/87 took this 4 → 8 and a hardcoded
    // expectation would have silently stopped proving what the title claims.
    expect(seen.size).toBe(THEMES.length)
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

describe('hexToRgba (#195a — the color-mix() replacement html2canvas can parse)', () => {
  it('converts a 6-digit hex + pct to the exact literal rgba() color-mix(in srgb, …, transparent) means', () => {
    expect(hexToRgba('#4ac8c0', 12)).toBe('rgba(74, 200, 192, 0.12)')
    expect(hexToRgba('#d8a840', 25)).toBe('rgba(216, 168, 64, 0.25)')
  })

  it('expands a 3-digit hex', () => {
    expect(hexToRgba('#fff', 50)).toBe('rgba(255, 255, 255, 0.5)')
  })
})

describe('resolveExportPalette — derived tints (#195a)', () => {
  it('always carries the two derived keys alongside the 8 roles', () => {
    const palette = resolveExportPalette({ themeId: 'totk-dark' })
    expect(palette['--a-hdr-tint']).toBe(hexToRgba(palette['--a-hdr'], 12))
    expect(palette['--a-int-edge']).toBe(hexToRgba(palette['--a-int'], 25))
  })

  it('a customised --a-hdr moves its tint with it, rather than freezing', () => {
    const palette = resolveExportPalette({
      themeId: 'totk-dark',
      custom: { '--a-hdr': '#ff00ff' },
    })
    expect(palette['--a-hdr-tint']).toBe('rgba(255, 0, 255, 0.12)')
  })

  it('EXPORT_ROLES stays at 8 — the derived tints are not customisable roles', () => {
    expect(EXPORT_ROLES).toHaveLength(8)
    expect(EXPORT_ROLES.some(r => r.role.endsWith('-tint') || r.role.endsWith('-edge'))).toBe(false)
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
