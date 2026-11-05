// Movement patterns (#233) — the user's 8, plus a modality tag from the category. A pattern
// comes from what the registry already knows about an entry: a small keyword table, its
// variation root (`rootGroup`) and its category — never from `muscles`, which is free prose
// on 240 of 260 entries. `entry.pattern` (edited in Exercícios, #237) always wins.
//
// Only a RESOLVED entry gets a pattern. A name the registry can't resolve stays unresolved —
// it is listed by the audit, never guessed into a pattern from its spelling.

import { familyOf, rootGroup } from '../../../../public/lib/exerciseGroups.js'
import { normExName } from '../../../../public/lib/registry.js'

export const PATTERNS = [
  'Agachamento',
  'Dobradiça',
  'Empurrar',
  'Puxar',
  'Olímpico',
  'Core',
  'Monoestrutural',
  'Carregar',
]

// Whole tokens of a name — split on spaces AND hyphens, like exerciseGroups' rootGroup.
export const tokens = name =>
  normExName(name)
    .split(/[\s-]+/)
    .filter(Boolean)

// Does the token run `needle` occur in `hay`, contiguous and whole?
export function hasRun(hay, needle) {
  for (let i = 0; i + needle.length <= hay.length; i++)
    if (needle.every((t, j) => hay[i + j] === t)) return true
  return false
}

// Whole-token runs, checked IN ORDER — so a more specific phrase sits above a looser one
// ("hip thrust" before "thruster"). Each row fixes something a root or a category gets wrong:
// "Nordic Curl" is a hinge, not a pull; "Wall Ball" lives in Cardio but is a squat; "Sled Pull"
// is loaded locomotion, not a pull-up. `null` blocks a misleading root ("Leg Swing").
const KEYWORDS = [
  ['hip thrust', 'Dobradiça'],
  ['hip thruster', 'Dobradiça'],
  ['glute bridge', 'Dobradiça'],
  ['ponte', 'Dobradiça'],
  ['nordic', 'Dobradiça'],
  ['hamstring curl', 'Dobradiça'],
  ['back extension', 'Dobradiça'],
  ['hiperextensao', 'Dobradiça'],
  ['reverse hyper', 'Dobradiça'],
  ['rdl', 'Dobradiça'],
  ['stiff', 'Dobradiça'],
  ['wall ball', 'Agachamento'],
  ['thruster', 'Agachamento'],
  ['wall sit', 'Agachamento'],
  ['step up', 'Agachamento'],
  ['step box', 'Agachamento'],
  ['box step', 'Agachamento'],
  ['step down', 'Agachamento'],
  ['knee extension', 'Agachamento'],
  ['calf', 'Agachamento'],
  ['ohs', 'Agachamento'],
  ['sled', 'Carregar'],
  // "Overhead Walking" is a carry; a plain "Walking Lunge" is still a lunge.
  ['overhead walking', 'Carregar'],
  ['oh walking', 'Carregar'],
  ['burpee', 'Monoestrutural'],
  ['double under', 'Monoestrutural'],
  ['single under', 'Monoestrutural'],
  ['devil', 'Olímpico'],
  ['chest to bar', 'Puxar'],
  ['kipping swing', 'Puxar'],
  ['kipping swings', 'Puxar'],
  ['hip to bar', 'Puxar'],
  ['pullover', 'Puxar'],
  ['reverse fly', 'Puxar'],
  ['handstand walk', 'Empurrar'],
  ['wall walk', 'Empurrar'],
  ['planche', 'Empurrar'],
  ['shoulder to overhead', 'Empurrar'],
  ['tricep', 'Empurrar'],
  ['skull crusher', 'Empurrar'],
  ['pallof', 'Core'],
  ['leg raise', 'Core'],
  ['knee raise', 'Core'],
  ['toes to', 'Core'],
  ['l sit', 'Core'],
  // "Pike up Row" is a core drill; a "Pike Push-up" keeps its push-up root.
  ['pike up', 'Core'],
  ['shoulder tap', 'Core'],
  ['dead march', 'Core'],
  ['inchworm', 'Core'],
  ['leg swing', null],
].map(([k, p]) => [tokens(k), p])

const ROOT_PATTERN = {
  'Muscle-up': 'Puxar',
  'Pull-up': 'Puxar',
  'Push-up': 'Empurrar',
  'Sit-up': 'Core',
  'Good Morning': 'Dobradiça',
  Deadlift: 'Dobradiça',
  Squat: 'Agachamento',
  Snatch: 'Olímpico',
  Clean: 'Olímpico',
  Jerk: 'Olímpico',
  Press: 'Empurrar',
  Row: 'Puxar',
  Pull: 'Puxar',
  Raise: 'Empurrar',
  Curl: 'Puxar',
  Dip: 'Empurrar',
  Swing: 'Dobradiça',
  Climb: 'Puxar',
  Lunge: 'Agachamento',
  Carry: 'Carregar',
  Jump: 'Monoestrutural',
  Hold: 'Core',
  Plank: 'Core',
  HSPU: 'Empurrar',
  Run: 'Monoestrutural',
}

// The category, last — only where it says something a root can't ("Toes to Bar" has no root
// but is in Core; "Ski Erg" in Cardio). LPO is the one category that beats the root: every
// LPO entry is an Olympic drill, including "Clean High Pull" (root Pull) and "Snatch Push
// Press" (root Press).
const CATEGORY_PATTERN = { Core: 'Core', Cardio: 'Monoestrutural' }
// In Cardio a "Row" is the erg, not a pulling movement — the one root a category overrides.
const CATEGORY_ROOT = { Cardio: { Row: 'Monoestrutural' } }

export function derivePattern(entry) {
  if (!entry?.name) return null
  const hay = tokens(entry.name)
  for (const [needle, pattern] of KEYWORDS) if (hasRun(hay, needle)) return pattern
  const cats = entry.categories || []
  if (cats.includes('LPO')) return 'Olímpico'
  const root = rootGroup(entry.name)
  for (const c of cats) if (CATEGORY_ROOT[c]?.[root]) return CATEGORY_ROOT[c][root]
  if (ROOT_PATTERN[root]) return ROOT_PATTERN[root]
  for (const c of cats) if (CATEGORY_PATTERN[c]) return CATEGORY_PATTERN[c]
  return null
}

export function patternOf(entry) {
  if (!entry) return null
  return PATTERNS.includes(entry.pattern) ? entry.pattern : derivePattern(entry)
}

// 'Força' · 'Ginástica' · 'Condicionamento' · 'WOD' — the Exercícios family of the entry's
// first category.
export const modalityOf = entry => familyOf(entry?.categories?.[0])?.label || null

// The Olympic lift families an LPO block rotates through. A name belongs to every family it
// names — "Clean & Jerk" is both — and the coach's own spellings count ("Squat Celan").
export const LPO_FAMILIES = ['Snatch', 'Clean', 'Jerk']
const FAMILY_TOKENS = {
  snatch: 'Snatch',
  arranco: 'Snatch',
  clean: 'Clean',
  celan: 'Clean',
  cluster: 'Clean',
  jerk: 'Jerk',
  s2oh: 'Jerk',
}
export function lpoFamiliesOf(name) {
  const out = new Set()
  const t = tokens(name)
  t.forEach(tok => FAMILY_TOKENS[tok] && out.add(FAMILY_TOKENS[tok]))
  if (hasRun(t, ['shoulder', 'to', 'overhead'])) out.add('Jerk')
  return out
}
