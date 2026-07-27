import { describe, it, expect } from 'vitest'
import {
  FAMILY_GROUPS,
  ALL_CATEGORIES,
  familyOf,
  rootGroup,
  groupByRoot,
  completeness,
} from './exerciseGroups.js'

// The 15 registry categories (Exercicios.jsx BLOCK_ORDER) — the family map must cover
// each exactly once. Duplicated here as a fixed contract so the test stays client-free.
const CATEGORIES = [
  'HIIT',
  'MetCon',
  'EMOM',
  'For Time',
  'AMRAP',
  'Estações',
  'Força',
  'LPO',
  'Core',
  'Acessórios',
  'Aquecimento',
  'Skill',
  'Cardio',
  'Mobilidade',
  'Benchmark',
]

describe('FAMILY_GROUPS', () => {
  it('partitions every registry category into exactly one family', () => {
    expect([...ALL_CATEGORIES].sort()).toEqual([...CATEGORIES].sort())
    // no category appears twice
    expect(new Set(ALL_CATEGORIES).size).toBe(ALL_CATEGORIES.length)
    // every category resolves to a family
    CATEGORIES.forEach(c => expect(familyOf(c)).not.toBeNull())
  })

  it('collapses the WOD formats into one family (Benchmark included)', () => {
    const wod = FAMILY_GROUPS.find(f => f.key === 'WOD')
    expect(wod.cats).toContain('Benchmark')
    expect(wod.cats).toContain('For Time')
    expect(familyOf('Força').label).toBe('Força')
    expect(familyOf('Skill').label).toBe('Ginástica')
    expect(familyOf('Cardio').label).toBe('Condicionamento')
  })
})

describe('rootGroup — rightmost-token, longest-wins', () => {
  it('takes the LAST movement of a compound lift', () => {
    expect(rootGroup('Snatch Deadlift')).toBe('Deadlift') // a deadlift, not a snatch
    expect(rootGroup('Clean & Jerk')).toBe('Jerk')
    expect(rootGroup('Push Press')).toBe('Press')
    expect(rootGroup('Snatch Pull')).toBe('Pull')
    expect(rootGroup('Clean Deadlift')).toBe('Deadlift')
  })

  it('prefers the longer root at an equal position (Pull-up over Pull)', () => {
    expect(rootGroup('Strict Pull-up')).toBe('Pull-up')
    expect(rootGroup('Ring Strict Pull-up')).toBe('Pull-up')
    expect(rootGroup('Weighted Pull-up')).toBe('Pull-up')
    expect(rootGroup('Face Pull')).toBe('Pull') // no -up → plain Pull
    expect(rootGroup('Bar Muscle-up')).toBe('Muscle-up')
  })

  it('matches whole tokens only — never a substring', () => {
    expect(rootGroup('Tuck Planche')).toBeNull() // "planche" is not "plank"
    expect(rootGroup('Snatch Balance')).toBe('Snatch')
  })

  it('returns null for names with no curated root (singletons)', () => {
    expect(rootGroup('Chest-to-Bar')).toBeNull()
    expect(rootGroup('Toes to Bar')).toBeNull()
    expect(rootGroup('L-Sit')).toBeNull() // "l-sit" ≠ "sit-up"
    expect(rootGroup('Double Under')).toBeNull()
    expect(rootGroup('Handstand Walk')).toBeNull()
    expect(rootGroup('')).toBeNull()
  })

  it('is accent/case/whitespace-safe via normExName', () => {
    expect(rootGroup('  BACK   SQUAT ')).toBe('Squat')
    expect(rootGroup('Agachamento')).toBeNull() // pt-BR free-text, no root
  })
})

describe('groupByRoot — real prod categories', () => {
  it('Força → Squat(7) · Deadlift(4) · Jerk(2) · Press(3), 4 singles', () => {
    const forca = [
      'Back Squat',
      'Barbell Row',
      'Bench Press',
      'Box Squat',
      'Bulgarian Split Squat',
      'Deadlift',
      'Front Squat',
      'Good Morning',
      'Overhead Squat',
      'Pause Squat',
      'Push Jerk',
      'Push Press',
      'Romanian Deadlift',
      'Split Jerk',
      'Strict Press',
      'Sumo Deadlift',
      'Trap Bar Deadlift',
      'Weighted Dip',
      'Weighted Pull-up',
      'Zercher Squat',
    ]
    const { groups, singles } = groupByRoot(forca)
    const map = Object.fromEntries(groups.map(g => [g.root, g.items.length]))
    expect(map).toEqual({ Squat: 7, Deadlift: 4, Jerk: 2, Press: 3 })
    // Row/Good Morning/Dip/Pull-up are 1-member each here → singles
    expect(singles.sort()).toEqual([
      'Barbell Row',
      'Good Morning',
      'Weighted Dip',
      'Weighted Pull-up',
    ])
    // nothing lost
    expect(groups.reduce((n, g) => n + g.items.length, 0) + singles.length).toBe(forca.length)
  })

  it('Skill → Pull-up(3) · Muscle-up(2) · HSPU(2) · Dip(2) · Climb(2) · Jump(2)', () => {
    const skill = [
      'Bar Dip',
      'Bar Muscle-up',
      'Box Jump',
      'Broad Jump',
      'Chest-to-Bar',
      'Double Under',
      'Handstand Hold',
      'Handstand Walk',
      'Kipping HSPU',
      'Kipping Pull-up',
      'L-sit (rings)',
      'Legless Rope Climb',
      'Low bar banded',
      'Pistol Squat',
      'Ring Dip',
      'Ring Muscle-up',
      'Ring Push-up',
      'Ring Row',
      'Ring Strict Pull-up',
      'Rope Climb',
      'Strict HSPU',
      'Strict Pull-up',
      'Tuck Planche',
    ]
    const { groups, singles } = groupByRoot(skill)
    const map = Object.fromEntries(groups.map(g => [g.root, g.items.length]))
    expect(map).toEqual({ Dip: 2, 'Muscle-up': 2, Jump: 2, HSPU: 2, 'Pull-up': 3, Climb: 2 })
    expect(groups.reduce((n, g) => n + g.items.length, 0) + singles.length).toBe(skill.length)
  })

  it('preserves incoming order and never drops an item', () => {
    const list = ['Front Squat', 'Deadlift', 'Back Squat', 'Random Thing']
    const { groups, singles } = groupByRoot(list)
    expect(groups.find(g => g.root === 'Squat').items).toEqual(['Front Squat', 'Back Squat'])
    expect(singles).toContain('Random Thing') // no root
    expect(singles).toContain('Deadlift') // 1-member root → single
  })

  it('reads names off objects too', () => {
    const list = [{ name: 'Back Squat' }, { name: 'Front Squat' }]
    const { groups } = groupByRoot(list)
    expect(groups[0].root).toBe('Squat')
    expect(groups[0].items).toHaveLength(2)
  })
})

describe('completeness', () => {
  it('reads the five fields, video 3-state', () => {
    expect(completeness({ videoUrl: 'x', videoPublished: true })).toMatchObject({ video: 'pub' })
    expect(completeness({ videoUrl: 'x' })).toMatchObject({ video: 'unpub' })
    expect(completeness({ videoUrl: '  ' })).toMatchObject({ video: 'none' })
    expect(completeness({})).toMatchObject({ video: 'none' })
  })

  it('detects loads from any of sets/reps/dist/intensity', () => {
    expect(completeness({ defaults: { sets: '5' } }).cargas).toBe(true)
    expect(completeness({ defaults: { reps: '10' } }).cargas).toBe(true)
    expect(completeness({ defaults: { dist: '400' } }).cargas).toBe(true)
    expect(completeness({ defaults: { intensity: { mode: 'pct' } } }).cargas).toBe(true)
    expect(completeness({ defaults: { intensity: { mode: 'none' } } }).cargas).toBe(false)
    expect(completeness({ defaults: {} }).cargas).toBe(false)
    expect(completeness({}).cargas).toBe(false)
  })

  it('trims description/muscles/notes', () => {
    const c = completeness({ description: 'a', muscles: '  ', notes: 'n' })
    expect(c).toMatchObject({ desc: true, musc: false, det: true })
  })

  it('accepts a bare string exercise (all empty)', () => {
    expect(completeness('Back Squat')).toEqual({
      cargas: false,
      video: 'none',
      desc: false,
      musc: false,
      det: false,
    })
  })
})
