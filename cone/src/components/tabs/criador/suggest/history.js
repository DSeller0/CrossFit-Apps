// What the suggested-session engine learns from (#233), and each block read into one shape.
// Pure: the sessions blob, the locations and the registry index are all passed in — the
// engine must not import utils/storage, which pulls the SPA Supabase client into the audit
// script and the client-free gallery.

import { inBoxScope, sessionBoxIds } from '../../../../public/lib/boxScope.js'
import { SEM_BOX } from '../../../../public/lib/sessions.js'
import { resolveExercise } from '../../../../public/lib/registry.js'
import { toISO } from '../../../../public/lib/week.js'
import { parseExerciseLine } from '../textFormat.js'

// Test and throwaway sessions the user names as such (prod's 2026-09-27 "TESTE MOBILE - apagar").
export const EXCLUDED_NAME = /teste|apagar/i

const noon = d => new Date(`${d}T12:00:00`)
export const weekdayOf = d => noon(d).getDay()
export function addDays(d, n) {
  const x = noon(d)
  x.setDate(x.getDate() + n)
  return toISO(x)
}
// Weeks start on Sunday, like every week strip in the app.
export const weekStartOf = d => addDays(d, -weekdayOf(d))
export const daysBetween = (a, b) => Math.round((noon(b) - noon(a)) / 86400000)

export const sessionName = s => s?.sessionName || s?.name || ''
export const keepSession = s => !!s && s.public !== false && !EXCLUDED_NAME.test(sessionName(s))
export const hasForca = s => (s?.blocks || []).some(b => b?.type === 'Força')

// `scope` is a box id or SEM_BOX. A box carrying `historyFromUntagged: { until }` — the main box
// once it is named: link, don't retag — also learns from the untagged sessions dated up to
// `until`. Any other session stays out, which is also what keeps prod's orphan location id
// out of every real box.
export function inHistoryScope(s, dateKey, scope, locations) {
  if (scope === SEM_BOX) return inBoxScope(s, null)
  if (inBoxScope(s, scope)) return true
  const until = (locations || []).find(l => l?.id === scope)?.historyFromUntagged?.until
  return !!until && sessionBoxIds(s).length === 0 && dateKey <= until
}

/**
 * The sessions the engine may learn from for `date`, oldest first. Always strictly before
 * `date` — a session dated `date` itself never feeds its own suggestion. With `lookAhead`
 * (the live engine) the LATER days of the same Sunday-start week join too: the user writes a
 * whole week, and a Friday suggestion must see Monday's lift. The backtest passes
 * `lookAhead: false`, because it cannot know whether a later same-week session had been typed
 * yet — which makes its scores pessimistic by design.
 * `allBoxes` is the thin-data fallback: every box's history instead of this one's.
 */
export function buildHistory({ sessions, locations, scope, date, lookAhead = true, allBoxes }) {
  const weekEnd = addDays(weekStartOf(date), 6)
  const out = []
  Object.keys(sessions || {})
    .sort()
    .forEach(d => {
      if (d === date || (d > date && !(lookAhead && d <= weekEnd))) return
      const day = sessions[d]
      ;(Array.isArray(day) ? day : []).forEach((s, order) => {
        if (!keepSession(s)) return
        if (!allBoxes && !inHistoryScope(s, d, scope, locations)) return
        out.push({ date: d, dow: weekdayOf(d), week: weekStartOf(d), session: s, order })
      })
    })
  return out
}

// ── Reading a block ───────────────────────────────────────────────────────────
// The side of a block its TYPE reads: an Estações block's exercises hang off its stations.
export const blockRows = b =>
  b?.type === 'Estações'
    ? (b.stations || []).filter(st => !st.isRest).flatMap(st => st.exercises || [])
    : b?.exercises || []

const str = v => String(v ?? '').trim()

// One exercise row as the engine sees it. Volume typed into the NAME ("800m Run", "30 DB
// Snatch", "20' Bike") is peeled off through the text grammar's own parseExerciseLine, so it
// reads exactly as Texto would read it. `entry` is the resolved registry entry, or null —
// and null stays null: an unresolved name is counted in the miss list, never guessed.
export function readRow(ex, index) {
  if (!ex) return null
  if (ex.isComplex) {
    const movements = (ex.complexMovements || [])
      .filter(m => str(m?.name))
      .map(m => ({ raw: str(m.name), entry: resolveExercise(m.name, index), reps: str(m.reps) }))
    return { kind: 'complex', raw: str(ex.name), movements, sets: str(ex.sets), ex }
  }
  let name = str(ex.name),
    reps = str(ex.reps),
    sets = str(ex.sets),
    dist = str(ex.dist),
    distUnit = ex.distUnit || 'm'
  // The WORD Rest, then a space or nothing: "Rest 2' entre sets" is rest, "Rest-pause Bench
  // Press" is a bench press.
  if (/^(rest|descanso)(?=\s|$)/i.test(name)) return { kind: 'rest', raw: name, reps, ex }
  if (!reps && !dist && name) {
    const p = parseExerciseLine(name).ex
    if (p.isComplex) {
      const movements = p.complexMovements.map(m => ({
        raw: m.name,
        entry: resolveExercise(m.name, index),
        reps: m.reps,
      }))
      return { kind: 'complex', raw: name, movements, sets: sets || p.sets, ex }
    }
    if (p.name && (p.reps || p.dist || p.sets)) {
      name = p.name
      reps = p.reps
      sets = sets || p.sets
      dist = p.dist
      distUnit = p.distUnit
    }
  }
  return {
    kind: 'single',
    raw: name,
    entry: name ? resolveExercise(name, index) : null,
    reps,
    sets,
    dist,
    distUnit,
    intensity: ex.intensity || null,
    note: str(ex.note),
    ex,
  }
}

export const readBlock = (b, index) => blockRows(b).map(ex => readRow(ex, index))

// Every movement name a block uses — the registry-miss list and recency both walk this.
export function rowMovements(row) {
  if (!row || row.kind === 'rest') return []
  if (row.kind === 'complex') return row.movements
  return row.raw ? [{ raw: row.raw, entry: row.entry, reps: row.reps }] : []
}
