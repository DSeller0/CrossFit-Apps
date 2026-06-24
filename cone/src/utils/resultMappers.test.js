import { describe, test, expect } from 'vitest'
import { rowToResult, resultToRow } from './resultMappers.js'

const sampleRow = {
  id: 'abc123',
  date: '2026-06-24',
  athlete_id: 'ath1',
  session_id: 'sess1',
  presence: 'Presente',
  energy_level: 7,
  blocks: [{ blockId: 'b1', rpe: 8 }],
  coach_note: 'Good session',
  flag_for_review: false,
  logged_by_athlete: true,
}

const sampleResult = {
  id: 'abc123',
  date: '2026-06-24',
  athleteId: 'ath1',
  sessionId: 'sess1',
  presence: 'Presente',
  energyLevel: 7,
  blocks: [{ blockId: 'b1', rpe: 8 }],
  coachNote: 'Good session',
  flagForReview: false,
  loggedByAthlete: true,
}

describe('rowToResult', () => {
  test('maps snake_case columns to camelCase fields', () => {
    const r = rowToResult(sampleRow)
    expect(r.id).toBe('abc123')
    expect(r.athleteId).toBe('ath1')
    expect(r.sessionId).toBe('sess1')
    expect(r.energyLevel).toBe(7)
    expect(r.coachNote).toBe('Good session')
    expect(r.flagForReview).toBe(false)
    expect(r.loggedByAthlete).toBe(true)
    expect(r.blocks).toEqual([{ blockId: 'b1', rpe: 8 }])
  })

  test('passes through null values unchanged', () => {
    const r = rowToResult({ ...sampleRow, energy_level: null, coach_note: null })
    expect(r.energyLevel).toBeNull()
    expect(r.coachNote).toBeNull()
  })
})

describe('resultToRow', () => {
  test('maps camelCase fields to snake_case columns', () => {
    const row = resultToRow(sampleResult)
    expect(row.id).toBe('abc123')
    expect(row.athlete_id).toBe('ath1')
    expect(row.session_id).toBe('sess1')
    expect(row.energy_level).toBe(7)
    expect(row.coach_note).toBe('Good session')
    expect(row.flag_for_review).toBe(false)
    expect(row.logged_by_athlete).toBe(true)
    expect(row.blocks).toEqual([{ blockId: 'b1', rpe: 8 }])
  })

  test('id is coerced to string', () => {
    expect(typeof resultToRow({ ...sampleResult, id: 42 }).id).toBe('string')
    expect(resultToRow({ ...sampleResult, id: 42 }).id).toBe('42')
  })

  test('sessionId is coerced to string', () => {
    expect(resultToRow({ ...sampleResult, sessionId: 99 }).session_id).toBe('99')
  })

  test('null sessionId stays null', () => {
    expect(resultToRow({ ...sampleResult, sessionId: null }).session_id).toBeNull()
  })

  test('missing presence defaults to Presente', () => {
    expect(resultToRow({ ...sampleResult, presence: undefined }).presence).toBe('Presente')
  })

  test('flagForReview coerced to boolean', () => {
    expect(resultToRow({ ...sampleResult, flagForReview: 1 }).flag_for_review).toBe(true)
    expect(resultToRow({ ...sampleResult, flagForReview: 0 }).flag_for_review).toBe(false)
  })

  test('loggedByAthlete coerced to boolean', () => {
    expect(resultToRow({ ...sampleResult, loggedByAthlete: undefined }).logged_by_athlete).toBe(false)
  })

  test('includes updated_at ISO timestamp', () => {
    const row = resultToRow(sampleResult)
    expect(typeof row.updated_at).toBe('string')
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('missing blocks defaults to []', () => {
    expect(resultToRow({ ...sampleResult, blocks: undefined }).blocks).toEqual([])
  })
})

describe('round-trip: rowToResult → resultToRow', () => {
  test('preserves all core fields', () => {
    const result = rowToResult(sampleRow)
    const row    = resultToRow(result)
    expect(row.id).toBe(sampleRow.id)
    expect(row.date).toBe(sampleRow.date)
    expect(row.athlete_id).toBe(sampleRow.athlete_id)
    expect(row.session_id).toBe(sampleRow.session_id)
    expect(row.presence).toBe(sampleRow.presence)
    expect(row.energy_level).toBe(sampleRow.energy_level)
    expect(row.blocks).toEqual(sampleRow.blocks)
    expect(row.coach_note).toBe(sampleRow.coach_note)
    expect(row.flag_for_review).toBe(sampleRow.flag_for_review)
    expect(row.logged_by_athlete).toBe(sampleRow.logged_by_athlete)
  })
})
