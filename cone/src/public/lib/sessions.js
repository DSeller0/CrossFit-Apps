// Session-domain helpers — neither WOD- nor date-domain, so they live here
// rather than in wod.js/week.js. Promoted from meHelpers.js (#70) because it was
// the one copy with tests (meHelpers.test.js); storage.js and Schedule.jsx each
// carried an equivalent, untested copy.

export function getTargets(s) {
  if (!s?.mainTraining) return []
  return Array.isArray(s.mainTraining) ? s.mainTraining : [s.mainTraining]
}

export function matchesAthlete(s, name) { return getTargets(s).includes(name) }
