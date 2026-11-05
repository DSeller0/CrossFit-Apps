// ✦ Sugerido's engine (#233 · plans/100): a session synthesized from one box's own history.
// Nothing is copied — the block set, the box's block order, every parameter, movement, lift
// and load is a statistic or a seeded draw over that history, and each block carries a `why`
// naming its numbers. Pure and React-free: the registry is a parameter (never utils/storage),
// and nothing here writes anything — the only write path is Phase 3's Aplicar → Salvar.
//
// Stable per day: block streams are seeded on `scope|date|blockType|variant` (rng.js), so the
// same day always reads the same, and "↻ Outra" re-rolls one block without touching the rest.

import { buildRegistryIndex } from '../../../../public/lib/registry.js'
import { serializeSession } from '../textFormat.js'
import { streamFor } from './rng.js'
import { buildHistory, weekdayOf } from './history.js'
import {
  RECENCY_EXCLUDED,
  WOD_GROUP,
  buildContext,
  canonicalOrder,
  goalRatio,
  presence,
  themeStats,
} from './stats.js'
import {
  RUN_MIN_EVIDENCE,
  chooseFamily,
  genCardio,
  genEstacoes,
  genForca,
  genLpo,
  genMovementBlock,
  genWod,
  presenceWhy,
  snapIntensity,
  thinWhy,
} from './synth.js'
import { estimateMinutes, typicalMinutes } from './estimate.js'

// Bump on ANY rule change: a new rule reshuffles the seeded draws, and the version is what
// `session.suggestion` records as provenance.
export const ENGINE_VERSION = 1

// Fewer sessions on the target weekday than this and the suggestion is flagged thin — the UI
// then offers the fallbacks (`options.widen`: 'boxes' · 'weekdays'). Chosen from the backtest:
// see docs/reviews/*-suggest-backtest.md.
export const THIN_WEEKDAY_SESSIONS = 2

// The order blocks are GENERATED in, not shown in: the constrained picks (the lift, the LPO
// drills, the day's one cardio modality) take their movements first; the free ones fill around
// them without repeating a movement.
const GEN_ORDER = [
  'Força',
  'LPO',
  'Cardio',
  ...WOD_GROUP.filter(t => t !== 'Benchmark'),
  'Acessórios',
  'Core',
  'Skill',
  'Aquecimento',
  'Mobilidade',
]

function generate(ctx, type, env) {
  if (type === 'Força') return genForca(ctx, env)
  if (type === 'LPO') return genLpo(ctx, env)
  if (type === 'Cardio') return genCardio(ctx, env)
  if (type === 'Estações') return genEstacoes(ctx, env)
  if (WOD_GROUP.includes(type)) return genWod(ctx, type, env)
  return genMovementBlock(ctx, type, env)
}

/**
 * @param {object}   p
 * @param {object}   p.sessions   the sessions blob (dateKey → sessions)
 * @param {object|Map} p.registry the exercise_registry blob, or a buildRegistryIndex Map
 * @param {object[]} [p.locations] for `historyFromUntagged`
 * @param {string}   p.scope      a box id, or SEM_BOX
 * @param {string}   p.date       YYYY-MM-DD
 * @param {object}   [p.options]  { lpoLift, pattern, blockTypes, budgetMin, widen }
 * @param {object}   [p.variants] { [blockType]: n } — "↻ Outra" per block
 * @param {boolean}  [p.lookAhead] see the later same-week days (live); false in the backtest
 * @param {object}   [p.rules]    { runLength, runEvidence } — the backtest's rule switches
 * @returns {{ blocks: object[], why: string[][], meta: object }}  `why[i]` explains `blocks[i]`
 */
export function suggestSession({
  sessions,
  registry,
  locations = [],
  scope,
  date,
  options = {},
  variants = {},
  lookAhead = true,
  rules = {},
}) {
  const index = registry instanceof Map ? registry : buildRegistryIndex(registry)
  const dow = weekdayOf(date)
  const allWeekdays = options.widen === 'weekdays'
  const entries = buildHistory({
    sessions,
    locations,
    scope,
    date,
    lookAhead,
    allBoxes: options.widen === 'boxes',
  })
  const weekdayCount = entries.filter(e => e.dow === dow).length
  const meta = {
    engineVersion: ENGINE_VERSION,
    seedKey: `${scope}|${date}`,
    historyCount: entries.length,
    weekdayCount,
    thin: false,
    thinReason: '',
    estimateMin: 0,
    overBudget: false,
    structure: [],
    dayTypes: [],
    skipped: [],
    picks: {},
  }
  if (!entries.length)
    return {
      blocks: [],
      why: [],
      meta: { ...meta, thin: true, thinReason: 'Nenhuma sessão no histórico deste box.' },
    }

  const ctx = buildContext(entries, { index, date, dow, allWeekdays })
  const have = allWeekdays ? entries.length : weekdayCount
  if (have < THIN_WEEKDAY_SESSIONS) {
    meta.thin = true
    meta.thinReason = thinWhy(ctx, have, THIN_WEEKDAY_SESSIONS)
  }
  const pres = presence(ctx)
  const order = canonicalOrder(ctx)
  const chosen = Array.isArray(options.blockTypes) && options.blockTypes.length > 0
  const wanted = chosen ? options.blockTypes : pres.types
  const types = order.order.filter(t => wanted.includes(t))
  wanted
    .filter(t => !types.includes(t))
    .forEach(type => meta.skipped.push({ type, reason: `${type} não é gerado.` }))
  // The box's own structure — the pane's "Estrutura: …". Types it has never used still have a
  // place in `order`, so a block picked by hand lands somewhere sensible.
  meta.structure = order.order.filter(t => order.seen.includes(t))
  meta.structureBasis = { basis: order.basis, sessions: order.sessions }

  const day = {
    family: types.includes('LPO') ? chooseFamily(ctx, options) : null,
    theme: themeStats(ctx),
    goal: goalRatio(ctx),
  }
  const fullRules = { runLength: true, runEvidence: RUN_MIN_EVIDENCE, ...rules }
  const run = (type, variant, take) =>
    generate(ctx, type, {
      rand: streamFor(scope, date, type, variant),
      take,
      options,
      day,
      rules: fullRules,
      variant,
    })
  // Warm-up and mobility repeat by design: they neither take a movement from the session nor
  // are kept off one.
  const exempt = t => RECENCY_EXCLUDED.includes(t)
  const genTypes = GEN_ORDER.filter(t => types.includes(t))

  // Every block at variant 0 first, each avoiding what the blocks generated before it took…
  const take = new Set()
  const out = new Map()
  for (const type of genTypes) {
    const r = run(type, 0, exempt(type) ? new Set() : take)
    out.set(type, r)
    if (r && !exempt(type)) r.used.forEach(n => take.add(n))
  }
  // …then each "↻ Outra" re-rolled against every OTHER block's final movements. A re-roll
  // never feeds back into the others, so it changes its own block and nothing else.
  for (const type of genTypes) {
    const v = Number(variants?.[type]) || 0
    if (!v) continue
    const others = new Set()
    if (!exempt(type))
      for (const [t, r] of out)
        if (t !== type && r && !exempt(t)) r.used.forEach(n => others.add(n))
    // A re-roll avoids MORE than its variant-0 build did (the blocks generated after it too), so
    // it can come back empty — then the block it would replace stays, and says why.
    const r = run(type, v, others)
    const base = out.get(type)
    if (r || !base) out.set(type, r)
    else
      out.set(type, {
        ...base,
        why: [...base.why, '↻ Outra: nenhuma outra opção livre — mantida a sugestão.'],
      })
  }

  const blocks = []
  const why = []
  for (const type of types) {
    const r = out.get(type)
    if (!r) {
      meta.skipped.push({ type, reason: `Sem histórico suficiente para gerar ${type}.` })
      continue
    }
    // The grid holds for every %RM, whichever generator wrote it.
    r.block.exercises?.forEach(ex => (ex.intensity = snapIntensity(ex.intensity)))
    blocks.push(r.block)
    why.push([presenceWhy(ctx, pres, type, chosen), ...r.why])
    if (type === 'Força') meta.picks.lift = { key: r.lift, top: r.top, rule: r.rule }
    if (type === 'LPO') meta.picks.family = r.family
  }
  meta.dayTypes = blocks.map(b => b.type)
  meta.estimateMin = estimateMinutes(blocks, typicalMinutes(ctx))
  meta.overBudget = Number(options.budgetMin) > 0 && meta.estimateMin > Number(options.budgetMin)
  return { blocks, why, meta }
}

/**
 * `session.suggestion` — the provenance snapshot Phase 3's Aplicar saves on the session (JSONB,
 * no migration). `text` is what was suggested; the saved blocks are what the user kept, and
 * `scripts/audit-suggest.mjs --edits` diffs the two. `at` is passed in: this module stays pure.
 */
export function suggestionRecord({ scope, date, options = {}, variants = {}, blocks, at }) {
  return {
    engine: 'synth',
    version: ENGINE_VERSION,
    at,
    seedKey: `${scope}|${date}`,
    variants,
    options,
    text: serializeSession({ blocks }),
  }
}
