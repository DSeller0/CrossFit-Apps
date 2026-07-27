import { loadRegistry } from '../../utils/storage'
import { ALL_CATEGORIES } from '../../public/lib/exerciseGroups.js'

// Re-export under this name so call sites (Exercicios.jsx, exerciciosHelpers.test.js)
// don't churn — ALL_CATEGORIES (exerciseGroups.js) is the one authored list (#98).
// #98 switched this from a standalone hand-typed list (Benchmark last, green family
// Aquecimento→Skill→Cardio→Mobilidade) to ALL_CATEGORIES' family order (Benchmark right
// after Estações, green family Skill→Cardio→Aquecimento→Mobilidade). This is a LAZY
// migration: `initRegistry` below only flags `needsSave` on a missing bucket or an
// unsorted category, never on order alone (a load path must not write — #109/#111), so
// an already-persisted registry keeps its old JSON key order until its next real edit
// triggers `saveRegistry`. Don't read "prod's key order hasn't changed" as a bug.
export const BLOCK_ORDER = ALL_CATEGORIES

export const getExName = ex => (typeof ex === 'string' ? ex : ex?.name || '')

// Alphabetical-within-category is the canonical stored order (#87) — the registry is a
// lookup catalog, not an ordered playlist, so insertion order + a manual A→Z button /
// drag-reorder are retired. Every mutation re-sorts the touched category here.
export const sortCat = arr =>
  [...arr].sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'))

// Builds the in-memory registry from storage, migrating string-only entries to {name}
// objects and re-sorting each category. Never writes — a load path never writes (#109;
// see #76/`0007` for what a load-time write cost there). The caller reads `needsSave`
// and decides whether to persist.
export function initRegistry() {
  const migrateEx = ex => (typeof ex === 'string' ? { name: ex } : ex)
  const existing = loadRegistry()
  if (existing && typeof existing === 'object') {
    const reg = {}
    let needsSave = false
    BLOCK_ORDER.forEach(n => {
      if (!existing[n]) {
        reg[n] = []
        needsSave = true
        return
      }
      const raw = Array.isArray(existing[n]) ? existing[n] : []
      if (raw.some(e => typeof e === 'string')) needsSave = true
      const migrated = raw.map(migrateEx)
      const sorted = sortCat(migrated)
      if (sorted.some((e, i) => e !== migrated[i])) needsSave = true
      reg[n] = sorted
    })
    return { registry: reg, needsSave }
  }
  const reg = {}
  BLOCK_ORDER.forEach(n => {
    reg[n] = []
  })
  return { registry: reg, needsSave: true }
}
