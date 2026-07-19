// Session-domain helpers — neither WOD- nor date-domain, so they live here
// rather than in wod.js/week.js. Promoted from meHelpers.js (#70) because it was
// the one copy with tests (meHelpers.test.js); storage.js and Schedule.jsx each
// carried an equivalent, untested copy.

import { dayNameFull } from './week.js'

export function getTargets(s) {
  if (!s?.mainTraining) return []
  return Array.isArray(s.mainTraining) ? s.mainTraining : [s.mainTraining]
}

export function matchesAthlete(s, name) { return getTargets(s).includes(name) }

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
