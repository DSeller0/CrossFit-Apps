import { describe, test, expect } from 'vitest'
import { blkLabel, exVolStr, toSecs, fmtSecs, rankResults, perfStr } from './wod.js'

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
    expect(exVolStr({ name: 'Run', intensity: { mode: 'cardio', cardioVal: '400', cardioUnit: 'm' } })).toBe('400m')
  })
  test('cardio: value already in name → empty string', () => {
    expect(exVolStr({ name: '400m Run', intensity: { mode: 'cardio', cardioVal: '400', cardioUnit: 'm' } })).toBe('')
  })
  test('cardio: missing value → empty string', () => {
    expect(exVolStr({ name: 'Run', intensity: { mode: 'cardio', cardioVal: '' } })).toBe('')
  })
  test('no reps, no sets, no cardio → empty string', () => {
    expect(exVolStr({})).toBe('')
  })
})

describe('toSecs', () => {
  test('mm:ss format', () => expect(toSecs('05:30')).toBe(330))
  test('1:00 → 60', () => expect(toSecs('1:00')).toBe(60))
  test('plain seconds string', () => expect(toSecs('45')).toBe(45))
  test('empty string → Infinity', () => expect(toSecs('')).toBe(Infinity))
  test('null → Infinity', () => expect(toSecs(null)).toBe(Infinity))
  test('undefined → Infinity', () => expect(toSecs(undefined)).toBe(Infinity))
})

describe('fmtSecs', () => {
  test('330 → 05:30', () => expect(fmtSecs(330)).toBe('05:30'))
  test('60 → 01:00', () => expect(fmtSecs(60)).toBe('01:00'))
  test('0 → 00:00', () => expect(fmtSecs(0)).toBe('00:00'))
  test('round-trips with toSecs', () => {
    expect(fmtSecs(toSecs('12:45'))).toBe('12:45')
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
})

describe('perfStr', () => {
  test('For Time with time → time string', () => {
    expect(perfStr({ perfTime: '05:30' }, 'For Time')).toBe('05:30')
  })
  test('For Time without time → —', () => {
    expect(perfStr({}, 'For Time')).toBe('—')
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
