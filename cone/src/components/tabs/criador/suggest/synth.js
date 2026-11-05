// The generators of a suggested session (#233) — one per block type, each building a FRESH
// block from emptyBlock/emptyEx (never cloneBlocks, which keeps station ids) plus a `why`
// naming the numbers behind each choice. The why is pt-BR UI copy: Phase 3 shows it.

import { emptyBlock, emptyEx, goalKindFor } from '../blockModel.js'
import { fmtPrime, fmtSecs, uid } from '../../../../public/lib/wod.js'
import { resolveExercise } from '../../../../public/lib/registry.js'
import { weightedIndex } from './rng.js'
import { PATTERNS, lpoFamiliesOf, patternOf } from './patterns.js'
import { daysBetween, rowMovements } from './history.js'
import {
  MIN_WEEKDAY_BLOCKS,
  MIN_WEEKDAY_LPO,
  OTHER_DAY_WEIGHT,
  WOD_GROUP,
  modalTiming,
  blockParams,
  blocksOf,
  familyScores,
  holdSecs,
  isPerRound,
  liftRuns,
  loadFor,
  median,
  modal,
  num,
  pairRule,
  poolFor,
  recency,
  snap5,
  volumeFor,
} from './stats.js'

// How much a focused pattern outweighs the rest in Core and the WOD (shown in the Phase 2 mockup).
export const PATTERN_FOCUS_WEIGHT = 3
// A drill climbs this much per round, up to LPO_CEILING %RM (higher only for a drill whose own
// history went higher).
export const LPO_STEP = 5
export const LPO_CEILING = 100
// Run-length rule: a switch or a keep needs at least this many completed runs that reached k.
export const RUN_MIN_EVIDENCE = 2
// The WOD carries the day's LPO family when the box does so on at least this share of days.
export const THEME_MIN_RATE = 0.5
// A flagged fallback for a movement with no volume history and no registry default.
const FALLBACK_REPS = 10

// ── pt-BR copy ────────────────────────────────────────────────────────────────
const DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const DIAS = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados']
export const ddmm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const dayOf = d => DIA[new Date(`${d}T12:00:00`).getDay()]
const pc = x => `${Math.round(x * 100)}%`
const n2 = x => x.toFixed(2).replace('.', ',')
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const where = ctx => (ctx.allWeekdays ? 'no box' : `às ${DIAS[ctx.dow]}`)
const count = (list, x) => list.filter(y => y === x).length

// Why a block type is in the day at all — the first line of every block's why.
export function presenceWhy(ctx, pres, type, chosen) {
  if (chosen) return `${type}: escolhido por você.`
  const days = ctx.allWeekdays ? 'sessões' : DIAS[ctx.dow]
  if (pres.wodFallback?.type === type)
    return `${type}: ${pres.wodFallback.withWod} de ${pres.n} ${days} têm um WOD e ${type} é o formato mais comum (${pres.wodFallback.typeCount}).`
  const c = pres.count[type] || 0
  return `${type} em ${c} de ${pres.n} ${days} (${pc(c / pres.n)}).`
}

export const thinWhy = (ctx, have, min) =>
  ctx.allWeekdays
    ? `Só ${plural(have, 'sessão', 'sessões')} no histórico (mínimo ${min}).`
    : `Só ${have} ${have === 1 ? DIA[ctx.dow] : DIAS[ctx.dow]} no histórico deste box (mínimo ${min}).`

// An entry's name as Texto writes it: "Remo (Ergômetro)" → "Remo", but only when the short
// form resolves back to the SAME entry — "L-sit (rings)" stays whole, since "L-sit" is L-Sit.
export function displayName(entry, index) {
  const m = entry.name.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (m && m[1].trim() && resolveExercise(m[1], index) === entry) return m[1].trim()
  return entry.name
}

// Every %RM on the 0/5 grid — off-grid values are snapped (87 → 85, 92 → 90), never re-stepped.
// `log` collects "87→85" for the why. Kilos and pounds are left as written.
const isPct = u => !u || /%/.test(u)
export function snapIntensity(ins, log = []) {
  if (!ins?.mode) return ins
  const snap = v => {
    const n = num(v)
    if (!Number.isFinite(n) || String(v ?? '').trim() === '') return v
    if (snap5(n) !== n) log.push(`${n}→${snap5(n)}`)
    return String(snap5(n))
  }
  if (ins.mode === 'pct') return { ...ins, pct: snap(ins.pct) }
  if (ins.mode === 'progression')
    return {
      ...ins,
      steps: (ins.steps || []).map(s => (isPct(s.unit) ? { ...s, load: snap(s.load) } : s)),
    }
  return ins
}

const ramp = loads => ({
  mode: 'progression',
  steps: loads.map(l => ({ reps: '', load: String(l), unit: '% do RM' })),
})

// A gender load as the parser writes it back: one unit for both genders, strings throughout.
function genderLoad(src) {
  const unit = src.Masculino_unit || src.Feminino_unit || 'kg'
  const out = { mode: 'gender', Masculino_unit: unit, Feminino_unit: unit }
  for (const g of ['Masculino', 'Feminino'])
    for (const sc of ['RX', 'Inter', 'SC']) {
      const v = String(src[`${g}_${sc}`] ?? '').trim()
      if (v) out[`${g}_${sc}`] = v
    }
  return out
}

// One exercise from a volume. A hold keeps ONE mark (`90"`, `2'`): the parser reads `1'30"` as
// a 1-minute hold followed by a name starting `30"`, so a mixed value is written in seconds.
function exercise(name, vol) {
  const ex = { ...emptyEx(), name }
  if (vol?.kind === 'dist') {
    ex.dist = String(vol.n)
    ex.distUnit = vol.unit === 'cal' ? 'cal' : 'm'
  } else if (vol?.kind === 'hold') ex.reps = vol.n % 60 ? `${vol.n}"` : `${vol.n / 60}'`
  else if (vol?.kind === 'uni') ex.name = `${vol.n}/${vol.n} ${name}`
  else if (vol) ex.reps = String(vol.n)
  return ex
}

function volStr(vol) {
  if (vol.kind === 'dist') return `${vol.n}${vol.unit === 'cal' ? 'cal' : 'm'}`
  if (vol.kind === 'hold') return fmtPrime(vol.n)
  if (vol.kind === 'uni') return `${vol.n}/${vol.n}`
  return String(vol.n)
}

function volumeWhy(vol) {
  if (vol.rule === 'chipper')
    return `${volStr(vol)} = ${vol.total} ÷ ${vol.rounds} rounds (chipper)`
  if (vol.rule === 'total') return `${volStr(vol)} (volume total, mediana de ${vol.obs})`
  if (vol.rule === 'fallback') return `${volStr(vol)} — sem histórico de volume, padrão`
  return `${volStr(vol)} (mediana de ${vol.obs})`
}

// What a volume is FOR: a block's type, its rounds, and whether it is written per round. A
// station is worked like a round of its own ("Max Ski" inside 4:00).
const targetOf = block => ({
  type: block.type,
  rounds: parseInt(block.rounds) || 0,
  perRound: isPerRound(block),
})
const STATION = { type: 'Estações', rounds: 0, perRound: true }

// The volume to prescribe — or the flagged fallback: the registry's own default (#38), else a
// plain rep count. The why says which.
function volumeOrFallback(ctx, m, target, prefer) {
  const v = volumeFor(ctx, m.name, target.type, { ...target, prefer })
  if (v) return v
  const d = m.entry.defaults || {}
  if (num(d.dist) > 0)
    return {
      kind: 'dist',
      n: num(d.dist),
      unit: d.distUnit === 'cal' ? 'cal' : 'm',
      rule: 'fallback',
    }
  if (/^\d+$/.test(String(d.reps || ''))) return { kind: 'reps', n: +d.reps, rule: 'fallback' }
  return { kind: 'reps', n: FALLBACK_REPS, rule: 'fallback' }
}

// ── Drawing movements ─────────────────────────────────────────────────────────
// No movement twice in a session (`take`) or in a block (`here`), and no variation root twice
// in a block (`roots`). `strict` keeps an exhausted pattern empty instead of drawing another.
export function drawMovement(pool, rand, { pattern, take, here, roots, focus, strict }) {
  const ok = m =>
    !take.has(m.name) && !here.has(m.name) && !(m.root && roots.has(m.root)) && m.weight > 0
  let cands = pool.filter(m => ok(m) && (!pattern || m.pattern === pattern))
  let relaxed = false
  if (!cands.length && pattern && !strict) {
    cands = pool.filter(ok)
    relaxed = true
  }
  if (!cands.length) return null
  const w = cands.map(m => m.weight * (focus && m.pattern === focus ? PATTERN_FOCUS_WEIGHT : 1))
  const i = weightedIndex(rand, w)
  return { m: cands[i], p: w[i] / w.reduce((s, x) => s + x, 0), relaxed }
}

function moveWhy(ctx, d) {
  const m = d.m
  const uses =
    m.other && !ctx.allWeekdays
      ? `${m.same} ${DIAS[ctx.dow]} + ${m.other} outros × ${n2(OTHER_DAY_WEIGHT)}`
      : plural(m.same + m.other, 'uso', 'usos')
  const rec = Number.isFinite(m.days) ? `, recência ${n2(m.recency)} (${m.days} d)` : ''
  return `p ${pc(d.p)} — ${uses}${rec}`
}

const slotLabel = (d, pattern) =>
  pattern ? ` (${d.relaxed ? `sem ${pattern} livre — outro padrão` : pattern})` : ''

// The pattern each position of a block usually holds — the weekday's modal composition.
function slotPatterns(ctx, type, n, filter) {
  const { blocks } = blocksOf(ctx, type, filter)
  const byPos = []
  const overall = []
  blocks.forEach(o =>
    o.rows
      .filter(r => r && r.kind !== 'rest')
      .forEach((r, i) => {
        const p = r.kind === 'single' && r.entry ? patternOf(r.entry) : null
        if (!p) return
        ;(byPos[i] = byPos[i] || []).push(p)
        overall.push(p)
      }),
  )
  return Array.from(
    { length: n },
    (_, i) => (modal(byPos[i] || []) || modal(overall))?.value || null,
  )
}

// `A cada 2'` · `40" on 20" off` — Texto's own notation, so the why reads like the block.
export const timingStr = t =>
  t.work
    ? `${fmtPrime(t.work)} on ${fmtPrime(t.every - t.work)} off`
    : `A cada ${fmtPrime(t.every)}`

// Rounds/cap/interval onto a fresh block, returning the cap it had to drop. A duration shorter
// than the interval work it would cap is the legacy "5 rounds 3'" EMOM notation, where 3' WAS
// the interval — dropped rather than shown as a cap. A duration is never derived from an
// interval (#228), and Estações never carries one: its stations are the cycle.
function applyParams(block, p, timing = p.timing) {
  if (p.rounds) block.rounds = String(p.rounds)
  const t = block.type === 'Estações' ? null : timing
  if (t) {
    block.interval = fmtSecs(t.every)
    if (t.work) block.work = fmtSecs(t.work)
  }
  const work = t && p.rounds ? (t.every * p.rounds) / 60 : 0
  if (p.duration && !(work && p.duration < work)) block.duration = String(p.duration)
  return p.duration && work && p.duration < work ? p.duration : null
}

function paramsWhy(ctx, type, p, dropped) {
  const parts = []
  if (p.rounds) parts.push(`${p.rounds} rounds (mediana de ${p.roundsObs})`)
  if (p.duration && !dropped) parts.push(`${p.duration}' (mediana de ${p.durationObs})`)
  if (p.timing) parts.push(`${timingStr(p.timing)} (${p.intervalCount} de ${p.intervalObs})`)
  if (p.count) parts.push(plural(p.count, 'movimento', 'movimentos'))
  const src = p.widened
    ? `${type} de todos os dias (poucos ${where(ctx)})`
    : `${plural(p.n, 'bloco', 'blocos')} de ${type} ${where(ctx)}`
  const drop = dropped
    ? ` A duração mediana (${dropped}') é menor que ${p.rounds} × ${fmtPrime(p.timing.every)}: é a notação antiga do intervalo, não um cap.`
    : ''
  return `${parts.join(' · ') || 'sem parâmetros'} — de ${src}.${drop}`
}

// ── Movement blocks: Core · Acessórios · Aquecimento · Mobilidade · Skill ─────
// A pattern focus RESTRICTS Acessórios (and the Força lift); Core and the WOD only weigh it up.
const FOCUS_WEIGHED = ['Core', ...WOD_GROUP]

// `filter` narrows the history blocks the parameters and the composition are read from, and
// `only` the movements drawn (Cardio passes its style for both). `prefer` is the volume kind to
// prescribe when the movement has it.
export function genMovementBlock(ctx, type, env, { filter, only, prefer, why: lead = [] } = {}) {
  const p = blockParams(ctx, type, filter)
  if (!p.n) return null
  const block = { ...emptyBlock(type), exercises: [] }
  const why = [...lead, paramsWhy(ctx, type, p, applyParams(block, p))]
  const n = Math.min(8, Math.max(1, p.count || 3))
  const all = poolFor(ctx, type)
  const narrowed = only ? all.filter(only) : all
  const pool = narrowed.length ? narrowed : all
  const focus = env.options.pattern
  const strict = type === 'Acessórios' && !!focus
  if (strict) {
    const free = pool.filter(m => m.pattern === focus && !env.take.has(m.name)).length
    if (free < n)
      why.push(
        `Foco ${focus}: só ${plural(free, 'movimento', 'movimentos')} desse padrão em ${type}.`,
      )
  }
  const slots = strict ? Array(n).fill(focus) : slotPatterns(ctx, type, n, filter)
  const roots = new Set()
  const here = new Set()
  for (const pattern of slots) {
    const d = drawMovement(pool, env.rand, {
      pattern,
      take: env.take,
      here,
      roots,
      focus: FOCUS_WEIGHED.includes(type) ? focus : null,
      strict,
    })
    if (!d) continue
    const vol = volumeOrFallback(ctx, d.m, targetOf(block), prefer)
    const ex = exercise(displayName(d.m.entry, ctx.index), vol)
    const load = loadFor(ctx, d.m.name, type)
    if (load) ex.intensity = genderLoad(load.intensity)
    block.exercises.push(ex)
    roots.add(d.m.root)
    here.add(d.m.name)
    why.push(
      `${displayName(d.m.entry, ctx.index)}${slotLabel(d, pattern)}: ${volumeWhy(vol)} · ${moveWhy(ctx, d)}.`,
    )
  }
  if (!block.exercises.length) return null
  return { block, why, used: [...here] }
}

// ── Cardio ────────────────────────────────────────────────────────────────────
// The heart-rate zone the user writes in a name or a note ("Run Z1", "30' Row z2").
const ZONE = /\bz\s?([1-5])\b/i
const isIntervals = o => parseInt(o.block.rounds) >= 2

/**
 * Cardio comes in two styles that must not mix — steady work ("40' Bike Z1", "20' Run + 20'
 * Row") and intervals ("5 rounds · 500m Run · 15 GHD"). Mixing them is how a 3-rounds block
 * of 15' runs gets built. The weekday's more common style decides, and only its blocks feed
 * the parameters.
 */
export function genCardio(ctx, env) {
  const { blocks, widened } = blocksOf(ctx, 'Cardio')
  if (!blocks.length) return null
  const iv = blocks.filter(isIntervals).length
  const style = `${iv > blocks.length - iv ? 'intervalado' : 'contínuo'} (${iv > blocks.length - iv ? iv : blocks.length - iv} de ${blocks.length})`
  if (iv > blocks.length - iv)
    return genMovementBlock(ctx, 'Cardio', env, { filter: isIntervals, why: [`Estilo ${style}.`] })
  const steady = o => !isIntervals(o)
  const p = blockParams(ctx, 'Cardio', steady)
  const zones = blocks
    .map(o =>
      [o.block.notes, ...(o.block.exercises || []).flatMap(e => [e.name, e.note])]
        .join(' ')
        .match(ZONE),
    )
    .filter(Boolean)
    .map(m => m[1])
  const zone = modal(zones)
  const why = [
    `Estilo ${style}${zone ? ` · Z${zone.value} (${zone.count} de ${zones.length} com zona)` : ''}.`,
  ]
  // Steady work is prescribed in minutes, so it draws from the movements this box has given a
  // time — not a 100-rep Double Under.
  const timed = m =>
    [...(m.vol.Cardio?.perRound || []), ...(m.vol.Cardio?.chipper || [])].some(
      v => v.kind === 'hold',
    )
  if (p.count > 1) {
    const r = genMovementBlock(ctx, 'Cardio', env, {
      filter: steady,
      only: timed,
      prefer: 'hold',
      why,
    })
    if (r && zone) r.block.exercises.forEach(ex => (ex.note = `Z${zone.value}`))
    return r
  }
  const single = blocksOf(ctx, 'Cardio', steady).blocks.filter(
    o => o.rows.filter(r => r && r.kind !== 'rest').length === 1,
  )
  const mins = single
    .map(o => {
      if (num(o.block.duration) > 0) return num(o.block.duration)
      const h = holdSecs(o.rows.find(r => r && r.kind !== 'rest')?.reps)
      return h ? h / 60 : null
    })
    .filter(v => v > 0)
  const minutes = mins.length ? Math.round(median(mins)) : 0
  const all = poolFor(ctx, 'Cardio')
  const d = drawMovement(all.some(timed) ? all.filter(timed) : all, env.rand, {
    pattern: 'Monoestrutural',
    take: env.take,
    here: new Set(),
    roots: new Set(),
  })
  if (!d) return null
  const ex = { ...emptyEx(), name: displayName(d.m.entry, ctx.index) }
  if (minutes) ex.reps = `${minutes}'`
  if (zone) ex.note = `Z${zone.value}`
  why.push(
    `${minutes ? `${minutes}' (mediana de ${mins.length})` : 'sem duração no histórico'} — de ${plural(single.length, 'bloco', 'blocos')} de um movimento${widened ? ' (todos os dias)' : ` ${where(ctx)}`}.`,
    `${displayName(d.m.entry, ctx.index)}: ${moveWhy(ctx, d)}.`,
  )
  return { block: { ...emptyBlock('Cardio'), exercises: [ex] }, why, used: [d.m.name] }
}

// ── Força ─────────────────────────────────────────────────────────────────────
// The most frequent key. Every list passed here is chronological — transitions, runs and
// observations of THIS weekday in date order — so a tie goes to the latest of them. (Breaking it
// by a lift's last use on ANY weekday let a Wednesday Deadlift outvote a Monday BS→BS
// transition: it cost three Monday hits in the backtest.)
function argmax(keys) {
  let best = null
  for (const k of new Set(keys)) {
    const c = count(keys, k)
    const b = count(keys, best)
    if (best === null || c > b || (c === b && keys.lastIndexOf(k) > keys.lastIndexOf(best)))
      best = k
  }
  return best
}

const allStrength = ctx =>
  [...ctx.strength.byDow.values()].flat().sort((a, b) => (a.date < b.date ? -1 : 1))

/**
 * The main lift. Once per week: a lift already in the week is out. Then, per weekday —
 *  - run-length (review §7c): k = weeks the current lift has run. Among the weekday's
 *    COMPLETED runs of that lift that reached k: if ≥ RUN_MIN_EVIDENCE ended at k and most did
 *    → switch to what most often followed it; if most went on → keep it; otherwise → Markov;
 *  - Markov: what most often followed the current lift on this weekday;
 *  - else the weekday's most frequent lift, else the box's.
 * A tie goes to the most recent. Only a lift the registry resolves can be suggested.
 */
export function chooseLift(ctx, env) {
  const all = allStrength(ctx)
  const obs = ctx.allWeekdays ? [] : ctx.strength.byDow.get(ctx.dow) || []
  const week = ctx.strength.weekLifts
  const focus = env.options.pattern
  const entryOf = new Map(all.filter(o => o.entry).map(o => [o.key, o.entry]))
  const byFocus = !!focus && [...entryOf.values()].some(e => patternOf(e) === focus)
  const ok = key =>
    entryOf.has(key) &&
    !week.has(key) &&
    !env.take.has(key) &&
    (!byFocus || patternOf(entryOf.get(key)) === focus)
  const why = []
  if (focus)
    why.push(
      byFocus
        ? `Foco ${focus}: só levantamentos desse padrão.`
        : `Nenhum levantamento de ${focus} no histórico — foco ignorado no Força.`,
    )
  const out = [...week].filter(([k]) => entryOf.has(k))
  if (out.length)
    why.push(
      `Já na semana: ${out.map(([k, d]) => `${k} (${dayOf(d)} ${ddmm(d)})`).join(', ')} — fora.`,
    )
  const pick = (key, rule, line, extra) => ({
    key,
    entry: entryOf.get(key),
    rule,
    why: [...why, line],
    ...extra,
  })

  const last = obs[obs.length - 1]
  if (last && env.rules.runLength) {
    const runs = liftRuns(obs)
    const k = runs[runs.length - 1].length
    const closed = runs.slice(0, -1).filter(r => r.key === last.key)
    const reached = closed.filter(r => r.length >= k)
    const ended = reached.filter(r => r.length === k).length
    const went = reached.length - ended
    const min = env.rules.runEvidence ?? RUN_MIN_EVIDENCE
    const nth = `${k}ª ${DIA[ctx.dow]} seguida de ${last.key}`
    if (reached.length >= min && ended >= min && ended > went) {
      const next = closed.map(r => r.next).filter(ok)
      const to = argmax(next)
      if (to)
        return pick(
          to,
          'switch',
          `${nth} — ${ended === 1 ? 'na vez anterior' : `nas ${ended} vezes anteriores`} você trocou; depois de ${last.key} veio ${to} ${count(next, to)} de ${closed.length}.`,
          { k },
        )
    } else if (reached.length >= min && went > ended && ok(last.key))
      return pick(
        last.key,
        'keep',
        `${nth}: em ${went} de ${reached.length} blocos você continuou — mantido.`,
        { k },
      )
  }
  if (last) {
    const next = obs
      .slice(1)
      .filter((o, i) => obs[i].key === last.key)
      .map(o => o.key)
    const allowed = next.filter(ok)
    const to = argmax(allowed)
    if (to)
      return pick(
        to,
        'markov',
        `Depois de ${last.key} na ${DIA[ctx.dow]}, veio ${to} ${count(allowed, to)} de ${next.length} vezes.`,
      )
  }
  const own = obs.map(o => o.key).filter(ok)
  const top = argmax(own)
  if (top)
    return pick(
      top,
      'frequency',
      `${top}: o mais frequente ${where(ctx)} (${count(own, top)} de ${obs.length}).`,
    )
  const any = all.map(o => o.key).filter(ok)
  const anyTop = argmax(any)
  if (anyTop)
    return pick(
      anyTop,
      'frequency',
      `${anyTop}: o mais frequente no box (${count(any, anyTop)} de ${all.length}).`,
    )
  return null
}

// "↻ Outra" on Força: another allowed lift, drawn by how often the weekday (and, at ¼, the
// rest of the week) has used it — the other choice the run-length rule's mitigation promises.
function alternateLift(ctx, env) {
  const base = chooseLift(ctx, env)
  const all = allStrength(ctx).filter(o => o.entry)
  const focus = env.options.pattern
  const keys = [...new Set(all.map(o => o.key))].filter(
    k =>
      k !== base?.key &&
      !ctx.strength.weekLifts.has(k) &&
      !env.take.has(k) &&
      (!focus || patternOf(all.find(o => o.key === k).entry) === focus),
  )
  if (!keys.length) return base
  const w = keys.map(k =>
    all
      .filter(o => o.key === k)
      .reduce((s, o) => s + (o.dow === ctx.dow ? 1 : OTHER_DAY_WEIGHT), 0),
  )
  const i = weightedIndex(env.rand, w)
  return {
    key: keys[i],
    entry: all.find(o => o.key === keys[i]).entry,
    rule: 'variant',
    why: [
      `Outra opção: ${keys[i]} (p ${pc(w[i] / w.reduce((s, x) => s + x, 0))}) no lugar de ${base?.key || '—'}.`,
    ],
  }
}

// The top %RM to aim for. After a keep or a Markov pick: what followed weeks with the same top
// on this weekday. After a switch: the new lift's own median top here.
function chooseTop(ctx, lift) {
  const obs = (ctx.allWeekdays ? [] : ctx.strength.byDow.get(ctx.dow) || []).filter(
    o => o.top != null,
  )
  const last = obs[obs.length - 1]
  if (last && (lift.rule === 'keep' || lift.rule === 'markov')) {
    const t = snap5(last.top)
    const after = obs
      .slice(1)
      .filter((o, i) => snap5(obs[i].top) === t)
      .map(o => snap5(o.top))
    if (after.length >= 2) {
      const top = snap5(median(after))
      return {
        top,
        line: `Topo ${top}%: depois de um topo de ${t}% na ${DIA[ctx.dow]}, os seguintes foram ${after.join('/')} (mediana).`,
      }
    }
  }
  const mine = obs.filter(o => o.key === lift.key).map(o => snap5(o.top))
  if (mine.length) {
    const top = snap5(median(mine))
    return {
      top,
      line: `Topo ${top}%: mediana dos topos de ${lift.key} ${where(ctx)} (${mine.join('/')}).`,
    }
  }
  const any = allStrength(ctx)
    .filter(o => o.key === lift.key && o.top != null)
    .map(o => snap5(o.top))
  if (any.length) {
    const top = snap5(median(any))
    return {
      top,
      line: `Topo ${top}%: mediana dos topos de ${lift.key} no box (${any.join('/')}).`,
    }
  }
  return { top: null, line: `Sem topo registrado para ${lift.key}.` }
}

/**
 * The scheme: the rows of a past block of THIS lift — its own ramp, never re-stepped — whose top
 * is nearest the target, preferring this weekday and anything but last week's block (copying
 * last week is no progression), then the most recent. A block with no %RM at all (kilos, or
 * sets × reps only) still counts — after every block that has one: a box that never writes a
 * percentage still gets its Força block.
 */
function chooseScheme(ctx, lift, top) {
  const lastWeek = o => {
    const d = daysBetween(o.date, ctx.date)
    return d > 0 && d <= 7
  }
  const NO_TOP = 1000
  const score = o => [
    o.top == null ? NO_TOP : top == null ? 0 : Math.abs(snap5(o.top) - top),
    !ctx.allWeekdays && o.dow === ctx.dow ? 0 : 1,
    lastWeek(o) ? 1 : 0,
  ]
  return allStrength(ctx)
    .filter(o => o.key === lift.key && o.scheme.rows.some(r => !r.rest))
    .sort((a, b) => {
      const sa = score(a),
        sb = score(b)
      for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i]
      return a.date > b.date ? -1 : 1
    })[0]
}

export function genForca(ctx, env) {
  const lift = env.variant ? alternateLift(ctx, env) : chooseLift(ctx, env)
  if (!lift) return null
  const top = chooseTop(ctx, lift)
  const src = chooseScheme(ctx, lift, top.top)
  if (!src) return null
  const name = displayName(lift.entry, ctx.index)
  const block = { ...emptyBlock('Força'), exercises: [] }
  const sc = src.scheme
  if (sc.rounds) block.rounds = sc.rounds
  if (sc.duration) block.duration = sc.duration
  if (sc.interval) block.interval = sc.interval
  if (sc.work) block.work = sc.work
  const snapped = []
  for (const r of sc.rows) {
    if (r.rest) block.exercises.push({ ...emptyEx(), name: 'Rest', reps: r.reps })
    else
      block.exercises.push({
        ...emptyEx(),
        name,
        sets: r.sets || '',
        reps: r.reps || '',
        intensity: r.intensity ? snapIntensity(r.intensity, snapped) : null,
      })
  }
  const why = [
    ...lift.why,
    top.line,
    `Esquema de ${ddmm(src.date)}${src.dow === ctx.dow ? '' : ` (${DIA[src.dow]})`}, ${src.top == null ? 'sem %RM' : `topo ${src.top}%`}${snapped.length ? `; no grid de 5: ${[...new Set(snapped)].join(', ')}` : ''}.`,
  ]
  return { block, why, used: [lift.key], lift: lift.key, top: top.top, rule: lift.rule }
}

// ── LPO ───────────────────────────────────────────────────────────────────────
/**
 * The day's LPO family: the user's choice (`lpoLift`), else the Mon/Wed pair rule once the
 * partner day has its family this week, else the best score (weekday frequency × family
 * recency). A weekday with no LPO history scores on every weekday's frequency instead.
 */
export function chooseFamily(ctx, options) {
  if (options.lpoLift)
    return { family: options.lpoLift, line: `${options.lpoLift}: escolhido por você.` }
  const pair = pairRule(ctx)
  if (pair)
    return {
      family: pair.family,
      line: `Par ${DIA[ctx.dow]}/${DIA[pair.partnerDow]} (${pair.opposite} de ${pair.total} semanas opostas): ${DIA[pair.partnerDow]} ${ddmm(pair.partner.date)} é ${pair.partner.family} → ${pair.family}.`,
    }
  let scores = familyScores(ctx)
  let scope = where(ctx)
  if (!scores.some(s => s.freq)) {
    scores = familyScores({ ...ctx, onDow: () => true })
    scope = 'no box'
  }
  const ranked = scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score)
  if (!ranked.length) return null
  const line = ranked
    .map(s => `${s.family} ${s.freq} × ${n2(s.recency)} = ${n2(s.score)}`)
    .join(' · ')
  return {
    family: ranked[0].family,
    line: `Família ${ranked[0].family} (frequência ${scope} × recência): ${line}.`,
  }
}

const takenBy = (d, take) =>
  d.complex ? d.movements.some(m => take.has(m.entry.name)) : take.has(d.entry.name)

export function genLpo(ctx, env) {
  const fam = env.day.family
  if (!fam) return null
  const fams = ctx.lpo.blocks.filter(b => b.family === fam.family)
  const own = fams.filter(b => ctx.onDow(b.e))
  const src = own.length >= MIN_WEEKDAY_LPO ? own : fams
  if (!src.length) return null
  const slots = Math.min(
    4,
    Math.max(1, Math.round(median(src.map(b => b.drills.length).filter(n => n > 0)) || 1)),
  )
  const rounds = src.map(b => parseInt(b.o.block.rounds)).filter(v => v > 0)
  const steps = src.flatMap(b => b.drills.map(d => d.steps)).filter(v => v > 1)
  const R =
    rounds.length * 2 >= src.length ? Math.round(median(rounds)) : Math.round(median(steps) || 3)
  const durations = src.map(b => num(b.o.block.duration)).filter(v => v > 0)
  const duration = durations.length * 2 >= src.length ? Math.round(median(durations)) : 0
  // The interval is the weekday's most common one, whatever the family.
  const iv = modalTiming(ctx.lpo.blocks.filter(b => ctx.onDow(b.e)).map(b => b.o.block))
  // Per slot, a draw by frequency × recency — then the drawn drills sorted by complexity.
  const near = id =>
    ctx.lpo.blocks.reduce(
      (m, b) =>
        b.drills.some(x => x.id === id)
          ? Math.min(m, Math.abs(daysBetween(b.e.date, ctx.date)))
          : m,
      Infinity,
    )
  const picked = []
  // LPO slots climb towards the full lift, so a movement may come back in a later complex
  // (Push Jerk + Split Jerk, then Split Jerk + Split Jerk — the user's own 28/07). What adds
  // nothing is the same drill twice, or a lone drill an earlier complex already holds
  // (Snatch Balance after Muscle Snatch + Snatch Balance).
  const here = new Set()
  const drillNames = d => (d.complex ? d.movements.map(m => m.entry.name) : [d.entry.name])
  for (let s = 0; s < slots; s++) {
    const at = src.flatMap(b => (b.drills[s] ? [b.drills[s]] : []))
    const table = (at.some(d => d.ok) ? at : src.flatMap(b => b.drills)).filter(
      d =>
        d.ok &&
        !takenBy(d, env.take) &&
        !picked.some(p => p.id === d.id) &&
        !(!d.complex && here.has(d.entry.name)),
    )
    const ids = [...new Set(table.map(d => d.id))].sort()
    if (!ids.length) continue
    const w = ids.map(
      id =>
        table.filter(d => d.id === id).length * (Number.isFinite(near(id)) ? recency(near(id)) : 1),
    )
    const i = weightedIndex(env.rand, w)
    const seen = ctx.lpo.blocks.flatMap(b => b.drills.filter(d => d.id === ids[i]))
    drillNames(seen[0]).forEach(nm => here.add(nm))
    picked.push({
      id: ids[i],
      p: w[i] / w.reduce((a, x) => a + x, 0),
      freq: table.filter(d => d.id === ids[i]).length,
      of: table.length,
      seen,
    })
  }
  if (!picked.length) return null
  picked.sort((a, b) => (ctx.lpo.rank.get(a.id) ?? 0.5) - (ctx.lpo.rank.get(b.id) ?? 0.5))
  const block = { ...emptyBlock('LPO'), label: fam.family, exercises: [] }
  const p = { rounds: R, duration, timing: iv.timing }
  const dropped = applyParams(block, p)
  if (picked.length > 1) block.lettered = true
  const why = [
    fam.line,
    `${R} rounds · ${plural(picked.length, 'drill', 'drills')}${duration && !dropped ? ` · ${duration}'` : ''}${iv.timing ? ` · ${timingStr(iv.timing)} (${iv.count} de ${iv.of})` : ''} — de ${plural(src.length, 'bloco', 'blocos')} de ${fam.family}${src === own ? ` ${where(ctx)}` : ' (todos os dias)'}.`,
  ]
  const used = []
  const starts = []
  const capped = []
  let floor = 0
  picked.forEach((pk, i) => {
    const d = pk.seen[0]
    const med = median(pk.seen.map(x => x.start).filter(Number.isFinite))
    // Each drill opens at its own median %RM — and never below the slot before it.
    const own0 = med == null ? null : snap5(med)
    const start = Math.max(floor, own0 ?? floor) || 50
    floor = start
    const label = d.complex
      ? d.movements.map(m => displayName(m.entry, ctx.index)).join(' + ')
      : displayName(d.entry, ctx.index)
    starts.push(
      own0 == null
        ? `${label} sem %RM registrado → ${start}`
        : `${label} ${own0}${start !== own0 ? `→${start}` : ''}`,
    )
    // The ramp stops at 100% — or at the drill's own highest recorded %RM when that is higher
    // (a Clean Pull at 105% is real; a Snatch at 110% is not).
    const own = pk.seen.map(x => x.top).filter(Number.isFinite)
    const cap = Math.max(LPO_CEILING, own.length ? snap5(Math.max(...own)) : 0)
    const loads = Array.from({ length: R }, (_, r) => Math.min(start + LPO_STEP * r, cap))
    if (start + LPO_STEP * (R - 1) > cap) capped.push(`${label} ${cap}%`)
    const intensity = R > 1 ? ramp(loads) : { mode: 'pct', pct: String(Math.min(start, cap)) }
    if (d.complex) {
      const reps = d.movements.map(
        (_, j) => modal(pk.seen.map(x => x.movements[j]?.reps).filter(Boolean))?.value || 1,
      )
      // sets '1' keeps the inline form: the two-line form is used when sets equals the step
      // count, and reads back with a `complex-detected` warning.
      block.exercises.push({
        ...emptyEx(),
        isComplex: true,
        sets: '1',
        complexMovements: d.movements.map((m, j) => ({
          id: uid(),
          name: displayName(m.entry, ctx.index),
          reps: String(reps[j]),
        })),
        intensity,
      })
      d.movements.forEach(m => used.push(m.entry.name))
    } else {
      const reps = Math.round(median(pk.seen.map(x => x.reps).filter(Number.isFinite)) || 0)
      block.exercises.push({
        ...emptyEx(),
        name: displayName(d.entry, ctx.index),
        reps: reps ? String(reps) : '',
        intensity,
      })
      used.push(d.entry.name)
    }
    why.push(
      `${picked.length > 1 ? `${String.fromCharCode(65 + i)} ` : ''}${label}: p ${pc(pk.p)} (${pk.freq} de ${pk.of} no slot).`,
    )
  })
  if (capped.length) why.push(`Rampa limitada ao teto: ${capped.join(' · ')}.`)
  why.push(
    `Início pela mediana do %RM, nunca abaixo do anterior, +${LPO_STEP} por round: ${starts.join(' · ')}.`,
  )
  return { block, why, used, family: fam.family }
}

// ── WOD: For Time · AMRAP · EMOM · MetCon · HIIT ──────────────────────────────
// Patterns drawn by how often the weekday's WODs use them — without replacement, so a WOD
// mixes them, until every pattern the box uses is taken.
function wodPatterns(ctx, n, rand, skip) {
  const own = ctx.occ.filter(o => WOD_GROUP.includes(o.type) && ctx.onDow(o.e))
  const src =
    own.length >= MIN_WEEKDAY_BLOCKS ? own : ctx.occ.filter(o => WOD_GROUP.includes(o.type))
  const freq = new Map()
  src.forEach(o =>
    o.rows.forEach(r =>
      rowMovements(r).forEach(mv => {
        const p = mv.entry && patternOf(mv.entry)
        if (p) freq.set(p, (freq.get(p) || 0) + 1)
      }),
    ),
  )
  const pats = PATTERNS.filter(p => freq.get(p))
  const out = []
  let avail = pats.filter(p => !skip.has(p))
  while (out.length < n && pats.length) {
    if (!avail.length) avail = pats.slice()
    const i = weightedIndex(
      rand,
      avail.map(p => freq.get(p)),
    )
    out.push(avail[i])
    avail.splice(i, 1)
  }
  return out
}

export function genWod(ctx, type, env) {
  const p = blockParams(ctx, type)
  if (!p.n) return null
  const block = { ...emptyBlock(type), exercises: [] }
  const why = [paramsWhy(ctx, type, p, applyParams(block, p))]
  const n = Math.min(8, Math.max(1, p.count || 4))
  const pool = poolFor(ctx, type)
  const focus = env.options.pattern
  const roots = new Set()
  const here = new Set()
  const add = (d, label) => {
    const vol = volumeOrFallback(ctx, d.m, targetOf(block))
    const ex = exercise(displayName(d.m.entry, ctx.index), vol)
    const load = loadFor(ctx, d.m.name, type)
    if (load) ex.intensity = genderLoad(load.intensity)
    block.exercises.push(ex)
    roots.add(d.m.root)
    here.add(d.m.name)
    why.push(
      `${displayName(d.m.entry, ctx.index)}${label}: ${volumeWhy(vol)} · ${moveWhy(ctx, d)}.`,
    )
  }
  const skip = new Set()
  const { theme, family } = env.day
  if (family && theme?.rate >= THEME_MIN_RATE) {
    const fam = family.family
    const d = drawMovement(
      pool.filter(m => lpoFamiliesOf(m.name).has(fam)),
      env.rand,
      { take: env.take, here, roots },
    )
    if (d) {
      add(d, ` (tema ${fam}: ${theme.themed} de ${theme.both} dias, ${pc(theme.rate)})`)
      skip.add(d.m.pattern)
    } else why.push(`Tema ${fam}: nenhum movimento de ${fam} livre no histórico de WOD.`)
  }
  for (const pattern of wodPatterns(ctx, n - block.exercises.length, env.rand, skip)) {
    const d = drawMovement(pool, env.rand, { pattern, take: env.take, here, roots, focus })
    if (d) add(d, slotLabel(d, pattern))
  }
  if (!block.exercises.length) return null
  const used = [...here]
  const g = env.day.goal
  if (goalKindFor(type) === 'time' && num(block.duration) > 0 && g?.ratio) {
    const cap = num(block.duration)
    const min = Math.min(cap - 1, Math.max(1, Math.round(g.ratio * cap)))
    if (min > 0) {
      block.goal = { kind: 'time', min: fmtSecs(min * 60) }
      why.push(`Meta ${min}' = ${n2(g.ratio)} × cap (mediana de ${g.n} metas).`)
    }
  }
  return { block, why, used }
}

// ── Estações ──────────────────────────────────────────────────────────────────
export function genEstacoes(ctx, env) {
  const { blocks, widened } = blocksOf(ctx, 'Estações')
  if (!blocks.length) return null
  const work = blocks.map(o => (o.block.stations || []).filter(st => !st.isRest))
  const nStations = Math.max(
    1,
    Math.min(8, Math.round(median(work.map(s => s.length).filter(Boolean)) || 2)),
  )
  const per = Math.max(
    1,
    Math.min(
      4,
      Math.round(
        median(
          work
            .flat()
            .map(st => (st.exercises || []).length)
            .filter(Boolean),
        ) || 1,
      ),
    ),
  )
  const dur = modal(
    work
      .flat()
      .map(st => st.duration)
      .filter(Boolean),
  )
  const rests = blocks.filter(o => (o.block.stations || []).some(st => st.isRest)).length
  const restDur = modal(
    blocks
      .flatMap(o => (o.block.stations || []).filter(st => st.isRest).map(st => st.duration))
      .filter(Boolean),
  )
  const withRest = rests * 2 >= blocks.length && !!restDur
  const repeat = Math.max(
    1,
    Math.round(median(blocks.map(o => Number(o.block.stationRepeat) || 1)) || 1),
  )
  const block = { ...emptyBlock('Estações'), stationRepeat: repeat, stations: [] }
  const pool = poolFor(ctx, 'Estações')
  const take = new Set(env.take)
  const used = []
  const why = [
    `${plural(nStations, 'estação', 'estações')} · ${per} mov.${dur ? ` · ${dur.value}` : ''}${repeat > 1 ? ` · ${repeat} ciclos` : ''}${withRest ? ` · descanso ${restDur.value}` : ''} — de ${plural(blocks.length, 'bloco', 'blocos')} de Estações${widened ? ' (todos os dias)' : ` ${where(ctx)}`}.`,
  ]
  for (let s = 0; s < nStations; s++) {
    const roots = new Set()
    const st = {
      id: uid(),
      name: `Grupo ${String.fromCharCode(65 + s)}`,
      duration: dur?.value || '',
      isRest: false,
      exercises: [],
    }
    for (let k = 0; k < per; k++) {
      const d = drawMovement(pool, env.rand, { take, here: new Set(), roots })
      if (!d) break
      const vol = volumeOrFallback(ctx, d.m, STATION)
      st.exercises.push(exercise(displayName(d.m.entry, ctx.index), vol))
      roots.add(d.m.root)
      take.add(d.m.name)
      used.push(d.m.name)
      why.push(
        `${st.name} · ${displayName(d.m.entry, ctx.index)}: ${volumeWhy(vol)} · ${moveWhy(ctx, d)}.`,
      )
    }
    if (!st.exercises.length) continue
    if (block.stations.length && withRest)
      block.stations.push({
        id: uid(),
        name: 'Descanso',
        duration: restDur.value,
        isRest: true,
        exercises: [],
      })
    block.stations.push(st)
  }
  if (!block.stations.length) return null
  return { block, why, used }
}
