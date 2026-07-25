// Exercícios catalog grouping (#55 / #87 · plans/38 · mockup 45). Three pure pieces
// the Exercícios tab composes; no React, no client — reuses normExName (registry.js).
//
//  1. FAMILY_GROUPS — the 4 movement families the category column groups under. Every
//     registry category maps to exactly one family; the WOD family collapses the format
//     categories (they hold formats, not movements — only Benchmark carries exercises).
//  2. rootGroup / groupByRoot — curated variation roots, so a category's exercise list
//     renders as sub-groups (▸ Squat (7)) with the leftovers flat.
//  3. completeness — the per-exercise 5-field indicator on the cards + detail labels.
//
// Family colors are DATA colors (family identity, stable across all four themes) — the
// same exemption as blkColor's block-family palette.

import { normExName } from './registry.js'

export const FAMILY_GROUPS = [
  { key: 'WOD',  label: 'WOD',             color: '#d8a840',
    cats: ['HIIT', 'MetCon', 'EMOM', 'For Time', 'AMRAP', 'Estações', 'Benchmark'] },
  { key: 'Forca', label: 'Força',          color: '#5090e0',
    cats: ['Força', 'LPO', 'Core', 'Acessórios'] },
  { key: 'Gin',  label: 'Ginástica',       color: '#4ac8c0',
    cats: ['Skill'] },
  { key: 'Cond', label: 'Condicionamento', color: '#40b878',
    cats: ['Cardio', 'Aquecimento', 'Mobilidade'] },
]

// Every category, in family order — the canonical iteration order for the grouped list.
export const ALL_CATEGORIES = FAMILY_GROUPS.flatMap(f => f.cats)

export const familyOf = cat => FAMILY_GROUPS.find(f => f.cats.includes(cat)) || null

// Curated variation roots (authored from a diff of prod's real 157 registry names, not
// guessed). The primary movement of a compound lift is its LAST word — "Snatch Deadlift"
// is a deadlift, "Push Press" a press, "Clean & Jerk" a jerk — so rootGroup picks the
// root whose match ENDS rightmost; longest-match wins a tie so "Strict Pull-up" resolves
// to Pull-up, not Pull. Multi-word ("Good Morning") and hyphenated ("Pull-up", "Sit-up",
// "Muscle-up", "Push-up") roots are matched as contiguous token runs; normExName lowercases
// and trims but KEEPS the hyphen, and tokenize() splits on space AND hyphen, so both parts
// line up. List order only breaks an exact end+length tie (earlier wins).
export const ROOTS = [
  'Muscle-up', 'Pull-up', 'Push-up', 'Sit-up', 'Good Morning',
  'Deadlift', 'Squat', 'Snatch', 'Clean', 'Jerk', 'Press', 'Row', 'Pull',
  'Raise', 'Curl', 'Dip', 'Swing', 'Extension', 'Climb', 'Lunge', 'Carry', 'Jump',
  'Hold', 'Plank', 'Stretch', 'Pose', 'Distraction', 'Circle', 'HSPU', 'Run',
]

const tokenize = key => key.split(/[\s-]+/).filter(Boolean)

// End index (exclusive) of the RIGHTMOST occurrence of token-run `needle` inside `hay`,
// or -1. Whole-token match only — "pull" never matches inside "pullover" (they're one
// token each and unequal), avoiding substring false positives.
function rightmostRun(hay, needle) {
  let end = -1
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let ok = true
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) { ok = false; break }
    if (ok) end = i + needle.length
  }
  return end
}

// The curated root a name groups under, or null (a singleton). Pure function of the name.
export function rootGroup(name) {
  const hay = tokenize(normExName(name))
  if (!hay.length) return null
  let best = null
  for (let r = 0; r < ROOTS.length; r++) {
    const needle = tokenize(normExName(ROOTS[r]))
    if (!needle.length) continue
    const end = rightmostRun(hay, needle)
    if (end < 0) continue
    if (!best || end > best.end || (end === best.end && needle.length > best.len)) {
      best = { root: ROOTS[r], end, len: needle.length }
    }
  }
  return best ? best.root : null
}

// Split a (pre-sorted) exercise list into variation sub-groups (a root with ≥2 members)
// plus the flat leftovers — roots with a single member and names that match no root both
// fall to `singles`. Sub-group order follows first appearance; member order is preserved.
export function groupByRoot(exercises, nameOf = e => (typeof e === 'string' ? e : e?.name || '')) {
  const byRoot = new Map()
  const order = []
  const noRoot = []
  for (const ex of exercises) {
    const root = rootGroup(nameOf(ex))
    if (!root) { noRoot.push(ex); continue }
    if (!byRoot.has(root)) { byRoot.set(root, []); order.push(root) }
    byRoot.get(root).push(ex)
  }
  const groups = []
  const singles = []
  for (const root of order) {
    const items = byRoot.get(root)
    if (items.length >= 2) groups.push({ root, items })
    else singles.push(...items)
  }
  singles.push(...noRoot)
  return { groups, singles }
}

// The 5-field completeness of one exercise, for the card icons + detail field labels.
// Video is 3-state — a URL that isn't published isn't visible to athletes yet, so it
// reads differently from a published one (decision #5). The others are plain presence.
export function completeness(ex) {
  const o = ex && typeof ex === 'object' ? ex : {}
  const d = o.defaults || {}
  const hasLoads = !!(
    (d.sets && String(d.sets).trim()) ||
    (d.reps && String(d.reps).trim()) ||
    (d.dist && String(d.dist).trim()) ||
    (d.intensity && d.intensity.mode && d.intensity.mode !== 'none')
  )
  return {
    cargas: hasLoads,
    video: o.videoUrl && String(o.videoUrl).trim() ? (o.videoPublished ? 'pub' : 'unpub') : 'none',
    desc: !!(o.description && String(o.description).trim()),
    musc: !!(o.muscles && String(o.muscles).trim()),
    det: !!(o.notes && String(o.notes).trim()),
  }
}
