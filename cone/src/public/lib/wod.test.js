import { describe, test, expect } from 'vitest'
import {
  blkLabel,
  exVolStr,
  toSecs,
  fmtSecs,
  maskMMSS,
  expandMMSS,
  rankResults,
  perfStr,
  repsBefore,
  groupProgressionSteps,
  goalStr,
  goalOutcome,
  isTimeBlock,
  BLOCK_FAMILY,
} from './wod.js'
import { ALL_CATEGORIES } from './exerciseGroups.js'

// #98 — BLOCK_FAMILY is a hand-authored presentation map (block color family), not
// derived from ALL_CATEGORIES. It legitimately carries a 16th key, 'WOD' (a block
// *label*, not a registry category), so this asserts coverage, not exact key equality.
describe('BLOCK_FAMILY', () => {
  test('covers every registry category', () => {
    ALL_CATEGORIES.forEach(c => expect(BLOCK_FAMILY).toHaveProperty(c))
  })
})

// #117 — MetCon/HIIT added: goalKindFor (blockModel.js) already gives them a time
// goal; this asserts isTimeBlock now agrees so a time Meta: doesn't show against a
// block that ranks/logs as rounds/reps.
describe('isTimeBlock', () => {
  test('For Time, Benchmark, MetCon, HIIT → true', () => {
    expect(isTimeBlock('For Time')).toBe(true)
    expect(isTimeBlock('Benchmark')).toBe(true)
    expect(isTimeBlock('MetCon')).toBe(true)
    expect(isTimeBlock('HIIT')).toBe(true)
  })
  test('AMRAP, EMOM, WOD, Estações → false', () => {
    expect(isTimeBlock('AMRAP')).toBe(false)
    expect(isTimeBlock('EMOM')).toBe(false)
    expect(isTimeBlock('WOD')).toBe(false)
    expect(isTimeBlock('Estações')).toBe(false)
  })
})

describe('blkLabel', () => {
  test('label and type differ → label · type', () => {
    expect(blkLabel({ label: 'Cindy', type: 'For Time' })).toBe('Cindy · For Time')
  })
  test('label equals type → no duplication', () => {
    expect(blkLabel({ label: 'AMRAP', type: 'AMRAP' })).toBe('AMRAP')
  })
  test('dash label → type only', () => {
    expect(blkLabel({ label: '-', type: 'EMOM' })).toBe('EMOM')
  })
  test('no label → type only', () => {
    expect(blkLabel({ type: 'Força' })).toBe('Força')
  })
  test('no type → label only', () => {
    expect(blkLabel({ label: 'Murph' })).toBe('Murph')
  })
  test('empty object → empty string', () => {
    expect(blkLabel({})).toBe('')
  })
})

describe('exVolStr', () => {
  test('sets + reps → sets×reps', () => {
    expect(exVolStr({ sets: 3, reps: '10' })).toBe('3×10')
  })
  test('reps only → reps', () => {
    expect(exVolStr({ reps: '21' })).toBe('21')
  })
  test('comma-separated reps → dash-joined', () => {
    expect(exVolStr({ sets: 3, reps: '5,4,3' })).toBe('3×5-4-3')
  })
  test('cardio mode → value + unit', () => {
    expect(
      exVolStr({ name: 'Run', intensity: { mode: 'cardio', cardioVal: '400', cardioUnit: 'm' } }),
    ).toBe('400m')
  })
  test('cardio: value already in name → empty string', () => {
    expect(
      exVolStr({
        name: '400m Run',
        intensity: { mode: 'cardio', cardioVal: '400', cardioUnit: 'm' },
      }),
    ).toBe('')
  })
  test('cardio: missing value → empty string', () => {
    expect(exVolStr({ name: 'Run', intensity: { mode: 'cardio', cardioVal: '' } })).toBe('')
  })
  test('no reps, no sets, no cardio → empty string', () => {
    expect(exVolStr({})).toBe('')
  })
  test('dist only → dist+unit', () => {
    expect(exVolStr({ dist: '500', distUnit: 'm' })).toBe('500m')
  })
  test('sets + dist → sets×dist+unit', () => {
    expect(exVolStr({ sets: 2, dist: '100', distUnit: 'm' })).toBe('2×100m')
  })
  test('dist in calories', () => {
    expect(exVolStr({ dist: '20', distUnit: 'cal' })).toBe('20cal')
  })
  test('dist takes precedence over legacy cardio intensity', () => {
    expect(
      exVolStr({
        dist: '100',
        distUnit: 'm',
        intensity: { mode: 'cardio', cardioVal: '400', cardioUnit: 'm' },
      }),
    ).toBe('100m')
  })
  test('progression, no ex.reps, uniform step reps → sets×reps', () => {
    const ex = {
      intensity: {
        mode: 'progression',
        steps: [
          { reps: '5', load: '60' },
          { reps: '5', load: '70' },
          { reps: '5', load: '80' },
        ],
      },
    }
    expect(exVolStr(ex)).toBe('3×5')
  })
  test('progression, no ex.reps, single step → reps only (no sets prefix)', () => {
    const ex = { intensity: { mode: 'progression', steps: [{ reps: '5', load: '60' }] } }
    expect(exVolStr(ex)).toBe('5')
  })
  test('progression, no ex.reps, ladder reps → dash-joined', () => {
    const ex = {
      intensity: {
        mode: 'progression',
        steps: [
          { reps: '5', load: '60' },
          { reps: '3', load: '70' },
          { reps: '1', load: '80' },
        ],
      },
    }
    expect(exVolStr(ex)).toBe('5-3-1')
  })
  test('progression, no ex.reps, no steps → empty string', () => {
    expect(exVolStr({ intensity: { mode: 'progression' } })).toBe('')
  })
  test('progression with ex.reps set → ex.reps wins (unchanged path)', () => {
    expect(
      exVolStr({
        reps: '10',
        intensity: { mode: 'progression', steps: [{ reps: '5', load: '60' }] },
      }),
    ).toBe('10')
  })
})

describe('groupProgressionSteps', () => {
  test('no steps → empty array', () => {
    expect(groupProgressionSteps({ intensity: {} })).toEqual([])
    expect(groupProgressionSteps({})).toEqual([])
  })
  test('distinct reps per step → one group per reps value, in first-seen order', () => {
    const ex = {
      intensity: {
        steps: [
          { reps: '4', load: '50' },
          { reps: '2', load: '80' },
        ],
      },
    }
    expect(groupProgressionSteps(ex)).toEqual([
      { reps: '4', loads: ['50'] },
      { reps: '2', loads: ['80'] },
    ])
  })
  test('shared reps across steps → loads accumulate onto one group', () => {
    const ex = {
      intensity: {
        steps: [
          { reps: '2', load: '60' },
          { reps: '2', load: '70' },
          { reps: '2', load: '80' },
        ],
      },
    }
    expect(groupProgressionSteps(ex)).toEqual([{ reps: '2', loads: ['60', '70', '80'] }])
  })
  test('step with no reps falls back to ex.reps', () => {
    const ex = { reps: '3', intensity: { steps: [{ load: '50' }] } }
    expect(groupProgressionSteps(ex)).toEqual([{ reps: '3', loads: ['50'] }])
  })
  test('step with no load → group has empty loads array', () => {
    const ex = { intensity: { steps: [{ reps: '2' }] } }
    expect(groupProgressionSteps(ex)).toEqual([{ reps: '2', loads: [] }])
  })
})

describe('toSecs', () => {
  test('mm:ss format', () => expect(toSecs('05:30')).toBe(330))
  test('1:00 → 60', () => expect(toSecs('1:00')).toBe(60))
  test('plain seconds string', () => expect(toSecs('45')).toBe(45))
  test('empty string → Infinity', () => expect(toSecs('')).toBe(Infinity))
  test('null → Infinity', () => expect(toSecs(null)).toBe(Infinity))
  test('undefined → Infinity', () => expect(toSecs(undefined)).toBe(Infinity))
  test('malformed minutes part (non-numeric) → number, not NaN', () => {
    expect(toSecs('ab:30')).toBe(30)
    expect(Number.isNaN(toSecs('ab:30'))).toBe(false)
  })
  test('malformed seconds part (non-numeric) → number, not NaN', () => {
    expect(toSecs('05:cd')).toBe(300)
    expect(Number.isNaN(toSecs('05:cd'))).toBe(false)
  })
})

describe('fmtSecs', () => {
  test('330 → 05:30', () => expect(fmtSecs(330)).toBe('05:30'))
  test('60 → 01:00', () => expect(fmtSecs(60)).toBe('01:00'))
  test('0 → 00:00', () => expect(fmtSecs(0)).toBe('00:00'))
  test('round-trips with toSecs', () => {
    expect(fmtSecs(toSecs('12:45'))).toBe('12:45')
  })
})

describe('maskMMSS', () => {
  test('empty stays empty', () => expect(maskMMSS('')).toBe(''))
  test('one digit', () => expect(maskMMSS('1')).toBe('1'))
  test('two digits (minutes being typed)', () => expect(maskMMSS('12')).toBe('12'))
  test('three digits fill seconds from the right', () => expect(maskMMSS('123')).toBe('1:23'))
  test('four digits → MM:SS', () => expect(maskMMSS('1234')).toBe('12:34'))
  test('re-masking an already-masked value is stable', () =>
    expect(maskMMSS('12:34')).toBe('12:34'))
  test('caps at 4 digits (99:99 ceiling)', () => expect(maskMMSS('12345')).toBe('12:34'))
  test('strips non-digits', () => expect(maskMMSS('a1b2c3')).toBe('1:23'))
  test('null/undefined → empty', () => {
    expect(maskMMSS(null)).toBe('')
    expect(maskMMSS(undefined)).toBe('')
  })
  test('does not validate — 999 → 9:99', () => expect(maskMMSS('9:99')).toBe('9:99'))
})

// The blur-time completion maskMMSS cannot do (#115). Prod held a bare '14' and '18' on For Time
// blocks, which toSecs read as 14 and 18 SECONDS — see docs/reviews/115-results-audit.md.
describe('expandMMSS', () => {
  test('empty stays empty — completes a value, never invents one', () => {
    expect(expandMMSS('')).toBe('')
    expect(expandMMSS(null)).toBe('')
    expect(expandMMSS(undefined)).toBe('')
  })
  test('a bare number is MINUTES', () => {
    expect(expandMMSS('14')).toBe('14:00')
    expect(expandMMSS('18')).toBe('18:00')
  })
  test('one digit pads to two', () => expect(expandMMSS('9')).toBe('09:00'))
  test('anything already carrying a colon is untouched', () => {
    expect(expandMMSS('1:23')).toBe('1:23')
    expect(expandMMSS('12:34')).toBe('12:34')
    expect(expandMMSS('09:00')).toBe('09:00')
  })
  test('idempotent', () => expect(expandMMSS(expandMMSS('14'))).toBe('14:00'))
  test('composes with maskMMSS the way the field uses it', () => {
    // typing 1,4 then blurring
    expect(expandMMSS(maskMMSS('14'))).toBe('14:00')
    // typing 0,9,0,0 — the mask already produced a colon, so blur is a no-op
    expect(expandMMSS(maskMMSS('0900'))).toBe('09:00')
    // typing 1,2,3 — right-fill wins, blur must not turn 1:23 into 123:00
    expect(expandMMSS(maskMMSS('123'))).toBe('1:23')
  })
  test('the prod corruption cases now read correctly through toSecs', () => {
    expect(toSecs(expandMMSS('14'))).toBe(14 * 60)
    expect(toSecs(expandMMSS(maskMMSS('1400')))).toBe(14 * 60)
    expect(toSecs(expandMMSS(maskMMSS('1636')))).toBe(16 * 60 + 36)
  })
})

describe('rankResults', () => {
  const forTime = [
    { perfTime: '10:00' },
    { perfTime: '08:30' },
    { perfTime: '12:00' },
    { perfTime: '' },
  ]

  test('For Time: sorts ascending by time, no-time last', () => {
    const ranked = rankResults(forTime, 'For Time')
    expect(ranked.map(r => r.perfTime)).toEqual(['08:30', '10:00', '12:00', ''])
  })

  test('For Time: does not mutate the original array', () => {
    const original = forTime.map(r => r.perfTime)
    rankResults(forTime, 'For Time')
    expect(forTime.map(r => r.perfTime)).toEqual(original)
  })

  const amrap = [
    { perfRounds: '5', perfReps: '10' },
    { perfRounds: '6', perfReps: '2' },
    { perfRounds: '5', perfReps: '15' },
  ]

  test('AMRAP: sorts by rounds desc, then reps desc', () => {
    const ranked = rankResults(amrap, 'AMRAP')
    expect(ranked[0].perfRounds).toBe('6')
    expect(ranked[1].perfReps).toBe('15')
    expect(ranked[2].perfReps).toBe('10')
  })

  // #112 — two capped athletes used to tie (Infinity - Infinity = NaN), so 4 rounds ranked
  // identically to 1. The checkpoint breaks the tie by real progress.
  test('For Time: two DNFs with checkpoints order by roundsDone desc, not tied', () => {
    const ranked = rankResults(
      [
        { perfTime: '', checkpoint: { roundsDone: 1, exIdx: 0, exReps: 3 } },
        { perfTime: '', checkpoint: { roundsDone: 4, exIdx: 2, exReps: 1 } },
      ],
      'For Time',
    )
    expect(ranked.map(r => r.checkpoint.roundsDone)).toEqual([4, 1])
  })

  test('For Time: DNF checkpoints tied on roundsDone break on exIdx, then exReps', () => {
    const ranked = rankResults(
      [
        { perfTime: '', checkpoint: { roundsDone: 3, exIdx: 0, exReps: 9 } },
        { perfTime: '', checkpoint: { roundsDone: 3, exIdx: 1, exReps: 2 } },
      ],
      'For Time',
    )
    expect(ranked[0].checkpoint.exIdx).toBe(1)
    const tiedOnExIdx = rankResults(
      [
        { perfTime: '', checkpoint: { roundsDone: 3, exIdx: 1, exReps: 2 } },
        { perfTime: '', checkpoint: { roundsDone: 3, exIdx: 1, exReps: 9 } },
      ],
      'For Time',
    )
    expect(tiedOnExIdx[0].checkpoint.exReps).toBe(9)
  })

  test('For Time: a legacy DNF (no checkpoint) still ranks by perfRounds, not tied at zero', () => {
    const ranked = rankResults(
      [
        { perfTime: '', perfRounds: '1' },
        { perfTime: '', perfRounds: '4' },
      ],
      'For Time',
    )
    expect(ranked.map(r => r.perfRounds)).toEqual(['4', '1'])
  })

  test('For Time: a finished result always outranks a DNF regardless of checkpoint', () => {
    const ranked = rankResults(
      [
        { perfTime: '', checkpoint: { roundsDone: 99, exIdx: 9, exReps: 99 } },
        { perfTime: '08:00' },
      ],
      'For Time',
    )
    expect(ranked[0].perfTime).toBe('08:00')
  })
})

describe('perfStr', () => {
  test('For Time with time → time string', () => {
    expect(perfStr({ perfTime: '05:30' }, 'For Time')).toBe('05:30')
  })
  test('For Time without time → —', () => {
    expect(perfStr({}, 'For Time')).toBe('—')
  })
  test('For Time capped, legacy row (no checkpoint) → "N rds (DNF)"', () => {
    expect(perfStr({ perfRounds: '4' }, 'For Time')).toBe('4 rds (DNF)')
  })
  test('For Time capped with a checkpoint → "N rds + M (DNF)"', () => {
    expect(perfStr({ checkpoint: { roundsDone: 3, exIdx: 1, exReps: 7 } }, 'For Time')).toBe(
      '3 rds + 7 (DNF)',
    )
  })
  test('For Time capped with a checkpoint but no partial reps → "N rds (DNF)", no stray "+ 0"', () => {
    expect(perfStr({ checkpoint: { roundsDone: 3, exIdx: 0, exReps: 0 } }, 'For Time')).toBe(
      '3 rds (DNF)',
    )
  })
  test('AMRAP with rounds and reps', () => {
    expect(perfStr({ perfRounds: '5', perfReps: '10' }, 'AMRAP')).toBe('5 rds + 10 reps')
  })
  test('AMRAP with rounds only', () => {
    expect(perfStr({ perfRounds: '5' }, 'AMRAP')).toBe('5 rds')
  })
  test('AMRAP with reps only', () => {
    expect(perfStr({ perfReps: '3' }, 'AMRAP')).toBe('3 reps')
  })
  test('AMRAP empty → —', () => {
    expect(perfStr({}, 'AMRAP')).toBe('—')
  })
})

describe('repsBefore', () => {
  test('exIdx 0 → no preceding exercises, sum is 0', () => {
    const bl = { exercises: [{ name: 'Thruster', reps: '10' }] }
    expect(repsBefore(bl, 0)).toBe(0)
  })
  test('preceding exercises with plain integer reps → summed', () => {
    const bl = {
      exercises: [
        { name: 'Thruster', reps: '10' },
        { name: 'Pull-up', reps: '10' },
        { name: 'Row', dist: '400', distUnit: 'm' },
      ],
    }
    expect(repsBefore(bl, 2)).toBe(20)
  })
  test('a preceding exercise with a rep scheme ("21-15-9") → null, never guessed', () => {
    const bl = {
      exercises: [
        { name: 'Wall Ball', reps: '21-15-9' },
        { name: 'Thruster', reps: '10' },
      ],
    }
    expect(repsBefore(bl, 1)).toBe(null)
  })
  test('a preceding dist/cal exercise carries no reps → null', () => {
    const bl = {
      exercises: [
        { name: 'Row', dist: '500', distUnit: 'm' },
        { name: 'Thruster', reps: '10' },
      ],
    }
    expect(repsBefore(bl, 1)).toBe(null)
  })
  test('Estações — reads the flattened station exercises via blockExercises', () => {
    const bl = {
      type: 'Estações',
      stations: [
        { exercises: [{ name: 'Row', reps: '10' }] },
        { isRest: true, exercises: [{ name: 'rest' }] },
        { exercises: [{ name: 'Burpee', reps: '5' }] },
      ],
    }
    expect(repsBefore(bl, 1)).toBe(10)
  })
})

describe('goalStr', () => {
  test('no goal → empty string', () => {
    expect(goalStr({ type: 'For Time' })).toBe('')
    expect(goalStr(null)).toBe('')
  })
  test('time range of whole minutes collapses to one apostrophe', () => {
    expect(goalStr({ goal: { kind: 'time', min: '11:00', max: '12:00' } })).toBe("11–12'")
  })
  test('time range with seconds keeps both mm:ss', () => {
    expect(goalStr({ goal: { kind: 'time', min: '11:30', max: '12:15' } })).toBe('11:30–12:15')
  })
  test('max only → sub', () => {
    expect(goalStr({ goal: { kind: 'time', max: '09:00' } })).toBe("sub 09'")
    expect(goalStr({ goal: { kind: 'time', max: '08:45' } })).toBe('sub 08:45')
  })
  test('min only → the bare time', () => {
    expect(goalStr({ goal: { kind: 'time', min: '11:00' } })).toBe("11'")
  })
  test('rounds', () => {
    expect(goalStr({ goal: { kind: 'rounds', min: 5 } })).toBe('5 rounds')
    expect(goalStr({ goal: { kind: 'rounds', min: 1 } })).toBe('1 round')
    expect(goalStr({ goal: { kind: 'rounds', min: 5, reps: 12 } })).toBe('5 rounds + 12 reps')
    expect(goalStr({ goal: { kind: 'rounds', reps: 12 } })).toBe('12 reps')
  })
  test('free text passes through trimmed', () => {
    expect(goalStr({ goal: { kind: 'text', text: '  sem quebrar  ' } })).toBe('sem quebrar')
  })
  test('an empty goal object renders nothing rather than a stray dash', () => {
    expect(goalStr({ goal: { kind: 'time' } })).toBe('')
    expect(goalStr({ goal: { kind: 'rounds' } })).toBe('')
    expect(goalStr({ goal: { kind: 'text', text: '' } })).toBe('')
  })
  test('degenerate range (min === max) renders the single value, not "14–14\'"', () => {
    expect(goalStr({ goal: { kind: 'time', min: '14:00', max: '14:00' } })).toBe("14'")
    expect(goalStr({ goal: { kind: 'time', min: '11:30', max: '11:30' } })).toBe('11:30')
  })
})

describe('goalOutcome', () => {
  test('no goal → null', () => {
    expect(goalOutcome({ perfTime: '10:00' }, { type: 'For Time' })).toBe(null)
    expect(goalOutcome({ perfTime: '10:00' }, null)).toBe(null)
  })
  test('kind:text → null, never comparable', () => {
    const bl = { type: 'WOD', goal: { kind: 'text', text: 'sem quebrar' } }
    expect(goalOutcome({ perfTime: '10:00' }, bl)).toBe(null)
  })
  test('an empty goal object (no min/max) → null', () => {
    expect(goalOutcome({ perfTime: '10:00' }, { goal: { kind: 'time' } })).toBe(null)
  })
  test('nothing logged yet (no perfTime, no checkpoint, no perfRounds) → null', () => {
    const bl = { goal: { kind: 'time', min: '11:00', max: '12:00' } }
    expect(goalOutcome({}, bl)).toBe(null)
  })

  describe('time, both ends (11:00–12:00)', () => {
    const bl = { goal: { kind: 'time', min: '11:00', max: '12:00' } }
    test('faster than min → beat', () => {
      expect(goalOutcome({ perfTime: '10:45' }, bl)).toBe('beat')
    })
    test('exactly the min → met, not beat (not STRICTLY under)', () => {
      expect(goalOutcome({ perfTime: '11:00' }, bl)).toBe('met')
    })
    test('inside the window → met', () => {
      expect(goalOutcome({ perfTime: '11:30' }, bl)).toBe('met')
    })
    test('exactly the max → met', () => {
      expect(goalOutcome({ perfTime: '12:00' }, bl)).toBe('met')
    })
    test('slower than max → missed', () => {
      expect(goalOutcome({ perfTime: '12:40' }, bl)).toBe('missed')
    })
  })

  describe('time, one end only (bare "14:00")', () => {
    const bl = { goal: { kind: 'time', min: '14:00' } }
    test('at or under → beat, no met state', () => {
      expect(goalOutcome({ perfTime: '13:50' }, bl)).toBe('beat')
      expect(goalOutcome({ perfTime: '14:00' }, bl)).toBe('beat')
    })
    test('over → missed', () => {
      expect(goalOutcome({ perfTime: '14:10' }, bl)).toBe('missed')
    })
  })

  describe('time, max only ("sub 12\'")', () => {
    const bl = { goal: { kind: 'time', max: '12:00' } }
    test('at or under the cap → beat', () => {
      expect(goalOutcome({ perfTime: '11:59' }, bl)).toBe('beat')
      expect(goalOutcome({ perfTime: '12:00' }, bl)).toBe('beat')
    })
    test('over the cap → missed', () => {
      expect(goalOutcome({ perfTime: '12:01' }, bl)).toBe('missed')
    })
  })

  describe('DNF is missed, never null', () => {
    const bl = { goal: { kind: 'time', min: '11:00', max: '12:00' } }
    test('capped with a checkpoint, no perfTime → missed', () => {
      expect(
        goalOutcome({ perfTime: '', checkpoint: { roundsDone: 3, exIdx: 1, exReps: 2 } }, bl),
      ).toBe('missed')
    })
    test('legacy DNF (perfRounds only, no checkpoint, no perfTime) → missed', () => {
      expect(goalOutcome({ perfTime: '', perfRounds: '4' }, bl)).toBe('missed')
    })
  })

  describe('rounds (AMRAP)', () => {
    const bl = { goal: { kind: 'rounds', min: 5, reps: 12 } }
    test('more rounds than the goal → beat', () => {
      expect(goalOutcome({ perfRounds: '6', perfReps: '0' }, bl)).toBe('beat')
    })
    test('fewer rounds than the goal → missed, regardless of reps', () => {
      expect(goalOutcome({ perfRounds: '4', perfReps: '50' }, bl)).toBe('missed')
    })
    test('same rounds, reps at or past the goal → beat', () => {
      expect(goalOutcome({ perfRounds: '5', perfReps: '12' }, bl)).toBe('beat')
      expect(goalOutcome({ perfRounds: '5', perfReps: '15' }, bl)).toBe('beat')
    })
    test('same rounds, reps short of the goal → missed', () => {
      expect(goalOutcome({ perfRounds: '5', perfReps: '3' }, bl)).toBe('missed')
    })
    test('nothing logged (no perfRounds, no perfReps) → null', () => {
      expect(goalOutcome({}, bl)).toBe(null)
    })
    test('an empty goal object (no min/reps) → null', () => {
      expect(goalOutcome({ perfRounds: '5' }, { goal: { kind: 'rounds' } })).toBe(null)
    })
  })
})
