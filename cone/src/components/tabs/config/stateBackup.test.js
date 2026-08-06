import { describe, it, expect, vi } from 'vitest'

// stateBackup.js also imports load*/save* helpers from utils/storage (for the
// untested buildSnapshot/applyState — thin glue over those same functions), which
// in turn imports the real Supabase client. Mocked the same way storage.test.js
// does, so createClient() never executes against the test env's undefined
// URL/key — these two functions (stateFileName/parseStateFile) never touch it.
vi.mock('../../../utils/supabase', () => {
  const names = [
    'dbSaveSessions',
    'dbSaveAthletes',
    'dbSaveResults',
    'dbSaveEvents',
    'dbSaveLocations',
    'dbSaveCoach',
    'dbSaveSettings',
    'dbSaveRegistry',
    'dbSaveGoalsData',
    'dbSaveTemplates',
    'dbLoadSessions',
    'dbLoadAthletes',
    'dbLoadResults',
    'dbLoadEvents',
    'dbLoadLocations',
    'dbLoadCoach',
    'dbLoadSettings',
    'dbLoadRegistry',
    'dbLoadGoalsData',
    'dbLoadTemplates',
    'dbGetUpdatedAt',
  ]
  return { supabase: {}, ...Object.fromEntries(names.map(n => [n, vi.fn()])) }
})

import { stateFileName, parseStateFile } from './stateBackup.js'

describe('stateFileName', () => {
  it('slugs a custom name and appends .json', () => {
    expect(stateFileName('Semana 32 - Final!', 'Team Medrado')).toBe('Semana-32-Final.json')
  })

  it('falls back to a gym slug + date when no custom name is given', () => {
    expect(stateFileName('', 'Team Medrado')).toMatch(
      /^grade-team-medrado-\d{4}-\d{2}-\d{2}\.json$/,
    )
  })

  it('falls back to a generic name when there is no gym name either', () => {
    expect(stateFileName('', '')).toMatch(/^grade-treino-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('strips accents and spaces from the gym slug', () => {
    expect(stateFileName('', 'Academia São João')).toMatch(/^grade-academia-sao-joao-/)
  })

  it('a whitespace-only custom name falls back to the gym slug', () => {
    expect(stateFileName('   ', 'Team Medrado')).toMatch(/^grade-team-medrado-/)
  })
})

describe('parseStateFile', () => {
  it('unwraps a v2 export and keeps every table', () => {
    const text = JSON.stringify({
      version: 2,
      sessions: { '2026-08-05': [{ id: 's1', blocks: [{ type: 'EMOM', zone: 'Zone 01' }] }] },
      athletes: [{ id: 'a1' }],
      settings: { gymName: 'X' },
    })
    const parsed = parseStateFile(text)
    expect(parsed.sessions['2026-08-05']).toHaveLength(1)
    expect(parsed.athletes).toEqual([{ id: 'a1' }])
    expect(parsed.settings).toEqual({ gymName: 'X' })
  })

  it('accepts a bare v1 sessions blob with no wrapper', () => {
    const text = JSON.stringify({ '2026-08-05': [{ id: 's1', blocks: [] }] })
    const parsed = parseStateFile(text)
    expect(parsed.sessions['2026-08-05']).toHaveLength(1)
    expect(parsed.athletes).toBeUndefined()
  })

  it('normalises legacy block type/zone aliases on every session', () => {
    const text = JSON.stringify({
      '2026-08-05': [{ id: 's1', blocks: [{ type: 'Strength', zone: 'Zone 01' }] }],
    })
    const parsed = parseStateFile(text)
    expect(parsed.sessions['2026-08-05'][0].blocks[0]).toMatchObject({
      type: 'Força',
      zone: 'Zona 01',
    })
  })

  it('leaves an already-current type/zone untouched', () => {
    const text = JSON.stringify({
      '2026-08-05': [{ id: 's1', blocks: [{ type: 'WOD', zone: undefined }] }],
    })
    const parsed = parseStateFile(text)
    expect(parsed.sessions['2026-08-05'][0].blocks[0].type).toBe('WOD')
  })

  it('throws on a payload that is not a plain object', () => {
    expect(() => parseStateFile(JSON.stringify([1, 2, 3]))).toThrow()
  })

  it('throws on invalid JSON', () => {
    expect(() => parseStateFile('not json')).toThrow()
  })
})
