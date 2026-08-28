import { matchesAthlete, calcBlockStats } from '../../../public/lib/sessions.js'
import { toISO, DAY_PT, DAY_PT_TITLE } from '../../../public/lib/week.js'
import { WOD_TYPES } from '../../../public/lib/wod.js'
import { buildEvents } from '../../../public/me/meHelpers.js'

// Atletas' pure helpers (#56/C2 · plans/75). Extracted out of the 1795-line tab so
// the arithmetic and the label formatting are testable — the convention
// resultadosHelpers / exerciciosHelpers / stateBackup / billing set.
//
// No React, no client: importable from the tab, its components AND the gallery.

/**
 * The default athlete identity colour. A DATA colour (it identifies a person, so it
 * must be stable across all four themes) and therefore #15-exempt — but it was seven
 * separate `'#e87820'` literals in the old tab, which is how a data colour quietly
 * becomes six data colours. One const, one meaning.
 */
export const DEFAULT_ATHLETE_COLOR = '#e87820'

/** Milestone percentages are stored freely but only ever render on the 10% grid. */
export const snapPct = p => Math.round((Number(p) || 0) / 10) * 10

/** A goal's own completion, 0–100. A goal with no sessions planned is 0, not NaN. */
export const goalPct = goal =>
  goal?.totalSessions > 0
    ? Math.min(100, Math.round((goal.completedSessions / goal.totalSessions) * 100))
    : 0

/**
 * The athlete-list row's "%": the mean completion across the athlete's goals.
 * `null` (not 0) when there are no goals — the row then prints nothing rather than
 * a 0% that reads like a failing athlete.
 */
export function combinedPct(goals) {
  const gs = goals || []
  if (!gs.length) return null
  const sum = gs.reduce(
    (s, g) => s + (g.totalSessions > 0 ? g.completedSessions / g.totalSessions : 0),
    0,
  )
  return Math.round((sum / gs.length) * 100)
}

/**
 * TallyBar tick descriptors for a goal's milestones — the same hit/next/future
 * shape me/GoalList.jsx:25-31 builds, so the coach's bar and the athlete's bar
 * can't drift. Sorted, because "next" means the first unhit one by percentage.
 */
export function milestoneTicks(milestones) {
  const ms = (milestones || []).slice().sort((a, b) => a.pct - b.pct)
  const next = ms.find(m => !m.hit)
  return ms.map(m => ({
    pct: snapPct(m.pct),
    state: m.hit ? 'hit' : m === next ? 'next' : 'future',
  }))
}

/** Value + unit for a PR reading, by PR type. `null` best → an em dash. */
export function prValueLabel(pr, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (pr?.type === 'load') return `${value} ${pr.unit || 'kg'}`
  if (pr?.type === 'reps') return `${value} reps`
  return String(value)
}

/** The "Meta: …" label, or null when the PR carries no target. */
export const prTargetLabel = pr =>
  pr?.target || pr?.target === 0 ? prValueLabel(pr, pr.target) : null

/** dd/mm for a yyyy-mm-dd key. Noon avoids the UTC-shift off-by-one. */
export function shortDate(dateKey) {
  if (!dateKey) return null
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

/** "ago. de 2025" for the profile header's "desde". */
export function monthYear(dateKey) {
  if (!dateKey) return null
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  })
}

/**
 * PRs grouped under their category, ordered by the registry's own block order with
 * anything unknown appended. A PR carries `categories[]` (#62's resolver) and a
 * legacy singular `category`; the first category that exists in the registry wins,
 * so a movement tagged under three families lands where the coach expects it.
 * Returns [[categoryName, prs[]], …].
 */
export function groupPrsByCategory(prs, blockOrder) {
  const order = blockOrder || []
  const groups = {}
  ;(prs || []).forEach(pr => {
    const cats = pr.categories?.length ? pr.categories : pr.category ? [pr.category] : []
    const cat = order.find(b => cats.includes(b)) || cats[0] || 'Sem categoria'
    ;(groups[cat] ||= []).push(pr)
  })
  return [
    ...order.filter(bt => groups[bt]).map(bt => [bt, groups[bt]]),
    ...Object.keys(groups)
      .filter(k => !order.includes(k))
      .map(k => [k, groups[k]]),
  ]
}

/**
 * The detail pane's session strip: the athlete's last 2 sessions and the next 1
 * inside a 30-day window. `sessions` is the date-keyed blob; `todayKey` is injected
 * rather than read from the clock so this stays pure and testable (calling
 * `new Date()` in a render path is also a react-hooks/purity violation).
 */
export function sessionStrip(sessions, athleteName, todayKey) {
  if (!athleteName || !sessions) return []
  const future = new Date(todayKey + 'T12:00:00')
  future.setDate(future.getDate() + 30)
  const f30 = future.toISOString().slice(0, 10)

  const all = []
  Object.keys(sessions)
    .sort()
    .forEach(date => {
      ;(sessions[date] || []).forEach(s => {
        if (matchesAthlete(s, athleteName)) all.push({ date, session: s })
      })
    })

  return [
    ...all.filter(x => x.date <= todayKey).slice(-2),
    ...all.filter(x => x.date > todayKey && x.date <= f30).slice(0, 1),
  ]
}

// ── #160/plans/76 — the grade + ficha helpers ──────────────────────────────────
// Every date arithmetic helper below takes `todayKey` as an argument rather than
// reading the clock — the sessionStrip convention above, and also what keeps
// react-hooks/purity happy at the call sites (a render body may not call
// `new Date()` itself).

const addDays = (dateKey, delta) => {
  const d = new Date(dateKey + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return toISO(d)
}
const daysBetween = (fromKey, toKey) => {
  const a = new Date(fromKey + 'T12:00:00'),
    b = new Date(toKey + 'T12:00:00')
  return Math.round((b - a) / 86400000)
}

/** "hoje" / "ontem" / "N d" under a week, "N sem" from a week on. Shared by every
 *  recency signal on the card (últ. sessão, sem feedback) so the two read consistently. */
export function agoLabel(days) {
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 7) return `${days} d`
  return `${Math.round(days / 7)} sem`
}

/**
 * The grade's grouping: each athlete lands under the earliest session (today or
 * later) they're assigned to, or under "Sem sessão marcada" with none. A time is
 * appended only when an agenda event links the session (`events[date]` carries
 * `time`+`sessionId`; a plain session record has no time field of its own).
 * Returns [{ date, time, label, athletes[] }, …] plus a trailing no-session group.
 */
export function nextSessionGroups(sessions, athletes, events, todayKey) {
  const byDate = {}
  const noSession = []

  ;(athletes || []).forEach(a => {
    const dates = Object.keys(sessions || {})
      .filter(d => d >= todayKey)
      .sort()
    let hit = null
    for (const date of dates) {
      const s = (sessions[date] || []).find(x => matchesAthlete(x, a.name))
      if (s) {
        hit = { date, session: s }
        break
      }
    }
    if (!hit) {
      noSession.push(a)
      return
    }
    const { date, session } = hit
    const time = (events?.[date] || []).find(e => e.sessionId === session.id)?.time || null
    ;(byDate[date] ||= { date, time, athletes: [] }).athletes.push(a)
  })

  const byName = (a, b) => a.name.localeCompare(b.name, 'pt-BR')
  const dayGroups = Object.keys(byDate)
    .sort()
    .map(date => {
      const g = byDate[date]
      return {
        date: g.date,
        time: g.time,
        label: dayLabel(g.date, todayKey),
        athletes: g.athletes.sort(byName),
      }
    })

  return [
    ...dayGroups,
    ...(noSession.length
      ? [{ date: null, time: null, label: 'Sem sessão marcada', athletes: noSession.sort(byName) }]
      : []),
  ]
}

function dayLabel(date, todayKey) {
  if (date === todayKey) return 'Hoje'
  if (date === addDays(todayKey, 1)) return 'Amanhã'
  const dow = DAY_PT_TITLE[new Date(date + 'T12:00:00').getDay()]
  return `${dow} ${shortDate(date)}`
}

/** newest results_v2 row for the athlete, however it was logged (any presence). */
export function lastSessionSignal(results, athleteId, todayKey) {
  const mine = (results || []).filter(r => String(r.athleteId) === String(athleteId))
  if (!mine.length) return null
  const newest = mine.reduce((b, r) => (r.date > b.date ? r : b))
  const days = Math.max(0, daysBetween(newest.date, todayKey))
  return { days, label: agoLabel(days) }
}

/**
 * "% of prescribed WOD blocks actually logged", last 30 days vs the 30 before —
 * NOT calcKPIs.freq (resultadosHelpers.js), whose denominator is result rows that
 * exist: an athlete who only logs when present would score 100% forever there.
 * `null` when nothing was ever prescribed in the current window (nothing to score).
 */
export function adherence(sessions, results, athlete, todayKey) {
  const present = (results || []).filter(
    r => String(r.athleteId) === String(athlete.id) && r.presence === 'Presente',
  )
  const windowPct = (start, end) => {
    const { planned, executed } = calcBlockStats(
      sessions,
      present,
      athlete.name,
      WOD_TYPES,
      start,
      end,
    )
    const pl = WOD_TYPES.reduce((n, t) => n + (planned[t] || 0), 0)
    const ex = WOD_TYPES.reduce((n, t) => n + (executed[t] || 0), 0)
    return pl > 0 ? Math.min(100, Math.round((ex / pl) * 100)) : null
  }
  const pct = windowPct(addDays(todayKey, -29), todayKey)
  if (pct === null) return null
  const prevPct = windowPct(addDays(todayKey, -59), addDays(todayKey, -30))
  const trend = prevPct === null || pct === prevPct ? 'flat' : pct > prevPct ? 'up' : 'down'
  return { pct, trend }
}

/** Days since the newest coachNotes entry — the anchor `sinceLastNote` also reads. */
export function daysSinceNote(notes, todayKey) {
  if (!notes?.length) return null
  const newest = notes.reduce((b, n) => (n.date > b.date ? n : b))
  const days = Math.max(0, daysBetween(newest.date, todayKey))
  return { days, label: agoLabel(days) }
}

// A milestone-progress gap this long reads as the goal having stalled — the card
// then shows "parado há N sem" in place of the plain percentage.
const STALL_DAYS = 21

/**
 * The nearest-to-completion OPEN goal (100% goals are done, not "open"), plus
 * whether it has stalled: its newest hit milestone is more than STALL_DAYS old.
 * A goal with no hit milestones yet can't be judged stalled — there's nothing to
 * measure the gap from — so `stalledWeeks` stays null.
 */
export function goalSignal(goals, todayKey) {
  const open = (goals || []).filter(g => goalPct(g) < 100)
  if (!open.length) return null
  const goal = open.slice().sort((a, b) => goalPct(b) - goalPct(a))[0]
  const hits = (goal.milestones || []).filter(m => m.hit && m.hitDate)
  let stalledWeeks = null
  if (hits.length) {
    const newestHit = hits.reduce((b, m) => (m.hitDate > b.hitDate ? m : b))
    const days = daysBetween(newestHit.hitDate, todayKey)
    if (days > STALL_DAYS) stalledWeeks = Math.round(days / 7)
  }
  return { goal, pct: goalPct(goal), stalledWeeks }
}

const PRESENCE_WEEKS = 4
export const DOW_LETTERS = DAY_PT.map(d => d[0]) // D S T Q Q S S — Sunday-start

/**
 * 4 weeks × 7 days, Sunday-start, ending with the week containing `todayKey`.
 * A cell is 'presente' (a results_v2 row with presence==='Presente'), 'unlogged'
 * (the athlete was assigned that day and nothing was logged — an INFERENCE, not a
 * fact: no row is ever created for a no-show, #102 is what turns this into one) or
 * 'none' (no session assigned, or the date hasn't happened yet).
 */
export function presenceGrid(sessions, results, athlete, todayKey) {
  const today = new Date(todayKey + 'T12:00:00')
  const sun = new Date(today)
  sun.setDate(today.getDate() - today.getDay())

  const weeks = []
  for (let w = PRESENCE_WEEKS - 1; w >= 0; w--) {
    const weekStart = new Date(sun)
    weekStart.setDate(sun.getDate() - w * 7)
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + d)
      const dateKey = toISO(date)
      days.push({
        date: dateKey,
        state: presenceCellState(sessions, results, athlete, dateKey, todayKey),
      })
    }
    weeks.push(days)
  }
  return weeks
}

function presenceCellState(sessions, results, athlete, dateKey, todayKey) {
  if (dateKey > todayKey) return 'none'
  const assigned = (sessions[dateKey] || []).some(s => matchesAthlete(s, athlete.name))
  if (!assigned) return 'none'
  const logged = (results || []).some(
    r =>
      String(r.athleteId) === String(athlete.id) && r.date === dateKey && r.presence === 'Presente',
  )
  return logged ? 'presente' : 'unlogged'
}

/**
 * "Desde o último 1:1": the newest coachNotes date anchors a list of what changed
 * since — PR improvements + milestones hit (both already computed by
 * me/meHelpers.js's buildEvents, filtered to after the anchor) plus sessions the
 * athlete was assigned to with no logged result. `null` anchor (no notes yet) means
 * there is nothing to anchor against, not an empty "nothing changed" list.
 */
export function sinceLastNote(athlete, notes, prs, goals, sessions, results, todayKey) {
  if (!notes?.length) return { anchorDate: null, items: [] }
  const anchor = notes.reduce((b, n) => (n.date > b.date ? n : b)).date

  const events = buildEvents(prs, goals).filter(e => e.date > anchor)

  const missed = []
  Object.keys(sessions || {})
    .filter(date => date > anchor && date <= todayKey)
    .sort()
    .forEach(date => {
      ;(sessions[date] || []).forEach(session => {
        if (!matchesAthlete(session, athlete.name)) return
        const logged = (results || []).some(
          r =>
            String(r.athleteId) === String(athlete.id) &&
            r.date === date &&
            r.sessionId === session.id,
        )
        if (!logged) missed.push({ date, session })
      })
    })

  const items = [
    ...events.map(e => ({ kind: 'event', date: e.date, title: e.title, sub: e.sub })),
    ...missed.map(m => ({ kind: 'missed', date: m.date, session: m.session })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return { anchorDate: anchor, items }
}
