import { describe, test, expect } from 'vitest'
import {
  TRANSITION_MIN,
  blockMinutes,
  estimateMinutes,
  knownMinutes,
  typicalMinutes,
} from './estimate.js'

describe('blockMinutes', () => {
  test('a timed WOD with a Meta ends at the Meta, not at the cap', () => {
    expect(
      blockMinutes({ type: 'For Time', duration: '15', goal: { kind: 'time', min: '12:00' } }),
    ).toBe(12)
  })

  test('else its duration, else interval × rounds', () => {
    expect(blockMinutes({ type: 'Core', duration: '9' })).toBe(9)
    expect(blockMinutes({ type: 'EMOM', rounds: '5', interval: '02:00' })).toBe(10)
  })

  test('a one-movement block timed in its reps ("40\' Bike") is that long', () => {
    expect(blockMinutes({ type: 'Cardio', exercises: [{ reps: "40'" }] })).toBe(40)
  })

  test("else what this box's blocks of the type usually take, else a flat default", () => {
    expect(blockMinutes({ type: 'Acessórios', rounds: '3' }, { Acessórios: 12 })).toBe(12)
    expect(blockMinutes({ type: 'Skill' }, {})).toBe(10)
  })

  test('an Estações block lasts its stations × cycles — not the 10-minute default', () => {
    const block = {
      type: 'Estações',
      stationRepeat: 2,
      stations: [{ duration: '4:00' }, { duration: '1:00', isRest: true }, { duration: '4:00' }],
    }
    expect(blockMinutes(block)).toBe(18)
  })

  test('a legacy bare Meta (`14`, typed and never blurred — #139) is 14 minutes, not seconds', () => {
    expect(
      knownMinutes({ type: 'For Time', duration: '20', goal: { kind: 'time', min: '14' } }),
    ).toBe(14)
  })
})

describe('typicalMinutes', () => {
  test("the median of what each type's own fields said, by the same reader as the estimate", () => {
    const occ = [
      { type: 'Core', block: { type: 'Core', duration: '9' } },
      { type: 'Core', block: { type: 'Core', duration: '12' } },
      { type: 'Core', block: { type: 'Core' } },
      { type: 'EMOM', block: { type: 'EMOM', rounds: '5', interval: '03:00' } },
    ]
    expect(typicalMinutes({ occ })).toEqual({ Core: 10.5, EMOM: 15 })
  })
})

describe('estimateMinutes', () => {
  test('the blocks plus one transition between each pair — a warning figure, never a trim', () => {
    const blocks = [
      { type: 'Core', duration: '9' },
      { type: 'For Time', duration: '15', goal: { kind: 'time', min: '12:00' } },
    ]
    expect(estimateMinutes(blocks)).toBe(9 + 12 + TRANSITION_MIN)
    expect(estimateMinutes([])).toBe(0)
  })
})
