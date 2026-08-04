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
import { TYPE_CONFIG, goalKindFor, normalizeCardioEx } from './blockModel.js'

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
  'warm up': 'Aquecimento',
  warmup: 'Aquecimento',
  'warm-up': 'Aquecimento',
  aquec: 'Aquecimento',
  strength: 'Força',
  forca: 'Força',
  complex: 'LPO',
  olympic: 'LPO',
  weightlifting: 'LPO',
  levantamento: 'LPO',
  'for time': 'For Time',
  fortime: 'For Time',
  ft: 'For Time',
  tecnica: 'Skill',
  technique: 'Skill',
  conditioning: 'Cardio',
  aerobico: 'Cardio',
  abs: 'Core',
  abdominal: 'Core',
  accessory: 'Acessórios',
  acessorio: 'Acessórios',
  mobility: 'Mobilidade',
  alongamento: 'Mobilidade',
  stations: 'Estações',
  circuito: 'Estações',
  wod: WOD_PENDING,
  metcon: 'MetCon',
  'met con': 'MetCon',
}
export function resolveType(seg) {
  const k = normExName(seg)
  if (!k) return null
  return TYPE_KEY_INDEX.get(k) || TYPE_ALIASES[k] || null
}

// Types whose `duration` reads as a time cap rather than a fixed window. Only
// affects how the structure line is *written* — both forms parse back to duration.
const CAP_TYPES = ['For Time', 'Benchmark', 'MetCon', 'HIIT']

// A block is locked out of text mode when its exercises are not the coach's to type:
// a LINKED Benchmark's movements come from the benchmark definition, so round-tripping
// one through the grammar would rewrite an official WOD from a paraphrase of it.
// Estações was locked too until plans/61·B gave stations their own notation
// (`matchStationLine`) — it is editable now, and Benchmark is the only case left.
// serializeBlock still renders a locked block for the read-only week Texto view.
export function isTextEditable(block) {
  return !!block && !block.benchmarkRef
}

// ── Structure lines ───────────────────────────────────────────────────────────
const RE_LADDER = /^(\d+(?:\s*-\s*\d+)+)(?=\s|$)/
const RE_EVERY = /\b(?:a\s+cada|every)\s+(\d+)\s*'(?:\s*(\d+)\s*")?/i
const RE_ROUNDS = /\b(\d+)\s*(?:rounds?|rds?|sets?|voltas?|s[ée]ries?|ciclos?)\b/i
// Decimals on purpose: `block.duration` is a bare minutes NUMBER (#93), and prod holds
// values like 2.3 — without this the serialized `2.3'` reads back as a 3-minute cap
// with a stray "2." note.
const RE_CAP = /\b(?:tc|cap|time\s*cap)\s*(\d+(?:[.,]\d+)?)\s*(?::(\d{2})|')?/i
const RE_TIME = /\b(\d+(?:[.,]\d+)?)\s*'(?:\s*(\d{1,2})\s*")?/
const STRUCT_TYPES = [
  [/\bfor\s*time\b/i, 'For Time'],
  [/\bamrap\b/i, 'AMRAP'],
  [/\bemom\b/i, 'EMOM'],
  [/\bmetcon\b/i, 'MetCon'],
  [/\bhiit\b/i, 'HIIT'],
]

// Consumes every structure token it recognizes and hands back what it couldn't
// (`rest`). `consumed` says whether anything matched at all; `rest === ''` means the
// line was *purely* structure, which is what lets `Quem já faz tc 15'` stay a label
// (it consumes `tc 15'` but leaves "Quem ja faz" behind) while `5 Rounds For Time`
// is recognized as a headerless structure line.
export function parseStructure(raw) {
  let s = normLine(raw).replace(/[()]/g, ' ')
  const out = { rounds: '', duration: '', type: null, ladder: '', everySecs: null, consumed: false }
  const eat = m => {
    s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)
    out.consumed = true
  }
  let m
  if ((m = s.match(RE_LADDER))) {
    out.ladder = m[1].replace(/\s*-\s*/g, '-')
    eat(m)
  }
  if ((m = s.match(RE_EVERY))) {
    out.everySecs = +m[1] * 60 + +(m[2] || 0)
    eat(m)
  }
  if ((m = s.match(RE_ROUNDS))) {
    out.rounds = m[1]
    eat(m)
  }
  for (const [re, t] of STRUCT_TYPES) {
    if ((m = s.match(re))) {
      out.type = t
      eat(m)
      break
    }
  }
  if ((m = s.match(RE_CAP))) {
    out.duration = dec(m[1])
    eat(m)
  }
  if (!out.duration && (m = s.match(RE_TIME))) {
    out.duration = dec(m[1])
    eat(m)
  }
  out.rest = s.replace(/\s+/g, ' ').trim()
  return out
}

// ── Exercise lines ────────────────────────────────────────────────────────────
// A slot letter is either punctuated (`B) …`, `C - …`) or bare — and a BARE one has to
// be followed by a quantity, or the first word of every exercise starting with a lone
// capital is eaten as a letter (`V ups Alt` → slot V + "ups Alt", live on prod).
const RE_SLOT = /^([A-Z])(?:\s*[).\-–]\s*(?=\S)|\s+(?=\d))/
// ⚠️ Inside an Estações block `Descanso 1:00` is a rest STATION, not a Rest exercise —
// the station probe (matchStationLine) runs before this one for exactly that reason.
// The two forms stay distinguishable anyway: a rest exercise writes its duration in the
// coach's own `'`/`"` notation (`Rest 2'`), a station in the editor's mm:ss.
const RE_REST = /^(?:rest|descanso)\b\s*(.*)$/i
const RE_NOTE_PAREN = /\s*\(([^()]*)\)\s*$/
const RE_META = /^(?:meta|alvo|goal)\s*:\s*(.+)$/i
const RE_OBS = /^(?:obs|nota|note)\s*:\s*(.*)$/i
const RE_ZONA = /^zona\s*:\s*(.+)$/i
// Estações only (#121c · plans/61·B). `Ciclos:`/`Entre ciclos:` join the Meta:/Obs:/Zona:
// keyword family rather than riding on the header, for two concrete reasons: the header
// is split into type + label segments (HEADER_SPLIT) and a `×2` segment has no grammar
// there, and a bare `2 ciclos` is ALREADY claimed by RE_ROUNDS as `block.rounds`.
const RE_CICLOS = /^ciclos\s*:\s*(\d+)\s*$/i
const RE_ENTRE_CICLOS = /^entre\s+ciclos\s*:\s*(.*)$/i

const DIST_UNITS = '(m|km|cal|mi)'
const RE_Q_SETS_DIST = new RegExp(
  `^(\\d+)\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*${DIST_UNITS}(?![a-zA-Z])\\s*`,
  'i',
)
// `3x20"` — sets times a HOLD. Must be tried before the plain sets×reps form, which
// would otherwise take `3x 20` and leave the quote mark stranded on the name.
const RE_Q_SETS_HOLD = /^(\d+)\s*[x×]\s*(\d+\s*['"]{1,2})\s*/
const RE_Q_SETS_REPS = /^(\d+)\s*[x×]\s*(\d+)(?![a-zA-Z\d])\s*/
const RE_Q_SETS_ONLY = /^(\d+)\s*[x×]\s+/
const RE_Q_DIST = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*${DIST_UNITS}(?![a-zA-Z])\\s*`, 'i')
// `{1,2}` so the coach's doubled-apostrophe seconds (`20''`) survives whole.
const RE_Q_HOLD = /^(\d+\s*['"]{1,2})\s*/
const RE_Q_LADDER = /^(\d+(?:\s*-\s*\d+)+)\s+/
const RE_Q_REPS = /^(\d+)\s+/

// Trailing load, scanned right-to-left. `%` forms first so a percent ladder can
// never be mistaken for a gender pair; the gender pair requires a unit on its
// rightmost pair, which is what keeps `6 RMU /8 BMU / 10 C2B` off this path.
const RE_PROG_PCT_CONCAT = /(?:^|\s)((?:\d+(?:[.,]\d+)?%){2,})$/
const RE_PROG_PCT_SLASH = /(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)+)\s*%$/
const RE_PCT_ONE = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*%$/
const RE_GENDER_PAIR =
  /(?:^|[\s–—-])((?:\d+(?:[.,]\d+)?|-)\s*\/\s*(?:\d+(?:[.,]\d+)?|-))\s*(kg|lb|kgs|lbs)?\s*$/i
const RE_LOAD_LIST = /(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)*)\s*(kg|lb)s?\s*$/i

// `3x60kg / 2x70%` — the pair form, the one notation that carries PER-STEP reps and
// MIXED units (#121a). EVERY token carries its own unit, which is exactly what keeps it
// off `60/70/80kg` (one trailing unit) and off the gender pair (`–`-separated, and its
// halves carry no unit of their own). Tried first in takeLoad because it is the most
// specific of the load forms, not despite it.
const LOAD_UNIT = '(?:kgs?|lbs?|%)'
// A step's reps is digits and separators only (`2`, `2+1`, `21-15-9`) — never a word, or
// an exercise name would be read as one.
const STEP_REPS = '\\d[\\d+\\-,.]*'
const PAIR_TOK = `(?:${STEP_REPS}\\s*[x×]\\s*)?\\d+(?:[.,]\\d+)?\\s*${LOAD_UNIT}`
const RE_PROG_PAIRS = new RegExp(`(?:^|\\s)(${PAIR_TOK}(?:\\s*\\/\\s*${PAIR_TOK})+)\\s*$`, 'i')
const RE_PAIR_TOK = new RegExp(
  `^(?:(${STEP_REPS})\\s*[x×]\\s*)?(\\d+(?:[.,]\\d+)?)\\s*(${LOAD_UNIT})$`,
  'i',
)
const RE_STEP_REPS_OK = new RegExp(`^${STEP_REPS}$`)

const SCALE_ORDER = ['RX', 'Inter', 'SC']
// Steps usually carry no `reps` of their own: groupProgressionSteps falls back to
// ex.reps, and that is the shape IntensityInput writes until the coach overrides a
// single step. When they DO differ — or the units are mixed — the pair form
// (RE_PROG_PAIRS) carries both; this builder is the uniform case.
const progSteps = (loads, unit) => ({
  mode: 'progression',
  steps: loads.map(l => ({ reps: '', load: dec(l), unit })),
})
const stepUnit = u => (/^%$/.test(u) ? '% do RM' : u.toLowerCase().replace(/s$/, ''))

// Returns { intensity, rest } — `rest` is the line with the load removed.
function takeLoad(tail) {
  let m
  if ((m = tail.match(RE_PROG_PAIRS))) {
    const steps = m[1]
      .split('/')
      .map(t => t.trim().match(RE_PAIR_TOK))
      .filter(Boolean)
      .map(t => ({ reps: t[1] || '', load: dec(t[2]), unit: stepUnit(t[3]) }))
    if (steps.length > 1)
      return {
        intensity: { mode: 'progression', steps },
        rest: tail.slice(0, tail.length - m[0].length).trim(),
      }
  }
  if ((m = tail.match(RE_PROG_PCT_CONCAT))) {
    const loads = m[1].split('%').filter(Boolean)
    return {
      intensity: progSteps(loads, '% do RM'),
      rest: tail.slice(0, tail.length - m[0].length).trim(),
    }
  }
  if ((m = tail.match(RE_PROG_PCT_SLASH))) {
    const loads = m[1].split('/').map(x => x.trim())
    return {
      intensity: progSteps(loads, '% do RM'),
      rest: tail.slice(0, tail.length - m[0].length).trim(),
    }
  }
  if ((m = tail.match(RE_PCT_ONE))) {
    return {
      intensity: { mode: 'pct', pct: dec(m[1]) },
      rest: tail.slice(0, tail.length - m[0].length).trim(),
    }
  }
  // Gender pairs: RX first (leftmost), then Inter, then SC — the coach's own order.
  const pairs = []
  let s = tail,
    unit = null
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
    return {
      intensity: progSteps(loads, m[2].toLowerCase()),
      rest: tail.slice(0, tail.length - m[0].length).trim(),
    }
  }
  return { intensity: null, rest: tail }
}

// `+` makes a complex only when EACH side carries its own quantity — one decidable
// rule: `1 Hang Squat Snatch + 1 Squat Snatch` is a complex, `5 Inchworm + Push Up`
// is one exercise named "Inchworm + Push Up".
function splitComplex(name, leadReps) {
  if (!leadReps || !name.includes('+')) return null
  const parts = name
    .split('+')
    .map(p => p.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  const movs = [{ id: uid(), name: parts[0], reps: leadReps }]
  for (const p of parts.slice(1)) {
    const m = p.match(/^(\d+)\s+(.+)$/)
    if (!m) return null
    movs.push({ id: uid(), name: m[2].trim(), reps: m[1] })
  }
  return movs
}

const emptyParsedEx = () => ({
  id: uid(),
  name: '',
  sets: '',
  reps: '',
  dist: '',
  distUnit: 'm',
  intensity: null,
  note: '',
})

export function parseExerciseLine(raw) {
  const ex = emptyParsedEx()
  let s = normLine(raw)
  let hadSlot = false

  const slot = s.match(RE_SLOT)
  if (slot && !/^a\s+cada\b/i.test(s)) {
    hadSlot = true
    s = s.slice(slot[0].length)
  }

  const rest = s.match(RE_REST)
  if (rest) return { ex: { ...ex, name: 'Rest', reps: normLine(rest[1]) }, hadSlot, isRest: true }

  // `<nome>: <complexo>` — a complex's own name (ExerciseRow's "Nome do complexo",
  // dropped on every round trip until #121a). Claimed only when the remainder really
  // parses as a complex, so it can't fire on a plain exercise; Obs:/Meta:/Zona: are
  // matched on the line before this ever runs, so it can't collide with them either.
  const named = s.match(/^([^:]{1,60}?)\s*:\s+(?=\S)(.+)$/)
  if (named) {
    const inner = parseExerciseLine(named[2])
    if (inner.ex.isComplex)
      return { ex: { ...inner.ex, name: named[1].trim() }, hadSlot, isRest: false }
  }

  const note = s.match(RE_NOTE_PAREN)
  if (note) {
    ex.note = note[1].trim()
    s = s.slice(0, s.length - note[0].length).trim()
  }

  // A line that is ENTIRELY a load — the coach's bare load list — must not have its first
  // token eaten as a leading quantity: `3x55% / 3x65% / 3x70%` is three loads with per-step
  // reps, not "3 sets × 55 reps" followed by two.
  const bareLoad = (l => l.intensity && !l.rest)(takeLoad(s.trim()))

  let m,
    leadReps = ''
  if (bareLoad) {
    /* the whole line is the load; takeLoad below claims it */
  } else if ((m = s.match(RE_Q_SETS_DIST))) {
    ex.sets = m[1]
    ex.dist = dec(m[2])
    ex.distUnit = m[3].toLowerCase()
    s = s.slice(m[0].length)
  } else if ((m = s.match(RE_Q_SETS_HOLD))) {
    ex.sets = m[1]
    ex.reps = m[2].replace(/\s+/g, '')
    s = s.slice(m[0].length)
  } else if ((m = s.match(RE_Q_SETS_REPS))) {
    ex.sets = m[1]
    leadReps = ex.reps = m[2]
    s = s.slice(m[0].length)
  } else if ((m = s.match(RE_Q_SETS_ONLY))) {
    ex.sets = m[1]
    s = s.slice(m[0].length)
  } else if ((m = s.match(RE_Q_DIST))) {
    ex.dist = dec(m[1])
    ex.distUnit = m[2].toLowerCase()
    s = s.slice(m[0].length)
  } else if ((m = s.match(RE_Q_HOLD))) {
    leadReps = ex.reps = m[1].replace(/\s+/g, '')
    s = s.slice(m[0].length)
  } else if ((m = s.match(RE_Q_LADDER))) {
    leadReps = ex.reps = m[1].replace(/\s*-\s*/g, ',')
    s = s.slice(m[0].length)
  } else if ((m = s.match(RE_Q_REPS))) {
    leadReps = ex.reps = m[1]
    s = s.slice(m[0].length)
  }

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
  if (ex.distUnit === 'km' && ex.dist)
    return { ...ex, dist: String(Math.round(parseFloat(ex.dist) * 1000)), distUnit: 'm' }
  return ex
}

// ── Station lines ─────────────────────────────────────────────────────────────
// Estações is the one type whose exercises hang off STATIONS instead of the block, so
// inside one the top level of the text is a list of station headers, each followed by
// its own exercise lines. Two forms, both decidable, and only ever tried inside a block
// whose resolved type is Estações:
//
//   Grupo A 3:00   a name (possibly empty) + a trailing mm:ss duration
//   Grupo A:       a trailing colon, for a station that carries no duration
//
// ⚠️ The duration is **mm:ss only**. `'`/`"` are the exercise and structure notation and
// a station NAME can contain them — prod carries one called `AMRAP 3'30''`, whose own
// header would otherwise be read as a 3-minute cap (that is today's `duration-invented`).
// mm:ss is also exactly what `maskMMSS` writes into the field, so nothing is reformatted.
//
// A leading digit means the line is an exercise wearing a quantity (`15 Wall Ball 1:00`),
// never a station. Rest stations are marked by the WORD, since `isRest` changes how the
// station renders everywhere while a custom rest name (prod has none — the editor names
// them "Descanso" and renders an empty name as "Descanso") is cosmetic.
const RE_STATION_DUR = /^(.*?)\s*(\d{1,2}:\d{2})$/
const RE_STATION_BARE = /^(.*?):$/
const RE_STATION_REST = /^(?:rest|descanso)$/i

export function matchStationLine(raw) {
  const line = normLine(raw)
  if (!line) return null
  let m,
    name,
    duration = ''
  if ((m = line.match(RE_STATION_DUR))) {
    name = m[1].trim()
    duration = m[2]
  } else if ((m = line.match(RE_STATION_BARE))) {
    name = m[1].trim()
  } else return null
  if (/^\d/.test(name)) return null
  return { name, duration, isRest: RE_STATION_REST.test(name) }
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
  // `min` stays a STRING: GoalInput writes strings and goalOutcome coerces with
  // Number(), so a goal typed in Texto mode and one typed in Detalhado mode are the
  // same object — #110's type-mismatch family, not a behavior change.
  if ((m = s.match(/^(\d+)\s*(?:rounds?|rds?|voltas?)\b(?:\s*\+\s*(\d+)\s*reps?\b)?/i)))
    return { kind: 'rounds', min: m[1], ...(m[2] ? { reps: m[2] } : {}) }
  if ((m = s.match(/^(\d+)\s*reps?\b/i))) return { kind: 'rounds', reps: m[1] }
  const one = parseTimeToken(s)
  if (one && /['":]/.test(s)) return { kind: 'time', min: one }
  return { kind: 'text', text: s }
}

// `goalKindFor` makes the goal's shape a function of the block's TYPE (#10), and
// GoalInput:20 drops any goal whose kind doesn't match — so `Meta: sub 10'` on a Skill
// block was promoted to a time and then rendered as an EMPTY Meta field. One-directional
// on purpose: a parse can be demoted to the coach's own sentence, never promoted into a
// scoring axis the line doesn't carry.
function coerceGoal(goal, type, raw) {
  if (!goal) return undefined
  return goalKindFor(type) === 'text' && goal.kind !== 'text' ? { kind: 'text', text: raw } : goal
}

export function serializeGoal(goal) {
  if (!goal) return null
  if (goal.kind === 'rounds')
    return [
      goal.min === undefined || goal.min === '' ? '' : `${goal.min} rounds`,
      goal.reps ? `${goal.reps} reps` : '',
    ]
      .filter(Boolean)
      .join(' + ')
  if (goal.kind === 'time') {
    const short = t => (t && t.endsWith(':00') ? `${t.slice(0, -3)}'` : t)
    if (goal.min && goal.max) {
      const whole = goal.min.endsWith(':00') && goal.max.endsWith(':00')
      return whole
        ? `${goal.min.slice(0, -3)}-${goal.max.slice(0, -3)}'`
        : `${goal.min}-${goal.max}`
    }
    if (goal.max) return `sub ${short(goal.max)}`
    if (goal.min) return short(goal.min)
  }
  return goal.text || ''
}

// ── Block parse ───────────────────────────────────────────────────────────────
const HEADER_SPLIT = /\s*[–—]\s*|\s*:\s*|\s+\/\s+|\s+-\s+/

function emptyParsedBlock() {
  return {
    id: uid(),
    label: '',
    type: '',
    zone: 'Zona 01',
    duration: '',
    rounds: '',
    notes: '',
    ladderMode: false,
    exercises: [],
  }
}

// The one rule that separates a line that IS an exercise from a line that merely wears a
// number — used by both the header probe and the structure probe (#130).
//
// It needs a leading quantity and a name after it: `Quem já faz tc 15'` and `Isabel` have
// no quantity, so they stay the labels they are. And when the structure parse also
// consumed something, the two must cover the SAME span: in `50' Run` structure took `50'`
// and the exercise took `50'` too (leftover "Run" both ways) — it is a 50-second Run,
// not a 50-minute cap plus an orphan note. In `3 sets cada letra` structure took `3 sets`
// while the exercise could only take `3`, so it is a structure line with prose after it.
function isExerciseNotStructure(line, st) {
  const { ex } = parseExerciseLine(line)
  if (ex.isComplex) return true
  if (!ex.name || !(ex.reps || ex.dist || ex.sets)) return false
  if (!st?.consumed) return true
  // The structure tokens have to be a LEADING run, so what's left is the line's own tail.
  // `3x 20" Handstand Hold` leaves `3x " Handstand Hold` — an interior bite out of the
  // quantity, which means the line was never a structure line to begin with.
  if (!normLine(line).endsWith(st.rest)) return true
  return !!st.rest && ex.name === st.rest
}

// The first line of a group. Returns null when the line is not a header at all
// (`knownType` mode, or a line with a clear exercise shape).
function parseHeaderLine(raw, allowUnresolved) {
  const line = normLine(raw)
  if (!line) return null
  const segs = line
    .split(HEADER_SPLIT)
    .map(s => s.trim())
    .filter(Boolean)
  const first = resolveType(segs[0])
  const whole = parseStructure(line)

  if (!first) {
    if (whole.consumed && !whole.rest)
      return { type: whole.type, labelParts: [], struct: whole, pureStructure: true }
    if (!allowUnresolved) return null
    if (isExerciseNotStructure(line, whole)) return null
    return { type: null, labelParts: [line], struct: null, unresolved: true }
  }

  const out = {
    type: first === WOD_PENDING ? null : first,
    labelParts: [],
    struct: null,
    wodPending: first === WOD_PENDING,
  }
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
  rounds: a.rounds || b.rounds,
  duration: a.duration || b.duration,
  type: a.type || b.type,
  ladder: a.ladder || b.ladder,
  everySecs: a.everySecs ?? b.everySecs,
  consumed: true,
  rest: [a.rest, b.rest].filter(Boolean).join(' '),
})

/**
 * @param {string} text            one block's lines (no blank-line splitting done here)
 * @param {string|object} [opts]   a knownType string, or { knownType, registry, startLine }
 */
export function parseBlock(text, opts = {}) {
  const o = typeof opts === 'string' ? { knownType: opts } : opts || {}
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((l, i) => ({ raw: l, lineNo: (o.startLine || 1) + i }))
    .filter(l => normLine(l.raw))
  return buildBlock(lines, o)
}

function buildBlock(lines, o) {
  const block = emptyParsedBlock()
  const warnings = [],
    audit = [],
    noteLines = []
  const warn = (kind, l, message) =>
    warnings.push({ kind, line: normLine(l.raw), lineNo: l.lineNo, message })
  const note = l => {
    noteLines.push(normLine(l.raw))
  }

  let i = 0
  let head = null
  if (lines.length) {
    head = parseHeaderLine(lines[0].raw, !o.knownType)
    if (head) {
      audit.push({
        lineNo: lines[0].lineNo,
        kind: head.pureStructure ? 'structure' : 'header',
        line: normLine(lines[0].raw),
      })
      i = 1
    }
  }
  block.type = head?.type || o.knownType || ''
  if (head?.unresolved) block.typeUnresolved = true
  const labelParts = head?.labelParts || []
  // Station mode is a function of the resolved TYPE and can only be decided here: the
  // header is the sole place Estações can come from (STRUCT_TYPES has no entry for it,
  // so the struct-line resolution below can never turn a block INTO one).
  const stationMode = block.type === 'Estações'
  if (stationMode) block.stations = []
  let cycles = 0,
    restCycles = ''

  // Structure line: the line right after the header, unless the header WAS one.
  let struct = head?.struct || (head?.pureStructure ? head.struct || null : null)
  if (head?.pureStructure) struct = mergeStruct(struct || { rest: '' }, head.struct)
  // A keyword line is never the structure line, whatever numbers it carries — the body
  // loop below owns Meta:/Obs:/Zona:, and letting the probe have first refusal turned
  // `Meta: Corrida abaixo de 1'.` into a 1-minute duration plus a mangled note.
  const isKeywordLine = l =>
    RE_META.test(l) ||
    RE_OBS.test(l) ||
    RE_ZONA.test(l) ||
    RE_CICLOS.test(l) ||
    RE_ENTRE_CICLOS.test(l)
  // A station header is never the structure line either — `AMRAP 3'30'' 03:30` is a
  // station called `AMRAP 3'30''`, and letting the probe have first refusal is what
  // invented a 3-minute duration for it (prod, 2026-06-19).
  const isStationLine = l => stationMode && !!matchStationLine(l)
  if (
    !head?.pureStructure &&
    i < lines.length &&
    !isKeywordLine(normLine(lines[i].raw)) &&
    !isStationLine(lines[i].raw)
  ) {
    const st = parseStructure(lines[i].raw)
    // A structure line, unless the line is really an exercise wearing a number — that is
    // what turned `50' Run` into a 50-minute cap plus an orphan "Run" note and `2.3'`
    // into a 3-minute one (#130, #93 from a new direction).
    if (st.consumed && !isExerciseNotStructure(lines[i].raw, st)) {
      struct = struct ? mergeStruct(struct, st) : st
      audit.push({ lineNo: lines[i].lineNo, kind: 'structure', line: normLine(lines[i].raw) })
      if (st.rest) {
        noteLines.push(st.rest)
        warn('unparsed-line', lines[i], `"${st.rest}" mantido como nota`)
      }
      if (st.everySecs != null) {
        // v1 limitation, recorded deliberately: the block model has no interval
        // field, so "A cada 1'20"" can't round-trip exactly. Nearest EMOM shape +
        // the original line verbatim in notes — never invent a schema field here.
        noteLines.push(normLine(lines[i].raw))
        if (st.everySecs % 60)
          warn(
            'interval-approximated',
            lines[i],
            `Intervalo ${st.everySecs}s aproximado para ${Math.round(st.everySecs / 60)}'`,
          )
      }
      i++
    }
  }
  if (struct) {
    block.rounds = struct.rounds || ''
    block.duration =
      struct.duration ||
      (struct.everySecs != null ? String(Math.max(1, Math.round(struct.everySecs / 60))) : '')
    if (struct.ladder) {
      block.ladderMode = true
      block.ladderReps = struct.ladder.replace(/-/g, ',')
    }
    if (!block.type && struct.type) {
      block.type = struct.type
      delete block.typeUnresolved
    }
    if (!block.type && struct.everySecs != null) {
      block.type = 'EMOM'
      delete block.typeUnresolved
    }
  }
  // `WOD` is a section marker, not a format (TYPE_ALIASES → WOD_PENDING) — a bare one
  // with no structure line has no type YET, and a block whose first line turned out to be
  // an exercise never had a header at all. Both are "escolher tipo", not a silent '':
  // typeUnresolved now means exactly "this block has no format yet" (#121d).
  if (!block.type && !o.knownType) block.typeUnresolved = true
  // Warn only once the structure line has had its say: `Quem já faz !` followed by
  // `Emom 15'` resolves to EMOM, so warning at header-parse time cried wolf.
  if (block.typeUnresolved && lines.length)
    warn('type-unresolved', lines[0], 'Tipo de bloco não reconhecido — escolha um tipo')

  // Body
  let lettered = false
  // In station mode every exercise belongs to the station above it. `bucket()` is that
  // station (or the block itself outside station mode) and opens an unnamed one when an
  // exercise arrives before any station header, so a line can never fall on the floor.
  let curStation = null
  const peek = () => (stationMode ? curStation : block)
  const bucket = () => {
    if (!stationMode) return block
    if (!curStation) {
      curStation = { id: uid(), name: '', duration: '', isRest: false, exercises: [] }
      block.stations.push(curStation)
    }
    return curStation
  }
  for (; i < lines.length; i++) {
    const l = lines[i],
      line = normLine(l.raw)
    let m
    if ((m = line.match(RE_META))) {
      // The raw text rides along so the coercion has a faithful fallback to demote to.
      block.goal = coerceGoal(parseGoal(m[1]), block.type, normLine(m[1]))
      audit.push({ lineNo: l.lineNo, kind: 'meta', line })
      continue
    }
    if ((m = line.match(RE_OBS))) {
      noteLines.push(m[1])
      audit.push({ lineNo: l.lineNo, kind: 'note', line })
      continue
    }
    if ((m = line.match(RE_ZONA))) {
      block.zone = m[1].trim()
      audit.push({ lineNo: l.lineNo, kind: 'zone', line })
      continue
    }
    if (stationMode) {
      if ((m = line.match(RE_CICLOS))) {
        cycles = +m[1]
        audit.push({ lineNo: l.lineNo, kind: 'cycles', line })
        continue
      }
      if ((m = line.match(RE_ENTRE_CICLOS))) {
        restCycles = m[1].trim()
        audit.push({ lineNo: l.lineNo, kind: 'cycles', line })
        continue
      }
      // Before the exercise parse, so `Descanso 1:00` is the rest STATION it is.
      const stn = matchStationLine(line)
      if (stn) {
        curStation = { id: uid(), ...stn, exercises: [] }
        block.stations.push(curStation)
        audit.push({ lineNo: l.lineNo, kind: 'station', line })
        continue
      }
    }

    const { ex, hadSlot, isRest } = parseExerciseLine(line)
    if (hadSlot) lettered = true
    if (isRest) {
      bucket().exercises.push(ex)
      audit.push({ lineNo: l.lineNo, kind: 'rest', line })
      continue
    }

    const bare = !ex.name && !ex.isComplex
    if (bare && ex.intensity && !ex.sets && !ex.reps && !ex.dist) {
      // A bare load list. With 2+ load-free rep-based movements above it, this is
      // the coach's two-line complex (the Friday LPO block); with one, it's just
      // that exercise's progression. The highest-ambiguity rule in the grammar —
      // it always announces itself in `warnings` so the preview can offer an undo.
      const merged = applyBareLoadList(bucket(), ex.intensity)
      if (merged === 'complex')
        warn('complex-detected', l, 'Complexo detectado a partir da lista de cargas')
      else if (merged === 'none') {
        warn('orphan-load', l, 'Lista de cargas sem exercício acima — mantida como nota')
        note(l)
      }
      audit.push({ lineNo: l.lineNo, kind: 'load', line })
      continue
    }
    if (bare && (ex.sets || ex.reps || ex.dist || ex.intensity) && peek()?.exercises.length) {
      // Name-then-prescription: "Back Squat" / "5x5 65/70/75/80/85%".
      const exs = peek().exercises
      exs[exs.length - 1] = mergePrescription(exs[exs.length - 1], ex)
      audit.push({ lineNo: l.lineNo, kind: 'exercise', line })
      continue
    }
    if (bare) {
      warn('unparsed-line', l, 'Linha mantida como nota')
      note(l)
      audit.push({ lineNo: l.lineNo, kind: 'note', line })
      continue
    }

    bucket().exercises.push(ex)
    audit.push({ lineNo: l.lineNo, kind: 'exercise', line })
  }

  if (lettered) block.lettered = true
  if (block.ladderReps) {
    block.exercises = block.exercises.map(ex =>
      ex.reps || ex.dist || ex.isComplex ? ex : { ...ex, reps: block.ladderReps },
    )
    delete block.ladderReps
  }
  block.label = labelParts.join(' – ') || block.type || ''
  block.notes = noteLines.join('\n')
  if (stationMode) {
    // `1` is the default everywhere `stationRepeat` is read (`block.stationRepeat || 1`),
    // so the notation carries only a real repeat — same rule blockSummary's `×N` uses.
    block.stationRepeat = cycles || 1
    if (restCycles) block.restBetweenCycles = restCycles
    // Estações keeps its exercises under `stations`; `emptyBlock('Estações')` has no
    // `exercises` key at all and no consumer reads one (wod.js `blockExercises`).
    delete block.exercises
  }

  const allExercises = stationMode
    ? block.stations.flatMap(st => st.exercises || [])
    : block.exercises
  if (o.registry) {
    allExercises.forEach(ex => {
      const names = ex.isComplex ? (ex.complexMovements || []).map(mv => mv.name) : [ex.name]
      names.filter(Boolean).forEach(n => {
        if (n !== 'Rest' && !resolveExercise(n, o.registry)) {
          warnings.push({
            kind: 'unknown-exercise',
            line: n,
            lineNo: null,
            message: `"${n}" fora do registro de exercícios`,
          })
        }
      })
    })
  }
  return { block, warnings, audit }
}

// The two-line complex assist. Movements only ever carry name+reps, so a candidate
// must be rep-based and load-free — that keeps `100m Run` out of a complex.
// `holder` is whatever owns the exercise list: the block, or (in station mode) the
// station the lines are landing in.
function applyBareLoadList(holder, intensity) {
  const block = holder
  const exs = block.exercises
  const cand = []
  for (let k = exs.length - 1; k >= 0; k--) {
    const e = exs[k]
    if (e.isComplex || e.intensity || e.dist || !e.name || !/^\d+$/.test(String(e.reps || '')))
      break
    cand.unshift(k)
  }
  if (cand.length >= 2) {
    const movs = cand.map(k => ({ id: uid(), name: exs[k].name, reps: exs[k].reps }))
    const steps = intensity.steps || []
    block.exercises = exs.slice(0, cand[0]).concat([
      {
        ...emptyParsedEx(),
        isComplex: true,
        complexMovements: movs,
        sets: steps.length ? String(steps.length) : '',
        intensity,
      },
    ])
    return 'complex'
  }
  if (exs.length) {
    exs[exs.length - 1] = { ...exs[exs.length - 1], intensity }
    return 'single'
  }
  return 'none'
}

function mergePrescription(prev, add) {
  const out = { ...prev }
  if (add.sets) out.sets = add.sets
  if (add.reps) out.reps = add.reps
  if (add.dist) {
    out.dist = add.dist
    out.distUnit = add.distUnit
  }
  if (add.intensity) out.intensity = add.intensity
  return out
}

// ── Session / week parse ──────────────────────────────────────────────────────
const isRestOnlyGroup = lines =>
  lines.every(l => RE_REST.test(normLine(l.raw).replace(RE_SLOT, '')))

export function parseSession(text, opts = {}) {
  const all = String(text ?? '')
    .split(/\r?\n/)
    .map((raw, i) => ({ raw, lineNo: i + 1 }))
  const groups = []
  let cur = []
  all.forEach(l => {
    if (normLine(l.raw)) cur.push(l)
    else if (cur.length) {
      groups.push(cur)
      cur = []
    }
  })
  if (cur.length) groups.push(cur)

  const blocks = [],
    warnings = [],
    audit = []
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
  const all = String(text ?? '')
    .split(/\r?\n/)
    .map((raw, i) => ({ raw, lineNo: i }))
  const groups = []
  let cur = []
  all.forEach(l => {
    if (normLine(l.raw)) cur.push(l)
    else if (cur.length) {
      groups.push(cur)
      cur = []
    }
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
;[
  ['domingo', 0],
  ['dom', 0],
  ['segunda-feira', 1],
  ['segunda feira', 1],
  ['segunda', 1],
  ['seg', 1],
  ['terca-feira', 2],
  ['terca feira', 2],
  ['terca', 2],
  ['ter', 2],
  ['quarta-feira', 3],
  ['quarta feira', 3],
  ['quarta', 3],
  ['qua', 3],
  ['quinta-feira', 4],
  ['quinta feira', 4],
  ['quinta', 4],
  ['qui', 4],
  ['sexta-feira', 5],
  ['sexta feira', 5],
  ['sexta', 5],
  ['sex', 5],
  ['sabado', 6],
  ['sab', 6],
].forEach(([k, v]) => DAY_MAP.set(k, v))

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
  const all = String(text ?? '')
    .split(/\r?\n/)
    .map((raw, i) => ({ raw, lineNo: i + 1 }))
  const days = []
  let cur = null,
    preamble = []
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
      dayIndex: d.dayIndex,
      sessionName: d.sessionName,
      blocks: r.blocks,
      warnings: r.warnings.map(w => ({ ...w, lineNo: w.lineNo == null ? null : w.lineNo + shift })),
      audit: [{ lineNo: d.headerLineNo, kind: 'day', line: d.headerLine }].concat(
        r.audit.map(a => ({ ...a, lineNo: a.lineNo + shift })),
      ),
    }
  })
  if (out.length && preamble.length) {
    out[0].warnings.unshift(
      ...preamble.map(l => ({
        kind: 'preamble',
        line: normLine(l.raw),
        lineNo: l.lineNo,
        message: 'Linha antes do primeiro dia — ignorada',
      })),
    )
    out[0].audit.unshift(
      ...preamble.map(l => ({ lineNo: l.lineNo, kind: 'preamble', line: normLine(l.raw) })),
    )
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
    // ⚠️ ONE unit for both genders: a per-gender unit split has blast radius ZERO on
    // prod (0 of 78 gender-intensity exercises, measured #121a/C-1 and pinned in a test)
    // and giving it notation would destabilize the scale-vs-gender axis divergence above.
    // Recorded deliberately — do not "fix" this without re-measuring first.
    const unit = ins.Masculino_unit || ins.Feminino_unit || 'kg'
    const cells = SCALE_ORDER.map(sc => [ins[`Masculino_${sc}`], ins[`Feminino_${sc}`]])
    const last = cells.reduce((n, [m, f], i) => (m || f ? i : n), -1)
    if (last < 0) return ''
    // Pairs are POSITIONAL (RX · Inter · SC), so a missing middle scale has to hold its
    // slot with `-/-` — dropping it made an SC load read back as Inter (prod, 5 rows).
    return cells
      .slice(0, last + 1)
      .map(([m, f]) => `${m || '-'}/${f || '-'}${unit}`)
      .join(' – ')
  }
  if (ins.mode === 'progression') {
    const steps = (ins.steps || []).filter(s => s.load)
    if (!steps.length) return ''
    const u = s => ((s.unit || '% do RM') === '% do RM' ? '%' : s.unit)
    const rep = s => String(s.reps || '').replace(/\s+/g, '')
    const mixedUnits = new Set(steps.map(s => s.unit || '% do RM')).size > 1
    // Reps ride along only when every one of them is expressible — a step whose reps is
    // free text has no notation here and would come back as part of the exercise name.
    const anyReps =
      steps.some(s => rep(s)) && steps.every(s => !rep(s) || RE_STEP_REPS_OK.test(rep(s)))
    // The pair form is the only one that carries per-step reps and mixed units; the
    // plain list stays the default so nothing the coach already writes changes shape.
    if (mixedUnits || anyReps)
      return steps.map(s => `${anyReps && rep(s) ? `${rep(s)}x` : ''}${s.load}${u(s)}`).join(' / ')
    return `${steps.map(s => s.load).join('/')}${u(steps[0])}`
  }
  // Defensive only: serializeExercise runs normalizeCardioEx first, so a legacy cardio
  // exercise's distance is already in dist/distUnit by the time this sees it (#37/#127).
  if (ins.mode === 'cardio') return ''
  return ''
}

function volStr(ex) {
  if (ex.dist)
    return ex.sets
      ? `${ex.sets}x${ex.dist}${ex.distUnit || 'm'}`
      : `${ex.dist}${ex.distUnit || 'm'}`
  const reps = String(ex.reps || '').includes(',')
    ? String(ex.reps)
        .split(',')
        .map(s => s.trim())
        .join('-')
    : String(ex.reps || '')
  if (ex.sets && reps) return `${ex.sets}x${reps}`
  if (ex.sets) return `${ex.sets}x`
  return reps
}

export function serializeExercise(ex, { letter } = {}) {
  // Legacy `intensity.mode:'cardio'` carried the distance in the load slot (#37) — run
  // it through the canonical lazy normalizer rather than hand-rolling a fallback in
  // volStr, or `5m HSW` serializes to a bare `HSW` (#127, 41 prod exercises).
  const x = normalizeCardioEx(ex)
  // A bare slot letter needs a quantity after it to read back as one (RE_SLOT), so an
  // exercise that starts with a word takes the punctuated form instead.
  const withLetter = body => (letter ? `${letter}${/^\d/.test(body) ? '' : ')'} ${body}` : body)
  if (x.name === 'Rest') return withLetter(`Rest${x.reps ? ` ${x.reps}` : ''}`)
  // A note is ONE line: an embedded newline splits the exercise in two on the way back,
  // and a second line beginning `Meta:` is then eaten as the block's goal (live on prod).
  const note = String(x.note || '')
    .replace(/\s*\n\s*/g, ' ')
    .trim()
  const tail = note ? ` (${note})` : ''
  const movs = x.isComplex
    ? (x.complexMovements || []).map(mv => `${mv.reps || ''} ${mv.name || ''}`.trim())
    : []
  // A "complex" with fewer than two real movements is a hollow one (prod has them: the
  // flag was set, the movement rows left blank) — serialize it as the plain exercise it
  // effectively is, or the whole row is emitted as blank lines and disappears.
  if (movs.filter(Boolean).length >= 2) {
    const load = loadStr(x.intensity)
    // A complex's own name only gets the `<nome>:` prefix when it can't be read back as
    // anything else. Prod's `name` field holds free text as often as a real name ("5
    // Rounds", "C- 2x 1 Hang power +1 Low Squat"), and emitting THAT ahead of a colon
    // makes the line ambiguous with a header, a slot letter and the complex itself.
    const raw = String(x.name || '').trim()
    const name =
      raw && !/[+:]/.test(raw) && !/^\d/.test(raw) && !parseStructure(raw).consumed ? raw : ''
    const steps =
      x.intensity?.mode === 'progression' ? (x.intensity.steps || []).filter(s => s.load) : []
    // splitComplex only reads the inline form back as a complex when EVERY movement
    // carries its own reps.
    const inlineOk = movs.length >= 2 && movs.every(m => /^\d/.test(m))
    // The coach's own two-line shape carries none of `sets`, the complex name or a note —
    // so it is used only when there is none of the three to lose. `sets` in particular
    // came back rewritten to the step count on every round trip (#130, 15 prod rows).
    const twoLine =
      !!load &&
      !!steps.length &&
      !raw &&
      !note &&
      (!x.sets || String(x.sets) === String(steps.length))
    if (twoLine || !inlineOk) return withLetter(movs.join('\n') + (load ? `\n${load}` : '')) + tail
    const head = x.sets ? `${x.sets}x${movs[0]}` : movs[0]
    const body = [[head].concat(movs.slice(1)).join(' + '), load].filter(Boolean).join(' ')
    return withLetter(name ? `${name}: ${body}` : body) + tail
  }
  return (
    withLetter(
      [[volStr(x), x.name].filter(Boolean).join(' '), loadStr(x.intensity)]
        .filter(Boolean)
        .join(' '),
    ) + tail
  )
}

// The station half of an Estações block (#121c · plans/61·B) — see matchStationLine for
// the two header forms and why the duration is mm:ss only.
function serializeStations(block) {
  const out = []
  const rep = Number(block.stationRepeat || 1)
  if (rep > 1) out.push(`Ciclos: ${rep}`)
  const rest = String(block.restBetweenCycles || '').trim()
  if (rest) out.push(`Entre ciclos: ${rest}`)

  const sts = block.stations || []
  // The type was switched to Estações before any station was built: emit whatever
  // exercises the block still carries rather than an empty block, and let them come
  // back under one unnamed station. Prod has no such block — this is the safety net
  // that keeps a mid-switch block from serializing to nothing.
  if (!sts.length)
    return out.concat(
      (block.exercises || []).map(ex => serializeExercise(ex)).filter(l => l.trim()),
    )

  sts.forEach(st => {
    // The rest marker is the WORD: `isRest` changes how the station renders everywhere,
    // a custom rest name does not (BlockDetail renders `st.name || 'Descanso'`, and the
    // editor names every rest station "Descanso"). So a rest station is always written
    // out as one, and a hand-named one — prod has none — reads back as its name.
    const name = st.isRest ? 'Descanso' : String(st.name || '').trim()
    const dur = String(st.duration || '').trim()
    out.push(dur ? `${name} ${dur}`.trim() : `${name}:`)
    ;(st.exercises || []).forEach(ex => {
      const line = serializeExercise(ex)
      // A blank editor row carries nothing — and an empty LINE would split the block in
      // two on the way back (prod 2026-07-06: 7 blocks came back as 8).
      if (line.trim()) out.push(line)
    })
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
    // Keyed on the TYPE, not on `typeUnresolved`: a block imported from text and then
    // given a type in the block bar keeps a stale `typeUnresolved:true` in storage, and
    // honouring it silently dropped the type it now has (prod, 2026-08-03 Core).
    const h = type ? [type, label].filter(Boolean).join(' – ') : String(block.label || '').trim()
    if (h) out.push(h)
  }

  const exs = block.exercises || []
  // A ladder line is emitted whenever the block IS one and SOME exercise carries the
  // scheme — not just the first, which on prod is routinely a distance row with no reps
  // at all. Reps are then stripped only from the exercises that actually share it, so a
  // MIXED ladder no longer loses `ladderMode` on the way back (#121a, 5 prod blocks) —
  // buildBlock's fill only touches exercises with no reps and no distance of their own.
  const ladderShared = block.ladderMode
    ? String(exs.find(e => /[,-]/.test(String(e?.reps || '')))?.reps || '')
    : ''
  const st = []
  if (ladderShared)
    st.push(
      String(ladderShared)
        .split(',')
        .map(s => s.trim())
        .join('-'),
    )
  if (block.rounds) st.push(`${block.rounds} rounds`)
  if (block.duration)
    st.push(CAP_TYPES.includes(type) ? `Cap ${block.duration}'` : `${block.duration}'`)
  if (st.length) out.push(st.join(' '))

  if (block.type === 'Estações') out.push(...serializeStations(block))
  else
    exs.forEach((ex, i) => {
      const e = ladderShared && String(ex.reps) === ladderShared ? { ...ex, reps: '' } : ex
      out.push(
        serializeExercise(e, { letter: block.lettered ? String.fromCharCode(65 + i) : null }),
      )
    })

  const goal = serializeGoal(block.goal)
  if (goal) out.push(`Meta: ${goal}`)
  if (block.zone && block.zone !== 'Zona 01') out.push(`Zona: ${block.zone}`)
  ;(block.notes || '')
    .split('\n')
    .filter(l => l.trim())
    .forEach(l => out.push(`Obs: ${l.trim()}`))
  return out.join('\n')
}

export function serializeSession(session) {
  return (session?.blocks || []).map(b => serializeBlock(b)).join('\n\n')
}

// ── Locked passthrough (plans/61·B) ───────────────────────────────────────────
// The session pane hands the coach ONE textarea for a whole session, so a block the
// grammar can't express (a linked Benchmark) has to survive it byte-identical rather
// than being rewritten from a paraphrase of itself. Split the session into the text
// half and a LAYOUT that remembers where the locked ones sat; `mergeLockedBlocks` puts
// them back at their own index however much the text changed in between.
// Pure and unit-testable on purpose — the pane stays thin.
export function splitLockedBlocks(blocks) {
  const list = blocks || []
  const layout = list.map(b =>
    isTextEditable(b) ? { kind: 'text' } : { kind: 'locked', block: b },
  )
  const warnings = list
    .filter(b => !isTextEditable(b))
    .map(b => ({
      kind: 'block-locked',
      line: b.benchmarkRef || b.label || b.type || '',
      lineNo: null,
      message: `"${b.benchmarkRef || b.label || b.type}" não é editável em texto — preservado`,
    }))
  return { text: serializeSession({ blocks: list.filter(isTextEditable) }), layout, warnings }
}

// Parsed blocks fill the `text` slots in order; a locked block anchors AFTER the text
// block it followed, so adding or removing blocks in the textarea leaves it where it is.
// Blocks the coach added beyond the original count land at the end.
export function mergeLockedBlocks(parsedBlocks, layout) {
  const parsed = parsedBlocks || []
  const out = []
  let i = 0
  for (const slot of layout || []) {
    if (slot.kind === 'locked') out.push(slot.block)
    else if (i < parsed.length) out.push(parsed[i++])
  }
  while (i < parsed.length) out.push(parsed[i++])
  return out
}
