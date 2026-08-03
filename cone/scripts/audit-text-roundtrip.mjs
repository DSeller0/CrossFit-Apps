// #121/#126/#127/#130 (plans/61·A) · Criador text-mode round-trip fidelity audit.
// Read-only, dry-run only, never writes. Run from cone/:
//   node scripts/audit-text-roundtrip.mjs            → table to stdout (markdown)
//   node scripts/audit-text-roundtrip.mjs --examples 5
//
// Text is supposed to be a *projection* of the canonical block model. This measures
// how lossy that projection actually is, against every block in live prod, one row
// per loss class. It is the acceptance instrument for plans/61·A: the review that
// raised these rows used scratch scripts that were deleted, so none of its numbers
// is re-derivable any other way.
//
// TWO passes, because the two directions break differently:
//   A · serialize → parse   (the week grid's ¶ Texto view, SessionTextPane's seed)
//   B · parse → (paste)     (the coach's own paste path — header-less text whose
//                            first line is an exercise, which `parseHeaderLine`
//                            claims as the block label)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import {
  serializeBlock,
  serializeSession,
  parseBlock,
  parseSession,
  normLine,
} from '../src/components/tabs/criador/textFormat.js'
import { normalizeCardioEx } from '../src/components/tabs/criador/blockModel.js'

const argv = process.argv.slice(2)
const N_EX = Number((argv.find(a => a.startsWith('--examples')) || '').split('=')[1] || 3) || 3

// ── prod client (anon read, same shape as scripts/audit-session-registry.mjs) ──
const env = readFileSync('./.env.production', 'utf8')
const get = k => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const sb = createClient(get('VITE_SUPABASE_URL'), get('VITE_SUPABASE_ANON_KEY'))
const { data: row, error } = await sb.from('sessions').select('value').eq('id', 1).maybeSingle()
if (error) throw error
const sessions = row?.value || {}

// ── Canonical comparable projection ───────────────────────────────────────────
// Everything the text grammar is *supposed* to carry, normalized so that only real
// losses show up as a diff: undefined/'' folded, numbers stringified, defaults filled
// the way the parser fills them, and legacy cardio pre-normalized (normalizeCardioEx
// is the canonical lazy migration — the projection's baseline, not a loss).
const S = v => (v === undefined || v === null ? '' : String(v))
const T = v => S(v).trim()
// Free-text fields go through the grammar's own normalization (whitespace collapse +
// curly quotes) before comparison — folding those is a recorded decision, not a loss.
const W = v => normLine(S(v))

function normIns(ins) {
  if (!ins || !ins.mode || ins.mode === 'none') return null
  if (ins.mode === 'pct') return T(ins.pct) ? { mode: 'pct', pct: T(ins.pct) } : null
  if (ins.mode === 'gender') {
    const o = { mode: 'gender' }
    for (const g of ['Masculino', 'Feminino'])
      for (const sc of ['RX', 'Inter', 'SC'])
        if (T(ins[`${g}_${sc}`])) o[`${g}_${sc}`] = T(ins[`${g}_${sc}`])
    if (Object.keys(o).length === 1) return null
    o.Masculino_unit = T(ins.Masculino_unit) || 'kg'
    o.Feminino_unit = T(ins.Feminino_unit) || 'kg'
    return o
  }
  if (ins.mode === 'progression') {
    // A step with no load carries nothing in text — not a loss, drop it both sides.
    const steps = (ins.steps || [])
      .filter(s => T(s?.load))
      .map(s => ({
        reps: W(s.reps).replace(/\s+/g, ''),
        load: T(s.load),
        unit: T(s.unit) || '% do RM',
      }))
    return steps.length ? { mode: 'progression', steps } : null
  }
  return { mode: ins.mode }
}

function normEx(e) {
  const x = normalizeCardioEx(e || {})
  const dist = T(x.dist)
  const o = {
    name: W(x.name),
    sets: T(x.sets),
    reps: W(x.reps),
    dist,
    distUnit: dist ? T(x.distUnit) || 'm' : 'm',
    note: W(x.note),
    intensity: normIns(x.intensity),
  }
  if (x.isComplex) {
    o.isComplex = true
    o.complexMovements = (x.complexMovements || []).map(m => ({
      name: W(m?.name),
      reps: W(m?.reps),
    }))
  }
  return o
}

function normGoal(g) {
  if (!g || typeof g !== 'object') return null
  const o = { kind: T(g.kind) || 'text' }
  for (const k of ['min', 'max', 'reps', 'text']) if (T(g[k])) o[k] = W(g[k])
  return Object.keys(o).length === 1 ? null : o
}

function normBlock(b) {
  const o = {
    type: T(b.type),
    // A label-less block serializes to its bare type and parses back with
    // label === type. That is the serializer's contract, not a loss.
    label: W(b.label) || T(b.type),
    zone: T(b.zone) || 'Zona 01',
    duration: T(b.duration),
    rounds: T(b.rounds),
    notes: S(b.notes).split('\n').map(W).filter(Boolean).join('\n'),
    ladderMode: !!b.ladderMode,
    lettered: !!b.lettered,
    goal: normGoal(b.goal),
    exercises: (b.exercises || []).map(normEx),
  }
  if (b.type === 'Estações' || b.stations)
    o.stations = (b.stations || []).map(st => ({
      name: W(st?.name),
      duration: T(st?.duration),
      isRest: !!st?.isRest,
      exercises: (st?.exercises || []).map(normEx),
    }))
  if (T(b.benchmarkRef)) o.benchmarkRef = T(b.benchmarkRef)
  if (b.stationRepeat != null) o.stationRepeat = T(b.stationRepeat)
  if (T(b.restBetweenCycles)) o.restBetweenCycles = T(b.restBetweenCycles)
  return o
}

// ── Path-level diff ───────────────────────────────────────────────────────────
// Every difference surfaces as a path, so a loss can never hide behind a class the
// audit forgot to look for — anything unattributed lands in `other-diff` by path.
function diffPaths(a, b, path = '', out = []) {
  const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a
  const tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b
  if (ta === 'array' && tb === 'array') {
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      diffPaths(a[i], b[i], `${path}[${i}]`, out)
    return out
  }
  if (ta === 'object' && tb === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
      diffPaths(a[k], b[k], path ? `${path}.${k}` : k, out)
    return out
  }
  if (a !== b) out.push({ path, a, b })
  return out
}

// ── Loss classes ──────────────────────────────────────────────────────────────
const CLASSES = [
  'cardio-volume',
  'goal-kind',
  'goal-reps',
  'type-drift',
  'first-line-eaten',
  'sets-rewrite',
  'duration-invented',
  'rounds-invented',
  'progression-reps',
  'progression-units',
  'ladder-off',
  'complex-name',
  'stations-lost',
  'benchmark-lost',
  'other-diff',
]
// Recorded and accepted:
// · `type-drift-flagged` — the type didn't survive, but the parse SAID so: the block comes
//   back `typeUnresolved` with a `type-unresolved` warning, so the preview shows its
//   "? escolher tipo" chip and one tap fixes it. plans/61·A A3 targets the SILENT half.
// · `first-line-ambiguous` — the block's first line is a bare name with no leading quantity
//   ("Diversos", "Isabel"). Undecidable by construction: that is the shape of a block label.
//   A4(b)'s rule is "leading quantity AND a name after it", and this is its complement.
// · `projection-shift` — the block changed but the TEXT is a fixed point, i.e. the coach's
//   own notation cannot tell the two block objects apart. Volume the coach typed into the
//   NAME field ("30\" HSW HOLD", "800m Run") moves into reps/dist; a name containing `+`
//   with quantities on both sides becomes a complex; a trailing "(…)" becomes the note.
//   Nothing is lost — the fields are re-attributed to the ones the grammar names. Text is
//   compared line-by-line through normLine, so whitespace collapse and curly quotes fold
//   too (the recorded normalization, CLAUDE.md "Criador text format").
// · `gender-units` — plans/61·A A11, blast radius zero, measured.
// · `interval-approximated` — plans/36's deliberate v1 limitation (no interval field).
const ACCEPTED = [
  'projection-shift',
  'complex-name-unnotatable',
  'ladder-vestigial',
  'type-drift-flagged',
  'first-line-ambiguous',
  'gender-units',
  'interval-approximated',
]

const exIdx = p => {
  const m = p.match(/^exercises\[(\d+)\]/)
  return m ? +m[1] : null
}

// A complex name the serializer deliberately refuses to emit, because the coach's `name`
// field holds free text ("5 Rounds", "C- 2x 1 Hang power +1 Low Squat") that would be read
// back as a header, a slot letter or part of the complex. plans/61·A A7's notation landed;
// these are values that are not names. Same guard as serializeExercise's.
const unnotatableName = n => !n || /[+:]/.test(n) || /^\d/.test(n)

function classify(path, raw, d) {
  const p = path.replace(/\[\d+\]/g, '[]')
  if (p === 'type') return 'type-drift'
  if (p === 'duration') return 'duration-invented'
  if (p === 'rounds') return 'rounds-invented'
  // `ladderMode:true` with no ladder-shaped reps anywhere carries nothing the notation can
  // express — the flag is vestigial, not a lost ladder.
  if (p === 'ladderMode')
    return (raw.exercises || []).some(e => /[,-]/.test(String(e?.reps || '')))
      ? 'ladder-off'
      : 'ladder-vestigial'
  if (p === 'benchmarkRef') return 'benchmark-lost'
  if (p === 'stations' || p.startsWith('stations[')) return 'stations-lost'
  if (p === 'stationRepeat' || p === 'restBetweenCycles') return 'stations-lost'
  if (p === 'goal' || p.startsWith('goal.')) return p.endsWith('.reps') ? 'goal-reps' : 'goal-kind'
  if (p.startsWith('exercises[]')) {
    const i = exIdx(path)
    const src = i == null ? null : (raw.exercises || [])[i]
    const tail = p.slice('exercises[].'.length)
    if (/^(dist|distUnit)$/.test(tail) && src?.intensity?.mode === 'cardio') return 'cardio-volume'
    // `sets` REWRITTEN is the loss A5 targets. `sets` INVENTED where there was none is the
    // grammar reading what the notation says (a coach-typed "2x " in the name, or a 3-step
    // load list under two movements = 3 sets) — same family as an invented reps/dist, which
    // have no named class either.
    if (tail === 'sets') return T(d?.a) ? 'sets-rewrite' : 'other-diff'
    if (tail === 'name' && src?.isComplex)
      return unnotatableName(W(src.name)) ? 'complex-name-unnotatable' : 'complex-name'
    if (tail === 'intensity.steps[].reps') return 'progression-reps'
    if (tail === 'intensity.steps[].unit') return 'progression-units'
    if (/^intensity\.(Masculino|Feminino)_unit$/.test(tail)) return 'gender-units'
  }
  return 'other-diff'
}

// ── Run ───────────────────────────────────────────────────────────────────────
// `est` counts the hits that sit inside an Estações block — 61·B's scope, not 61·A's, and
// the reason a class can read non-zero while A's own acceptance is met.
const hits = new Map(
  [...CLASSES, ...ACCEPTED].map(c => [c, { n: 0, est: 0, seen: new Set(), ex: [] }]),
)
let inStations = false
// The two path-keyed buckets are only diagnosable broken down by path.
const byPathHits = new Map()
const record = (cls, key, sample, path, bucket) => {
  const h = hits.get(cls)
  if (!h || h.seen.has(key)) return
  h.seen.add(key)
  h.n++
  if (inStations) h.est++
  if (h.ex.length < N_EX) h.ex.push(sample)
  if (path) {
    const m = byPathHits.get(bucket) || new Map()
    const e = m.get(path) || { n: 0, ex: [] }
    e.n++
    if (e.ex.length < N_EX) e.ex.push(sample)
    m.set(path, e)
    byPathHits.set(bucket, m)
  }
}

// normLine folds the whitespace and curly quotes the grammar already folds (a recorded
// decision, CLAUDE.md); `+` spacing goes with it — `A+B` and `A + B` are the same complex.
const normText = t =>
  String(t ?? '')
    .split('\n')
    .map(l => normLine(l).replace(/\s*\+\s*/g, ' + '))
    .filter(Boolean)
    .join('\n')

const drifts = []
let nSessions = 0,
  nBlocks = 0,
  nClean = 0,
  nDrift = 0,
  nRewritten = 0,
  nBlockCount = 0,
  numericGoalMin = 0

const allSessions = []
for (const [dateKey, arr] of Object.entries(sessions))
  for (const s of Array.isArray(arr) ? arr : []) allSessions.push({ dateKey, s })

for (const { dateKey, s } of allSessions) {
  nSessions++
  const blocks = s.blocks || []

  // Session-level: does the block COUNT survive at all?
  try {
    const back = parseSession(serializeSession({ blocks })).blocks
    if (back.length !== blocks.length) {
      nBlockCount++
      record(
        'other-diff',
        `count|${dateKey}|${s.id}`,
        `${dateKey} · ${blocks.length} blocos → ${back.length}`,
      )
    }
  } catch (e) {
    record(
      'other-diff',
      `throw|${dateKey}|${s.id}`,
      `${dateKey} · parseSession lançou: ${e.message}`,
    )
  }

  blocks.forEach((b, bi) => {
    nBlocks++
    const where = `${dateKey} #${bi} ${b.type || '(sem tipo)'}`
    inStations = b.type === 'Estações' || !!b.stations
    const bkey = `${dateKey}|${s.id}|${bi}`
    if (b.goal && typeof b.goal.min === 'number') numericGoalMin++

    // ── Pass A · serialize → parse ────────────────────────────────────────────
    let after, warnings
    try {
      const r = parseBlock(serializeBlock(b))
      after = r.block
      warnings = r.warnings
    } catch (e) {
      record('other-diff', `${bkey}|throw`, `${where} · lançou: ${e.message}`)
      return
    }
    if (warnings.some(w => w.kind === 'interval-approximated'))
      record(
        'interval-approximated',
        `${bkey}|interval`,
        `${where} · intervalo não-inteiro aproximado`,
      )

    // Does the TEXT SETTLE? The first application is the projection itself — it
    // canonicalizes `30M`→`30m`, `A+B`→`A + B`, volume typed into the name into the
    // reps/dist the grammar names. What must not happen is the notation continuing to
    // move: t2 !== t3 means the grammar disagrees with itself. So a block whose text is
    // stable can only differ in fields the coach's own notation cannot tell apart, and
    // its unattributed diffs are `projection-shift`. Named loss classes are attributed
    // regardless — a dropped volume leaves the text perfectly stable (that is #127).
    const t1 = serializeBlock(b)
    let t2 = '',
      t3 = ''
    let stable = false
    try {
      t2 = serializeBlock(after)
      t3 = serializeBlock(parseBlock(t2).block)
      stable = normText(t2) === normText(t3)
    } catch {
      /* keep false */
    }
    const fixedPoint = stable
    if (normText(t1) !== normText(t2)) nRewritten++
    if (!stable) {
      nDrift++
      // `--drift` prints the three generations, the only readable way to see WHY the
      // notation won't settle.
      if (argv.includes('--drift'))
        drifts.push(`\n### ${where}\n--- t1\n${t1}\n--- t2\n${t2}\n--- t3\n${t3}`)
    }

    const before = normBlock(b)
    const got = normBlock(after)
    const diffs = diffPaths(before, got)
    if (!diffs.length) nClean++
    const flagged = warnings.some(w => w.kind === 'type-unresolved')
    for (const d of diffs) {
      let cls = classify(d.path, b, d)
      if (cls === 'other-diff' && fixedPoint) cls = 'projection-shift'
      if (cls === 'type-drift' && flagged) cls = 'type-drift-flagged'
      const i = exIdx(d.path)
      const norm = d.path.replace(/\[\d+\]/g, '[]')
      const byPath = cls === 'other-diff' || cls === 'projection-shift'
      const unit = byPath ? `${norm}|${i ?? '-'}` : i == null ? '-' : i
      record(
        cls,
        `${bkey}|${cls}|${unit}`,
        `${where} · ${d.path}: ${JSON.stringify(d.a)} → ${JSON.stringify(d.b)}`,
        byPath ? norm : null,
        cls,
      )
    }

    // ── Pass B · the coach-paste path ─────────────────────────────────────────
    // Header-less text (what the coach actually types) re-parsed with no knownType:
    // parseHeaderLine claims the first line as the block label, so an exercise there
    // disappears with only a `type-unresolved` warning to show for it.
    try {
      const paste = serializeBlock(b, { header: false })
      if (paste.trim()) {
        const p = parseBlock(paste).block
        const beforeEx = before.exercises.filter(e => e.name || e.isComplex)
        const afterEx = (p.exercises || []).map(normEx).filter(e => e.name || e.isComplex)
        if (afterEx.length < beforeEx.length) {
          // Decidable only when the first line carries a leading quantity — a bare name is
          // exactly the shape of a block label and has no answer (see ACCEPTED above).
          const head = paste.split('\n')[0]
          const quantified = /^\s*[A-Z]?[\s).\-–]*\d/.test(head)
          record(
            quantified ? 'first-line-eaten' : 'first-line-ambiguous',
            `${bkey}|paste`,
            `${where} · ${beforeEx.length} → ${afterEx.length} ex · label virou "${p.label}"`,
          )
        }
      }
    } catch (e) {
      record('other-diff', `${bkey}|paste-throw`, `${where} · paste lançou: ${e.message}`)
    }
  })
}

// ── Report ────────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n)
const rows = [...CLASSES, ...ACCEPTED].map(c => [
  c,
  hits.get(c).n,
  hits.get(c).est,
  ACCEPTED.includes(c)
    ? 'aceito'
    : hits.get(c).n && hits.get(c).n === hits.get(c).est
      ? '61·B'
      : '',
])
const w = Math.max(...rows.map(r => r[0].length), 'classe'.length)

console.log(
  `\n# Criador text round-trip — ${allSessions.length} sessões · ${nBlocks} blocos (prod, ${new Date().toISOString().slice(0, 10)})\n`,
)
console.log(`| ${pad('classe', w)} | count | em Estações | nota |`)
console.log(`|${'-'.repeat(w + 2)}|-------|-------------|------|`)
for (const [c, n, est, note] of rows)
  console.log(`| ${pad(c, w)} | ${String(n).padStart(5)} | ${String(est).padStart(11)} | ${note} |`)
console.log(
  `\nblocos idênticos após ida-e-volta: **${nClean}/${nBlocks}** (${((nClean / nBlocks) * 100).toFixed(1)}%)` +
    ` · texto reescrito na 1ª aplicação: **${nRewritten}**` +
    ` · texto NÃO estabiliza (t2≠t3): **${nDrift}**` +
    ` · sessões cujo nº de blocos muda: **${nBlockCount}**` +
    ` · goals com \`min\` numérico em storage: **${numericGoalMin}**`,
)

for (const c of [...CLASSES, ...ACCEPTED]) {
  const h = hits.get(c)
  if (!h.n) continue
  console.log(`\n## ${c} (${h.n})`)
  h.ex.forEach(e => console.log(`- ${e}`))
  const m = byPathHits.get(c)
  if (m) {
    console.log(`\n### ${c} por caminho`)
    ;[...m.entries()]
      .sort((a, z) => z[1].n - a[1].n)
      .forEach(([p, e]) => {
        console.log(`\n**${p}** — ${e.n}`)
        e.ex.forEach(x => console.log(`- ${x}`))
      })
  }
}
if (argv.includes('--drift')) {
  console.log('\n# Blocos cujo texto não é ponto fixo')
  drifts.forEach(d => console.log(d))
}
console.log('')
