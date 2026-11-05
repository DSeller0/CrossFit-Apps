// The logic of ✦ Sugerido's pane (#235 · plans/102), kept out of the JSX so the pane stays thin —
// the same split SessionTextPane has with textFormat.js. Pure: controls in, engine options and
// display strings out. Nothing here reads a session, a registry or a clock.

import { SEM_BOX } from '../../../../public/lib/sessions.js'
import { suggestionRecord } from './index.js'
import { DIA, DIAS, ddmm } from './synth.js'

// The controls as the user left them. `null` / '' / {} everywhere means "untouched": an untouched
// pane sends the engine NO options, so its own defaults decide the day.
export const initialControls = () => ({
  lpoLift: null,
  pattern: null,
  budget: '',
  blockTypes: null,
  widen: null,
  variants: {},
})

// A session's box → the engine's scope. No tag is the "Sem box" history; a tagged session learns
// from its own box. Two or more tags (none in prod — measured 0 of 197 sessions) use the first,
// and `extra` says how many were left out, so the pane can name the box it used.
export function scopeOf(locationIds) {
  const ids = (Array.isArray(locationIds) ? locationIds : []).filter(Boolean)
  return ids.length ? { scope: ids[0], extra: ids.length - 1 } : { scope: SEM_BOX, extra: 0 }
}

export const budgetOf = c => {
  const n = parseInt(c.budget, 10)
  return n > 0 ? n : 0
}

export function optionsOf(c) {
  const o = {}
  if (c.lpoLift) o.lpoLift = c.lpoLift
  if (c.pattern) o.pattern = c.pattern
  if (budgetOf(c)) o.budgetMin = budgetOf(c)
  if (c.blockTypes) o.blockTypes = c.blockTypes
  if (c.widen) o.widen = c.widen
  return o
}

// Anything to clear? ("Limpar ajustes" is offered only then.)
export const isTouched = c =>
  !!(
    c.lpoLift ||
    c.pattern ||
    budgetOf(c) ||
    c.blockTypes ||
    c.widen ||
    Object.keys(c.variants).length
  )

// What the block list shows ticked: the user's own list once they have made one, else the types the
// engine generated for the day.
export const checkedTypes = (c, dayTypes) => c.blockTypes ?? dayTypes

// The first tick or untick MATERIALISES the day's types into an explicit list — from then on the
// list is the user's (the engine says "escolhido por você"). Kept in the box's own order, so a type
// ticked later lands where the structure puts it. The LAST ticked block cannot be unticked: the
// engine reads an empty list as "not chosen" and builds the default day, so the pane would show
// every box unticked over a full session.
export function toggleBlockType(c, type, dayTypes, structure) {
  const cur = checkedTypes(c, dayTypes)
  const next = cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type]
  if (!next.length) return c
  const order = t => {
    const i = structure.indexOf(t)
    return i < 0 ? structure.length : i
  }
  return { ...c, blockTypes: next.slice().sort((a, b) => order(a) - order(b)) }
}

// "↻ Outra" — one block's own stream. "↻ Outra sessão" — every block the day has.
export const bumpVariant = (c, type) => ({
  ...c,
  variants: { ...c.variants, [type]: (c.variants[type] || 0) + 1 },
})
export const bumpAll = (c, types) => types.reduce(bumpVariant, c)

// The mobile collapsed row: what the controls currently say, in one line.
export function summaryLine(c) {
  return [
    c.lpoLift ? `LPO ${c.lpoLift}` : 'LPO automático',
    c.pattern ? `foco ${c.pattern}` : 'sem foco',
    budgetOf(c) ? `${budgetOf(c)} min` : 'sem limite',
  ].join(' · ')
}

// The over-budget banner's figures, or null. `overBudget` is the engine's; the arithmetic is only
// for the sentence. Nothing is trimmed — the warning is the whole feature.
export function budgetNote(meta, c) {
  const budget = budgetOf(c)
  if (!budget || !meta.overBudget) return null
  return { estimate: meta.estimateMin, budget, over: meta.estimateMin - budget }
}

// The engine's own sentence when a pattern focus could not restrict the main lift ("Nenhum
// levantamento de Puxar no histórico — foco ignorado no Força."), shown on that block.
export const focusNoteOf = why => (why || []).find(l => /foco ignorado/i.test(l)) || null

// The widened-history banner. `weekday` is the plural the engine's own text uses ("terças").
export function widenNote(c, meta, weekdayPlural) {
  if (c.widen === 'weekdays') return `Usando todos os dias do box — ${meta.historyCount} sessões.`
  if (c.widen === 'boxes')
    return `Usando o histórico de todos os boxes — ${meta.weekdayCount} ${weekdayPlural} em ${meta.historyCount} sessões.`
  return null
}

// A "por quê" line split so its numbers can be set bold without injecting markup.
export function highlightParts(line) {
  return String(line)
    .split(/(\d+(?:[.,]\d+)?%?)/)
    .filter(p => p !== '')
    .map(p => ({ text: p, num: /^\d/.test(p) }))
}

// A date as the pane names it: "segunda" · "Segunda" · "segundas" · "09/11". Noon-anchored, like
// every date helper here, so a UTC offset cannot roll the day back. The names and `ddmm` are the
// engine's own (synth.js), so the pane and the por quê cannot disagree.
export function weekdayLabel(date) {
  const i = new Date(`${date}T12:00:00`).getDay()
  const name = DIA[i] ?? ''
  return {
    name,
    cap: name.charAt(0).toUpperCase() + name.slice(1),
    plural: DIAS[i] ?? '',
    dd: String(date).length >= 10 ? ddmm(String(date)) : '',
  }
}

// The confirm that guards Aplicar when the session already has blocks. It names what is about to
// go — a linked Benchmark included, which Texto preserves but Aplicar here does not.
export const describeBlocks = blocks =>
  `${blocks.length} — ${blocks.map(b => b.benchmarkRef || b.type || b.label || 'sem tipo').join(', ')}`
export const confirmRows = (current, nextCount) => [
  { label: 'Blocos atuais', value: describeBlocks(current) },
  { label: 'Blocos sugeridos', value: `${nextCount}` },
]

// The snapshot Aplicar hands up. `at` comes from the click handler — this module has no clock.
export const recordFor = ({ scope, date, controls, blocks, at }) =>
  suggestionRecord({
    scope,
    date,
    options: optionsOf(controls),
    variants: controls.variants,
    blocks,
    at,
  })
