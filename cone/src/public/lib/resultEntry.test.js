import { describe, test, expect } from 'vitest'
import { ATHLETE_KEYS, mergeBlockEntry, clearAthleteKeys } from './resultEntry.js'

describe('mergeBlockEntry', () => {
  test('unknown key on prev survives a patch that does not mention it', () => {
    const prev = { blockId: 'b1', blockType: 'For Time', blockLabel: 'WOD', checkpoint: [1, 2] }
    const patch = { blockId: 'b1', blockType: 'For Time', blockLabel: 'WOD', rpe: 8, scale: 'RX' }
    const merged = mergeBlockEntry(prev, patch)
    expect(merged.checkpoint).toEqual([1, 2])
    expect(merged.rpe).toBe(8)
    expect(merged.scale).toBe('RX')
  })

  test('identity fields (blockId/blockType/blockLabel) always come from patch', () => {
    const prev = { blockId: 'b1', blockType: 'AMRAP', blockLabel: 'Old Label', rpe: 5 }
    const patch = { blockId: 'b1', blockType: 'For Time', blockLabel: 'New Label', rpe: 7 }
    const merged = mergeBlockEntry(prev, patch)
    expect(merged.blockType).toBe('For Time')
    expect(merged.blockLabel).toBe('New Label')
  })

  test('patch fields override matching prev fields', () => {
    const prev = { blockId: 'b1', rpe: 5, scale: 'SC' }
    const patch = { rpe: 9, scale: 'RX' }
    const merged = mergeBlockEntry(prev, patch)
    expect(merged.rpe).toBe(9)
    expect(merged.scale).toBe('RX')
  })

  test('no prior entry — merged result is just the patch', () => {
    const patch = { blockId: 'b1', blockType: 'AMRAP', blockLabel: 'WOD', rpe: 6 }
    expect(mergeBlockEntry(null, patch)).toEqual(patch)
    expect(mergeBlockEntry(undefined, patch)).toEqual(patch)
  })

  test('an unknown key survives the schedule.jsx doOpenLog merge shape (base <- eb)', () => {
    // doOpenLog builds a fresh identity+empty-athlete-fields base, then merges the
    // persisted entry (eb) on top — the base must not clobber eb's unknown keys.
    const base = clearAthleteKeys({ blockId: 'b1', blockType: 'For Time', blockLabel: 'WOD' })
    const eb = { blockId: 'b1', blockType: 'For Time', blockLabel: 'WOD', rpe: 8, checkpoint: [3] }
    const merged = mergeBlockEntry(base, eb)
    expect(merged.checkpoint).toEqual([3])
    expect(merged.rpe).toBe(8)
  })

  test('an unknown key survives the submit-time re-merge shape (persisted <- form entry)', () => {
    // submitLog/submitDeskReg/doSubmit re-merge the freshest persisted entry with the
    // form's entry right before writing — the form entry never carried the unknown key,
    // but the persisted one did, so it must still be there after the merge.
    const persisted = {
      blockId: 'b1',
      blockType: 'For Time',
      blockLabel: 'WOD',
      exerciseRows: ['x'],
    }
    const formEntry = {
      blockId: 'b1',
      blockType: 'For Time',
      blockLabel: 'WOD',
      rpe: 7,
      scale: 'RX',
    }
    const merged = mergeBlockEntry(persisted, formEntry)
    expect(merged.exerciseRows).toEqual(['x'])
  })
})

describe('clearAthleteKeys', () => {
  test('clears every declared athlete key to its empty value', () => {
    const entry = {
      blockId: 'b1',
      rpe: 8,
      scale: 'RX',
      perfTime: '12:34',
      perfRounds: '5',
      perfReps: '10',
    }
    const cleared = clearAthleteKeys(entry)
    expect(cleared.rpe).toBe(null)
    expect(cleared.scale).toBe(null)
    expect(cleared.perfTime).toBe('')
    expect(cleared.perfRounds).toBe('')
    expect(cleared.perfReps).toBe('')
  })

  test('leaves identity fields and unknown keys untouched', () => {
    const entry = {
      blockId: 'b1',
      blockType: 'For Time',
      blockLabel: 'WOD',
      rpe: 8,
      checkpoint: [1, 2, 3],
    }
    const cleared = clearAthleteKeys(entry)
    expect(cleared.blockId).toBe('b1')
    expect(cleared.blockType).toBe('For Time')
    expect(cleared.blockLabel).toBe('WOD')
    expect(cleared.checkpoint).toEqual([1, 2, 3])
  })

  test('every ATHLETE_KEYS entry is present on the cleared result', () => {
    const cleared = clearAthleteKeys({ blockId: 'b1' })
    ATHLETE_KEYS.forEach(k => {
      expect(Object.prototype.hasOwnProperty.call(cleared, k)).toBe(true)
    })
  })

  test('null/undefined entry does not throw and returns the defaults', () => {
    expect(clearAthleteKeys(null)).toEqual({
      rpe: null,
      scale: null,
      perfTime: '',
      perfRounds: '',
      perfReps: '',
    })
    expect(clearAthleteKeys(undefined)).toEqual({
      rpe: null,
      scale: null,
      perfTime: '',
      perfRounds: '',
      perfReps: '',
    })
  })
})
