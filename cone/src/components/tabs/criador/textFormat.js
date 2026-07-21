// Criador text format (#92) — the coach's own weekly-training notation, parsed into
// the app's real block model and serialized back out. Pure: no React, no Supabase
// client, no localStorage. The registry (for name-validation warnings) is passed in
// by the caller, same convention as blockModel.js.
//
// **Blocks stay canonical.** Text is an input/output projection, never storage —
// everything downstream (TV, schedule.html, results.html, Publicador) keeps reading
// the same block objects. The only new persisted field is `block.goal`.
//
// The contract that makes this safe to point at a real week: **the parser never
// drops a line.** Anything it can't classify lands verbatim in `block.notes` and is
// reported in `warnings`; `audit` carries one entry per non-blank input line so a
// test can assert total coverage.

import { uid } from '../../../public/lib/wod.js'
import { normExName, resolveExercise } from '../../../public/lib/registry.js'
import { TYPE_CONFIG } from './blockModel.js'

// ── Normalization ─────────────────────────────────────────────────────────────
// The coach writes on a phone: typographic quotes for minutes/seconds, en-dashes,
// NBSPs and trailing spaces everywhere. Fold all of that before any matching.
export function normLine(s) {
  return String(s ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/[‘’ʼ′´]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

const dec = v => String(v).replace(',', '.')

// ── Types ─────────────────────────────────────────────────────────────────────
// Every TYPE_CONFIG key, keyed by its accent-folded form, plus the shorthand the
// coach actually writes. `WOD` is deliberately NOT a type — it's the pending
// marker that resolves from the block's structure line (`5 Rounds For Time`).
const WOD_PENDING = 'WOD'
const TYPE_KEY_INDEX = new Map(Object.keys(TYPE_CONFIG).map(k => [normExName(k), k]))
const TYPE_ALIASES = {
  'warm up': 'Aquecimento', 'warmup': 'Aquecimento', 'warm-up': 'Aquecimento', 'aquec': 'Aquecimento',
  'strength': 'Força', 'forca': 'Força',
  'complex': 'LPO', 'olympic': 'LPO', 'weightlifting': 'LPO', 'levantamento': 'LPO',
  'for time': 'For Time', 'fortime': 'For Time', 'ft': 'For Time',
  'tecnica': 'Skill', 'technique': 'Skill',
  'conditioning': 'Cardio', 'aerobico': 'Cardio',
  'abs': 'Core', 'abdominal': 'Core',
  'accessory': 'Acessórios', 'acessorio': 'Acessórios',
  'mobility': 'Mobilidade', 'alongamento': 'Mobilidade',
  'stations': 'Estações', 'circuito': 'Estações',
  'wod': WOD_PENDING, 'metcon': 'MetCon', 'met con': 'MetCon',
}
export function resolveType(seg) {
  const k = normExName(seg)
  if (!k) return null
  return TYPE_KEY_INDEX.get(k) || TYPE_ALIASES[k] || null
}

// Types whose `duration` reads as a time cap rather than a fixed window. Only
// affects how the structure line is *written* — both forms parse back to duration.
const CAP_TYPES = ['For Time', 'Benchmark', 'MetCon', 'HIIT']

// Estações carries stations (not exercises) and Benchmark blocks are read-only in
// the detailed editor — neither is expressible in this grammar, so text mode is not
// offered for them. serializeBlock still renders them for the read-only week view.
export const TEXT_UNSUPPORTED_TYPES = ['Estações']
export function isTextEditable(block) {
  if (!block) return false
  if (block.benchmarkRef) return false
  return !TEXT_UNSUPPORTED_TYPES.includes(block.type)
}

// ── Structure lines ───────────────────────────────────────────────────────────
const RE_LADDER = /^(\d+(?:\s*-\s*\d+)+)(?=\s|$)/
const RE_EVERY = /\b(?:a\s+cada|every)\s+(\d+)\s*'(?:\s*(\d+)\s*")?/i
const RE_ROUNDS = /\b(\d+)\s*(?:rounds?|rds?|sets?|voltas?|s[ée]ries?|ciclos?)\b/i
const RE_CAP = /\b(?:tc|cap|time\s*cap)\s*(\d+)\s*(?::(\d{2})|')?/i
const RE_TIME = /\b(\d+)\s*'(?:\s*(\d{1,2})\s*")?/
const STRUCT_TYPES = [[/\bfor\s*time\b/i, 'For Time'], [/\bamrap\b/i, 'AMRAP'], [/\bemom\b/i, 'EMOM'], [/\bmetcon\b/i, 'MetCon'], [/\bhiit\b/i, 'HIIT']]

// Consumes every structure token it recognizes and hands back what it couldn't
// (`rest`). `consumed` says whether anything matched at all; `rest === ''` means the
// line was *purely* structure, which is what lets `Quem já faz tc 15'` stay a label
// (it consumes `tc 15'` but leaves "Quem ja faz" behind) while `5 Rounds For Time`
// is recognized as a headerless structure line.
export function parseStructure(raw) {
  let s = normLine(raw).replace(/[()]/g, ' ')
  const out = { rounds: '', duration: '', type: null, ladder: '', everySecs: null, consumed: false }
  const eat = m => { s = (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)); out.consumed = true }
  let m
  if ((m = s.match(RE_LADDER))) { out.ladder = m[1].replace(/\s*-\s*/g, '-'); eat(m) }
  if ((m = s.match(RE_EVERY))) { out.everySecs = (+m[1]) * 60 + (+(m[2] || 0)); eat(m) }
  if ((m = s.match(RE_ROUNDS))) { out.rounds = m[1]; eat(m) }
  for (const [re, t] of STRUCT_TYPES) { if ((m = s.match(re))) { out.type = t; eat(m); break } }
  if ((m = s.match(RE_CAP))) { out.duration = m[1]; eat(m) }
  if (!out.duration && (m = s.match(RE_TIME))) { out.duration = m[1]; eat(m) }
  out.rest = s.replace(/\s+/g, ' ').trim()
  return out
}

// ── Exercise lines ────────────────────────────────────────────────────────────
const RE_SLOT = /^([A-Z])\s*[).\-–]?\s+(?=\S)/
const RE_REST = /^(?:rest|descanso)\b\s*(.*)$/i
const RE_NOTE_PAREN = /\s*\(([^()]*)\)\s*$/
const RE_META = /^(?:meta|alvo|goal)\s*:\s*(.+)$/i
const RE_OBS = /^(?:obs|nota|note)\s*:\s*(.*)$/i
const RE_ZONA = /^zona\s*:\s*(.+)$/i

const DIST_UNITS = '(m|km|cal|mi)'
const RE_Q_SETS_DIST = new RegExp(`^(\\d+)\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*${DIST_UNITS}(?![a-zA-Z])\\s*`, 'i')
const RE_Q_SETS_REPS = /^(\d+)\s*[x×]\s*(\d+)(?![a-zA-Z\d])\s*/
const RE_Q_SETS_ONLY = /^(\d+)\s*[x×]\s+/
const RE_Q_DIST = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*${DIST_UNITS}(?![a-zA-Z])\\s*`, 'i')
const RE_Q_HOLD = /^(\d+\s*['"])\s*/
const RE_Q_LADDER = /^(\d+(?:\s*-\s*\d+)+)\s+/
const RE_Q_REPS = /^(\d+)\s+/

// Trailing load, scanned right-to-left. `%` forms first so a percent ladder can
// never be mistaken for a gender pair; the gender pair requires a unit on its
// rightmost pair, which is what keeps `6 RMU /8 BMU / 10 C2B` off this path.
const RE_PROG_PCT_CONCAT = /(?:^|\s)((?:\d+(?:[.,]\d+)?%){2,})$/
const RE_PROG_PCT_SLASH = /(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)+)\s*%$/
const RE_PCT_ONE = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*%$/
const RE_GENDER_PAIR = /(?:^|[\s–—-])((?:\d+(?:[.,]\d+)?|-)\s*\/\s*(?:\d+(?:[.,]\d+)?|-))\s*(kg|lb|kgs|lbs)?\s*$/i
const RE_LOAD_LIST = /(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)*)\s*(kg|lb)s?\s*$/i

const SCALE_ORDER = ['RX', 'Inter', 'SC']
// Steps carry no `reps` of their own: groupProgressionSteps falls back to ex.reps,
// and that is the shape IntensityInput actually writes (its per-step reps field is
// placeholder-only until the coach overrides a single step). v1 limitation: a
// progression whose steps have DIFFERENT reps has no notation here, so it can't
// round-trip — the loads survive, the per-step reps collapse to the exercise's.
const progSteps = (loads, unit) => ({ mode: 'progression', steps: loads.map(l => ({ reps: '', load: dec(l), unit })) })

// Returns { intensity, rest } — `rest` is the line with the load removed.
function takeLoad(tail) {
  let m
  if ((m = tail.match(RE_PROG_PCT_CONCAT))) {
    const loads = m[1].split('%').filter(Boolean)
    return { intensity: progSteps(loads, '% do RM'), rest: tail.slice(0, tail.length - m[0].length).trim() }
  }
  if ((m = tail.match(RE_PROG_PCT_SLASH))) {
    const loads = m[1].split('/').map(x => x.trim())
    return { intensity: progSteps(loads, '% do RM'), rest: tail.slice(0, tail.length - m[0].length).trim() }
  }
  if ((m = tail.match(RE_PCT_ONE))) {
    return { intensity: { mode: 'pct', pct: dec(m[1]) }, rest: tail.slice(0, tail.length - m[0].length).trim() }
  }
  // Gender pairs: RX first (leftmost), then Inter, then SC — the coach's own order.
  const pairs = []
  let s = tail, unit = null
  while (pairs.length < SCALE_ORDER.length) {
    const p = s.match(RE_GENDER_PAIR)
    if (!p) break
    if (!pairs.length && !p[2]) break // rightmost pair must carry the unit
    if (p[2] && !unit) unit = p[2].toLowerCase().replace(/s$/, '')
    pairs.unshift(p[1])
    s = s.slice(0, p.index).replace(/[\s–—-]+$/, '')
  }
  if (pairs.length) {
    const ins = { mode: 'gender', Masculino_unit: unit || 'kg', Feminino_unit: unit || 'kg' }
    pairs.forEach((pair, i) => {
      const [mv, fv] = pair.split('/').map(x => x.trim())
      if (mv && mv !== '-') ins[`Masculino_${SCALE_ORDER[i]}`] = dec(mv)
      if (fv && fv !== '-') ins[`Feminino_${SCALE_ORDER[i]}`] = dec(fv)
    })
    return { intensity: ins, rest: s.trim() }
  }
  // A kg/lb list of 1 or 3+ values (2 would have matched the gender pair above).
  if ((m = tail.match(RE_LOAD_LIST))) {
    const loads = m[1].split('/').map(x => x.trim())
    return { intensity: progSteps(loads, m[2].toLowerCase()), rest: tail.slice(0, tail.length - m[0].length).trim() }
  }
  return { intensity: null, rest: tail }
}

// `+` makes a complex only when EACH side carries its own quantity — one decidable
// rule: `1 Hang Squat Snatch + 1 Squat Snatch` is a complex, `5 Inchworm + Push Up`
// is one exercise named "Inchworm + Push Up".
function splitComplex(name, leadReps) {
  if (!leadReps || !name.includes('+')) return null
  const parts = name.split('+').map(p => p.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const movs = [{ id: uid(), name: parts[0], reps: leadReps }]
  for (const p of parts.slice(1)) {
    const m = p.match(/^(\d+)\s+(.+)$/)
    if (!m) return null
    movs.push({ id: uid(), name: m[2].trim(), reps: m[1] })
  }
  return movs
}

const emptyParsedEx = () => ({ id: uid(), name: '', sets: '', reps: '', dist: '', distUnit: 'm', intensity: null, note: '' })

export function parseExerciseLine(raw) {
  const ex = emptyParsedEx()
  let s = normLine(raw)
  let hadSlot = false

  const slot = s.match(RE_SLOT)
  if (slot && !/^a\s+cada\b/i.test(s)) { hadSlot = true; s = s.slice(slot[0].length) }

  const rest = s.match(RE_REST)
  if (rest) return { ex: { ...ex, name: 'Rest', reps: normLine(rest[1]) }, hadSlot, isRest: true }


  const note = s.match(RE_NOTE_PAREN)
  if (note) { ex.note = note[1].trim(); s = s.slice(0, s.length - note[0].length).trim() }

  let m, leadReps = ''
  if ((m = s.match(RE_Q_SETS_DIST))) { ex.sets = m[1]; ex.dist = dec(m[2]); ex.distUnit = m[3].toLowerCase(); s = s.slice(m[0].length) }
  else if ((m = s.match(RE_Q_SETS_REPS))) { ex.sets = m[1]; leadReps = ex.reps = m[2]; s = s.slice(m[0].length) }
  else if ((m = s.match(RE_Q_SETS_ONLY))) { ex.sets = m[1]; s = s.slice(m[0].length) }
  else if ((m = s.match(RE_Q_DIST))) { ex.dist = dec(m[1]); ex.distUnit = m[2].toLowerCase(); s = s.slice(m[0].length) }
  else if ((m = s.match(RE_Q_HOLD))) { leadReps = ex.reps = m[1].replace(/\s+/g, ''); s = s.slice(m[0].length) }
  else if ((m = s.match(RE_Q_LADDER))) { leadReps = ex.reps = m[1].replace(/\s*-\s*/g, ',');  s = s.slice(m[0].length) }
  else if ((m = s.match(RE_Q_REPS))) { leadReps = ex.reps = m[1]; s = s.slice(m[0].length) }

  if (ex.dist === '' && ex.distUnit !== 'm') ex.distUnit = 'm'

  const load = takeLoad(s.trim())
  ex.intensity = load.intensity
  ex.name = load.rest.trim()

  const movs = splitComplex(ex.name, leadReps)
  if (movs) {
    ex.isComplex = true
    ex.complexMovements = movs
    ex.name = ''
    ex.reps = ''
  }
  return { ex: foldKm(ex), hadSlot, isRest: false }
}

// km is stored in metres — `distUnit` only ever holds 'm' or 'cal' downstream.
function foldKm(ex) {
  if (ex.distUnit === 'km' && ex.dist) return { ...ex, dist: String(Math.round(parseFloat(ex.dist) * 1000)), distUnit: 'm' }
  return ex
}

// ── Goals ─────────────────────────────────────────────────────────────────────
const timeStr = (min, sec) => `${min}:${String(sec ?? 0).padStart(2, '0')}`
function parseTimeToken(tok) {
  let m
  if ((m = tok.match(/^(\d+)\s*:\s*(\d{1,2})$/))) return timeStr(+m[1], +m[2])
  if ((m = tok.match(/^(\d+)\s*'(?:\s*(\d{1,2})\s*")?$/))) return timeStr(+m[1], +(m[2] || 0))
  if ((m = tok.match(/^(\d+)$/))) return timeStr(+m[1], 0)
  return null
}
export function parseGoal(raw) {
  const s = normLine(raw)
  let m
  if ((m = s.match(/^sub\s+(.+)$/i))) {
    const max = parseTimeToken(m[1].trim())
    if (max) return { kind: 'time', max }
  }
  if ((m = s.match(/^(\d+(?:\s*[:'"]\s*\d+)?)\s*-\s*(\d+(?:\s*[:'"]\s*\d+)?\s*['"]?)$/))) {
    // "11-12'" — the unit rides on the second token; borrow it for the first.
    const unit = /'/.test(m[2]) ? "'" : ''
    const min = parseTimeToken(m[1].trim() + (/[:'"]/.test(m[1]) ? '' : unit))
    const max = parseTimeToken(m[2].trim())
    if (min && max) return { kind: 'time', min, max }
  }
  if ((m = s.match(/^(\d+)\s*(?:rounds?|rds?|voltas?)\b/i))) return { kind: 'rounds', min: +m[1] }
  const one = parseTimeToken(s)
  if (one && /['":]/.test(s)) return { kind: 'time', min: one }
  return { kind: 'text', text: s }
}
export function serializeGoal(goal) {
  if (!goal) return null
  if (goal.kind === 'rounds') return `${goal.min} rounds`
  if (goal.kind === 'time') {
    const short = t => (t && t.endsWith(':00') ? `${t.slice(0, -3)}'` : t)
    if (goal.min && goal.max) {
      const whole = goal.min.endsWith(':00') && goal.max.endsWith(':00')
      return whole ? `${goal.min.slice(0, -3)}-${goal.max.slice(0, -3)}'` : `${goal.min}-${goal.max}`
    }
    if (goal.max) return `sub ${short(goal.max)}`
    if (goal.min) return short(goal.min)
  }
  return goal.text || ''
}

// ── Block parse ───────────────────────────────────────────────────────────────
const HEADER_SPLIT = /\s*[–—]\s*|\s*:\s*|\s+\/\s+|\s+-\s+/

function emptyParsedBlock() {
  return { id: uid(), label: '', type: '', zone: 'Zona 01', duration: '', rounds: '', notes: '', ladderMode: false, exercises: [] }
}

// The first line of a group. Returns null when the line is not a header at all
// (`knownType` mode, or a line with a clear exercise shape).
function parseHeaderLine(raw, allowUnresolved) {
  const line = normLine(raw)
  if (!line) return null
  const segs = line.split(HEADER_SPLIT).map(s => s.trim()).filter(Boolean)
  const first = resolveType(segs[0])
  const whole = parseStructure(line)

  if (!first) {
    if (whole.consumed && !whole.rest) return { type: whole.type, labelParts: [], struct: whole, pureStructure: true }
    if (!allowUnresolved) return null
    return { type: null, labelParts: [line], struct: null, unresolved: true }
  }

  const out = { type: first === WOD_PENDING ? null : first, labelParts: [], struct: null, wodPending: first === WOD_PENDING }
  for (const seg of segs.slice(1)) {
    const st = parseStructure(seg)
    if (st.consumed && !st.rest) {
      out.struct = out.struct ? mergeStruct(out.struct, st) : st
      if (st.type && !out.type) out.type = st.type
    } else out.labelParts.push(seg)
  }
  return out
}

const mergeStruct = (a, b) => ({
  rounds: a.rounds || b.rounds, duration: a.duration || b.duration,
  type: a.type || b.type, ladder: a.ladder || b.ladder,
  everySecs: a.everySecs ?? b.everySecs, consumed: true, rest: [a.rest, b.rest].filter(Boolean).join(' '),
})

/**
 * @param {string} text            one block's lines (no blank-line splitting done here)
 * @param {string|object} [opts]   a knownType string, or { knownType, registry, startLine }
 */
export function parseBlock(text, opts = {}) {
  const o = typeof opts === 'string' ? { knownType: opts } : (opts || {})
  const lines = String(text ?? '').split(/\r?\n/)
    .map((l, i) => ({ raw: l, lineNo: (o.startLine || 1) + i }))
    .filter(l => normLine(l.raw))
  return buildBlock(lines, o)
}

function buildBlock(lines, o) {
  const block = emptyParsedBlock()
  const warnings = [], audit = [], noteLines = []
  const warn = (kind, l, message) => warnings.push({ kind, line: normLine(l.raw), lineNo: l.lineNo, message })
  const note = l => { noteLines.push(normLine(l.raw)) }

  let i = 0
  let head = null
  if (lines.length) {
    head = parseHeaderLine(lines[0].raw, !o.knownType)
    if (head) { audit.push({ lineNo: lines[0].lineNo, kind: head.pureStructure ? 'structure' : 'header', line: normLine(lines[0].raw) }); i = 1 }
  }
  block.type = head?.type || o.knownType || ''
  if (head?.unresolved) block.typeUnresolved = true
  const labelParts = head?.labelParts || []

  // Structure line: the line right after the header, unless the header WAS one.
  let struct = head?.struct || (head?.pureStructure ? head.struct || null : null)
  if (head?.pureStructure) struct = mergeStruct(struct || { rest: '' }, head.struct)
  if (!head?.pureStructure && i < lines.length) {
    const st = parseStructure(lines[i].raw)
    if (st.consumed) {
      struct = struct ? mergeStruct(struct, st) : st
      audit.push({ lineNo: lines[i].lineNo, kind: 'structure', line: normLine(lines[i].raw) })
      if (st.rest) { noteLines.push(st.rest); warn('unparsed-line', lines[i], `"${st.rest}" mantido como nota`) }
      if (st.everySecs != null) {
        // v1 limitation, recorded deliberately: the block model has no interval
        // field, so "A cada 1'20"" can't round-trip exactly. Nearest EMOM shape +
        // the original line verbatim in notes — never invent a schema field here.
        noteLines.push(normLine(lines[i].raw))
        if (st.everySecs % 60) warn('interval-approximated', lines[i], `Intervalo ${st.everySecs}s aproximado para ${Math.round(st.everySecs / 60)}'`)
      }
      i++
    }
  }
  if (struct) {
    block.rounds = struct.rounds || ''
    block.duration = struct.duration || (struct.everySecs != null ? String(Math.max(1, Math.round(struct.everySecs / 60))) : '')
    if (struct.ladder) { block.ladderMode = true; block.ladderReps = struct.ladder.replace(/-/g, ',') }
    if (!block.type && struct.type) { block.type = struct.type; delete block.typeUnresolved }
    if (!block.type && struct.everySecs != null) { block.type = 'EMOM'; delete block.typeUnresolved }
  }
  // Warn only once the structure line has had its say: `Quem já faz !` followed by
  // `Emom 15'` resolves to EMOM, so warning at header-parse time cried wolf.
  if (block.typeUnresolved) warn('type-unresolved', lines[0], 'Tipo de bloco não reconhecido — escolha um tipo')

  // Body
  let lettered = false
  for (; i < lines.length; i++) {
    const l = lines[i], line = normLine(l.raw)
    let m
    if ((m = line.match(RE_META))) {
      block.goal = parseGoal(m[1])
      audit.push({ lineNo: l.lineNo, kind: 'meta', line })
      continue
    }
    if ((m = line.match(RE_OBS))) { noteLines.push(m[1]); audit.push({ lineNo: l.lineNo, kind: 'note', line }); continue }
    if ((m = line.match(RE_ZONA))) { block.zone = m[1].trim(); audit.push({ lineNo: l.lineNo, kind: 'zone', line }); continue }

    const { ex, hadSlot, isRest } = parseExerciseLine(line)
    if (hadSlot) lettered = true
    if (isRest) { block.exercises.push(ex); audit.push({ lineNo: l.lineNo, kind: 'rest', line }); continue }

    const bare = !ex.name && !ex.isComplex
    if (bare && ex.intensity && !ex.sets && !ex.reps && !ex.dist) {
      // A bare load list. With 2+ load-free rep-based movements above it, this is
      // the coach's two-line complex (the Friday LPO block); with one, it's just
      // that exercise's progression. The highest-ambiguity rule in the grammar —
      // it always announces itself in `warnings` so the preview can offer an undo.
      const merged = applyBareLoadList(block, ex.intensity)
      if (merged === 'complex') warn('complex-detected', l, 'Complexo detectado a partir da lista de cargas')
      else if (merged === 'none') { warn('orphan-load', l, 'Lista de cargas sem exercício acima — mantida como nota'); note(l) }
      audit.push({ lineNo: l.lineNo, kind: 'load', line })
      continue
    }
    if (bare && (ex.sets || ex.reps || ex.dist || ex.intensity) && block.exercises.length) {
      // Name-then-prescription: "Back Squat" / "5x5 65/70/75/80/85%".
      const prev = block.exercises[block.exercises.length - 1]
      block.exercises[block.exercises.length - 1] = mergePrescription(prev, ex)
      audit.push({ lineNo: l.lineNo, kind: 'exercise', line })
      continue
    }
    if (bare) { warn('unparsed-line', l, 'Linha mantida como nota'); note(l); audit.push({ lineNo: l.lineNo, kind: 'note', line }); continue }

    block.exercises.push(ex)
    audit.push({ lineNo: l.lineNo, kind: 'exercise', line })
  }

  if (lettered) block.lettered = true
  if (block.ladderReps) {
    block.exercises = block.exercises.map(ex => (ex.reps || ex.dist || ex.isComplex ? ex : { ...ex, reps: block.ladderReps }))
    delete block.ladderReps
  }
  block.label = labelParts.join(' – ') || block.type || ''
  block.notes = noteLines.join('\n')

  if (o.registry) {
    block.exercises.forEach(ex => {
      const names = ex.isComplex ? (ex.complexMovements || []).map(mv => mv.name) : [ex.name]
      names.filter(Boolean).forEach(n => {
        if (n !== 'Rest' && !resolveExercise(n, o.registry)) {
          warnings.push({ kind: 'unknown-exercise', line: n, lineNo: null, message: `"${n}" fora do registro de exercícios` })
        }
      })
    })
  }
  return { block, warnings, audit }
}

// The two-line complex assist. Movements only ever carry name+reps, so a candidate
// must be rep-based and load-free — that keeps `100m Run` out of a complex.
function applyBareLoadList(block, intensity) {
  const exs = block.exercises
  const cand = []
  for (let k = exs.length - 1; k >= 0; k--) {
    const e = exs[k]
    if (e.isComplex || e.intensity || e.dist || !e.name || !/^\d+$/.test(String(e.reps || ''))) break
    cand.unshift(k)
  }
  if (cand.length >= 2) {
    const movs = cand.map(k => ({ id: uid(), name: exs[k].name, reps: exs[k].reps }))
    const steps = intensity.steps || []
    block.exercises = exs.slice(0, cand[0]).concat([{
      ...emptyParsedEx(), isComplex: true, complexMovements: movs,
      sets: steps.length ? String(steps.length) : '', intensity,
    }])
    return 'complex'
  }
  if (exs.length) { exs[exs.length - 1] = { ...exs[exs.length - 1], intensity }; return 'single' }
  return 'none'
}

function mergePrescription(prev, add) {
  const out = { ...prev }
  if (add.sets) out.sets = add.sets
  if (add.reps) out.reps = add.reps
  if (add.dist) { out.dist = add.dist; out.distUnit = add.distUnit }
  if (add.intensity) out.intensity = add.intensity
  return out
}

// ── Session / week parse ──────────────────────────────────────────────────────
const isRestOnlyGroup = lines => lines.every(l => RE_REST.test(normLine(l.raw).replace(RE_SLOT, '')))

export function parseSession(text, opts = {}) {
  const all = String(text ?? '').split(/\r?\n/).map((raw, i) => ({ raw, lineNo: i + 1 }))
  const groups = []
  let cur = []
  all.forEach(l => {
    if (normLine(l.raw)) cur.push(l)
    else if (cur.length) { groups.push(cur); cur = [] }
  })
  if (cur.length) groups.push(cur)

  const blocks = [], warnings = [], audit = []
  groups.forEach(g => {
    // A lone "Rest 2'" between two WOD groups is a rest *exercise* on the block
    // above it, not a block of its own.
    if (isRestOnlyGroup(g) && blocks.length) {
      const last = blocks[blocks.length - 1]
      g.forEach(l => {
        last.exercises.push(parseExerciseLine(normLine(l.raw)).ex)
        audit.push({ lineNo: l.lineNo, kind: 'rest', line: normLine(l.raw) })
      })
      return
    }
    const r = buildBlock(g, opts)
    blocks.push(r.block)
    warnings.push(...r.warnings)
    audit.push(...r.audit)
  })
  return { blocks, warnings, audit }
}

// The 0-based line index each parsed block starts on, aligned 1:1 with
// parseSession(text).blocks. Lets a caller edit one block's header line in place
// (the preview's "escolher tipo" button) instead of re-serializing the whole
// session and reformatting text the coach hasn't finished with.
export function blockLineStarts(text) {
  const all = String(text ?? '').split(/\r?\n/).map((raw, i) => ({ raw, lineNo: i }))
  const groups = []
  let cur = []
  all.forEach(l => {
    if (normLine(l.raw)) cur.push(l)
    else if (cur.length) { groups.push(cur); cur = [] }
  })
  if (cur.length) groups.push(cur)

  const starts = []
  groups.forEach(g => {
    if (isRestOnlyGroup(g) && starts.length) return // folds into the block above
    starts.push(g[0].lineNo)
  })
  return starts
}

const DAY_MAP = new Map()
;[['domingo', 0], ['dom', 0], ['segunda-feira', 1], ['segunda feira', 1], ['segunda', 1], ['seg', 1],
  ['terca-feira', 2], ['terca feira', 2], ['terca', 2], ['ter', 2], ['quarta-feira', 3], ['quarta feira', 3], ['quarta', 3], ['qua', 3],
  ['quinta-feira', 4], ['quinta feira', 4], ['quinta', 4], ['qui', 4], ['sexta-feira', 5], ['sexta feira', 5], ['sexta', 5], ['sex', 5],
  ['sabado', 6], ['sab', 6]].forEach(([k, v]) => DAY_MAP.set(k, v))

export function matchDayHeader(raw) {
  const line = normLine(raw)
  if (!line) return null
  const m = line.match(/^([^(]+?)\s*(?:\(([^)]*)\))?$/)
  if (!m) return null
  const idx = DAY_MAP.get(normExName(m[1]))
  if (idx === undefined) return null
  return { dayIndex: idx, sessionName: (m[2] || '').trim() }
}

export function parseWeek(text, opts = {}) {
  const all = String(text ?? '').split(/\r?\n/).map((raw, i) => ({ raw, lineNo: i + 1 }))
  const days = []
  let cur = null, preamble = []
  all.forEach(l => {
    const d = matchDayHeader(l.raw)
    if (d) {
      cur = { ...d, lines: [], headerLineNo: l.lineNo, headerLine: normLine(l.raw) }
      days.push(cur)
    } else if (cur) cur.lines.push(l)
    else if (normLine(l.raw)) preamble.push(l)
  })

  const out = days.map(d => {
    const body = d.lines.map(l => l.raw).join('\n')
    const first = d.lines.length ? d.lines[0].lineNo : d.headerLineNo + 1
    const r = parseSession(body, opts)
    const shift = first - 1
    return {
      dayIndex: d.dayIndex, sessionName: d.sessionName, blocks: r.blocks,
      warnings: r.warnings.map(w => ({ ...w, lineNo: w.lineNo == null ? null : w.lineNo + shift })),
      audit: [{ lineNo: d.headerLineNo, kind: 'day', line: d.headerLine }]
        .concat(r.audit.map(a => ({ ...a, lineNo: a.lineNo + shift }))),
    }
  })
  if (out.length && preamble.length) {
    out[0].warnings.unshift(...preamble.map(l => ({ kind: 'preamble', line: normLine(l.raw), lineNo: l.lineNo, message: 'Linha antes do primeiro dia — ignorada' })))
    out[0].audit.unshift(...preamble.map(l => ({ lineNo: l.lineNo, kind: 'preamble', line: normLine(l.raw) })))
  }
  return out
}

// ── Serialize ─────────────────────────────────────────────────────────────────
// The coach writes gender loads grouped by SCALE (`60/45kg – 50/35kg` = RX pair,
// then Inter pair) while canonical `fmtIntensity` groups by GENDER (`M: 60/50 kg |
// F: 45/35 kg`). Different axis order, both correct for their surface — this is a
// deliberate divergence, do NOT "fix" fmtIntensity to match.
function loadStr(ins) {
  if (!ins || !ins.mode) return ''
  if (ins.mode === 'pct') return ins.pct ? `${ins.pct}%` : ''
  if (ins.mode === 'gender') {
    const unit = ins.Masculino_unit || ins.Feminino_unit || 'kg'
    const pairs = SCALE_ORDER
      .map(sc => [ins[`Masculino_${sc}`], ins[`Feminino_${sc}`]])
      .filter(([m, f]) => m || f)
      .map(([m, f]) => `${m || '-'}/${f || '-'}${unit}`)
    return pairs.join(' – ')
  }
  if (ins.mode === 'progression') {
    const steps = ins.steps || [], loads = steps.map(s => s.load).filter(Boolean)
    if (!loads.length) return ''
    const unit = steps[0]?.unit || '% do RM'
    return unit === '% do RM' ? `${loads.join('/')}%` : `${loads.join('/')}${unit}`
  }
  if (ins.mode === 'cardio') return '' // legacy; distance lives in dist/distUnit (#37)
  return ''
}

function volStr(ex) {
  if (ex.dist) return ex.sets ? `${ex.sets}x${ex.dist}${ex.distUnit || 'm'}` : `${ex.dist}${ex.distUnit || 'm'}`
  const reps = String(ex.reps || '').includes(',') ? String(ex.reps).split(',').map(s => s.trim()).join('-') : String(ex.reps || '')
  if (ex.sets && reps) return `${ex.sets}x${reps}`
  if (ex.sets) return `${ex.sets}x`
  return reps
}

export function serializeExercise(ex, { letter } = {}) {
  const pre = letter ? `${letter} ` : ''
  if (ex.name === 'Rest') return `${pre}Rest${ex.reps ? ` ${ex.reps}` : ''}`
  if (ex.isComplex) {
    const movs = (ex.complexMovements || []).map(mv => `${mv.reps || ''} ${mv.name || ''}`.trim())
    // Two-line form when the complex carries progression loads (the coach's own
    // shape); the inline `+` form otherwise.
    const load = loadStr(ex.intensity)
    if (ex.intensity?.mode === 'progression' && load) return `${movs.join('\n')}\n${load}`
    const head = ex.sets ? `${ex.sets}x${movs[0] || ''}` : movs[0] || ''
    return [pre + [head].concat(movs.slice(1)).join(' + '), load].filter(Boolean).join(' ')
  }
  return [pre + [volStr(ex), ex.name].filter(Boolean).join(' '), loadStr(ex.intensity)]
    .filter(Boolean).join(' ')
    .concat(ex.note ? ` (${ex.note})` : '')
}

function serializeStations(block) {
  const out = []
  ;(block.stations || []).forEach(st => {
    out.push([st.isRest ? 'Descanso' : st.name, st.duration].filter(Boolean).join(' '))
    ;(st.exercises || []).forEach(ex => out.push(serializeExercise(ex)))
  })
  return out
}

/**
 * @param {object} block
 * @param {object} [opts]  { header = true } — the per-block editor hides the header
 *                         line (the type is already chosen in the block bar).
 */
export function serializeBlock(block, opts = {}) {
  const { header = true } = opts
  const out = []
  const type = block.type || ''
  const label = block.label && block.label !== type ? block.label : ''
  if (header) {
    const h = block.typeUnresolved ? (block.label || '') : [type, label].filter(Boolean).join(' – ')
    if (h) out.push(h)
  }

  const exs = block.exercises || []
  const ladderShared = block.ladderMode && exs.length && exs.every(e => e.reps && e.reps === exs[0].reps) ? exs[0].reps : ''
  const st = []
  if (ladderShared) st.push(String(ladderShared).split(',').map(s => s.trim()).join('-'))
  if (block.rounds) st.push(`${block.rounds} rounds`)
  if (block.duration) st.push(CAP_TYPES.includes(type) ? `Cap ${block.duration}'` : `${block.duration}'`)
  if (st.length) out.push(st.join(' '))

  if (block.type === 'Estações') out.push(...serializeStations(block))
  else exs.forEach((ex, i) => {
    const e = ladderShared ? { ...ex, reps: '' } : ex
    out.push(serializeExercise(e, { letter: block.lettered ? String.fromCharCode(65 + i) : null }))
  })

  const goal = serializeGoal(block.goal)
  if (goal) out.push(`Meta: ${goal}`)
  if (block.zone && block.zone !== 'Zona 01') out.push(`Zona: ${block.zone}`)
  ;(block.notes || '').split('\n').filter(l => l.trim()).forEach(l => out.push(`Obs: ${l.trim()}`))
  return out.join('\n')
}

export function serializeSession(session) {
  return (session?.blocks || []).map(b => serializeBlock(b)).join('\n\n')
}
