// Seeded draws for the suggested session (#233). One stream per BLOCK, keyed on
// `scope|date|blockType|variant`: "↻ Outra" bumps one block's variant, and because no other
// block reads that stream, nothing else redraws. FNV-1a hashes the key, mulberry32 turns the
// hash into a [0, 1) sequence — both tiny, dependency-free and identical on every engine, so
// the same key draws the same numbers in the browser, in the audit script and in a test.

export function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const seedKey = (scope, date, blockType, variant = 0) =>
  `${scope}|${date}|${blockType}|${variant}`

export const streamFor = (scope, date, blockType, variant = 0) =>
  mulberry32(fnv1a(seedKey(scope, date, blockType, variant)))

// The index a weighted draw lands on, or -1 when no weight is positive. Callers pass the
// candidates in a stable order — the draw is only as deterministic as that order.
export function weightedIndex(rand, weights) {
  const total = weights.reduce((s, w) => s + (w > 0 ? w : 0), 0)
  if (!(total > 0)) return -1
  let r = rand() * total
  let last = -1
  for (let i = 0; i < weights.length; i++) {
    if (!(weights[i] > 0)) continue
    last = i
    r -= weights[i]
    if (r < 0) return i
  }
  return last
}
