import { describe, test, expect } from 'vitest'
import { fnv1a, mulberry32, seedKey, streamFor, weightedIndex } from './rng.js'

describe('fnv1a', () => {
  test('matches the published FNV-1a 32-bit vectors', () => {
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
    expect(fnv1a('foobar')).toBe(0xbf9cf968)
  })
})

describe('mulberry32', () => {
  test('the same seed draws the same sequence, inside [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const xs = Array.from({ length: 50 }, () => a())
    expect(Array.from({ length: 50 }, () => b())).toEqual(xs)
    expect(xs.every(x => x >= 0 && x < 1)).toBe(true)
  })
})

describe('streamFor', () => {
  test('one stream per scope|date|blockType|variant', () => {
    expect(seedKey('__sem_box__', '2026-10-05', 'LPO', 1)).toBe('__sem_box__|2026-10-05|LPO|1')
    const first = (...k) => streamFor(...k)()
    expect(first('s', '2026-10-05', 'LPO', 0)).toBe(first('s', '2026-10-05', 'LPO', 0))
    // "↻ Outra" bumps one block's variant: a different stream for that block only.
    expect(first('s', '2026-10-05', 'LPO', 1)).not.toBe(first('s', '2026-10-05', 'LPO', 0))
    expect(first('s', '2026-10-05', 'Core', 0)).not.toBe(first('s', '2026-10-05', 'LPO', 0))
  })
})

describe('weightedIndex', () => {
  test('-1 when no weight is positive', () => {
    expect(weightedIndex(() => 0.5, [])).toBe(-1)
    expect(weightedIndex(() => 0.5, [0, 0])).toBe(-1)
  })

  test('lands on the weight band the draw falls in, skipping zero weights', () => {
    expect(weightedIndex(() => 0, [0, 1, 3])).toBe(1)
    expect(weightedIndex(() => 0.2, [0, 1, 3])).toBe(1)
    expect(weightedIndex(() => 0.3, [0, 1, 3])).toBe(2)
    expect(weightedIndex(() => 0.9999, [1, 3, 0])).toBe(1)
  })
})
