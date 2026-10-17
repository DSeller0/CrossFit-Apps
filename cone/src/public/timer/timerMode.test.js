import { describe, test, expect } from 'vitest'
import { timerMode, cycleOf, cycleEnd } from './timerMode.js'

// #228 — the timer's first tests. Which mode a config runs in used to be ~20 scattered
// `cfg.blockType === …` checks with EMOM and AMRAP tried before Estações, so an EMOM carrying its
// own interval would have taken the 60-second branches. The precedence is the whole point.
describe('timerMode', () => {
  test('Estações and any interval block run the cycle', () => {
    expect(timerMode({ blockType: 'Estações' })).toBe('cycle')
    expect(timerMode({ blockType: 'Força', intervalMode: true })).toBe('cycle')
    expect(timerMode({ blockType: 'LPO', intervalMode: true })).toBe('cycle')
  })

  test('an EMOM or AMRAP that carries its own interval takes the cycle, not the minute / the cap', () => {
    expect(timerMode({ blockType: 'EMOM', intervalMode: true })).toBe('cycle')
    expect(timerMode({ blockType: 'AMRAP', intervalMode: true })).toBe('cycle')
  })

  test('an EMOM or AMRAP without one keeps its own mode', () => {
    expect(timerMode({ blockType: 'EMOM' })).toBe('emom')
    expect(timerMode({ blockType: 'AMRAP' })).toBe('amrap')
  })

  test('everything else counts up — WOD types and the types that never had a timer alike', () => {
    for (const blockType of [
      'For Time',
      'Benchmark',
      'MetCon',
      'HIIT',
      'Força',
      'LPO',
      'Core',
      'Skill',
    ])
      expect(timerMode({ blockType }), blockType).toBe('up')
  })

  test('a missing config is the stopwatch', () => {
    expect(timerMode(undefined)).toBe('up')
    expect(timerMode({})).toBe('up')
  })
})

describe('cycleOf', () => {
  test('defaults to the Estações 45s work / 15s transition', () => {
    expect(cycleOf({})).toEqual({ st: 45, tt: 15, cycle: 60 })
  })

  test('reads the config, and keeps a zero rest', () => {
    expect(cycleOf({ stationTime: 120, transitionTime: 0 })).toEqual({ st: 120, tt: 0, cycle: 120 })
  })

  test('a zero-length cycle still has length 1, so the clock cannot divide by zero', () => {
    expect(cycleOf({ stationTime: 0, transitionTime: 0 }).cycle).toBe(1)
  })
})

describe('cycleEnd', () => {
  test('Estações: stations × rounds × cycle — one round when rounds is missing', () => {
    const exercises = [{ name: 'A' }, { name: 'B' }]
    expect(
      cycleEnd({
        blockType: 'Estações',
        exercises,
        stationTime: 45,
        transitionTime: 15,
        rounds: 3,
      }),
    ).toBe(360)
    expect(
      cycleEnd({ blockType: 'Estações', exercises, stationTime: 45, transitionTime: 15 }),
    ).toBe(120)
  })

  test('an interval block: rounds × cycle — a rest counts', () => {
    expect(cycleEnd({ intervalMode: true, stationTime: 120, transitionTime: 0, rounds: 3 })).toBe(
      360,
    )
    expect(cycleEnd({ intervalMode: true, stationTime: 40, transitionTime: 20, rounds: 3 })).toBe(
      180,
    )
  })

  test('rounds may arrive as the string the block stores', () => {
    expect(cycleEnd({ intervalMode: true, stationTime: 120, transitionTime: 0, rounds: '3' })).toBe(
      360,
    )
  })

  test('an interval block with no rounds ends only on FIM', () => {
    expect(
      cycleEnd({ intervalMode: true, stationTime: 120, transitionTime: 0, rounds: null }),
    ).toBeNull()
    expect(cycleEnd({ intervalMode: true, stationTime: 120, transitionTime: 0 })).toBeNull()
  })

  test('a zero-length cycle cannot be timed — null, never an instant finish', () => {
    expect(
      cycleEnd({ intervalMode: true, stationTime: 0, transitionTime: 0, rounds: 3 }),
    ).toBeNull()
    expect(
      cycleEnd({ blockType: 'Estações', exercises: [{}], stationTime: 0, transitionTime: 0 }),
    ).toBeNull()
  })
})
