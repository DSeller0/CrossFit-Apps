import { describe, test, expect } from 'vitest'
import { PATTERNS, derivePattern, patternOf, modalityOf, lpoFamiliesOf } from './patterns.js'

const e = (name, ...categories) => ({ name, categories })

describe('derivePattern', () => {
  test.each([
    // the root decides
    [e('Back Squat', 'Força'), 'Agachamento'],
    [e('Deadlift', 'Força'), 'Dobradiça'],
    [e('Bench Press', 'Força'), 'Empurrar'],
    [e('Strict Pull-up', 'Skill'), 'Puxar'],
    [e("Farmer's Carry", 'Cardio'), 'Carregar'],
    [e('Run', 'Cardio'), 'Monoestrutural'],
    [e('American KB Swing', 'Core'), 'Dobradiça'],
    // the category decides where no root does
    [e('Toes to Bar', 'Core'), 'Core'],
    [e('Ski Erg', 'Cardio'), 'Monoestrutural'],
    // LPO beats the root: every LPO entry is an Olympic drill
    [e('Clean High Pull', 'LPO'), 'Olímpico'],
    [e('Snatch Push Press', 'LPO'), 'Olímpico'],
    // the keyword table fixes a misleading root or category
    [e('Nordic Curl', 'Acessórios'), 'Dobradiça'],
    [e('Wall Ball', 'Cardio'), 'Agachamento'],
    [e('Sled Pull', 'Cardio'), 'Carregar'],
    [e('DB Hip Thruster', 'Acessórios'), 'Dobradiça'],
    [e('Thruster', 'Força'), 'Agachamento'],
    [e('Pallof Press', 'Core'), 'Core'],
    [e('Burpee Over the Bar (BOB)', 'Cardio'), 'Monoestrutural'],
    // a keyword must not swallow a real root
    [e('Walking Lunge', 'Acessórios'), 'Agachamento'],
    [e('DUal KB Overhead Walking', 'Core'), 'Carregar'],
    [e('Pike Push-up', 'Skill'), 'Empurrar'],
    [e('Pike up Row', 'Skill'), 'Core'],
    // in Cardio a Row is the erg
    [e('Row', 'Cardio'), 'Monoestrutural'],
    [e('Russian Row', 'Acessórios'), 'Puxar'],
  ])('%o → %s', (entry, pattern) => {
    expect(derivePattern(entry)).toBe(pattern)
  })

  test('a stretch or a drill with no root, keyword or patterned category has none', () => {
    expect(derivePattern(e('Couch Stretch', 'Mobilidade'))).toBe(null)
    expect(derivePattern(e('Leg Swing', 'Aquecimento'))).toBe(null)
    expect(derivePattern(null)).toBe(null)
  })

  test('every pattern it can return is one of the eight', () => {
    ;[
      'Back Squat',
      'Deadlift',
      'Bench Press',
      'Pull-up',
      'Snatch',
      'Plank',
      'Run',
      "Farmer's Carry",
    ].forEach(name => expect(PATTERNS).toContain(derivePattern(e(name, 'Força'))))
  })
})

describe('patternOf', () => {
  test('an entry.pattern set in Exercícios wins over the derived one', () => {
    expect(patternOf({ ...e('Wall Ball', 'Cardio'), pattern: 'Empurrar' })).toBe('Empurrar')
  })

  test('an unknown pattern value is ignored, not trusted', () => {
    expect(patternOf({ ...e('Wall Ball', 'Cardio'), pattern: 'Squat' })).toBe('Agachamento')
  })
})

describe('modalityOf', () => {
  test("the Exercícios family of the entry's first category", () => {
    expect(modalityOf(e('Back Squat', 'Força'))).toBe('Força')
    expect(modalityOf(e('Pull-up', 'Skill'))).toBe('Ginástica')
    expect(modalityOf(e('Run', 'Cardio'))).toBe('Condicionamento')
  })
})

describe('lpoFamiliesOf', () => {
  test('a name belongs to every family it names, in the coach spellings too', () => {
    expect([...lpoFamiliesOf('Clean & Jerk')].sort()).toEqual(['Clean', 'Jerk'])
    expect([...lpoFamiliesOf('Squat Celan')]).toEqual(['Clean'])
    expect([...lpoFamiliesOf('Shoulder to Overhead (S2OH)')]).toEqual(['Jerk'])
    expect([...lpoFamiliesOf('Hang Power Snatch')]).toEqual(['Snatch'])
    expect([...lpoFamiliesOf('Back Squat')]).toEqual([])
  })
})
