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
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

// Prescription volume that leaked into the name field — strip it before matching so the
// bare movement name underneath still resolves. #94's prod audit found this is the single
// biggest miss bucket (179 of 453 unresolved occurrences), so this peels far more than the
// original "leading bare count": distances ("800m Run"), durations ("40\" Hollow Hold",
// "1' Prancha"), rep schemes ("21-15-9 C2B", "2-4-6-8… BMU"), UNILATERAL per-side schemes
// ("8/8 Búlgaro Squat" = 8 each leg, "10/10", "20''/20''"), calorie counts ("12 cal row"),
// heart-rate zones ("20' z2 bike", "Run Z1") and the coach's "heavy" qualifier.
//
// A unit letter must not be followed by another letter — otherwise the "s" in "5 Strict
// Pull Up" reads as a seconds unit and the name is mangled to "trict pull up".
const LEADING_VOLUME =
  /^(?:heavy(?![a-z])|z\d+|\d+(?:[.,]\d+)?\s*(?:(?:km|kg|cal|min|k|m|s|x)(?![a-z]))?)\s*['"’”′″]*\s*[-/…,.]*\s*/
// A slot letter from a lettered block ("A- 3 Snatch Balance", "C 3 Squat Jerk"). Only
// stripped when a NUMBER follows, so the interval "A cada 3'" is never mistaken for one.
const SLOT = /^[a-e][-).]?\s+(?=\d)/
// A tempo/pause note glued to the end ("Bench Press 3\" pausa", "Squat clean 30\" entre as
// reps"): everything from the tempo mark on is coaching detail, not the movement.
const TRAILING_NOTE = /\s*\d+\s*['"’”′″].*$/
// A trailing qualifier in parens ("Row ( forte )", "Split Jerk (BNK)", "Box Jump Over
// (Step Down)"). Safe as a FALLBACK only — resolveExercise tries the exact key first, so
// a real entry like "Hip Distraction (banded)" still matches before this ever runs.
const TRAILING_PAREN = /\s*\([^)]*\)\s*$/
// Alternating-sides suffix ("DB Snatch alt", "Perdigueiro alternando", "V ups Alt") and a
// dangling "pausa" left behind once its tempo mark is stripped ("Bench Press pausa 2\" …").
const TRAILING_ALT = /\s+(?:alt|alternad[oa]s?|alternando|pausa|pause)$/

function stripVolumeNoise(key) {
  let out = key.replace(SLOT, '')
  // Iterate: a rep scheme is several volume tokens in a row ("21-15-9 " = 3 passes).
  for (let i = 0; i < 12 && out; i++) {
    const next = out.replace(LEADING_VOLUME, '')
    if (next === out) break
    out = next
  }
  return out
    .replace(/\s*z\d+$/, '')
    .replace(TRAILING_NOTE, '')
    .replace(TRAILING_PAREN, '')
    .replace(TRAILING_ALT, '')
    .trim()
}

// A trailing "(…)" in a registry name is either a DISAMBIGUATOR ("Remo (Ergômetro)",
// "L-sit (rings)") or the coach's SHORTHAND ("Single Under (SU)", "Burpee Over the Bar
// (BOB)") — the convention #94 settled on for new entries. Both halves must resolve, so
// an entry is also indexed under its base name and, when the parenthetical looks like a
// shorthand, under the shorthand alone. Shorthand = a short all-caps token, which is what
// separates "(SU)"/"(S2OH)"/"(BOB)" from "(Ergômetro)"/"(banded)"/"(Assault/Echo)" —
// so no per-entry upkeep is needed as the coach adds more.
const PAREN = /^(.*?)\s*\(([^)]+)\)\s*$/
const SHORTHAND = /^[A-Z0-9&/+-]{2,6}$/
function derivedKeys(name) {
  const keys = []
  const add = k => {
    if (k && !keys.includes(k)) keys.push(k)
  }

  const m = String(name).match(PAREN)
  if (m) {
    const [, base, inner] = m
    if (base.trim()) add(normExName(base))
    if (SHORTHAND.test(inner.trim())) add(normExName(inner))
  }

  // "Strict Pull-up" ↔ "Strict Pull Up". normExName KEEPS hyphens on purpose (exerciseGroups'
  // rootGroup tokenizes on them), but the coach types the spaced spelling about as often, so
  // every hyphenated entry also answers to it — one rule instead of an alias per name.
  ;[normExName(name), ...keys].forEach(k => {
    if (k.includes('-')) add(k.replace(/-/g, ' '))
  })
  return keys
}

// Shorthand / pt-BR variant → canonical registry name. Authored from a real diff of
// prod's 228 session-exercise-name occurrences against exercise_registry
// (docs/plans/30-registry-normalization.md, 2026-07-18) — not guessed. Raised the
// join rate from 12.7% to 51.3% on that sample; the rest of the misses are compound
// prescription notation ("1 MUSCLE + 3 FRONT 3\"", "A- 3 SNATCH BALANCE") that isn't a
// single exercise name and would need real product changes (not aliasing) to capture.
// Extend here as new misses turn up — never at a call site.
//
// ⚠️ Every VALUE must be an EXACT existing registry entry name. A value naming an entry
// that doesn't exist is a dangling pointer that silently resolves to nothing — #94 found
// 'run'/'sprint' both pointing at a "Corrida" entry the registry has never had (the real
// Cardio entry is "Run"), so the coach's actual pt-BR word missed entirely.
export const ALIASES = {
  bmu: 'Bar Muscle-up',
  rmu: 'Ring Muscle-up',
  'ring mu': 'Ring Muscle-up',
  t2b: 'Toes to Bar',
  'strict t2b': 'Toes to Bar',
  c2b: 'Chest-to-Bar',
  du: 'Double Under',
  'du crossover': 'Double Under',
  hspu: 'Strict HSPU',
  ohs: 'Overhead Squat',
  'c&j': 'Clean & Jerk',
  corrida: 'Run',
  row: 'Remo (Ergômetro)',
  remador: 'Remo (Ergômetro)',
  bike: 'Bike (Assault/Echo)',
  ski: 'Ski Erg',
  pistol: 'Pistol Squat',
  pistols: 'Pistol Squat',
  'strict pull up supinado': 'Strict Pull-up',
  'strict pull-up supinado': 'Strict Pull-up',
  'strict pull up argola': 'Strict Pull-up',
  hsw: 'Handstand Walk',
  'ring dips': 'Ring Dip',
  prancha: 'Plank',
  'prancha lateral': 'Side Plank',
  'bent over row': 'Barbell Row',
  'rosca direta': 'Bicep Curl',
  'farm carry': "Farmer's Carry",
  'elevacao frontal': 'Front Raise',
  'elevacao lateral': 'Lateral Raise',
  'deficit deadlift': 'Deadlift',
  'strict press sentado': 'Strict Press',
  'bulgaro squat': 'Bulgarian Split Squat',
  'hip thruster': 'Hip Thrust',
  'flexao nordica': 'Nordic Curl',

  // #94 batch (2026-07-25). A "squat" clean/snatch IS the full lift — the registry names
  // it plain, the coach spells the receiving position out.
  'squat clean': 'Clean',
  'floor squat clean': 'Clean',
  'low squat clean': 'Clean',
  'hang squat clean': 'Hang Clean',
  'high hang squat clean': 'Hang Clean',
  'squat snatch': 'Snatch',
  'hang squat snatch': 'Hang Snatch',
  // pt-BR word order ("Deadlift déficit") + feminine/bare forms of aliases already here.
  'deadlift deficit': 'Deadlift',
  bulgaro: 'Bulgarian Split Squat',
  'strict pull up supinada': 'Strict Pull-up',
  'strict pull-up supinada': 'Strict Pull-up',
  // Bare "GHD" is the sit-up in this gym's usage; the extension is spelled out.
  ghd: 'GHD Sit-up',
  'ghd hiperextensao': 'GHD Back Extension',
  'ghd hipertensao': 'GHD Back Extension',
  // pt-BR the coach actually types.
  'remada russa': 'Russian Row',
  'remada curvada': 'Barbell Row',
  'prancha ventral': 'Plank',
  'prancha lat': 'Side Plank',
  'bom dia': 'Good Morning',
  martelo: 'Hammer Curl',
  'elevacao lat': 'Lateral Raise',
  // Spellings of the new #94 entries. "Devil Press" is by definition a dumbbell movement,
  // so "DB Devil Press"/"Devil's Press" are spellings of ONE exercise, not load variants.
  "devil's press": 'Devil Press',
  'devils press': 'Devil Press',
  'db devil press': 'Devil Press',
  'wal ball': 'Wall Ball',
  // ("burpee over the bar" itself needs no alias — it's the derived base name of the entry.)
  'burpee over bar': 'Burpee Over the Bar (BOB)',
  'bar facing burpee': 'Burpee Over the Bar (BOB)',
  bbjo: 'Burpee Box Jump Over',

  // #94 round 2 — plain misspellings of entries that already exist. Match-only, so the
  // coach's spelling stays on screen; only the lookup key is corrected.
  'back squay': 'Back Squat',
  hollowrock: 'Hollow Rock',
  vup: 'V-up',
  vups: 'V-up', // run-together spellings the hyphen rule can't reach
  'romenian deadlift': 'Romanian Deadlift',
  'hummer curl': 'Hammer Curl',
  'nordic hamstring curl': 'Nordic Curl',
  'dragon fly': 'Dragon Flag',
  celan: 'Clean',
  'squat celan': 'Clean',
  'hang squat celan': 'Hang Clean',
  'shoulders press': 'Strict Press',
  'shoulders pres': 'Strict Press',
  'pause bench press': 'Bench Press',
  'a swing': 'American KB Swing',
  'kb american swing': 'American KB Swing',
  'kh oh walking': 'DUal KB Overhead Walking',
  'dual kb oh walking': 'DUal KB Overhead Walking',
  'oh walking 2kb': 'DUal KB Overhead Walking',

  // #94 round 2 — spellings/variants of entries added by 94-round2-registry-additions.sql,
  // plus the two the coach mapped onto existing English entries instead of registering.
  'abs anilha': 'Plate Sit-up',
  'abdominal com anilha': 'Plate Sit-up',
  'prancha lat e': 'Side Plank',
  'prancha lat d': 'Side Plank',
  'prancha lateral e': 'Side Plank',
  'prancha lateral d': 'Side Plank',
  'abs medball': 'Abs Med Ball',
  'lenhador caotic': 'Lenhador',
  // Bare HSPU means the kipping version (coach's call — same logic as the bare Pull-up).
  'handstand push up': 'Kipping HSPU',
  'handstand push-up': 'Kipping HSPU',
  'handstand hold wall': 'Handstand Hold',
  'hsw hold': 'Handstand Hold',
  'lsit argola': 'L-sit (rings)',
  'l sit argola': 'L-sit (rings)',
  lsit: 'L-Sit',
  'l sit barra': 'L-Sit Barra',
  'wall walking': 'Wall Walk',
  'tap shoulder': 'Shoulder Tap',
  'wall shoulder taps': 'Shoulder Tap',
  'push up hand release': 'Hand Release Push-up',
  'push-up hand release': 'Hand Release Push-up',
  'burpees box jump over': 'Burpee Box Jump Over',
  'box jump step down': 'Box Jump Over',
  'bbjo step down': 'Box Jump Over',
  'burpees broad jump': 'Burpee Broad Jump',
  'burpees to plate': 'Burpee to Plate',
  'globet squat': 'Goblet Squat',
  'remada low curvada': 'Barbell Row',
  'remada curvada peg supinada': 'Barbell Row',
  'bulgaro squat com': 'Bulgarian Split Squat',
  legless: 'Legless Rope Climb',
  rc: 'Rope Climb',
  'wall sit hold': 'Wall Sit',
  'db bench press inclinado': 'DB Bench Press',
  'dual step box up': 'DB Step Box Up',
  'step down kb': 'KB Step Down',
  'kb leg over': 'KB Over Leg',
  'over kb leg': 'KB Over Leg',
  'low hang clean': 'Hang Clean',
  'high squat clean': 'Clean',
  // "S" = strict in the coach's shorthand.
  's pull up': 'Strict Pull-up',
  's pull-up': 'Strict Pull-up',
  's t2b': 'Toes to Bar',
  's hspu': 'Strict HSPU',
  // NOTE: "Pull Up" → "Pull-up" needs no alias — buildRegistryIndex derives the spaced
  // spelling of every hyphenated entry (see derivedKeys), which is self-maintaining.
}

// Map<normKey, entry> flattened across every block family — entry gets a `categories`
// array of every family key it was found under (first-seen entry data wins on a
// collision, matching the old per-consumer `demoMap`/`getRegistryDefaults` behavior).
// Build once per registry fetch and reuse across many resolveExercise() calls.
export function buildRegistryIndex(registry) {
  const index = new Map()
  if (!registry || typeof registry !== 'object') return index

  const flat = []
  Object.entries(registry).forEach(([family, list]) => {
    ;(Array.isArray(list) ? list : []).forEach(raw => {
      const name = typeof raw === 'string' ? raw : raw?.name
      if (name) flat.push([family, name, raw])
    })
  })

  // Pass 1 — real entry names. Two passes (not one) so a name DERIVED from one entry can
  // never shadow another entry's actual name: every real name is in the map first.
  flat.forEach(([family, name, raw]) => {
    const key = normExName(name)
    const existing = index.get(key)
    if (existing) {
      if (!existing.categories.includes(family)) existing.categories.push(family)
    } else
      index.set(key, { ...(typeof raw === 'string' ? { name: raw } : raw), categories: [family] })
  })

  // Pass 2 — base-name / shorthand keys point at the SAME entry object (so `categories`
  // stays shared and correct); first one wins, and a real name is never overwritten.
  flat.forEach(([, name]) => {
    const entry = index.get(normExName(name))
    if (!entry) return
    derivedKeys(name).forEach(k => {
      if (!index.has(k)) index.set(k, entry)
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
  const index =
    registryOrIndex instanceof Map ? registryOrIndex : buildRegistryIndex(registryOrIndex)
  const key = normExName(name)
  if (!key) return null

  // Candidate spellings, strongest signal first — the exact name always wins, and each
  // fallback only runs if everything before it missed.
  const forms = [key, stripVolumeNoise(key)]
  // Hyphens both ways: the index carries the spaced form of a hyphenated ENTRY
  // (derivedKeys); this is the mirror case, a hyphenated spelling of a spaced entry.
  forms.forEach(k => {
    if (k.includes('-')) forms.push(k.replace(/-/g, ' '))
  })
  // Last resort — a plain plural ("Lunges", "Burpees", "Upright Rows", "V-ups"). The
  // "[^s]s" guard means a word already ending in "ss" is left alone, so "Press" is never
  // mangled into "Pres".
  forms.slice().forEach(k => {
    if (/[^s]s$/.test(k)) forms.push(k.slice(0, -1))
  })

  for (const form of forms) {
    const hit = lookup(index, form)
    if (hit) return hit
  }
  return null
}
