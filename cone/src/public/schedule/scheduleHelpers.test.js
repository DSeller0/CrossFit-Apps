import { describe, test, expect } from 'vitest'
import {
  GUEST_CAP,
  findNameCollision,
  suggestGuestName,
  findAthleteById,
  usesRm,
  calcFromRm,
} from './scheduleHelpers.js'

// #71 — the guest check-in name helpers. The whole point of this pair is that they never
// dedupe: findNameCollision only REPORTS, and suggestGuestName only PROPOSES. Two real
// guests sharing a first name must both be able to reach the roster.

describe('findNameCollision', () => {
  test('returns null on an empty roster', () => {
    expect(findNameCollision([], 'Fulano')).toBe(null)
  })

  test('returns null when nothing matches', () => {
    expect(findNameCollision(['Beltrano', 'Sicrano'], 'Fulano')).toBe(null)
  })

  test('returns the existing spelling, not the typed one', () => {
    expect(findNameCollision(['Fulano da Silva'], 'fulano  DA silva')).toBe('Fulano da Silva')
  })

  test('matches through case, accents and repeated whitespace (normExName)', () => {
    expect(findNameCollision(['João Conceição'], 'joao conceicao')).toBe('João Conceição')
    expect(findNameCollision(['  Ana  Paula '], 'ana paula')).toBe('  Ana  Paula ')
  })

  test('an empty or whitespace-only typed name never collides', () => {
    expect(findNameCollision(['Fulano'], '')).toBe(null)
    expect(findNameCollision(['Fulano'], '   ')).toBe(null)
    expect(findNameCollision([''], '')).toBe(null)
  })

  test('a distinct surname is not a collision', () => {
    expect(findNameCollision(['Fulano Silva'], 'Fulano Souza')).toBe(null)
  })

  test('tolerates a missing roster', () => {
    expect(findNameCollision(undefined, 'Fulano')).toBe(null)
    expect(findNameCollision(null, 'Fulano')).toBe(null)
  })
})

describe('suggestGuestName', () => {
  test('derives an initial from the surname', () => {
    expect(suggestGuestName('Fulano Silva', ['Fulano Silva'])).toBe('Fulano S.')
  })

  test('skips particles when picking the surname', () => {
    expect(suggestGuestName('Fulano da Silva', ['Fulano da Silva'])).toBe('Fulano S.')
    expect(suggestGuestName('Maria dos Santos', [])).toBe('Maria S.')
  })

  test('falls back to dropping the particle when the initial is taken', () => {
    expect(suggestGuestName('Fulano da Silva', ['Fulano da Silva', 'Fulano S.'])).toBe(
      'Fulano Silva',
    )
  })

  test('returns empty when the fallback would just be the typed name again', () => {
    // "Fulano Silva" has no particle to drop, so candidate 2 IS what they typed — which is
    // on the roster by definition (that's why the prompt opened).
    expect(suggestGuestName('Fulano Silva', ['Fulano Silva', 'Fulano S.'])).toBe('')
  })

  test('returns empty for a single-token name — no initial to derive', () => {
    expect(suggestGuestName('Fulano', ['Fulano'])).toBe('')
  })

  test('returns empty when every token after the first is a particle', () => {
    expect(suggestGuestName('Fulano de', ['Fulano de'])).toBe('')
  })

  test('uses the LAST non-particle token, not the second', () => {
    expect(suggestGuestName('Ana Maria Rocha', [])).toBe('Ana R.')
  })

  test('uppercases the initial of a lowercase surname', () => {
    expect(suggestGuestName('fulano silva', [])).toBe('fulano S.')
  })

  test('handles empty, whitespace and missing input', () => {
    expect(suggestGuestName('', [])).toBe('')
    expect(suggestGuestName('   ', [])).toBe('')
    expect(suggestGuestName(undefined)).toBe('')
  })

  test('never suggests a name that collides with the roster', () => {
    const roster = ['Fulano Silva', 'Fulano S.']
    const s = suggestGuestName('Fulano Silva', roster)
    if (s) expect(findNameCollision(roster, s)).toBe(null)
  })
})

describe('GUEST_CAP', () => {
  // Guards the client/server pair: migration 0008 hardcodes 20 in SQL and cannot import this.
  test('is 20, matching migration 0008', () => {
    expect(GUEST_CAP).toBe(20)
  })
})

// #207 — the one validator both Schedule.jsx's `?id=` and `?athlete=` branches resolve
// through. Empty/adjacency/ordering mirror the GUARD-01 must_haves truths in the plan.
describe('findAthleteById', () => {
  test('returns null for an empty roster', () => {
    expect(findAthleteById([], 'a')).toBe(null)
  })

  test('returns null for a null roster', () => {
    expect(findAthleteById(null, 'a')).toBe(null)
  })

  test('returns null for an undefined roster', () => {
    expect(findAthleteById(undefined, 'a')).toBe(null)
  })

  test('returns null for an empty string id', () => {
    expect(findAthleteById([{ id: 'a' }], '')).toBe(null)
  })

  test('returns null for a null id', () => {
    expect(findAthleteById([{ id: 'a' }], null)).toBe(null)
  })

  test('returns null for an undefined id', () => {
    expect(findAthleteById([{ id: 'a' }], undefined)).toBe(null)
  })

  test('matches a numeric roster id via a string id', () => {
    expect(findAthleteById([{ id: 7, name: 'X' }], '7')).toEqual({ id: 7, name: 'X' })
  })

  test('matches a numeric roster id via a numeric id', () => {
    expect(findAthleteById([{ id: 7, name: 'X' }], 7)).toEqual({ id: 7, name: 'X' })
  })

  test('does not match a leading-zero variant', () => {
    expect(findAthleteById([{ id: 7 }], '07')).toBe(null)
  })

  test('does not match a leading-space variant', () => {
    expect(findAthleteById([{ id: 7 }], ' 7')).toBe(null)
  })

  test('does not match a trailing-space variant', () => {
    expect(findAthleteById([{ id: 7 }], '7 ')).toBe(null)
  })

  test('two entries sharing an id: the first in array order wins, every time', () => {
    const roster = [
      { id: 'a', name: 'first' },
      { id: 'a', name: 'second' },
    ]
    expect(findAthleteById(roster, 'a').name).toBe('first')
  })

  test('never mutates or reorders the roster array', () => {
    const roster = [
      { id: 'a', name: 'first' },
      { id: 'b', name: 'second' },
    ]
    const before = JSON.stringify(roster)
    findAthleteById(roster, 'b')
    expect(JSON.stringify(roster)).toBe(before)
  })
})

// #231 / #209 — "does this row get an RM chip?" and "what does a % of the RM weigh?". One rule,
// shared by ExRow (the chip, the computed load) and Schedule.jsx's autofillRm (the pre-fill).
describe('usesRm', () => {
  const prog = (...steps) => ({ intensity: { mode: 'progression', steps } })

  test('a plain %RM load uses an RM — only with a number in it', () => {
    expect(usesRm({ intensity: { mode: 'pct', pct: '75' } })).toBe(true)
    expect(usesRm({ intensity: { mode: 'pct', pct: '' } })).toBe(false)
    expect(usesRm({ intensity: { mode: 'pct' } })).toBe(false)
  })
  test('gender loads, legacy cardio and no intensity have nothing to compute from an RM', () => {
    expect(usesRm({ intensity: { mode: 'gender', Masculino_RX: '32' } })).toBe(false)
    expect(usesRm({ intensity: { mode: 'cardio', cardioVal: '500' } })).toBe(false)
    expect(usesRm({})).toBe(false)
    expect(usesRm(undefined)).toBe(false)
  })
  test('a % progression uses an RM, whichever way its unit is spelled', () => {
    for (const unit of ['% do RM', '%', '% RM', undefined])
      expect(usesRm(prog({ reps: '5', load: '70', unit }))).toBe(true)
  })
  test('a kg progression does not (#209)', () => {
    expect(
      usesRm(
        prog(
          { reps: '3', load: '60', unit: 'kg' },
          { reps: '3', load: '70', unit: 'kg' },
          { reps: '3', load: '80', unit: 'kg' },
        ),
      ),
    ).toBe(false)
  })
  test('a progression with no load at all does not', () => {
    expect(usesRm(prog({ reps: '5' }, { reps: '3' }))).toBe(false)
    expect(usesRm(prog())).toBe(false)
  })
  test('one % group among kg ones is enough', () => {
    expect(
      usesRm(prog({ reps: '5', load: '60', unit: 'kg' }, { reps: '3', load: '80', unit: '%' })),
    ).toBe(true)
  })
  test('a complex follows the same rule as a plain exercise', () => {
    expect(
      usesRm({
        isComplex: true,
        intensity: { mode: 'progression', steps: [{ load: '50', unit: '% do RM' }] },
      }),
    ).toBe(true)
    expect(
      usesRm({
        isComplex: true,
        intensity: { mode: 'progression', steps: [{ load: '50', unit: 'kg' }] },
      }),
    ).toBe(false)
  })
})

describe('calcFromRm', () => {
  const rm = (n, unit) => ({ rm: n, unit })

  test('one %: 75% of a 100 kg RM', () => {
    expect(calcFromRm(rm(100, 'kg'), [75])).toBe('75 kg')
  })
  test('a ladder reads slash-joined, in the athlete’s own unit', () => {
    expect(calcFromRm(rm(100, 'kg'), [60, 70, 80])).toBe('60/70/80 kg')
    expect(calcFromRm(rm(225, 'lbs'), [50, 100])).toBe('113/225 lbs')
  })
  test('rounds UP, so the bar is never under-loaded: 75% of 85 kg is 64 kg, not 63.75', () => {
    expect(calcFromRm(rm(85, 'kg'), [75])).toBe('64 kg')
  })
  test('no unit recorded → kg', () => {
    expect(calcFromRm({ rm: 100 }, [50])).toBe('50 kg')
  })
  test('no RM yet, or nothing to compute → empty (the pill is simply not drawn)', () => {
    expect(calcFromRm(undefined, [75])).toBe('')
    expect(calcFromRm(rm(0, 'kg'), [75])).toBe('')
    expect(calcFromRm(rm(100, 'kg'), [])).toBe('')
  })
})
