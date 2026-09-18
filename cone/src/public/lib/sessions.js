// Session-domain helpers — neither WOD- nor date-domain, so they live here
// rather than in wod.js/week.js. Promoted from meHelpers.js (#70) because it was
// the one copy with tests (meHelpers.test.js); storage.js and Schedule.jsx each
// carried an equivalent, untested copy.

import { dayNameFull } from './week.js'
import { uid } from './wod.js'
import { inBoxScope, sessionBoxIds } from './boxScope.js'

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

// The names a session was written for. `[]` means UNTARGETED, not "nobody": three
// consumers depend on exactly that reading (AgendaView's dayGymSessions, sessName,
// criador/useSessionEditor), so who an untargeted session reaches is decided in
// matchesAthlete below, never by making this return something else.
export function getTargets(s) {
  if (!s?.mainTraining) return []
  return Array.isArray(s.mainTraining) ? s.mainTraining : [s.mainTraining]
}

// The scope of an untagged ("Sem box") session. Underscores never occur in a base36
// uid(), so this cannot collide with a real locationId.
export const SEM_BOX = '__sem_box__'

// A session's audience scopes: its box tags, or [SEM_BOX] when it has none — the same
// partition #80's ?box= links draw (inBoxScope): an untagged session belongs to the
// no-box audience, a tagged one only to its own boxes.
export function sessionScopes(s) {
  const boxes = sessionBoxIds(s)
  return boxes.length ? boxes : [SEM_BOX]
}

/**
 * The scopes an athlete trains in (#164/plans/91), as a Set — the union of:
 *  - every BOX location whose `athleteIds` lists them (the registered roster). Only
 *    `type === 'box'`: a personal location carries `athleteIds` too, but it can never
 *    tag a session (Criador offers box locations only), so counting it would cost a
 *    personal client their Sem box default and prescribe them nothing;
 *  - the scope of every session they have a `Presente` result on — the "join via
 *    results" rule afiliados/AthleteAssignment.jsx already tells the user about.
 * With neither, the athlete is `{SEM_BOX}`. A result whose session no longer exists
 * adds nothing. Ids are compared as strings on both sides (#110).
 */
export function athleteScopes(athlete, { locations = [], results = [], sessions = {} } = {}) {
  const id = String(athlete?.id)
  const scopes = new Set()
  ;(locations || []).forEach(l => {
    if (l?.type === 'box' && (l.athleteIds || []).some(x => String(x) === id)) scopes.add(l.id)
  })
  const mine = (results || []).filter(r => String(r.athleteId) === id && r.presence === 'Presente')
  if (mine.length) {
    const byId = new Map()
    Object.values(sessions || {}).forEach(arr => {
      if (Array.isArray(arr)) arr.forEach(s => s && byId.set(String(s.id), s))
    })
    mine.forEach(r => {
      const s = byId.get(String(r.sessionId))
      if (s) sessionScopes(s).forEach(sc => scopes.add(sc))
    })
  }
  if (!scopes.size) scopes.add(SEM_BOX)
  return scopes
}

/**
 * Is this session prescribed to this athlete? (#164/plans/91)
 *  - A session with `mainTraining` names matches by name, whatever its box tags or
 *    visibility.
 *  - An untargeted session that is hidden (`public === false`) is a draft nobody can
 *    see, so it is prescribed to no one.
 *  - Otherwise an untargeted session reaches its audience: with `scopes === null` the
 *    caller has already narrowed the list to one scope (the public pages, via
 *    inBoxScope), so every athlete in it; with a scope Set, the athletes whose scopes
 *    (athleteScopes) intersect the session's (sessionScopes).
 */
export function matchesAthlete(s, name, scopes = null) {
  if (!s) return false
  const targets = getTargets(s)
  if (targets.length) return targets.includes(name)
  if (s.public === false) return false
  if (scopes == null) return true
  return sessionScopes(s).some(sc => scopes.has(sc))
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
// inside a date window. Only public sessions prescribed to the athlete count as
// planned (matchesAthlete). Promoted from public/me/meHelpers.js (#160/plans/76 —
// same move #70 made for getTargets/matchesAthlete): it's session-domain, and Atletas
// (SPA-side) is now a second consumer alongside me.html.
//
// Two ways to say whose sessions count (#164/plans/91):
//  - `{ box }` (me.html): the viewer's ?box= scope narrows the list first
//    (inBoxScope — `null` is the Sem box view), then untargeted means everyone in it;
//  - `{ scopes }` (Atletas): the athlete's own scope Set replaces that filter, so a
//    member of two boxes is scored against both.
export function calcBlockStats(
  sessions,
  present,
  name,
  types,
  start,
  end,
  { box = null, scopes = null } = {},
) {
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
      .filter(s => s.public !== false && (scopes || inBoxScope(s, box)))
      .forEach(s => {
        if (!matchesAthlete(s, name, scopes)) return
        ;(s.blocks || []).forEach(b => {
          if (ts.has(b.type)) planned[b.type]++
        })
      })
  })
  present.forEach(r => {
    if (r.date < start || r.date > end) return
    ;(r.blocks || []).forEach(b => {
      // #157 — a block marked "não fez" was prescribed but not executed, so it counts
      // towards `planned` (via the session above) and never towards `executed`. Without
      // this the adherence bars read a skipped block as done.
      if (b.skipped) return
      if (ts.has(b.blockType)) executed[b.blockType]++
    })
  })
  return { planned, executed }
}
