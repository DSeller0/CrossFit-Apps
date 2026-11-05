// #233 (plans/100) · The suggested-session engine, run read-only against prod. Run from cone/:
//
//   node scripts/audit-suggest.mjs                   next week, every box: Texto + why per block,
//                                                     the estimate, the structure, parse warnings,
//                                                     and each box's registry-miss list
//   node scripts/audit-suggest.mjs --backtest        every strength day since 06/06, replayed on
//                                                     the sessions dated BEFORE it, scored against
//                                                     what was really programmed
//   node scripts/audit-suggest.mjs --edits           session.suggestion.text vs the saved session
//
// Flags: --box <id|sem-box> · --week <YYYY-MM-DD> (the Sunday-start week holding it) · --date
// <YYYY-MM-DD> (one day) · --variant <Tipo>=<n> (repeatable; "↻ Outra") · --lpo <Snatch|Clean|
// Jerk> · --pattern <Padrão> · --blocks <Tipo,Tipo> · --budget <min> · --widen <boxes|weekdays>
// · backtest only: --since <YYYY-MM-DD> · --write (also writes docs/reviews/<today>-suggest-
// backtest.md).
//
// The anon key reads `sessions` and `exercise_registry`. It CANNOT read `locations` (RLS, 0006):
// boxes are therefore found by the ids sessions are tagged with, unnamed, and a box's
// `historyFromUntagged` link is invisible here — the run says so instead of treating a refused
// read as "no locations". This script never writes to Supabase. The backtest is the yardstick
// for every engine rule: run it before and after a rule change and record both tables.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { buildRegistryIndex } from '../src/public/lib/registry.js'
import { SEM_BOX } from '../src/public/lib/sessions.js'
import { sessionBoxIds } from '../src/public/lib/boxScope.js'
import { DAY_PT_TITLE as DOW, todayISO } from '../src/public/lib/week.js'
import { parseSession, serializeBlock } from '../src/components/tabs/criador/textFormat.js'
import {
  ENGINE_VERSION,
  THIN_WEEKDAY_SESSIONS,
  suggestSession,
} from '../src/components/tabs/criador/suggest/index.js'
import {
  addDays,
  buildHistory,
  hasForca,
  keepSession,
  inHistoryScope,
  readBlock,
  rowMovements,
  weekStartOf,
  weekdayOf,
} from '../src/components/tabs/criador/suggest/history.js'
import {
  WOD_GROUP,
  buildContext,
  forcaScheme,
  lpoFamilyOfRows,
  mainLiftOf,
  registryMisses,
} from '../src/components/tabs/criador/suggest/stats.js'
import { lpoFamiliesOf } from '../src/components/tabs/criador/suggest/patterns.js'
import { ddmm } from '../src/components/tabs/criador/suggest/synth.js'

// ── args ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const flag = name => argv.includes(`--${name}`)
const opt = name => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}
const many = name => argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1]] : []))
const variants = Object.fromEntries(
  many('variant').map(v => {
    const [t, n] = String(v).split('=')
    return [t, Number(n) || 0]
  }),
)
const options = {}
if (opt('lpo')) options.lpoLift = opt('lpo')
if (opt('pattern')) options.pattern = opt('pattern')
if (opt('blocks')) options.blockTypes = opt('blocks').split(',')
if (opt('budget')) options.budgetMin = Number(opt('budget'))
if (opt('widen')) options.widen = opt('widen')
const boxArg = opt('box')
const scopeOf = b => (!b || b === 'sem-box' ? SEM_BOX : b)

// ── prod read (anon, read-only — same shape as scripts/audit-session-registry.mjs) ──
const env = readFileSync('./.env.production', 'utf8')
const get = k => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const sb = createClient(get('VITE_SUPABASE_URL'), get('VITE_SUPABASE_ANON_KEY'))
const [sRes, rRes, lRes] = await Promise.all([
  sb.from('sessions').select('value').eq('id', 1).maybeSingle(),
  sb.from('exercise_registry').select('value').eq('id', 1).maybeSingle(),
  sb.from('locations').select('value').eq('id', 1).maybeSingle(),
])
if (sRes.error) throw sRes.error
if (rRes.error) throw rRes.error
const sessions = sRes.data?.value || {}
const index = buildRegistryIndex(rRes.data?.value || {})
const locations = Array.isArray(lRes.data?.value) ? lRes.data.value : []
const locNote = locations.length
  ? `locations: ${locations.length} read`
  : 'locations: not readable with the anon key (RLS, 0006) — boxes come from session tags, unnamed; historyFromUntagged links are not visible'

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—')
const scopeName = s => (s === SEM_BOX ? 'Sem box (main box)' : `Box ${s}`)

// Every scope with kept sessions, the main box first, then by size.
function allScopes() {
  const n = new Map([[SEM_BOX, 0]])
  Object.values(sessions).forEach(day =>
    (Array.isArray(day) ? day : []).forEach(s => {
      if (!keepSession(s)) return
      const ids = sessionBoxIds(s)
      ;(ids.length ? ids : [SEM_BOX]).forEach(id => n.set(id, (n.get(id) || 0) + 1))
    }),
  )
  return [...n].sort((a, b) => (a[0] === SEM_BOX ? -1 : b[0] === SEM_BOX ? 1 : b[1] - a[1]))
}

// Every exercise name the engine emits is a registry name, so a parse with the registry passed
// counts every miss — the same check Texto's preview runs.
const parseWarnings = blocks =>
  blocks.map(b => parseSession(serializeBlock(b), { registry: index }).warnings)

// Every %RM the blocks carry that does not end in 0 or 5 — read back from the Texto, the form
// the user sees.
function offGrid(blocks) {
  const out = []
  parseSession(blocks.map(b => serializeBlock(b)).join('\n\n')).blocks.forEach(b =>
    (b.exercises || []).forEach(ex => {
      const ins = ex.intensity
      const pcts =
        ins?.mode === 'pct'
          ? [ins.pct]
          : ins?.mode === 'progression'
            ? (ins.steps || []).filter(s => /%/.test(s.unit || '%')).map(s => s.load)
            : []
      pcts.filter(v => Number(v) % 5).forEach(v => out.push(`${b.type} ${v}%`))
    }),
  )
  return out
}

// ── default: next week ────────────────────────────────────────────────────────
function runWeek() {
  const scopes = boxArg ? [[scopeOf(boxArg), null]] : allScopes()
  const dateArg = opt('date')
  const week0 = weekStartOf(opt('week') || dateArg || addDays(weekStartOf(todayISO()), 7))
  const days = dateArg ? [dateArg] : Array.from({ length: 7 }, (_, i) => addDays(week0, i))
  const out = []
  out.push(`audit-suggest · engine v${ENGINE_VERSION} · week of ${week0}`)
  out.push(locNote)
  if (Object.keys(variants).length) out.push(`variants: ${JSON.stringify(variants)}`)
  if (Object.keys(options).length) out.push(`options: ${JSON.stringify(options)}`)
  for (const [scope, n] of scopes) {
    out.push('', `═══ ${scopeName(scope)}${n != null ? ` · ${n} sessions` : ''} ═══`)
    const check = { structures: new Set(), outOfOrder: [], offGrid: [], warnings: 0, days: 0 }
    for (const date of days) {
      const r = suggestSession({
        sessions,
        registry: index,
        locations,
        scope,
        date,
        options,
        variants,
      })
      const m = r.meta
      if (!m.historyCount) {
        out.push(
          '',
          `── ${DOW[weekdayOf(date)]} ${ddmm(date)} · ${r.blocks.length} blocks · historyCount 0 · thin: ${m.thin} — ${m.thinReason}`,
        )
        break
      }
      // A weekday this box never trains is not printed, unless it was asked for by date.
      if (!m.weekdayCount && !dateArg) continue
      const warns = parseWarnings(r.blocks)
      out.push(
        '',
        `── ${DOW[weekdayOf(date)]} ${ddmm(date)} · history ${m.historyCount} · ${DOW[weekdayOf(date)]} ${m.weekdayCount}${m.thin ? ` · THIN: ${m.thinReason}` : ''} · estimate ${m.estimateMin}'${m.overBudget ? ' · OVER BUDGET' : ''}`,
        `   structure (${m.structureBasis.basis}, ${m.structureBasis.sessions} sessions): ${m.structure.join(' → ')}`,
      )
      if (m.skipped.length)
        out.push(`   skipped: ${m.skipped.map(s => `${s.type} — ${s.reason}`).join(' · ')}`)
      r.blocks.forEach((b, i) => {
        out.push('', serializeBlock(b))
        r.why[i].forEach(w => out.push(`   ↳ ${w}`))
        out.push(
          `   ⚑ parse: ${warns[i].length} warnings${warns[i].length ? ` — ${warns[i].map(w => `${w.kind}: ${w.line}`).join(' · ')}` : ''}`,
        )
      })
      out.push(`   ⚑ session: ${warns.flat().length} parse warnings`)
      check.days++
      check.warnings += warns.flat().length
      check.structures.add(m.structure.join('>'))
      const pos = r.blocks.map(b => m.structure.indexOf(b.type))
      if (pos.some((p, i) => i && p < pos[i - 1])) check.outOfOrder.push(ddmm(date))
      check.offGrid.push(...offGrid(r.blocks).map(v => `${ddmm(date)} ${v}`))
    }
    if (check.days)
      out.push(
        '',
        `   ✔ checks · ${check.days} days · one structure for the week: ${check.structures.size === 1 ? 'yes' : `NO (${check.structures.size})`} · blocks in structure order: ${check.outOfOrder.length ? `NO (${check.outOfOrder.join(', ')})` : 'yes'} · %RM off the 0/5 grid: ${check.offGrid.length ? check.offGrid.join(', ') : 'none'} · parse warnings: ${check.warnings}`,
      )
  }
  // The run ENDS with the miss lists, the main box's last: a name nobody resolves is invisible
  // to recency and to every pool, so it is shown here rather than read as "not used" (#211).
  const occ = list => list.reduce((s, m) => s + m.count, 0)
  for (const [scope] of scopes.slice().reverse()) {
    const hist = buildHistory({ sessions, locations, scope, date: '9999-12-31', lookAhead: false })
    if (!hist.length) continue
    const { movements, structural } = registryMisses(
      buildContext(hist, { index, date: todayISO(), dow: 0 }),
    )
    out.push(
      '',
      `═══ registry misses · ${scopeName(scope)} — ${movements.length} movement names, ${occ(movements)} occurrences ═══`,
    )
    movements.forEach(m => out.push(`   ×${String(m.count).padStart(3)}  ${m.name}`))
    if (structural.length)
      out.push(
        `   + ${structural.length} structure names typed into an exercise field (${occ(structural)} occurrences), not counted: ${structural
          .slice(0, 12)
          .map(m => `${m.name} ×${m.count}`)
          .join(' · ')}${structural.length > 12 ? ' …' : ''}`,
      )
  }
  console.log(out.join('\n'))
}

// ── backtest ──────────────────────────────────────────────────────────────────
const movesOf = blocks =>
  new Set(
    blocks
      .flatMap(b => readBlock(b, index).flatMap(rowMovements))
      .map(m => m.entry?.name)
      .filter(Boolean),
  )
const firstOfType = (blocks, t) => blocks.find(b => b.type === t)
const goalMin = b => {
  const g = b?.goal
  if (g?.kind !== 'time') return null
  const [mm, ss] = String(g.min || g.max || '')
    .split(':')
    .map(Number)
  return Number.isFinite(mm) ? mm + (ss || 0) / 60 : null
}

// What the real session holds, read with the engine's own readers.
function readReal(session, ctx) {
  const blocks = session.blocks || []
  const types = []
  blocks.forEach(b => b?.type && !types.includes(b.type) && types.push(b.type))
  const forca = firstOfType(blocks, 'Força')
  const lift = forca ? mainLiftOf(forca, ctx) : null
  const top = lift ? forcaScheme(forca, lift, ctx).top : null
  const lpoRows = blocks.filter(b => b.type === 'LPO').flatMap(b => readBlock(b, index))
  const family = lpoRows.length ? lpoFamilyOfRows(lpoRows) : null
  return { blocks, types, lift: lift?.key || null, top, family }
}

const themed = (blocks, family) =>
  !!family &&
  blocks
    .filter(b => WOD_GROUP.includes(b.type))
    .some(b =>
      readBlock(b, index).some(r =>
        rowMovements(r).some(m => lpoFamiliesOf(m.entry ? m.entry.name : m.raw).has(family)),
      ),
    )

function orderAgrees(sugTypes, realTypes) {
  const common = sugTypes.filter(t => realTypes.includes(t))
  let ok = 0,
    all = 0
  for (let i = 0; i < common.length; i++)
    for (let j = i + 1; j < common.length; j++) {
      all++
      if (realTypes.indexOf(common[i]) < realTypes.indexOf(common[j])) ok++
    }
  return { ok, all }
}

function scoreDay(date, real, sug) {
  const types = sug.blocks.map(b => b.type)
  const set = types.length === real.types.length && types.every(t => real.types.includes(t))
  const inter = types.filter(t => real.types.includes(t)).length
  const union = new Set([...types, ...real.types]).size
  const order = orderAgrees(types, real.types)
  const lift = sug.meta.picks.lift
  const fam = sug.meta.picks.family || null
  const wodS = sug.blocks.find(b => WOD_GROUP.includes(b.type))
  const wodR = wodS ? firstOfType(real.blocks, wodS.type) : null
  const overlaps = types
    .filter(t => real.types.includes(t))
    .map(t => {
      const S = movesOf([firstOfType(sug.blocks, t)])
      const R = movesOf(real.blocks.filter(b => b.type === t))
      return S.size ? [...S].filter(x => R.has(x)).length / S.size : null
    })
    .filter(v => v != null)
  const capS = Number(wodS?.duration) || null
  const capR = Number(wodR?.duration) || null
  const metaS = goalMin(wodS)
  const metaR = goalMin(wodR)
  return {
    date,
    dow: weekdayOf(date),
    thin: sug.meta.thin,
    weekdayCount: sug.meta.weekdayCount,
    set,
    jaccard: union ? inter / union : 0,
    order: order.all ? order.ok === order.all : null,
    sugTypes: types,
    realTypes: real.types,
    lift: lift?.key || null,
    liftRule: lift?.rule || null,
    realLift: real.lift,
    liftHit: real.lift ? lift?.key === real.lift : null,
    top: lift?.top ?? null,
    realTop: real.top,
    topHit: real.top != null && lift?.top != null ? Math.abs(lift.top - real.top) <= 5 : null,
    family: fam,
    realFamily: real.family,
    familyHit: real.family ? fam === real.family : null,
    theme: real.family && fam ? themed(sug.blocks, fam) === themed(real.blocks, real.family) : null,
    overlap: overlaps.length ? overlaps.reduce((s, v) => s + v, 0) / overlaps.length : null,
    capHit: capS && capR ? Math.abs(capS - capR) <= 2 : null,
    capS,
    capR,
    metaHit: metaS != null && metaR != null ? Math.abs(metaS - metaR) <= 2 : null,
    warnings: parseWarnings(sug.blocks).flat().length,
  }
}

const RULES = {
  markov: { runLength: false },
  runLength: { runLength: true },
  evidence1: { runLength: true, runEvidence: 1 },
}

function backtest() {
  const scope = scopeOf(boxArg)
  const since = opt('since') || '2026-06-06'
  const today = todayISO()
  const days = Object.keys(sessions)
    .sort()
    .filter(d => d >= since && d <= today)
    .map(d => {
      const real = (sessions[d] || []).find(
        s => keepSession(s) && inHistoryScope(s, d, scope, locations) && hasForca(s),
      )
      return real ? { date: d, real } : null
    })
    .filter(Boolean)
  const rows = { markov: [], runLength: [], evidence1: [] }
  for (const { date, real } of days) {
    const hist = buildHistory({ sessions, locations, scope, date, lookAhead: false })
    const ctx = buildContext(hist, { index, date, dow: weekdayOf(date) })
    const realRead = readReal(real, ctx)
    for (const [name, rules] of Object.entries(RULES)) {
      const sug = suggestSession({
        sessions,
        registry: index,
        locations,
        scope,
        date,
        lookAhead: false,
        rules,
      })
      rows[name].push(scoreDay(date, realRead, sug))
    }
  }
  return { scope, since, rows }
}

const mark = v => (v == null ? '·' : v ? '✓' : '✗')
const rate = (list, key) => {
  const v = list.map(r => r[key]).filter(x => x != null)
  return { hit: v.filter(x => x === true).length, n: v.length }
}
const mean = (list, key) => {
  const v = list.map(r => r[key]).filter(x => x != null)
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}
const fmtRate = r => (r.n ? `${r.hit}/${r.n} ${pct(r.hit, r.n)}` : '—')

function backtestReport() {
  const { scope, since, rows } = backtest()
  const R = rows.runLength
  const lines = []
  lines.push(`## Backtest data (${todayISO()})`)
  lines.push('')
  lines.push(
    `Generated by \`node scripts/audit-suggest.mjs --backtest --write\` (engine v${ENGINE_VERSION}, #233 · [plans/100](../plans/100-suggested-session-engine.md)). Read-only against prod. **${scopeName(scope)}**, every strength day (a session with a Força block) since ${since}: the engine runs on the sessions dated **strictly before** the day — never the later days of its week, so these scores are pessimistic by design — and is compared with what was really programmed. A day whose weekday had fewer than ${THIN_WEEKDAY_SESSIONS} earlier sessions is **thin**: listed, marked, and left out of every average.`,
  )
  lines.push('')
  lines.push('### Per day')
  lines.push('')
  lines.push(
    '| Day | Wd n | Blocks | Order (vs real · suggested) | Main lift (real · Markov · run-length) | Top (real · sugg) | LPO family (real · sugg) | Theme | Movements | Cap (real · sugg) | Meta | Warn |',
  )
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
  const ABBR = {
    Aquecimento: 'Aq',
    Acessórios: 'Ac',
    Força: 'F',
    'For Time': 'FT',
    Cardio: 'Ca',
    MetCon: 'MC',
    Estações: 'Est',
    Mobilidade: 'Mob',
  }
  const seq = types => types.map(t => ABBR[t] || t).join('>')
  R.forEach((r, i) => {
    const m = rows.markov[i]
    const thin = r.thin ? ' *(thin)*' : ''
    lines.push(
      `| ${DOW[r.dow]} ${ddmm(r.date)}${thin} | ${r.weekdayCount} | ${mark(r.set)}${
        r.set
          ? ''
          : ` ${r.sugTypes
              .filter(t => !r.realTypes.includes(t))
              .map(t => `+${t}`)
              .concat(r.realTypes.filter(t => !r.sugTypes.includes(t)).map(t => `−${t}`))
              .join(' ')}`
      } | ${mark(r.order)} ${seq(r.sugTypes)} | ${r.realLift || '—'} · ${m.lift || '—'} ${mark(m.liftHit)} · ${r.lift || '—'} ${mark(r.liftHit)}${r.liftRule && r.liftRule !== 'markov' ? ` (${r.liftRule})` : ''} | ${r.realTop ?? '—'} · ${r.top ?? '—'} ${mark(r.topHit)} | ${r.realFamily || '—'} · ${r.family || '—'} ${mark(r.familyHit)} | ${mark(r.theme)} | ${r.overlap == null ? '—' : pct(r.overlap, 1)} | ${r.capR ?? '—'} · ${r.capS ?? '—'} ${mark(r.capHit)} | ${mark(r.metaHit)} | ${r.warnings} |`,
    )
  })
  const scored = name => rows[name].filter(r => !r.thin)
  const byDow = (list, dow) => list.filter(r => r.dow === dow)
  const dows = [...new Set(R.map(r => r.dow))].sort()
  lines.push('')
  lines.push('### Scorecard (thin days excluded)')
  lines.push('')
  lines.push(
    '| Weekday | Days | Block set | Order | Main lift · Markov | Main lift · run-length | Top ±5 | LPO family | WOD theme | Movement overlap | Cap ±2 | Meta ±2 | Parse warnings |',
  )
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  const row = (label, run, mk) => {
    const ov = mean(run, 'overlap')
    lines.push(
      `| ${label} | ${run.length} | ${fmtRate(rate(run, 'set'))} | ${fmtRate(rate(run, 'order'))} | ${fmtRate(rate(mk, 'liftHit'))} | ${fmtRate(rate(run, 'liftHit'))} | ${fmtRate(rate(run, 'topHit'))} | ${fmtRate(rate(run, 'familyHit'))} | ${fmtRate(rate(run, 'theme'))} | ${ov == null ? '—' : pct(ov, 1)} | ${fmtRate(rate(run, 'capHit'))} | ${fmtRate(rate(run, 'metaHit'))} | ${run.reduce((s, r) => s + r.warnings, 0)} |`,
    )
  }
  dows.forEach(d => row(DOW[d], byDow(scored('runLength'), d), byDow(scored('markov'), d)))
  row('**All**', scored('runLength'), scored('markov'))
  lines.push('')
  lines.push('### Main lift: the run-length rule against Markov alone')
  lines.push('')
  lines.push(
    '| Weekday | Markov | Run-length (≥ 2 runs, as specified) | Run-length (≥ 1 run, sensitivity) |',
  )
  lines.push('|---|---|---|---|')
  ;[...dows.map(d => [DOW[d], r => r.dow === d]), ['**All**', () => true]].forEach(([label, f]) =>
    lines.push(
      `| ${label} | ${fmtRate(rate(scored('markov').filter(f), 'liftHit'))} | ${fmtRate(rate(scored('runLength').filter(f), 'liftHit'))} | ${fmtRate(rate(scored('evidence1').filter(f), 'liftHit'))} |`,
    ),
  )
  const oct5 = i => rows[i].find(r => r.date === '2026-10-05')
  if (oct5('runLength'))
    lines.push(
      '',
      `05/10: real ${oct5('runLength').realLift} (top ${oct5('runLength').realTop}) · Markov ${oct5('markov').lift} (top ${oct5('markov').top}) · run-length ${oct5('runLength').lift} (${oct5('runLength').liftRule}) · ≥ 1 run ${oct5('evidence1').lift} (${oct5('evidence1').liftRule}, top ${oct5('evidence1').top}).`,
    )
  lines.push('')
  lines.push(
    `### Accuracy by weekday history — where \`THIN_WEEKDAY_SESSIONS\` (${THIN_WEEKDAY_SESSIONS}) comes from`,
  )
  lines.push('')
  lines.push(
    '| Earlier sessions on the weekday | Days | Block set | Mean Jaccard | Main lift | LPO family |',
  )
  lines.push('|---|---|---|---|---|---|')
  const buckets = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 9],
    [10, 99],
  ]
  buckets.forEach(([a, b]) => {
    const list = R.filter(r => r.weekdayCount >= a && r.weekdayCount <= b)
    const j = mean(list, 'jaccard')
    lines.push(
      `| ${a}–${b === 99 ? '…' : b} | ${list.length} | ${fmtRate(rate(list, 'set'))} | ${j == null ? '—' : j.toFixed(2)} | ${fmtRate(rate(list, 'liftHit'))} | ${fmtRate(rate(list, 'familyHit'))} |`,
    )
  })
  return lines.join('\n')
}

// ── edits ─────────────────────────────────────────────────────────────────────
// How a saved session differs from the suggestion it started as, per block. Each suggested
// block is paired with the first saved block of the same type: identical text is KEPT, the same
// type with any shared movement EDITED (per field), no shared movement REPLACED, no saved block
// of that type REMOVED. Saved blocks no suggestion paired are ADDED.
function editsReport() {
  const found = []
  Object.keys(sessions)
    .sort()
    .forEach(d => (sessions[d] || []).forEach(s => s?.suggestion?.text && found.push({ d, s })))
  if (!found.length) return 'no suggested sessions yet'
  const out = [`${found.length} suggested sessions`]
  const tally = { kept: 0, edited: 0, replaced: 0, removed: 0, added: 0 }
  const fields = { movements: 0, loads: 0, reps: 0, structure: 0 }
  for (const { d, s } of found) {
    const sug = parseSession(s.suggestion.text).blocks
    const saved = (s.blocks || []).slice()
    const used = new Set()
    out.push(
      '',
      `── ${d} · ${s.sessionName || ''} · engine v${s.suggestion.version} · ${s.suggestion.seedKey}`,
    )
    for (const b of sug) {
      const i = saved.findIndex((x, k) => !used.has(k) && x.type === b.type)
      if (i < 0) {
        tally.removed++
        out.push(`   removed   ${b.type}`)
        continue
      }
      used.add(i)
      const real = saved[i]
      if (serializeBlock(real) === serializeBlock(b)) {
        tally.kept++
        out.push(`   kept      ${b.type}`)
        continue
      }
      const S = movesOf([b])
      const R = movesOf([real])
      if (![...S].some(x => R.has(x))) {
        tally.replaced++
        out.push(`   replaced  ${b.type}`)
        continue
      }
      tally.edited++
      const lines = blk => serializeBlock(blk).split('\n').slice(1)
      const diff = []
      if ([...S].sort().join() !== [...R].sort().join()) diff.push('movements')
      const load = blk =>
        (blk.exercises || []).map(e => JSON.stringify(e.intensity || null)).join('|')
      if (load(b) !== load(real)) diff.push('loads')
      const reps = blk => (blk.exercises || []).map(e => `${e.sets}x${e.reps}${e.dist}`).join('|')
      if (reps(b) !== reps(real)) diff.push('reps')
      if (lines(b)[0] !== lines(real)[0]) diff.push('structure')
      diff.forEach(f => fields[f]++)
      out.push(`   edited    ${b.type} — ${diff.join(', ') || 'text'}`)
    }
    saved.forEach((b, k) => {
      if (used.has(k)) return
      tally.added++
      out.push(`   added     ${b.type}`)
    })
  }
  out.push(
    '',
    `blocks: ${Object.entries(tally)
      .map(([k, v]) => `${k} ${v}`)
      .join(' · ')}`,
  )
  out.push(
    `edited fields: ${Object.entries(fields)
      .map(([k, v]) => `${k} ${v}`)
      .join(' · ')}`,
  )
  return out.join('\n')
}

// The report keeps a HAND-WRITTEN head (the findings, the rule decisions) above this sentinel,
// and regenerates only the data below it — the convention of 94-session-registry-audit.md.
const SENTINEL =
  '<!-- ===BACKTEST-DATA-BELOW=== auto-generated by scripts/audit-suggest.mjs --backtest --write — edits below are overwritten on the next run -->'

if (flag('backtest')) {
  const md = backtestReport()
  console.log(md)
  if (flag('write')) {
    const path = `./docs/reviews/${todayISO()}-suggest-backtest.md`
    let head = ''
    try {
      const old = readFileSync(path, 'utf8')
      if (old.includes(SENTINEL)) head = old.slice(0, old.indexOf(SENTINEL))
    } catch {
      /* first run today */
    }
    writeFileSync(path, `${head}${SENTINEL}\n\n${md}\n`)
    console.log(`\nwrote ${path}`)
  }
} else if (flag('edits')) console.log(editsReport())
else runWeek()
