// Registry name resolution (#62) — a coach free-types shorthand and pt-BR names
// ("BMU", "T2B", "HSPU ", "FLEXÃO NÓRDICA ") into session/PR exercise fields while
// exercise_registry entries are English long-form ("Bar Muscle-up", "Toes to Bar").
// Raw exact-lowercase equality at each consumer joined only ~12% of real prod names
// (docs/plans/30-registry-normalization.md). This is the one path every name→registry
// lookup should go through instead of reimplementing the comparison.
//
// Match-only: normExName/resolveExercise never rewrite what the coach typed — only
// the lookup key changes, so prescriptions and display are untouched.

export function normExName(name) {
  return (name || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().trim().replace(/\s+/g, ' ')
}

// A leading rep/time/distance count ("10' BIKE", "800m Run") or a trailing heart-rate
// zone ("Run Z1") is prescription volume that leaked into the name field — strip it
// before matching so the bare movement name underneath still resolves.
function stripVolumeNoise(key) {
  return key.replace(/^\d+['"’′]*\s*/, '').replace(/\s*z\d+$/, '').trim()
}

// Shorthand / pt-BR variant → canonical registry name. Authored from a real diff of
// prod's 228 session-exercise-name occurrences against exercise_registry
// (docs/plans/30-registry-normalization.md, 2026-07-18) — not guessed. Raised the
// join rate from 12.7% to 51.3% on that sample; the rest of the misses are compound
// prescription notation ("1 MUSCLE + 3 FRONT 3\"", "A- 3 SNATCH BALANCE") that isn't a
// single exercise name and would need real product changes (not aliasing) to capture.
// Extend here as new misses turn up — never at a call site.
export const ALIASES = {
  'bmu': 'Bar Muscle-up',
  'rmu': 'Ring Muscle-up', 'ring mu': 'Ring Muscle-up',
  't2b': 'Toes to Bar', 'strict t2b': 'Toes to Bar',
  'c2b': 'Chest-to-Bar',
  'du': 'Double Under', 'du crossover': 'Double Under',
  'hspu': 'Strict HSPU',
  'ohs': 'Overhead Squat',
  'c&j': 'Clean & Jerk',
  'run': 'Corrida', 'sprint': 'Corrida',
  'row': 'Remo (Ergômetro)',
  'bike': 'Bike (Assault/Echo)',
  'ski': 'Ski Erg',
  'pistol': 'Pistol Squat', 'pistols': 'Pistol Squat',
  'strict pull up supinado': 'Strict Pull-up',
  'strict pull-up supinado': 'Strict Pull-up',
  'strict pull up argola': 'Strict Pull-up',
  'hsw': 'Handstand Walk',
  'ring dips': 'Ring Dip',
  'prancha': 'Plank', 'prancha lateral': 'Side Plank',
  'bent over row': 'Barbell Row',
  'rosca direta': 'Bicep Curl',
  "farm carry": "Farmer's Carry",
  'elevacao frontal': 'Front Raise',
  'elevacao lateral': 'Lateral Raise',
  'deficit deadlift': 'Deadlift',
  'strict press sentado': 'Strict Press',
  'bulgaro squat': 'Bulgarian Split Squat',
  'hip thruster': 'Hip Thrust',
  'flexao nordica': 'Nordic Curl',
}

// Map<normKey, entry> flattened across every block family — entry gets a `categories`
// array of every family key it was found under (first-seen entry data wins on a
// collision, matching the old per-consumer `demoMap`/`getRegistryDefaults` behavior).
// Build once per registry fetch and reuse across many resolveExercise() calls.
export function buildRegistryIndex(registry) {
  const index = new Map()
  if (!registry || typeof registry !== 'object') return index
  Object.entries(registry).forEach(([family, list]) => {
    (Array.isArray(list) ? list : []).forEach(raw => {
      const name = typeof raw === 'string' ? raw : raw?.name
      if (!name) return
      const key = normExName(name)
      const existing = index.get(key)
      if (existing) { if (!existing.categories.includes(family)) existing.categories.push(family) }
      else index.set(key, { ...(typeof raw === 'string' ? { name: raw } : raw), categories: [family] })
    })
  })
  return index
}

function lookup(index, key) {
  if (!key) return null
  if (index.has(key)) return index.get(key)
  const alias = ALIASES[key]
  return alias ? index.get(normExName(alias)) || null : null
}

// Resolves a coach-typed exercise name to its registry entry (with a `categories`
// array attached). `registryOrIndex` accepts either the raw `exercise_registry` blob
// or a `buildRegistryIndex` Map — pass a pre-built Map when resolving many names
// against the same registry (e.g. every exercise row in a session).
export function resolveExercise(name, registryOrIndex) {
  const index = registryOrIndex instanceof Map ? registryOrIndex : buildRegistryIndex(registryOrIndex)
  const key = normExName(name)
  if (!key) return null
  return lookup(index, key) || lookup(index, stripVolumeNoise(key))
}
