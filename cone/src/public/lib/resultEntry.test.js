import { describe, test, expect } from 'vitest'
import { ATHLETE_KEYS, mergeBlockEntry, clearAthleteKeys } from './resultEntry.js'

describe('mergeBlockEntry', () => {
  test('unknown key on prev survives a patch that does not mention it', () => {
    // `futureField` stands in for a field THIS version doesn't know about yet — both
    // `checkpoint` (#112) and `exerciseRows` (#116) were this placeholder in earlier
    // sessions and are now real ATHLETE_KEYS fields, tested on their own terms below.
    const prev = { blockId: 'b1', blockType: 'For Time', blockLabel: 'WOD', futureField: [1, 2] }
    const patch = { blockId: 'b1', blockType: 'For Time', blockLabel: 'WOD', rpe: 8, scale: 'RX' }
    const merged = mergeBlockEntry(prev, patch)
    expect(merged.futureField).toEqual([1, 2])
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
    const eb = {
      blockId: 'b1',
      blockType: 'For Time',
      blockLabel: 'WOD',
      rpe: 8,
      futureField: [3],
    }
    const merged = mergeBlockEntry(base, eb)
    expect(merged.futureField).toEqual([3])
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
      futureField: ['x'],
    }
    const formEntry = {
      blockId: 'b1',
      blockType: 'For Time',
      blockLabel: 'WOD',
      rpe: 7,
      scale: 'RX',
    }
    const merged = mergeBlockEntry(persisted, formEntry)
    expect(merged.futureField).toEqual(['x'])
  })

  test('exerciseRows (#116) round-trips through the same re-merge shape now that it is real', () => {
    const persisted = { blockId: 'b1', exerciseRows: [{ exId: 'e1', name: 'Thruster', note: 'x' }] }
    const formEntry = { blockId: 'b1', rpe: 7, scale: 'SC' }
    expect(mergeBlockEntry(persisted, formEntry).exerciseRows).toEqual([
      { exId: 'e1', name: 'Thruster', note: 'x' },
    ])
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
      finished: true,
      checkpoint: { roundsDone: 3, roundsTotal: 5, exIdx: 1, exName: 'Row', exReps: 2 },
      exerciseRows: [{ exId: 'e1', name: 'Thruster', note: 'reduzi a carga' }],
    }
    const cleared = clearAthleteKeys(entry)
    expect(cleared.rpe).toBe(null)
    expect(cleared.scale).toBe(null)
    expect(cleared.perfTime).toBe('')
    expect(cleared.perfRounds).toBe('')
    expect(cleared.perfReps).toBe('')
    expect(cleared.finished).toBe(null)
    expect(cleared.checkpoint).toBe(null)
    // #116 — switching which athlete a form edits must not carry the outgoing athlete's
    // adaptation notes into the incoming one's submission, same reasoning as rpe/scale.
    expect(cleared.exerciseRows).toBe(null)
  })

  test('leaves identity fields and truly unknown keys untouched', () => {
    // `futureField` stands in for a field THIS version doesn't know about — `checkpoint`
    // (#112) and `exerciseRows` (#116) both used to illustrate this and are now real
    // ATHLETE_KEYS fields, covered by the test above instead.
    const entry = {
      blockId: 'b1',
      blockType: 'For Time',
      blockLabel: 'WOD',
      rpe: 8,
      futureField: [1, 2, 3],
    }
    const cleared = clearAthleteKeys(entry)
    expect(cleared.blockId).toBe('b1')
    expect(cleared.blockType).toBe('For Time')
    expect(cleared.blockLabel).toBe('WOD')
    expect(cleared.futureField).toEqual([1, 2, 3])
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
      finished: null,
      checkpoint: null,
      exerciseRows: null,
      skipped: null,
    })
    expect(clearAthleteKeys(undefined)).toEqual({
      rpe: null,
      scale: null,
      perfTime: '',
      perfRounds: '',
      perfReps: '',
      finished: null,
      checkpoint: null,
      exerciseRows: null,
      skipped: null,
    })
  })
})

describe('skipped (#157)', () => {
  test('is a declared athlete key, so every reset site clears it automatically', () => {
    expect(ATHLETE_KEYS).toContain('skipped')
    expect(clearAthleteKeys({ blockId: 'b1', skipped: true }).skipped).toBe(null)
  })

  test('survives a re-merge from another surface that does not know the key', () => {
    // The #118 guarantee applied to the newest field: results.html re-logging the same
    // block must not silently destroy a "não fez" the coach set in the SPA.
    const persisted = { blockId: 'b1', skipped: true }
    const fromOtherSurface = { blockId: 'b1', blockType: 'EMOM', blockLabel: 'EMOM 12' }
    expect(mergeBlockEntry(persisted, fromOtherSurface).skipped).toBe(true)
  })
})
