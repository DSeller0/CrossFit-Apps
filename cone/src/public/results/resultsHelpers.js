import { toSecs, fmtSecs, rankResults, perfStr, deriveScale } from '../lib/wod.js'
import { dayNameFull } from '../lib/week.js'

// Shared by Results.jsx and its extracted results/ components (#51) — one
// canonical copy so the extraction can't drift the same helper two ways
// (mirrors schedule/scheduleHelpers.js).

export const DEF_INP = () => ({ rpe: 7, scale: 'RX', perfTime: '', perfRounds: '', perfReps: '' })

export function inputKey(sid, bid) { return `${sid}:${bid}` }

export function sessName(sess, dateKey) {
  return sess.sessionName || sess.name || dayNameFull(dateKey)
}

export function blkMeta(bl) {
  const p = []
  if (bl.rounds)   p.push(`${bl.rounds} rounds`)
  if (bl.duration) p.push(`CAP ${bl.duration}'`)
  return p.join(' · ')
}

// The block rows for one session+block across every present athlete, shaped for
// both the KPI grid and RankList.
export function blockEntries(results, athletes, sid, bid) {
  return (results || [])
    .filter(r => r.sessionId === sid && r.presence === 'Presente')
    .map(r => {
      const br = (r.blocks || []).find(b => b.blockId === bid)
      if (!br) return null
      const ath = (athletes || []).find(a => String(a.id) === String(r.athleteId))
      return { ...br, id: r.id, athleteId: String(r.athleteId), name: ath?.name || '?', color: ath?.color, scale: deriveScale(br) }
    })
    .filter(Boolean)
}

// One calculator, two shapes. `variant: 'compact'` powers the 4-tile mobile grid;
// `'extended'` adds the per-scale split for the desktop pane. Replaces the two
// ~90%-identical calcKPIs/calcExtKpis that had drifted on their DNF handling.
export function calcKpis(entries, btype, variant = 'compact') {
  const count = entries.length
  const base  = { count: 0, avgRpe: null, perfKpi: null, rxPct: null, avgSecs: 0, rxPctStr: '—', interPct: '—', scPct: '—' }
  if (!count) return base

  // Average over the athletes who actually logged an RPE. Both pre-#51
  // calculators summed `Number(b.rpe)||0` and divided by the FULL count, so a
  // single athlete with no RPE dragged the whole gym's average toward zero.
  const rpes   = entries.map(b => Number(b.rpe)).filter(n => n > 0)
  const avgRpe = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null
  const scales = entries.map(b => b.scale).filter(s => s && s !== '-')
  const pctOf  = sc => scales.length ? Math.round(scales.filter(s => s === sc).length / scales.length * 100) : null

  let perfKpi = null, avgSecs = 0
  if (btype === 'For Time') {
    const times = entries.map(b => b.perfTime).filter(Boolean).map(toSecs).filter(t => t > 0 && t < Infinity)
    if (times.length) {
      avgSecs = times.reduce((a, b) => a + b, 0) / times.length
      perfKpi = fmtSecs(Math.round(avgSecs))
    }
  } else {
    const rounds = entries.map(b => parseInt(b.perfRounds) || 0).filter(r => r > 0)
    if (rounds.length) perfKpi = (rounds.reduce((a, b) => a + b, 0) / rounds.length).toFixed(1) + ' rds'
  }

  const rxPct = pctOf('RX')
  const str   = n => n === null ? '—' : n + '%'
  if (variant === 'compact') return { ...base, count, avgRpe, perfKpi, rxPct, avgSecs }
  return { ...base, count, avgRpe, perfKpi, rxPct, avgSecs, rxPctStr: str(rxPct), interPct: str(pctOf('Inter')), scPct: str(pctOf('SC')) }
}

// Collapsed-card summary (#51 — the SugarWOD-whiteboard density fix): how many
// logged, who is leading, and where the viewing athlete stands.
export function cardSummary(entries, btype, selAth) {
  const ranked = rankResults(entries, btype)
  const leader = ranked[0] || null
  const own    = selAth ? ranked.find(e => String(e.athleteId) === String(selAth)) : null
  return {
    count:      ranked.length,
    leaderName: leader?.name || '',
    leaderPerf: leader ? perfStr(leader, btype) : '',
    ownPerf:    own ? perfStr(own, btype) : '',
  }
}
