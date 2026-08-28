// Session-domain helpers — neither WOD- nor date-domain, so they live here
// rather than in wod.js/week.js. Promoted from meHelpers.js (#70) because it was
// the one copy with tests (meHelpers.test.js); storage.js and Schedule.jsx each
// carried an equivalent, untested copy.

import { dayNameFull } from './week.js'
import { uid } from './wod.js'
import { inBoxScope } from './boxScope.js'

// Sessions created before mid-June 2026 carry a numeric Date.now()+Math.random()
// id; uid() has returned a base36 string since. results_v2.session_id is `text`
// and every writer does String(sessionId), so a session read back with a numeric
// id never === its own results (#110). Call this at every point sessions enter
// the app (SPA load + sync, each public page's fetch) so every downstream `===`
// is string-vs-string for free — coercing at the ~12 comparison sites instead is
// how this bug keeps coming back. Pure; a missing id gets a fresh uid() (folds in
// the stamping loadLS already did).
export function normalizeSessionIds(blob) {
  if (!blob || typeof blob !== 'object') return blob
  const out = {}
  Object.keys(blob).forEach(dateKey => {
    const arr = blob[dateKey]
    if (!Array.isArray(arr)) {
      out[dateKey] = arr
      return
    }
    out[dateKey] = arr.map(s => {
      if (!s || typeof s !== 'object') return s
      return { ...s, id: s.id != null ? String(s.id) : uid() }
    })
  })
  return out
}

export function getTargets(s) {
  if (!s?.mainTraining) return []
  return Array.isArray(s.mainTraining) ? s.mainTraining : [s.mainTraining]
}

export function matchesAthlete(s, name) {
  return getTargets(s).includes(name)
}

// Session display name — superset fallback chain: explicit name, then legacy
// mainTraining (string or array, joined), then the weekday. Canonical since
// #84 (was folder-scoped to results/resultsHelpers.js; ~9 other sites hand-
// rolled a subset of 'Sessão'/'Treino'/'–'/'—'/'' placeholders — several
// skipped mainTraining entirely, regressing legacy sessions that only set it —
// and a static placeholder is worse than the real weekday when dateKey is
// known: an unnamed Monday reads "Segunda-feira", not "Sessão"). Falls back to
// 'Sessão' only when dateKey isn't available (some Publicador <option> lists).
export function sessName(sess, dateKey) {
  if (sess?.sessionName || sess?.name) return sess.sessionName || sess.name
  const targets = getTargets(sess)
  return (targets.length ? targets.join(', ') : null) || (dateKey ? dayNameFull(dateKey) : 'Sessão')
}

// Planned (from the sessions blob) vs executed (from results) block counts per type,
// inside a date window. Only public sessions the athlete was assigned to count as
// planned. Promoted from public/me/meHelpers.js (#160/plans/76 — same move #70 made
// for getTargets/matchesAthlete): it's session-domain, and Atletas (SPA-side) is now
// a second consumer alongside me.html.
export function calcBlockStats(sessions, present, name, types, start, end, box = null) {
  const ts = new Set(types),
    planned = {},
    executed = {}
  types.forEach(t => {
    planned[t] = 0
    executed[t] = 0
  })
  Object.keys(sessions).forEach(date => {
    if (date < start || date > end) return
    ;(sessions[date] || [])
      .filter(s => s.public !== false && inBoxScope(s, box))
      .forEach(s => {
        if (!matchesAthlete(s, name)) return
        ;(s.blocks || []).forEach(b => {
          if (ts.has(b.type)) planned[b.type]++
        })
      })
  })
  present.forEach(r => {
    if (r.date < start || r.date > end) return
    ;(r.blocks || []).forEach(b => {
      if (ts.has(b.blockType)) executed[b.blockType]++
    })
  })
  return { planned, executed }
}
