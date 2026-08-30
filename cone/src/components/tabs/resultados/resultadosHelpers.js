import { monthGridCells } from '../../../public/lib/week.js'
import { perfStr } from '../../../public/lib/wod.js'

// Pure helpers behind the Resultados tab (#74-B/plans/44, pure move out of
// Resultados.jsx — no behavior change). Mirrors public/results/resultsHelpers.js
// and public/schedule/scheduleHelpers.js.
//
// #57/plans/80 (C3) deleted two frozen taxonomies that lived here:
//   • SCALE_CLS + index.css's .sc-rx/.sc-inter/.sc-sc/.sc-adap — a FOURTH divergent scale
//     palette (RX green · Inter blue · SC amber) against canonical SCALE_COL (RX teal ·
//     Inter orange · SC violet). The same logged result showed a different-coloured badge
//     in the SPA than on every public page. Callers use scaleColor() from lib/wod.js.
//   • LEVEL_CLS + .lv-ini/-int/-adv/-comp — superseded by C2's treatment, which tints the
//     level tag with the ATHLETE's own identity colour through color-mix and needs no
//     level palette at all (atletas/AthleteHeader.jsx).
// The `getPerformanceStr` tombstone comment went with them: #115 completed that swap and
// every consumer imports canonical perfStr directly.

// ── Constants ─────────────────────────────────────────────────────────────────
export const PRESENCE = ['Presente', 'Ausente', 'Justificado']

// ── Month/week grid ───────────────────────────────────────────────────────────
export function getWeeksInMonth(year, month) {
  return monthGridCells(year, month).map(week => ({ start: week[0].date, end: week[6].date }))
}

export function weekLabel(week, year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  const s = week.start.getMonth() === month ? week.start.getDate() : 1
  const e = week.end.getMonth() === month ? week.end.getDate() : lastDay
  return `${s}–${e}`
}

// ── The save gate (#157) ──────────────────────────────────────────────────────
// A block is RESOLVED when the coach has said something about it — either a real
// scale+RPE, or an explicit "não fez". Deliberately NOT "has any field filled in": #61a
// established that scale/RPE start unselected on purpose, because a pre-picked `RX @ 7`
// records information nobody entered. results.html pays nothing for that rule (it submits
// one block at a time); this tab has ONE Salvar for N blocks, so without the skip toggle a
// 3-WOD session is unsaveable unless the coach invents scores.
export function isBlockResolved(bl) {
  return !!bl?.skipped || (!!bl?.scale && !!bl?.rpe)
}

// Pure so the gate is unit-tested as a predicate rather than through the component.
// Returns the UNRESOLVED block labels too, because a disabled Salvar that doesn't say
// which block is missing is the user-facing face of #157 on a 3-WOD session.
export function saveGate(presence, blockLogs) {
  // An absent athlete has nothing to score — presence alone records the absence (#118),
  // and the existing blocks are preserved untouched by the merge in saveLog.
  if (presence !== 'Presente') return { canSave: true, missing: [] }
  const missing = (blockLogs || [])
    .filter(bl => !isBlockResolved(bl))
    .map(bl => bl.blockLabel || bl.blockType || 'Bloco')
  return { canSave: missing.length === 0, missing }
}

// ── Class read-back ───────────────────────────────────────────────────────────
export function calcSessionKPIs(dateKey, results, sessionId = undefined) {
  const sr = results.filter(
    r =>
      r.date === dateKey &&
      r.presence === 'Presente' &&
      // Scoped to ONE session when the caller knows which (the class header always does).
      // Left unscoped for the by-date call shape the old "Por sessão" pane used, so the
      // existing tests keep describing the same function.
      (sessionId === undefined || String(r.sessionId) === String(sessionId)),
  )
  if (!sr.length) return null
  // #157 — a skipped block contributes neither an RPE nor a scale. It is not a zero and
  // not an "Adaptado": it is absence, and averaging it in would drag the class RPE down
  // with a number nobody entered.
  const liveBlocks = r => (r.blocks || []).filter(b => !b.skipped)
  const allRpe = sr.flatMap(r =>
    liveBlocks(r)
      .map(b => b.rpe)
      .filter(Boolean),
  )
  const avgRpe =
    allRpe.length > 0 ? (allRpe.reduce((a, b) => a + b, 0) / allRpe.length).toFixed(1) : null
  const allScales = sr.flatMap(r =>
    liveBlocks(r)
      .map(b => b.scale)
      .filter(Boolean),
  )
  const scaleDist = { RX: 0, Inter: 0, SC: 0, Adaptado: 0 }
  allScales.forEach(s => {
    if (scaleDist[s] !== undefined) scaleDist[s]++
  })
  // null (not 0%) with no real scales — 0% reads as "logged, all scaled" and its
  // colour threshold would score no-data as "bad" (plans/22 rules 1, 5).
  const rxPct = allScales.length > 0 ? Math.round((scaleDist.RX / allScales.length) * 100) : null
  const flags = sr.filter(r => r.flagForReview).length
  return { avgRpe, rxPct, scaleDist, scaleTotal: allScales.length, flags, count: sr.length }
}

// ── Row summary ───────────────────────────────────────────────────────────────
// The one-line read-back on a logged athlete's collapsed row. Canonical perfStr, so a
// capped For Time athlete reads "3 rds (DNF)" here exactly as in every ranking.
export function resultSummary(r) {
  if (!r) return ''
  if (r.presence !== 'Presente') return r.presence
  const live = (r.blocks || []).filter(b => !b.skipped)
  const perfs = live
    .map(b => perfStr(b, b.blockType))
    .filter(p => p && p !== '—')
    .slice(0, 2)
  const rpes = live.map(b => b.rpe).filter(Boolean)
  const avgRpe = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(0) : null
  const skipped = (r.blocks || []).filter(b => b.skipped).length
  return (
    [...perfs, avgRpe ? `RPE ${avgRpe}` : null, skipped ? `${skipped} não fez` : null]
      .filter(Boolean)
      .join(' · ') || 'Presente'
  )
}

// The scale shown on a collapsed row — the first real one logged, so the row carries the
// same vocabulary the ficha history and every ranking use.
export function topScale(r) {
  return (
    (r?.blocks || [])
      .filter(b => !b.skipped)
      .map(b => b.scale)
      .filter(Boolean)[0] || null
  )
}

// How far through the class the coach is. `logged` counts rows that exist for this
// session at all (an Ausente row IS a decision the coach made and recorded), which is what
// makes the progress bar reach 100% on a class where somebody didn't show up.
export function sessionProgress(results, dateKey, session, athleteCount) {
  const logged = (results || []).filter(
    r => r.date === dateKey && (r.sessionId === session?.id || (!r.sessionId && !session?.id)),
  ).length
  const total = athleteCount || 0
  return { logged, total, pct: total > 0 ? Math.round((logged / total) * 100) : 0 }
}
