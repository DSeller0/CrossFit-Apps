// #105 / #59 · plans/81 C5·a step (b) — the ONE event filter.
//
// Agenda offered a single tri-state (all/scheduled/completed) while
// `ReportModal.filteredEvents` already implemented period + type + status +
// affiliates + athletes. The backlog row says "lift, don't copy" — and the lifted
// thing has to be a SUPERSET, because the two were not the same filter:
//   · ReportModal's status only ever narrowed to `completed` (no scheduled-only
//     branch), so it gains Agenda's third value here;
//   · ReportModal's athlete filter applies ONLY to `ev.type === 'personal'`, a rule
//     that was buried in `filteredEvents` and visible nowhere on screen.
//
// 🔴 THE COUPLING BOUNDARY, decided in mockup 62 rather than mid-build.
// The athlete predicate is used at TWO granularities:
//   · event level  — "does this event survive?"        → `matchesEvent`
//   · athlete level — "which of ITS athletes survive?" → `matchingAthleteIds`
// The second exists because `groupByLocation` (events.jsx) fans one personal event
// with three athletes out into three groups, so a filter narrowed to one athlete has
// to leave that event in exactly ONE of them. That is why `groupByLocation` used to
// re-implement `athAll || athSelected.has(id)` a second time.
//
// So: THE FILTER OWNS THE PREDICATE AT BOTH GRANULARITIES; THE REPORT OWNS THE
// GROUPING. `groupByLocation` stays in events.jsx (it is report-shaped, not
// filter-shaped) and calls `matchingAthleteIds` instead of re-deriving the rule.
// One rule, one place, no second copy.
//
// Pure — no React, no client, no storage. Unit-tested (`eventFilter.test.js`).

/** `null` means "all" for the two set-valued axes — an empty Set means "none match". */
export const DEFAULT_FILTER = Object.freeze({
  period: null, // null = "every date"; {mode:'month',yr,mo} | {mode:'range',from,to}
  types: Object.freeze({ aula: true, personal: true }),
  status: 'all', // 'all' | 'scheduled' | 'completed'
  affiliates: null, // null | Set<locationId>
  athletes: null, // null | Set<athleteId>
})

/** Agenda's own default: no period axis (the month nav IS the period). */
export function agendaFilter() {
  return { ...DEFAULT_FILTER, types: { ...DEFAULT_FILTER.types } }
}

/** ReportModal's own default: this month, completed only — its historical behaviour. */
export function reportFilter(yr, mo) {
  return {
    ...DEFAULT_FILTER,
    types: { ...DEFAULT_FILTER.types },
    period: { mode: 'month', yr, mo },
    status: 'completed',
  }
}

/**
 * `status` carried across verbatim from `AgendaView`'s `evStatus` (#59/plans/81
 * decision 1). ⚠️ This is a MANUAL toggle the coach flips, never attendance —
 * `class_executions` is what knows who showed up and has no join key to `events`
 * (#102). Nothing here may be relabelled as presence.
 */
export function evStatus(ev) {
  return ev.status === 'completed' ? 'completed' : 'scheduled'
}

/** Inclusive ISO bounds for a period, or `null` when the axis is off. */
export function periodBounds(period) {
  if (!period) return null
  if (period.mode === 'range') return { from: period.from, to: period.to }
  const { yr, mo } = period
  const mm = String(mo + 1).padStart(2, '0')
  const last = new Date(yr, mo + 1, 0).getDate()
  return { from: `${yr}-${mm}-01`, to: `${yr}-${mm}-${String(last).padStart(2, '0')}` }
}

/**
 * "Which of this event's athletes pass the athlete axis?"
 *
 * ⚠️ The athlete axis is personal-only, by design and now by contract: for a class
 * this returns the event's own `athleteIds` untouched, because narrowing a class by
 * athlete would silently hide classes the athlete simply wasn't ticked on — which is
 * not the same claim (#102's honesty rule).
 */
export function matchingAthleteIds(ev, f = DEFAULT_FILTER) {
  const ids = ev.athleteIds || []
  if (ev.type !== 'personal') return ids
  if (!f.athletes) return ids
  return ids.filter(id => f.athletes.has(id))
}

/** "Does this event survive the filter?" `date` is the blob key it was stored under. */
export function matchesEvent(ev, date, f = DEFAULT_FILTER) {
  const bounds = periodBounds(f.period)
  if (bounds && (date < bounds.from || date > bounds.to)) return false

  if (f.types && !f.types[ev.type]) return false

  if (f.status !== 'all' && evStatus(ev) !== f.status) return false

  if (f.affiliates) {
    // An event with no affiliate can never match a positive affiliate selection —
    // it is exactly the unbillable case Agenda now surfaces rather than hides.
    if (!ev.locationId) return false
    if (!f.affiliates.has(ev.locationId)) return false
  }

  // Personal-only, matching ReportModal's original rule. A personal event survives
  // when at least one of its athletes does.
  if (f.athletes && ev.type === 'personal') {
    if (matchingAthleteIds(ev, f).length === 0) return false
  }

  return true
}

/**
 * The whole-blob loop both call sites use. Returns date-stamped copies sorted by
 * date then time, the shape `groupByLocation`/`calcTotal` already expect.
 */
export function filterEvents(events = {}, f = DEFAULT_FILTER) {
  const out = []
  Object.entries(events).forEach(([date, evs]) => {
    ;(evs || []).forEach(ev => {
      if (matchesEvent(ev, date, f)) out.push({ ...ev, date })
    })
  })
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

/** One day's events, filtered and time-sorted — Agenda's per-cell and per-pane read. */
export function filterDay(events = {}, iso, f = DEFAULT_FILTER) {
  return (events[iso] || [])
    .filter(ev => matchesEvent(ev, iso, f))
    .sort((a, b) => a.time.localeCompare(b.time))
}

/**
 * How many axes are actually narrowing anything — feeds the "N filtros · Limpar"
 * affordance. With one always-visible tri-state that was unnecessary; with five
 * axes, a filter you don't remember switching on is how an event goes missing.
 * `period` is deliberately NOT counted: it is the surface's own navigation
 * (Agenda's month nav, the Relatório's period picker), not a narrowing the user
 * needs warning about.
 */
export function activeCount(f = DEFAULT_FILTER) {
  let n = 0
  if (f.types && (!f.types.aula || !f.types.personal)) n++
  if (f.status !== 'all') n++
  if (f.affiliates) n++
  if (f.athletes) n++
  return n
}

/** Clear every narrowing axis, keeping the period (see `activeCount`). */
export function clearFilter(f = DEFAULT_FILTER) {
  return {
    ...DEFAULT_FILTER,
    types: { ...DEFAULT_FILTER.types },
    period: f.period ?? null,
  }
}

/** Toggle one member of a set-valued axis; emptying it returns to `null` ("all"). */
export function toggleInSet(current, id) {
  const next = new Set(current || [])
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next.size === 0 ? null : next
}
