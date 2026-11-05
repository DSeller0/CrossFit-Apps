// A class-length estimate for a suggested session (#233). A WARNING figure only: the time
// budget never trims a block (the user's call) — it sets `meta.overBudget` and nothing else.
// There is no pace model, so each block counts what its own fields say it lasts, else what
// that block type usually lasts in this box.

import { intervalTotal, toSecs } from '../../../../public/lib/wod.js'
import { normalizeGoal, stationsTotalSecs } from '../blockModel.js'
import { GENERATED_TYPES, holdSecs, median, num } from './stats.js'

// Moving between blocks — setting up a bar, changing stations.
export const TRANSITION_MIN = 2
// Only for a block type this box has never timed.
const DEFAULT_MIN = 10

// What a block's own fields say it lasts, in minutes — or null when they say nothing. One reader
// for the estimate AND for the box's typical minutes, so the two cannot drift apart.
export function knownMinutes(block) {
  // A timed WOD with a Meta is expected to end at the Meta, not at the cap. normalizeGoal first:
  // a legacy bare `min: '14'` is 14 minutes, and toSecs alone reads 14 seconds.
  const g = block.goal?.kind === 'time' ? normalizeGoal(block.goal) : null
  const goal = g ? toSecs(g.min || g.max) : Infinity
  if (Number.isFinite(goal)) return goal / 60
  if (num(block.duration) > 0) return num(block.duration)
  const st = stationsTotalSecs(block)
  if (st) return st / 60
  const iv = intervalTotal(block)
  if (iv) return iv / 60
  const exs = block.exercises || []
  if (exs.length === 1) {
    const h = holdSecs(exs[0].reps)
    if (h >= 60) return h / 60
  }
  return null
}

export const blockMinutes = (block, typical = {}) =>
  knownMinutes(block) ?? typical[block.type] ?? DEFAULT_MIN

export function estimateMinutes(blocks, typical = {}) {
  if (!blocks?.length) return 0
  const total = blocks.reduce((s, b) => s + blockMinutes(b, typical), 0)
  return Math.round(total + TRANSITION_MIN * (blocks.length - 1))
}

// Minutes a block of each type usually takes in this box's history.
export function typicalMinutes(ctx) {
  const out = {}
  for (const type of GENERATED_TYPES) {
    const mins = ctx.occ
      .filter(o => o.type === type)
      .map(o => knownMinutes(o.block))
      .filter(v => v > 0)
    if (mins.length) out[type] = median(mins)
  }
  return out
}
