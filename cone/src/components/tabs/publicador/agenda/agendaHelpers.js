import { DAY_PT_FULL, DAY_PT_TITLE, MONTH_PT, MONTH_PT_SHORT } from '../../../../public/lib/week.js'
import { evStatus } from '../eventFilter.js'

// ── Agenda's pure helpers (#59 · plans/81 C5·a) ──────────────────────────────
// No React, no client, no storage — the same rule agendaHelpers' neighbours
// (billing.js, eventFilter.js) follow, so they stay trivially testable and the
// components that use them stay gallery-renderable.

/**
 * "Quarta, 5 de agosto".
 *
 * ⚠️ NOT `toLocaleDateString('pt-BR', {weekday:'long', …})` under a
 * `text-transform: capitalize`, which is what this was: CSS capitalizes every
 * word, so the real output read "Quarta-Feira, 05 De Agosto". Built from the
 * app's own pt-BR constants instead, with only the weekday capitalised — and
 * `DAY_PT_FULL` already is.
 */
export function dayTitle(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT_FULL[d.getDay()]}, ${d.getDate()} de ${MONTH_PT[d.getMonth()].toLowerCase()}`
}

/** "Seg, 3 de ago" — the compact form, for a labelled row that must not wrap. */
export function dayTitleShort(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT_TITLE[d.getDay()]}, ${d.getDate()} de ${MONTH_PT_SHORT[d.getMonth()].toLowerCase()}`
}

/** "2 – 8 ago" / "30 ago – 5 set" — the mobile week-strip button label. */
export function weekRangeLabel(week) {
  const a = week[0]
  const b = week[6]
  const m1 = MONTH_PT_SHORT[a.getMonth()].toLowerCase()
  const m2 = MONTH_PT_SHORT[b.getMonth()].toLowerCase()
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${m1}`
    : `${a.getDate()} ${m1} – ${b.getDate()} ${m2}`
}

/**
 * The month's stats strip.
 *
 * 🔴 Every number is labelled for exactly what it counts, and NONE of them may be
 * read as attendance: `status` is a manual toggle the coach flips and `athleteIds`
 * is a checkbox list he ticks. `class_executions` is what actually knows who showed
 * up and has no join key to either (#102). Hence "a lançar" — events not yet
 * toggled — rather than any claim about who was there. Same honesty rule
 * MinhaSemanaPane and AffiliateSessions already follow.
 *
 * The old strip printed three `completed/total` ratios; "concluídas" was the exact
 * inverse of "a lançar", so only the actionable one survives.
 */
export function monthStats(events, weeks) {
  let total = 0
  let aulas = 0
  let personal = 0
  let open = 0
  weeks.forEach(week =>
    week.forEach(({ date, inMonth }) => {
      if (!inMonth) return
      const iso = toISOLocal(date)
      ;(events[iso] || []).forEach(ev => {
        total++
        if (ev.type === 'aula') aulas++
        if (ev.type === 'personal') personal++
        if (evStatus(ev) !== 'completed') open++
      })
    }),
  )
  return { total, aulas, personal, open }
}

/**
 * Local-midday ISO for a Date. `toISOString()` is UTC, so for anyone west of
 * Greenwich it returns the PREVIOUS day for most of the evening — the same class
 * of bug `week.js`'s own `toISO` exists to avoid. Kept here (rather than importing
 * `toISO`) only so this module stays importable without `utils/storage`.
 */
function toISOLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/**
 * One day's renderable items, sessions first then events — the shape both the
 * month cell and the list row consume, so the two can never disagree about what
 * "3 items" means.
 */
export function dayCards(gymSessions, evs) {
  return [
    ...gymSessions.map(s => ({ kind: 'session', data: s })),
    ...evs.map(ev => ({ kind: 'event', data: ev })),
  ]
}

/**
 * How many of a day's events the filter is hiding. A day whose events are all
 * filtered out is NOT the same state as an empty day, and the pane has to say
 * which one it is.
 */
export function hiddenCount(allEvs, shownEvs) {
  return Math.max(0, (allEvs || []).length - (shownEvs || []).length)
}

/**
 * Every event sharing a `recurrenceGroup`, flattened and date-stamped (#106).
 * `recurrenceGroup` has been written by `events.jsx`'s expander since it shipped
 * and never read back, which is why deleting a generated quarter meant ~13
 * separate deletes.
 */
export function seriesEvents(events, group) {
  if (!group) return []
  const out = []
  Object.entries(events).forEach(([date, evs]) =>
    (evs || []).forEach(ev => {
      if (ev.recurrenceGroup === group) out.push({ ...ev, date })
    }),
  )
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

/**
 * What each #106 scope would actually touch, given the event acted on.
 *
 * ⚠️ Scope applies to DELETE and EDIT only, never to the status toggle: marking
 * today's class done cannot mean marking the quarter done, because "this and
 * following" over a state that describes the past is a false claim.
 */
export function seriesScopes(events, ev) {
  const all = seriesEvents(events, ev.recurrenceGroup)
  if (all.length < 2) return null
  const following = all.filter(e => e.date > ev.date || (e.date === ev.date && e.time >= ev.time))
  return {
    all,
    one: [ev],
    following,
    counts: { one: 1, following: following.length, all: all.length },
    span: { from: all[0].date, to: all[all.length - 1].date },
  }
}

/** The subset of fields "this and following" propagates — never `date`, never `status`. */
export const SERIES_EDIT_FIELDS = [
  'time',
  'durationMin',
  'label',
  'locationId',
  'athleteIds',
  'notes',
  'local',
  'localText',
  'sessionId',
  'rateSnapshot',
]
