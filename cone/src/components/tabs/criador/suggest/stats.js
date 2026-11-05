// The statistics behind a suggested session (#233), all computed from history.js's sessions.
// `buildContext` reads the history once; every generator in synth.js only queries it. Each
// figure here is one the `why` of a block can name — a count, a share, a median — so a rule
// that cannot be stated as a number does not belong in this file.

import { TYPE_CONFIG, normalizeGoal } from '../blockModel.js'
import { parseStructure, resolveType } from '../textFormat.js'
import { intervalOf, toSecs } from '../../../../public/lib/wod.js'
import { normExName, resolveExercise } from '../../../../public/lib/registry.js'
import { rootGroup } from '../../../../public/lib/exerciseGroups.js'
import { addDays, daysBetween, hasForca, readBlock, rowMovements, weekStartOf } from './history.js'
import { LPO_FAMILIES, hasRun, lpoFamiliesOf, patternOf, tokens } from './patterns.js'

// A block type joins a weekday when it is on at least half of that weekday's sessions.
export const PRESENCE_MIN = 0.5
// The canonical order is the majority of the last 6 weeks of strength days: a one-off move
// cannot change it, a durable one takes over once it holds the majority of the window.
export const ORDER_WINDOW_DAYS = 42
export const MIN_ORDER_SESSIONS = 6
// Below this many blocks of a type on the weekday, its parameters come from every weekday.
export const MIN_WEEKDAY_BLOCKS = 3
// Below this many LPO blocks of a family on the weekday, its slot tables use every weekday.
export const MIN_WEEKDAY_LPO = 4
// Pool weight: W = (sameWeekdayUses + OTHER_DAY_WEIGHT × otherUses) × recency.
export const OTHER_DAY_WEIGHT = 0.25
// recency = 1 − e^(−days / RECENCY_DAYS) from a movement's nearest use: a movement done
// yesterday is lowered to 0.13, never removed.
export const RECENCY_DAYS = 7
export const MIN_INTERVAL_OBS = 2
export const MIN_REP_OBS = 2
// The Mon/Wed rule, learned: two weekdays pair when their Snatch/Clean days were opposite in
// at least PAIR_MIN_WEEKS weeks and in PAIR_MIN_SHARE of the weeks that had both.
export const PAIR_MIN_WEEKS = 3
export const PAIR_MIN_SHARE = 0.75
// The rep counts the user writes; anything computed is rounded to the nearest of these.
export const USUAL_REPS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 20, 21, 24, 25, 30, 40, 50, 60, 100]

export const WOD_GROUP = ['For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT', 'Estações', 'Benchmark']
// A linked Benchmark is an official WOD, not something to synthesize.
export const GENERATED_TYPES = Object.keys(TYPE_CONFIG).filter(t => t !== 'Benchmark')
// Warm-up and mobility repeat by design, so their uses never lower another block's pick.
export const RECENCY_EXCLUDED = ['Aquecimento', 'Mobilidade']
// Only decides a pair the box's history never shows together.
const DEFAULT_RANK = [
  'Aquecimento',
  'Mobilidade',
  'Core',
  'Skill',
  'Força',
  'LPO',
  'Acessórios',
  'EMOM',
  'AMRAP',
  'For Time',
  'MetCon',
  'HIIT',
  'Estações',
  'Benchmark',
  'Cardio',
]

// ── Small numerics ────────────────────────────────────────────────────────────
export function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}
export const snap5 = v => Math.round(v / 5) * 5
export const recency = days => 1 - Math.exp(-Math.abs(days) / RECENCY_DAYS)
export const nearest = (list, v) =>
  list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0])
export const roundReps = v => nearest(USUAL_REPS, v)

// The most frequent value; a tie goes to the one seen LAST (inputs are oldest first).
export function modal(values, key = v => v) {
  const count = new Map()
  const lastAt = new Map()
  values.forEach((v, i) => {
    const k = key(v)
    count.set(k, (count.get(k) || 0) + 1)
    lastAt.set(k, i)
  })
  let best = null
  for (const [k, n] of count) {
    if (
      best === null ||
      n > count.get(best) ||
      (n === count.get(best) && lastAt.get(k) > lastAt.get(best))
    )
      best = k
  }
  return best === null ? null : { value: best, count: count.get(best), of: values.length }
}

// A number the user may have written with a decimal comma ("22,5"); '' and junk are NaN-or-0, so
// callers test `> 0` or Number.isFinite.
export const num = v => Number(String(v ?? '').replace(',', '.'))
const dec = num

// A row name that is block structure the user typed into an exercise field ("Rounds",
// "Complex", "60/70/80% RM Jerk", "—"), not a movement.
export const isNoiseName = raw =>
  !/[a-zà-ú]/i.test(raw) ||
  /%/.test(raw) ||
  /^(rounds?|sets?|complex[oa]?|then|rest|bloco|block|buy\s*(in|out)|max|mix)$/i.test(
    String(raw).trim(),
  )

export const poolGroup = type => (WOD_GROUP.includes(type) ? 'WOD' : type)

// A block's interval, `{ every, work }` in seconds: #228's fields, else the "A cada 1'30''" or
// the "40" on 20" off" the user wrote in the label or the notes before #228, read through the
// parser's own spellings. `work` is null for a plain "A cada".
export function blockTiming(b) {
  const iv = intervalOf(b)
  if (iv) return { every: iv.every, work: iv.work }
  for (const line of [b?.label, ...String(b?.notes || '').split('\n')]) {
    if (!line) continue
    const st = parseStructure(line)
    if (st.onSecs > 0 && st.offSecs > 0) return { every: st.onSecs + st.offSecs, work: st.onSecs }
    if (st.everySecs > 0) return { every: st.everySecs, work: null }
  }
  return null
}
export const blockInterval = b => blockTiming(b)?.every ?? null
export const timingKey = t => `${t.every}/${t.work || 0}`
// The most common interval of a set of blocks — only once some value has been used at least
// MIN_INTERVAL_OBS times; two different intervals seen once each have no mode.
export function modalTiming(blocks) {
  const all = blocks.map(blockTiming).filter(Boolean)
  const top = modal(all, timingKey)
  if (!top || top.count < MIN_INTERVAL_OBS)
    return { timing: null, count: top?.count || 0, of: all.length }
  return {
    timing: all.filter(t => timingKey(t) === top.value).pop(),
    count: top.count,
    of: all.length,
  }
}

// A block whose volume is written PER ROUND: rounds, an AMRAP/EMOM/HIIT (per round by nature,
// even an `EMOM 12'` with no rounds), or an interval. Anything else is a chipper of totals.
export const isPerRound = (block, type = block.type) =>
  parseInt(block.rounds) >= 2 || ['AMRAP', 'EMOM', 'HIIT'].includes(type) || !!blockInterval(block)

// A hold or a time the user wrote as reps: 40" · 40'' · 1' · 1'30"
export function holdSecs(reps) {
  const r = String(reps || '')
    .replace(/[“”″]/g, '"')
    .replace(/[‘’′]/g, "'")
    .trim()
  let m
  if ((m = r.match(/^(\d+)\s*(?:"|'')$/))) return +m[1]
  if ((m = r.match(/^(\d+)\s*'(?:\s*(\d{1,2})\s*(?:"|'')?)?$/))) return +m[1] * 60 + +(m[2] || 0)
  return null
}

// What one row asks for, in one comparable shape — or null when it asks for nothing countable.
export function readVolume(row) {
  if (!row || row.kind !== 'single') return null
  const uni = String(row.raw).match(/^(\d+)\s*\/\s*(\d+)\s+\S/)
  if (uni && uni[1] === uni[2]) return { kind: 'uni', n: +uni[1] }
  const d = dec(row.dist)
  if (d > 0) return { kind: 'dist', n: d, unit: row.distUnit === 'cal' ? 'cal' : 'm' }
  const r = String(row.reps || '').trim()
  if (/^\d+$/.test(r)) return { kind: 'reps', n: +r }
  if (/^\d+(?:\s*,\s*\d+)+$/.test(r))
    return { kind: 'reps', n: r.split(',').reduce((s, x) => s + +x, 0), ladder: true }
  const h = holdSecs(r)
  if (h) return { kind: 'hold', n: h }
  return null
}

// The %RM values a row carries (pct mode, or a progression's % steps).
const isPctUnit = u => !u || u === '%' || u === '% do RM' || u === '% RM'
export function pctLoads(ins) {
  if (!ins?.mode) return []
  // An empty pct is no load — not 0% (dec('') is 0, which once put a 0% top into Bench Press).
  if (ins.mode === 'pct')
    return String(ins.pct ?? '').trim() && Number.isFinite(dec(ins.pct)) ? [dec(ins.pct)] : []
  if (ins.mode === 'progression')
    return (ins.steps || [])
      .filter(s => String(s.load ?? '').trim() && isPctUnit(s.unit))
      .map(s => dec(s.load))
      .filter(Number.isFinite)
  return []
}

// ── The context ───────────────────────────────────────────────────────────────
/**
 * Everything the generators need, read once. `dow` is the target weekday; `allWeekdays`
 * (the thin-data fallback) treats every weekday as the target's own.
 */
export function buildContext(entries, { index, date, dow, allWeekdays = false }) {
  const onDow = e => allWeekdays || e.dow === dow
  const occ = []
  entries.forEach(e =>
    (e.session.blocks || []).forEach((block, j) => {
      if (!block?.type || !TYPE_CONFIG[block.type]) return
      occ.push({ e, j, block, type: block.type, rows: readBlock(block, index) })
    }),
  )
  const ctx = { entries, index, date, dow, week: weekStartOf(date), allWeekdays, onDow, occ }
  ctx.forca = forcaLifts(index)
  ctx.moves = movementStats(ctx)
  ctx.strength = strengthHistory(ctx)
  ctx.lpo = lpoHistory(ctx)
  return ctx
}

// ── Presence + order ──────────────────────────────────────────────────────────
// A weekday whose WOD format varies (Thursday: For Time 25%, MetCon 19%, Estações 13%) can
// have no single WOD type at 50% while most of its sessions still hold a WOD. Then the
// weekday's most common WOD type stands in for the family.
export function presence(ctx) {
  const day = ctx.entries.filter(ctx.onDow)
  const n = day.length
  const count = {}
  day.forEach(e =>
    new Set((e.session.blocks || []).map(b => b?.type)).forEach(t => {
      if (GENERATED_TYPES.includes(t)) count[t] = (count[t] || 0) + 1
    }),
  )
  const types = GENERATED_TYPES.filter(t => n && count[t] / n >= PRESENCE_MIN)
  let wodFallback = null
  if (n && !types.some(t => WOD_GROUP.includes(t))) {
    const withWod = day.filter(e =>
      (e.session.blocks || []).some(b => WOD_GROUP.includes(b?.type)),
    ).length
    // Per session, like presence itself; `day` is oldest first, so a tie goes to the type
    // used most recently.
    const perSession = day.flatMap(e => [
      ...new Set(
        (e.session.blocks || [])
          .map(b => b?.type)
          .filter(t => WOD_GROUP.includes(t) && GENERATED_TYPES.includes(t)),
      ),
    ])
    const top = modal(perSession)
    if (withWod / n >= PRESENCE_MIN && top) {
      wodFallback = { type: top.value, withWod, typeCount: top.count }
      types.push(top.value)
    }
  }
  return { n, count, types, wodFallback }
}

function pairCounts(list) {
  const m = new Map()
  for (const e of list) {
    const first = new Map()
    ;(e.session.blocks || []).forEach((b, i) => {
      if (b?.type && !first.has(b.type)) first.set(b.type, i)
    })
    for (const [a, ia] of first)
      for (const [b, ib] of first)
        if (a !== b && ia < ib) m.set(`${a}|${b}`, (m.get(`${a}|${b}`) || 0) + 1)
  }
  return (a, b) => m.get(`${a}|${b}`) || 0
}

/**
 * One block order for the whole box, used for every weekday — the user's "the overall
 * structure should hold; blocks moving around are not intentional". Each pair is decided by
 * the majority of the window (the last 6 weeks of strength days, pooled across weekdays),
 * then by all history, then by DEFAULT_RANK; the box's types are ranked by pairwise wins
 * (Copeland). A box with too few strength days (Eagles) falls back to all its recent days.
 *
 * ⚠️ Anchored on the WEEK, not the day: a window sliding with each date gave Monday
 * "Força → Skill → LPO" and Thursday "Força → LPO → Skill" in the same week. And a type the box
 * has never used is INSERTED by DEFAULT_RANK, never scored — in a Copeland count, an unseen
 * type decided by the defaults can flip two real types' order.
 */
export function canonicalOrder(ctx) {
  const past = ctx.entries.filter(e => e.date < ctx.week)
  const since = addDays(ctx.week, -ORDER_WINDOW_DAYS)
  const recent = past.filter(e => e.date >= since)
  let window = recent.filter(e => hasForca(e.session)),
    basis = 'strength'
  if (window.length < MIN_ORDER_SESSIONS) {
    window = recent
    basis = 'recent'
  }
  if (window.length < MIN_ORDER_SESSIONS) {
    window = past
    basis = 'all'
  }
  const win = pairCounts(window)
  const all = pairCounts(past)
  const rank = t => DEFAULT_RANK.indexOf(t)
  const seen = GENERATED_TYPES.filter(t =>
    past.some(e => (e.session.blocks || []).some(b => b?.type === t)),
  )
  const beats = (a, b) => {
    for (const c of [win, all]) if (c(a, b) !== c(b, a)) return c(a, b) > c(b, a)
    return rank(a) < rank(b)
  }
  const score = new Map(seen.map(a => [a, seen.filter(b => b !== a && beats(a, b)).length]))
  const order = seen.slice().sort((a, b) => score.get(b) - score.get(a) || rank(a) - rank(b))
  for (const t of GENERATED_TYPES) {
    if (order.includes(t)) continue
    const i = order.findIndex(s => rank(s) > rank(t))
    if (i < 0) order.push(t)
    else order.splice(i, 0, t)
  }
  return { order, seen, basis, sessions: window.length }
}

// ── Block parameters ──────────────────────────────────────────────────────────
// From the EXACT type — an EMOM's minutes must not leak into a For Time cap. `filter` narrows
// further (Cardio's steady vs interval style).
export function blocksOf(ctx, type, filter = () => true) {
  const all = ctx.occ.filter(o => o.type === type && filter(o))
  const own = all.filter(o => ctx.onDow(o.e))
  return own.length < MIN_WEEKDAY_BLOCKS && all.length > own.length
    ? { blocks: all, widened: true, own: own.length }
    : { blocks: own, widened: false, own: own.length }
}

export function blockParams(ctx, type, filter) {
  const { blocks, widened } = blocksOf(ctx, type, filter)
  const n = blocks.length
  const rounds = blocks.map(o => parseInt(o.block.rounds)).filter(v => v > 0)
  const durations = blocks.map(o => dec(o.block.duration)).filter(v => v > 0)
  const counts = blocks
    .map(o => o.rows.filter(r => r && r.kind !== 'rest').length)
    .filter(v => v > 0)
  const iv = modalTiming(blocks.map(o => o.block))
  return {
    n,
    widened,
    rounds: rounds.length * 2 >= n && rounds.length ? Math.round(median(rounds)) : 0,
    roundsObs: rounds.length,
    duration: durations.length * 2 >= n && durations.length ? Math.round(median(durations)) : 0,
    durationObs: durations.length,
    count: counts.length ? Math.max(1, Math.round(median(counts))) : 0,
    countObs: counts.length,
    timing: iv.timing,
    intervalCount: iv.count,
    intervalObs: iv.of,
  }
}

// ── Movements: pools, recency, reps ───────────────────────────────────────────
function movementStats(ctx) {
  const moves = new Map()
  const get = entry => {
    let m = moves.get(entry.name)
    if (!m) {
      m = {
        name: entry.name,
        entry,
        pattern: patternOf(entry),
        root: rootGroup(entry.name),
        uses: {},
        near: Infinity,
        nearOwn: {},
        vol: {},
        loads: {},
      }
      moves.set(entry.name, m)
    }
    return m
  }
  for (const o of ctx.occ) {
    const group = poolGroup(o.type)
    const d = Math.abs(daysBetween(o.e.date, ctx.date))
    const same = ctx.onDow(o.e)
    const perRound = isPerRound(o.block, o.type)
    for (const row of o.rows) {
      for (const mv of rowMovements(row)) {
        if (!mv.entry) continue
        const m = get(mv.entry)
        const u = (m.uses[group] = m.uses[group] || { same: 0, other: 0 })
        if (same) u.same++
        else u.other++
        if (RECENCY_EXCLUDED.includes(o.type))
          m.nearOwn[o.type] = Math.min(m.nearOwn[o.type] ?? Infinity, d)
        else m.near = Math.min(m.near, d)
      }
      if (row?.kind !== 'single' || !row.entry) continue
      const m = get(row.entry)
      const v = readVolume(row)
      if (v) {
        const b = (m.vol[group] = m.vol[group] || { perRound: [], chipper: [] })
        if (perRound && !v.ladder) b.perRound.push({ ...v, rounds: parseInt(o.block.rounds) || 0 })
        else b.chipper.push(v)
      }
      if (row.intensity?.mode === 'gender')
        (m.loads[group] = m.loads[group] || []).push(row.intensity)
    }
  }
  return moves
}

/**
 * The movements a block of `type` draws from, each with its weight
 * W = (same-weekday uses + ¼ × other uses) × recency. Uses are counted in the type's own
 * blocks — every WOD format shares one vocabulary — and recency from the nearest use in any
 * block except warm-up and mobility. A warm-up or mobility pool also counts its own type, or
 * its movements would never rotate.
 */
export function poolFor(ctx, type) {
  const group = poolGroup(type)
  const out = []
  for (const m of ctx.moves.values()) {
    const u = m.uses[group]
    if (!u) continue
    const near = RECENCY_EXCLUDED.includes(type)
      ? Math.min(m.near, m.nearOwn[type] ?? Infinity)
      : m.near
    const rec = Number.isFinite(near) ? recency(near) : 1
    out.push({
      ...m,
      same: u.same,
      other: u.other,
      days: near,
      recency: rec,
      weight: (u.same + OTHER_DAY_WEIGHT * u.other) * rec,
    })
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

/**
 * How much of a movement to prescribe per round: the median per round when there are at
 * least two per-round observations, else a chipper total ÷ rounds — rounded to the user's own
 * numbers (USUAL_REPS), and a distance to the distances this movement has actually been given.
 * A hold keeps its unit; one written without a unit stays as the user wrote it (#138).
 * `perRound` says whether the target block is written per round (isPerRound); `prefer` picks a
 * volume kind over the movement's usual one when it has any (steady cardio prescribes time).
 */
export function volumeFor(ctx, name, type, { rounds = 0, perRound = rounds > 1, prefer } = {}) {
  const m = ctx.moves.get(name)
  const groups = [poolGroup(type), ...Object.keys(m?.vol || {}).filter(g => g !== poolGroup(type))]
  for (const g of groups) {
    const b = m?.vol?.[g]
    if (!b) continue
    const kinds = [...b.perRound, ...b.chipper].map(v => v.kind)
    const kind = prefer && kinds.includes(prefer) ? prefer : modal(kinds)?.value
    // One unit only: a median over 12 cal and 400 m is no distance at all.
    const ofKind = [...b.perRound, ...b.chipper].filter(v => v.kind === kind)
    const unitKey = modal(ofKind.map(v => v.unit || ''))?.value ?? ''
    const unit = unitKey || undefined
    const sameUnit = v => v.kind === kind && (v.unit || '') === unitKey
    const per = b.perRound.filter(sameUnit)
    const chip = b.chipper.filter(sameUnit)
    const R = Math.max(1, rounds || 1)
    let n, how
    if (perRound && per.length >= MIN_REP_OBS) {
      n = median(per.map(v => v.n))
      how = { rule: 'median', obs: per.length }
    } else if (perRound && R > 1 && chip.length) {
      n = median(chip.map(v => v.n)) / R
      how = { rule: 'chipper', obs: chip.length, total: median(chip.map(v => v.n)), rounds: R }
    } else if (!perRound && chip.length >= MIN_REP_OBS) {
      n = median(chip.map(v => v.n))
      how = { rule: 'median', obs: chip.length }
    } else if (!perRound && per.some(v => v.rounds > 1)) {
      // A chipper with only per-round history: the volume those rounds added up to.
      const totals = per.filter(v => v.rounds > 1).map(v => v.n * v.rounds)
      n = median(totals)
      how = { rule: 'total', obs: totals.length }
    } else if (per.length) {
      n = median(per.map(v => v.n))
      how = { rule: 'median', obs: per.length }
    } else if (chip.length) {
      n = median(chip.map(v => v.n))
      how = { rule: 'median', obs: chip.length }
    } else continue
    const seen = [...per, ...chip].map(v => v.n)
    if (kind === 'dist' || kind === 'hold') n = nearest(seen, n)
    else n = Math.max(1, roundReps(n))
    return { kind, n, unit, group: g, ...how }
  }
  return null
}

// The gender load a movement is usually given in this type of block: the most common RX pair,
// as last written. Never a %RM — those belong to Força and LPO.
export function loadFor(ctx, name, type) {
  const list = ctx.moves.get(name)?.loads?.[poolGroup(type)] || []
  const key = ins =>
    `${ins.Masculino_RX || ''}/${ins.Feminino_RX || ''}${ins.Masculino_unit || 'kg'}`
  const top = modal(
    list.filter(i => i.Masculino_RX || i.Feminino_RX),
    key,
  )
  if (!top) return null
  const pick = list.filter(i => key(i) === top.value).pop()
  return { intensity: { ...pick }, count: top.count, of: list.length }
}

// ── Strength: the main lift per weekday ───────────────────────────────────────
function forcaLifts(index) {
  const seen = new Set()
  const list = []
  for (const entry of index.values()) {
    if (!entry.categories?.includes('Força') || seen.has(entry.name)) continue
    seen.add(entry.name)
    list.push({ name: entry.name, entry, tokens: tokens(entry.name) })
  }
  return list.sort((a, b) => a.tokens.length - b.tokens.length || (a.name < b.name ? -1 : 1))
}

/**
 * The lift a name stands for: the SHORTEST Força entry whose name runs inside it as whole
 * tokens. That makes Sumo, Banded, Snatch-grip and Deficit Deadlift all Deadlift weeks, and
 * "tempo Bench press 3" descida" a Bench Press week, while Back, Front and Overhead Squat stay
 * three lifts — there is no bare "Squat" entry to fold them into. A name nothing resolves
 * keeps its own spelling as its identity ("shoulder press"): it still ends a run, but it can
 * never be suggested, because it would come back as a registry miss.
 */
export function baseLift(name, ctx) {
  const hit = resolveExercise(name, ctx.index)
  const hay = tokens(hit ? hit.name : name)
  for (const f of ctx.forca) if (hasRun(hay, f.tokens)) return { key: f.name, entry: f.entry }
  if (hit) return null
  return { key: normExName(name), entry: null }
}

// A Força block's main lift: its label when that names a lift, else its first movement row.
// `rows` is the block already read (buildContext keeps one per occurrence).
export function mainLiftOf(block, ctx, rows = readBlock(block, ctx.index)) {
  const label = String(block?.label || '').trim()
  if (label && label !== block.type && /[a-z]/i.test(label)) {
    const k = baseLift(label, ctx)
    if (k?.entry) return k
  }
  for (const row of rows) {
    if (row?.kind !== 'single' || isNoiseName(row.raw)) continue
    const k = baseLift(row.raw, ctx)
    if (k) return k
  }
  return null
}

// The prescription rows of a block's main lift — its own rows, plus the continuation rows the
// user writes without a name ("—", "5/5 70%") — and their top %RM.
export function forcaScheme(block, lift, ctx, read = readBlock(block, ctx.index)) {
  const rows = []
  for (const row of read) {
    if (!row) continue
    if (row.kind === 'rest') {
      rows.push({ rest: true, reps: row.reps })
      continue
    }
    if (row.kind !== 'single') continue
    if (!isNoiseName(row.raw) && baseLift(row.raw, ctx)?.key !== lift.key) continue
    const pcts = pctLoads(row.intensity)
    let { sets, reps } = row
    const slash = String(row.raw).match(/^(\d+)(?:\s*\/\s*\1)+$/)
    if (slash) {
      sets = String(row.raw.split('/').length)
      reps = slash[1]
    }
    if (!sets && !reps && !pcts.length) continue
    rows.push({ sets, reps, intensity: row.intensity, pcts })
  }
  const all = rows.flatMap(r => r.pcts || [])
  return {
    rows,
    top: all.length ? Math.max(...all) : null,
    rounds: String(block.rounds || ''),
    duration: String(block.duration || ''),
    interval: block.interval,
    work: block.work,
  }
}

/**
 * Per weekday, one observation per week — the week's main lift and its top. A Força block is
 * the usual carrier; since 2026-10-19 the user also writes the lift inside an EMOM ("FRONT
 * SQUAT · 5/5 70% · 3/3/3 90%"), so a session WITHOUT a Força block lends its first non-LPO
 * block that names a Força lift with a %RM top. `weekLifts` is every lift already used in
 * the target's week, on any block: those are out (main lift once per week).
 */
function strengthHistory(ctx) {
  const byDow = new Map()
  const weekLifts = new Map()
  const seenWeek = new Set()
  const bySession = new Map()
  for (const o of ctx.occ) {
    if (o.type === 'LPO') continue
    const lift = mainLiftOf(o.block, ctx, o.rows)
    if (!lift) continue
    const scheme = forcaScheme(o.block, lift, ctx, o.rows)
    const isForca = o.type === 'Força'
    if (!isForca && !(lift.entry && scheme.top != null)) continue
    if (o.e.week === ctx.week && lift.entry && !weekLifts.has(lift.key))
      weekLifts.set(lift.key, o.e.date)
    const list = bySession.get(o.e) || []
    list.push({ lift, scheme, isForca, block: o.block })
    bySession.set(o.e, list)
  }
  for (const [e, list] of bySession) {
    const pick = list.find(x => x.isForca) || list[0]
    const k = `${e.dow}|${e.week}`
    if (seenWeek.has(k)) continue
    seenWeek.add(k)
    const arr = byDow.get(e.dow) || []
    arr.push({
      date: e.date,
      week: e.week,
      dow: e.dow,
      key: pick.lift.key,
      entry: pick.lift.entry,
      top: pick.scheme.top,
      scheme: pick.scheme,
      viaForca: pick.isForca,
    })
    byDow.set(e.dow, arr)
  }
  for (const arr of byDow.values()) arr.sort((a, b) => (a.date < b.date ? -1 : 1))
  return { byDow, weekLifts }
}

// Consecutive observations of the same lift on one weekday. A week without an observation
// (no session, or a session with no strength block) does not break a run.
export function liftRuns(obs) {
  const runs = []
  obs.forEach(o => {
    const last = runs[runs.length - 1]
    if (last && last.key === o.key) {
      last.length++
      last.end = o.date
    } else {
      if (last) last.next = o.key
      runs.push({ key: o.key, entry: o.entry, length: 1, start: o.date, end: o.date, next: null })
    }
  })
  return runs
}

// ── LPO ───────────────────────────────────────────────────────────────────────
// A block's family is the one most of its movements name; a tie goes to the first named.
export function lpoFamilyOfRows(rows) {
  const count = { Snatch: 0, Clean: 0, Jerk: 0 }
  let first = null
  for (const row of rows)
    for (const mv of rowMovements(row))
      lpoFamiliesOf(mv.entry ? mv.entry.name : mv.raw).forEach(f => {
        count[f]++
        first = first || f
      })
  const best = Math.max(...Object.values(count))
  if (!best) return null
  const tied = LPO_FAMILIES.filter(f => count[f] === best)
  return tied.includes(first) ? first : tied[0]
}

// A drill: one LPO row the engine could prescribe again — a resolved movement, or a complex
// whose every movement resolves. Its identity is its movement names.
function readDrill(row) {
  if (!row || row.kind === 'rest') return null
  if (row.kind === 'complex') {
    const mvs = row.movements
    if (mvs.length < 2) return null
    const ok = mvs.every(m => m.entry)
    const pcts = pctLoads(row.ex?.intensity)
    return {
      id: mvs.map(m => (m.entry ? m.entry.name : normExName(m.raw))).join(' + '),
      ok,
      complex: true,
      movements: mvs.map(m => ({ entry: m.entry, reps: parseInt(m.reps) || 1 })),
      start: pcts[0],
      top: pcts.length ? Math.max(...pcts) : null,
      steps: pcts.length,
    }
  }
  if (isNoiseName(row.raw)) return null
  const pcts = pctLoads(row.intensity)
  return {
    id: row.entry ? row.entry.name : normExName(row.raw),
    ok: !!row.entry,
    complex: false,
    entry: row.entry,
    reps: parseInt(row.reps) || null,
    start: pcts[0],
    top: pcts.length ? Math.max(...pcts) : null,
    steps: pcts.length,
  }
}

function lpoHistory(ctx) {
  const bySession = new Map()
  for (const o of ctx.occ) {
    if (o.type !== 'LPO') continue
    const s = bySession.get(o.e) || { e: o.e, blocks: [] }
    s.blocks.push(o)
    bySession.set(o.e, s)
  }
  const days = []
  const blocks = []
  for (const s of bySession.values()) {
    s.family = lpoFamilyOfRows(s.blocks.flatMap(o => o.rows))
    days.push(s)
    s.blocks.forEach(o => {
      const drills = o.rows.map(readDrill).filter(Boolean)
      blocks.push({ o, e: o.e, family: lpoFamilyOfRows(o.rows) || s.family, drills })
    })
  }
  // Complexity: a drill's mean normalized slot position across every LPO block — a drill that
  // usually opens a block (a pull, a balance) is simpler than one that closes it (the full lift).
  const pos = new Map()
  for (const b of blocks)
    b.drills.forEach((d, i) => {
      const p = b.drills.length > 1 ? i / (b.drills.length - 1) : 0.5
      pos.set(d.id, [...(pos.get(d.id) || []), p])
    })
  const rank = new Map([...pos].map(([id, ps]) => [id, ps.reduce((a, x) => a + x, 0) / ps.length]))
  return { days, blocks, rank }
}

// Family score = weekday frequency × family recency, from the family's nearest LPO day.
export function familyScores(ctx) {
  return LPO_FAMILIES.map(family => {
    const mine = ctx.lpo.days.filter(d => d.family === family)
    const freq = mine.filter(d => ctx.onDow(d.e)).length
    let near = Infinity,
      last = null
    for (const d of mine) {
      const dd = Math.abs(daysBetween(d.e.date, ctx.date))
      if (dd < near) {
        near = dd
        last = d.e.date
      }
    }
    const rec = Number.isFinite(near) ? recency(near) : 1
    return { family, freq, days: near, recency: rec, score: freq * rec, last }
  })
}

/**
 * The Mon/Wed rule, learned rather than hard-coded: a weekday pairs with another when their
 * Snatch/Clean days were opposite in most weeks that had both. When the partner already has
 * its family this week, the target takes the other one.
 */
export function pairRule(ctx) {
  if (ctx.allWeekdays) return null
  const byWeek = new Map()
  ctx.lpo.days.forEach(d => {
    if (d.family !== 'Snatch' && d.family !== 'Clean') return
    const w = byWeek.get(d.e.week) || new Map()
    if (!w.has(d.e.dow)) w.set(d.e.dow, { family: d.family, date: d.e.date })
    byWeek.set(d.e.week, w)
  })
  let best = null
  for (let p = 0; p < 7; p++) {
    if (p === ctx.dow) continue
    let opposite = 0,
      same = 0
    for (const w of byWeek.values()) {
      if (!w.has(ctx.dow) || !w.has(p)) continue
      if (w.get(ctx.dow).family !== w.get(p).family) opposite++
      else same++
    }
    const total = opposite + same
    if (opposite < PAIR_MIN_WEEKS || opposite < PAIR_MIN_SHARE * total) continue
    const partner = byWeek.get(ctx.week)?.get(p)
    if (!partner) continue
    if (!best || opposite > best.opposite)
      best = {
        partnerDow: p,
        partner,
        opposite,
        total,
        family: partner.family === 'Snatch' ? 'Clean' : 'Snatch',
      }
  }
  return best
}

// The day's LPO family, as the WOD theme rule reads it: how often a WOD on a day with an LPO
// family carries a movement of that family.
export function themeStats(ctx) {
  let both = 0,
    themed = 0
  for (const d of ctx.lpo.days) {
    if (!d.family) continue
    const wods = ctx.occ.filter(o => o.e === d.e && WOD_GROUP.includes(o.type))
    if (!wods.length) continue
    both++
    const hit = wods.some(o =>
      o.rows.some(r =>
        rowMovements(r).some(mv => lpoFamiliesOf(mv.entry ? mv.entry.name : mv.raw).has(d.family)),
      ),
    )
    if (hit) themed++
  }
  return { both, themed, rate: both ? themed / both : 0 }
}

// The median Meta ÷ cap of the box's timed WODs, which puts a suggested Meta at ≈ 0.80 × cap.
// Through normalizeGoal first: a legacy `min: '14'` (typed, never blurred — #139) means 14
// MINUTES, and toSecs alone reads it as 14 seconds.
export function goalRatio(ctx) {
  const r = ctx.occ
    .filter(
      o => WOD_GROUP.includes(o.type) && o.block.goal?.kind === 'time' && dec(o.block.duration) > 0,
    )
    .map(o => {
      const g = normalizeGoal(o.block.goal)
      const s = toSecs(g.min || g.max)
      return Number.isFinite(s) ? s / 60 / dec(o.block.duration) : null
    })
    .filter(v => v > 0 && v <= 1.5)
  return { ratio: r.length ? median(r) : null, n: r.length }
}

// Block structure typed into a name field — a block type ("Core", "Warm up"), a structure line
// ("AMRAP 10'"), a keyword line ("Meta 7'"), a heart-rate zone ("Z1") — is no movement, so it
// is no registry miss either. It is counted apart, never hidden.
export function isStructuralName(raw) {
  const t = String(raw || '').trim()
  if (isNoiseName(t) || resolveType(t)) return true
  if (/^(meta|obs|nota|zona|z\s?\d|a\s+cada|every|e\s*rest|diversos|then|cap|tc)\b/i.test(t))
    return true
  const st = parseStructure(t)
  return st.consumed && !st.rest
}

/**
 * Every unresolved name in the history, with its count — the recency blind spots: an unresolved
 * movement is invisible to recency and to every pool, so the list is printed rather than the
 * names being treated as "not used". Structure typed into a name field is listed apart.
 */
export function registryMisses(ctx) {
  const miss = new Map()
  for (const o of ctx.occ)
    for (const row of o.rows)
      for (const mv of rowMovements(row)) {
        if (mv.entry || !String(mv.raw).trim()) continue
        const k = normExName(mv.raw)
        const m = miss.get(k) || {
          name: mv.raw.trim(),
          count: 0,
          structural: isStructuralName(mv.raw),
        }
        m.count++
        miss.set(k, m)
      }
  const all = [...miss.values()].sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1))
  return { movements: all.filter(m => !m.structural), structural: all.filter(m => m.structural) }
}
