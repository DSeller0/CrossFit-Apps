import { exVolStr, groupProgressionSteps } from '../../../public/lib/wod.js'
import { monthGridCells } from '../../../public/lib/week.js'
import { toISO } from '../../../utils/storage'

export function buildProgressionLines(ex) {
  const steps = ex.intensity?.steps || []
  if (!steps.length) return null
  const name = ex.name.toUpperCase()
  const distPrefix = ex.dist
    ? ex.sets
      ? `${ex.sets}×${ex.dist}${ex.distUnit || 'm'}`
      : `${ex.dist}${ex.distUnit || 'm'}`
    : null
  const normUnit = u => (u === '%' || u === '% do RM' ? '% RM' : u || '% RM')
  // Groups by reps only (same key as the canonical Schedule.jsx view) so the
  // printed/exported WOD always shows the same number of lines as the in-app
  // schedule — re-derive each group's unit from the raw steps (canonical
  // groupProgressionSteps() doesn't carry unit) so kg/lb progressions keep
  // their real unit instead of always being labeled "% RM".
  const groups = groupProgressionSteps(ex)
  return groups.map(g => {
    const repsPrefix = distPrefix || (ex.sets && g.reps ? `${ex.sets}×${g.reps}` : g.reps)
    const nameLine = [repsPrefix, name].filter(Boolean).join(' ')
    const groupUnits = [
      ...new Set(
        steps
          .filter(s => (s.reps || ex.reps || '') === g.reps && s.load)
          .map(s => normUnit(s.unit)),
      ),
    ]
    const loadStr = g.loads.length
      ? `${g.loads.join('/')} ${groupUnits.length === 1 ? groupUnits[0] : '% RM'}`
      : ''
    return { nameLine, loadStr }
  })
}

export function exLine(ex) {
  return [exVolStr(ex), ex.name.toUpperCase()].filter(Boolean).join(' ')
}

export function complexLine(ex) {
  const movs = ex.complexMovements || []
  const displayName = ex.name || movs.map(m => m.name).join(' + ') || 'Complexo'
  const notation = movs.map(m => m.reps || '?').join('+')
  const volPrefix =
    ex.sets && notation
      ? `${ex.sets}×(${notation})`
      : notation
        ? `(${notation})`
        : ex.sets
          ? `${ex.sets}×`
          : ''
  return [volPrefix, displayName.toUpperCase()].filter(Boolean).join(' ')
}

export function getWeeksOfMonth(year, month) {
  return monthGridCells(year, month).map(week => week.map(c => c.date))
}

export function buildMobileSession(sessions, selectedDate, currentWeekDates) {
  if (selectedDate) {
    const s = (sessions[selectedDate] || [])[0] || null
    if (s) return { s, dateKey: selectedDate, date: new Date(selectedDate + 'T12:00:00') }
  }
  for (let i = 1; i <= 5; i++) {
    const d = currentWeekDates[i]
    const key = toISO(d)
    const s = (sessions[key] || [])[0] || null
    if (s) return { s, dateKey: key, date: d }
  }
  return null
}

export const mfs = (px, fs) => `${Math.round(px * fs)}px`
