import { ZONES, normaliseZone } from '../../../utils/config'
import { sessionBoxIds } from '../../../public/lib/boxScope.js'

// Pure layout helpers for #59 · C5·b2 (plans/83's T6) — the three axes that turn a
// hardcoded artefact into a parametric one: Dia's zone count/split, Semana's day
// picker, Mês's per-box cell grouping. No React, no client — gallery + test safe.

// ── Zonas (Dia) ─────────────────────────────────────────────────────────────
// Groups a session's blocks by zone, then folds any zone beyond `zoneCount` into
// the last VISIBLE zone rather than dropping it — the collapse rule plans/83 T6
// requires ("Zona 03 tem 2 blocos — vão para a Zona 02.") is the same failure mode
// as B1, in the same file, so blocks in a hidden zone must never just vanish.
export function distributeZones(blocks, zoneCount) {
  const count = Math.min(Math.max(zoneCount || ZONES.length, 1), ZONES.length)
  const byZone = Object.fromEntries(ZONES.map(z => [z, []]))
  ;(blocks || []).forEach(bl => {
    const z = normaliseZone(bl.zone) || ZONES[0]
    ;(byZone[z] || byZone[ZONES[0]]).push(bl)
  })
  const visible = ZONES.slice(0, count)
  const hidden = ZONES.slice(count)
  const into = visible[visible.length - 1]
  const collapsed = hidden.map(z => ({ zone: z, count: byZone[z].length })).filter(c => c.count > 0)
  hidden.forEach(z => {
    byZone[into] = byZone[into].concat(byZone[z])
  })
  return {
    columns: visible.map(z => ({ zone: z, blocks: byZone[z] })),
    collapsed,
    collapseInto: collapsed.length ? into : null,
  }
}

// The panel copy for a collapse, or '' when nothing collapsed — "never drop it
// silently" means the fact has to reach the coach, not just the layout.
export function zoneCollapseMessage({ collapsed, collapseInto } = {}) {
  if (!collapsed || !collapsed.length || !collapseInto) return ''
  const parts = collapsed.map(c => `${c.zone} tem ${c.count} bloco${c.count === 1 ? '' : 's'}`)
  return `${parts.join(' · ')} — vão para a ${collapseInto}.`
}

export function zoneColumnWidths(zoneCount, split) {
  if (zoneCount <= 1) return ['1fr']
  if (zoneCount === 2) return split === '30-70' ? ['3fr', '7fr'] : ['1fr', '1fr']
  return ['1fr', '1fr', '1fr']
}

// ── Dia picker (Semana) ──────────────────────────────────────────────────────
// Index order matches DAY_PT (week.js): 0=DOM..6=SAB. All 7 on by default; every
// format that renders a week reads this same shape (WeeklyCalendarExportView,
// MobileWeeklyExportView) — one picker, not a per-format copy.
export const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6]

export function visibleWeekDates(weekDates, visibleDays) {
  const days = visibleDays && visibleDays.length ? visibleDays : ALL_WEEK_DAYS
  const set = new Set(days)
  return (weekDates || []).filter((_, i) => set.has(i))
}

// ── Mês — per-box cell grouping ──────────────────────────────────────────────
// `sessionBoxIds` is the ONLY sanctioned read of a session's box tags (#80) — never
// hand-roll `session.locationIds`/`locationId` again here.
export const MONTH_CELL_MAX_ROWS = 3

export function monthCellSessions(daySessions, locations, maxRows = MONTH_CELL_MAX_ROWS) {
  const byId = Object.fromEntries((locations || []).map(l => [l.id, l]))
  const rows = (daySessions || []).map(s => {
    const boxIds = sessionBoxIds(s)
    const loc = boxIds.length ? byId[boxIds[0]] : null
    return {
      id: s.id,
      title: s.sessionName || s.mainTraining || '—',
      color: loc?.color || null,
    }
  })
  return {
    rows: rows.slice(0, maxRows),
    overflow: Math.max(0, rows.length - maxRows),
  }
}
