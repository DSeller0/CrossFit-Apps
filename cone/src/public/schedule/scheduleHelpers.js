import { groupProgressionSteps, isWodBlock, SCALES } from '../lib/wod.js'

// Shared by Schedule.jsx and its extracted schedule/ components (#17) — one
// canonical copy so extraction can't drift the same helper two ways.

export const LOG_SCALES = SCALES

export function isRoundBlock(bl) { return !isWodBlock(bl) && Number(bl.rounds) > 0 }

// A progression exercise with zero intensity.steps still needs one countable
// row/checkbox slot in the interactive schedule view (so it can be checked off
// like any other exercise) — pad the canonical [] to one placeholder group here,
// consistently, for every Schedule.jsx consumer.
export function progGroups(ex) {
  const g = groupProgressionSteps(ex)
  return g.length ? g : [{ reps: '', loads: [] }]
}

export function parseDurMins(d) {
  if (!d) return 0; const p = String(d).trim()
  if (p.includes(':')) { const [m, s] = p.split(':').map(n => parseInt(n) || 0); return m + s / 60 }
  return parseInt(p) || 0
}

export function stationsCapMins(bl) {
  const sts = bl.stations || [], cycM = sts.reduce((t, s) => t + parseDurMins(s.duration), 0)
  const last = sts[sts.length - 1], lastRest = last?.isRest ? parseDurMins(last.duration) : 0
  const rep = bl.stationRepeat || 1, betM = parseDurMins(bl.restBetweenCycles)
  const tot = cycM * rep + Math.max(0, rep - 1) * betM - lastRest
  return tot > 0 ? Math.round(tot) : 0
}

export function extractYtId(url) {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export function fmtDeskPerf(blk) {
  if (!blk) return null
  if (blk.perfTime) return blk.perfTime
  const p = []
  if (blk.perfRounds) p.push(`${blk.perfRounds} Rds`)
  if (blk.perfReps) p.push(`${blk.perfReps} Reps`)
  return p.join(' + ') || null
}

// Enter/Space keyboard activation for click-divs (#14)
export function onKey(fn) {
  return e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fn() } }
}
