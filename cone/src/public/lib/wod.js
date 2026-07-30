export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export const WOD_TYPES = [
  'For Time',
  'AMRAP',
  'EMOM',
  'MetCon',
  'HIIT',
  'WOD',
  'Benchmark',
  'Estações',
]
export function isWodBlock(bl) {
  return WOD_TYPES.includes(bl.type) || WOD_TYPES.includes(bl.label)
}

// The WOD types a timer can drive — a semantic subset of WOD_TYPES, not derived
// from it (EMOM/AMRAP/For Time/Benchmark have a duration or cap; MetCon/HIIT/WOD/
// Estações don't map to a single timer shape). TvController.jsx and useTimer.js
// both hand-rolled this identically before consolidation.
export const TIMER_TYPES = ['For Time', 'AMRAP', 'EMOM', 'Benchmark']

export const BLOCK_FAMILY = {
  WOD: 'red',
  HIIT: 'red',
  MetCon: 'red',
  'For Time': 'amber',
  AMRAP: 'amber',
  EMOM: 'amber',
  Benchmark: 'amber',
  Estações: 'amber',
  Força: 'blue',
  LPO: 'blue',
  Core: 'blue',
  Acessórios: 'blue',
  Aquecimento: 'green',
  Skill: 'green',
  Cardio: 'green',
  Mobilidade: 'green',
}
const FAMILY_COLOR = { red: '#c84038', amber: '#d8a840', blue: '#4878d8', green: '#48b860' }
export function blkColor(bl) {
  return FAMILY_COLOR[BLOCK_FAMILY[bl.type] || BLOCK_FAMILY[bl.label]] || '#d8a840'
}

// ── Scales ────────────────────────────────────────────────────────────────────
// SCALE_COL is a DATA-COLOR family, deliberately exempt from tokenization —
// same precedent as the block families above: the color identifies the scale, so
// it must stay stable across all 4 themes rather than re-tint with the palette.
// Canonical since #51; it reconciles two diverged copies (Results.jsx assigned
// Inter orange, Athletes.jsx assigned it gold; Results' Adaptado red collided
// with the red block family and misread as an error state). One fallback grey
// replaces the three that existed (#666/#666/#888).
export const SCALES = ['RX', 'Inter', 'SC', 'Adaptado']
export const SCALE_COL = { RX: '#4ac8c0', Inter: '#e87820', SC: '#9070d8', Adaptado: '#a89880' }
export const SCALE_FALLBACK = '#808080'
export function scaleColor(sc) {
  return SCALE_COL[sc] || SCALE_FALLBACK
}

// Short form for tight, aligned columns (RankList's scale pill). "Adaptado" is
// twice the width of the other three, which forced its column wider and knocked
// that row's left edge out of line with the rest. The stored value is unchanged —
// this is display only; anywhere with room (the scale filter, the log form)
// still spells it out.
export const SCALE_SHORT = { RX: 'RX', Inter: 'Inter', SC: 'SC', Adaptado: 'Adap' }
export function scaleLabel(sc) {
  return SCALE_SHORT[sc] || sc
}

// A block's effective scale is its WEAKEST per-exercise scale: an athlete who
// scaled one movement did not do the WOD RX. Blocks logged before per-exercise
// scaling existed carry a flat blk.scale instead — fall back to it.
//
// ⚠️ Filter to rows that actually carry a `.scale` before checking length (#116).
// exerciseRows got its first real writer in #116 (ScoreFields.jsx's
// ExerciseNotesRows) — {exId, name, note}, deliberately with NO `.scale` field,
// specifically so this function stays dormant. But `rows.length` alone doesn't
// know that: a block with adaptation notes and no per-exercise scale ANYWHERE
// used to take the "has rows" branch anyway, and `SCALE_RANK[undefined] ?? 0`
// ranked every row below Adaptado — one adaptation note silently blanked a
// real RX/Inter/SC/Adaptado to '-' on every ranking, KPI and ScaleFilter.
// Caught live-verifying #116 against real prod-snapshot data, not by a test.
const SCALE_RANK = { RX: 4, Inter: 3, SC: 2, Adaptado: 1, '-': 0 }
const SCALE_NAMES = { 4: 'RX', 3: 'Inter', 2: 'SC', 1: 'Adaptado', 0: '-' }
export function deriveScale(blk) {
  const rows = (blk?.exerciseRows || []).filter(r => r.scale)
  if (!rows.length) return blk?.scale || '-'
  let min = 4
  rows.forEach(r => {
    const n = SCALE_RANK[r.scale] ?? 0
    if (n < min) min = n
  })
  return SCALE_NAMES[min]
}

// A block's result shape is time-based (mm:ss) vs rounds/reps-based. Benchmark
// WODs (Fran, Grace, Murph...) are almost always for-time — schedule.html's
// DeskRegPane/LogPane already treated them that way; #61(d) makes every other
// perf-shape branch (results.html, the SPA coach view, rankResults/perfStr)
// agree, so a Benchmark result stores/ranks/renders the same regardless of
// which page logged it.
// MetCon and HIIT added #117: blockModel.js's goalKindFor already gives both a TIME
// goal, while this function counted only For Time/Benchmark — so the coach's Meta:
// line showed a time target on a block the athlete logged (and this ranked) as
// rounds/reps. Measured blast radius: 1 prod entry re-ranks (rounds-scored, no
// time, so it sorts last either way).
export function isTimeBlock(blType) {
  return blType === 'For Time' || blType === 'Benchmark' || blType === 'MetCon' || blType === 'HIIT'
}

export function blkLabel(bl) {
  const l = bl.label && bl.label !== '-' ? bl.label : null,
    t = bl.type && bl.type !== '-' ? bl.type : null
  return l && t && l !== t ? `${l} · ${t}` : l || t || ''
}

// Block-meta "rounds · CAP" fragment — rounds-first, full word "rounds", "CAP"
// prefix. Canonical since #84 (was folder-scoped to results/resultsHelpers.js;
// ~10 other sites hand-rolled it with casing/order drift — "RDS"/"rds" instead
// of "rounds", duration-first on the TV wall, lowercase "Cap" on the index).
// blkMetaParts is the array form for callers that render each piece as its own
// chip (WodBlockCard) rather than one joined string.
export function blkMetaParts(bl) {
  const p = []
  if (bl.rounds) p.push(`${bl.rounds} rounds`)
  if (bl.duration) p.push(`CAP ${bl.duration}'`)
  return p
}
export function blkMeta(bl) {
  return blkMetaParts(bl).join(' · ')
}

// The coach's `Meta:` line as one display string (#10). `bl.goal` is the ONE new
// persisted block field — same shape the text parser emits (plans/36), written by
// the Criador's GoalInput:
//   { kind:'time',   min?:'MM:SS', max?:'MM:SS' }
//   { kind:'rounds', min?:number,  reps?:number }
//   { kind:'text',   text:string }
// One formatter, four render sites (WodBlockCard · schedule BlockDetail · TV
// BlockCard + TimerSlide) — do not hand-roll a fifth.
//
// Deliberately NOT the same function as textFormat.js's serializeGoal: that one
// emits the coach's ASCII notation and must survive a re-parse ("11-12'"), this
// one is display-only and uses a real en dash. Same data, different contracts.
export function goalStr(bl) {
  const g = bl?.goal
  if (!g) return ''
  const short = t => (t && /:00$/.test(t) ? `${t.slice(0, -3)}'` : t)
  if (g.kind === 'time') {
    if (g.min && g.max) {
      // A fixed goal is normally expressed by leaving max blank (the `return
      // short(g.min)` branch below) — but both ends equal is still reachable data
      // and must render as the single value, not a degenerate "14–14'" range.
      if (g.min === g.max) return short(g.min)
      // "11–12'" when both are whole minutes; "11:30–12:15" the moment either isn't.
      const whole = /:00$/.test(g.min) && /:00$/.test(g.max)
      return whole ? `${g.min.slice(0, -3)}–${g.max.slice(0, -3)}'` : `${g.min}–${g.max}`
    }
    if (g.max) return `sub ${short(g.max)}`
    return short(g.min) || ''
  }
  if (g.kind === 'rounds') {
    const r = g.min ? `${g.min} round${Number(g.min) === 1 ? '' : 's'}` : ''
    const x = g.reps ? `${g.reps} reps` : ''
    return [r, x].filter(Boolean).join(' + ')
  }
  return (g.text || '').trim()
}

// Compares a LOGGED result against the block's own `Meta:` goal (#117) — the badge
// behind "did this athlete beat/meet the coach's target". `bl` is a block-shaped
// object ({ goal }, the same argument `goalStr` takes — a real block or RankList's
// synthesized `{ type, goal }` both work since only `.goal` is read).
//
// Returns 'beat' | 'met' | 'missed' | null. null is reserved for "cannot honestly
// judge" — no goal, `kind:'text'`, or nothing logged yet. A DNF (capped, no
// perfTime) is a judgement against the goal, not an absence of one, so it always
// resolves to 'missed', never null.
export function goalOutcome(entry, bl) {
  const g = bl?.goal
  if (!g || g.kind === 'text') return null
  if (g.kind === 'time') {
    if (!g.min && !g.max) return null
    if (!entry.perfTime) {
      // A checkpoint (#112) or a legacy perfRounds-only row both mean "capped", not
      // "hasn't logged yet" — see the module comment above.
      return entry.checkpoint || entry.perfRounds ? 'missed' : null
    }
    const t = toSecs(entry.perfTime)
    if (g.min && g.max) {
      if (t < toSecs(g.min)) return 'beat'
      return t <= toSecs(g.max) ? 'met' : 'missed'
    }
    // One end only ("14:00" or "sub 12'") — hitting it IS the goal, no window to
    // land inside, so there's no 'met' state here.
    return t <= toSecs(g.min || g.max) ? 'beat' : 'missed'
  }
  if (g.kind === 'rounds') {
    if (!g.min && !g.reps) return null
    if (!entry.perfRounds && !entry.perfReps) return null
    const rd = parseInt(entry.perfRounds) || 0,
      rp = parseInt(entry.perfReps) || 0
    const gr = Number(g.min) || 0,
      gx = Number(g.reps) || 0
    if (rd !== gr) return rd > gr ? 'beat' : 'missed'
    return rp >= gx ? 'beat' : 'missed'
  }
  return null
}

// Timer/TV mode display label — Timer.jsx and tv/slides.jsx both hand-rolled
// this identically before consolidation.
export const MODE_LBL = {
  'For Time': 'FOR TIME',
  AMRAP: 'AMRAP',
  EMOM: 'EMOM',
  Benchmark: 'BENCHMARK',
  Estações: 'ESTAÇÕES',
}

// Progression rep scheme as one glanceable string, for surfaces (TV) that show
// a single line rather than ExRow's per-step grouped rows: "5×5" when the
// grouped steps share one rep count, "5-3-1" when the ladder varies per step.
function progRepsStr(ex) {
  const groups = groupProgressionSteps(ex)
  if (!groups.length) return ''
  if (groups.length === 1) {
    const reps = groups[0].reps
    if (!reps) return ''
    const sets = ex.intensity.steps.length
    return sets > 1 ? `${sets}×${reps}` : reps
  }
  return groups.map(g => g.reps || '?').join('-')
}

export function exVolStr(ex) {
  if (ex.dist) {
    const unit = ex.distUnit || 'm'
    if ((ex.name || '').toLowerCase().includes(String(ex.dist).toLowerCase())) return ''
    return ex.sets ? `${ex.sets}×${ex.dist}${unit}` : `${ex.dist}${unit}`
  }
  if (ex.intensity?.mode === 'cardio') {
    const val = ex.intensity?.cardioVal,
      unit = ex.intensity?.cardioUnit || 'm'
    if (!val) return ''
    return (ex.name || '').toLowerCase().includes(String(val).toLowerCase()) ? '' : `${val}${unit}`
  }
  if (!ex.reps && ex.intensity?.mode === 'progression') return progRepsStr(ex)
  const r = ex.reps || '',
    rd = r.includes(',')
      ? r
          .split(',')
          .map(x => x.trim())
          .join('-')
      : r
  return ex.sets && rd ? `${ex.sets}×${rd}` : rd
}

// Returns [] when ex has no steps. Callers that need a countable placeholder
// (round/checkbox key generation) pad it themselves — schedule/scheduleHelpers.js's
// progGroups() does this consistently for all of Schedule.jsx's interactive render
// paths (ExRow, the round-badge calc, and blockProgress) so a stepless progression
// exercise still gets one checkable row instead of silently vanishing (#44).
export function groupProgressionSteps(ex) {
  const steps = ex.intensity?.steps || [],
    groups = []
  steps.forEach(s => {
    const reps = s.reps || ex.reps || ''
    const g = groups.find(g => g.reps === reps)
    if (g) {
      if (s.load) g.loads.push(s.load)
    } else groups.push({ reps, loads: s.load ? [s.load] : [] })
  })
  return groups
}

// The exercises a REGISTER FORM shows for a block. Estações nests its exercises under
// stations rather than bl.exercises, so any consumer reading bl.exercises directly renders
// nothing for that type. Rest stations are dropped and notes stripped — the approved compact
// register-form treatment shows the prescription only (mockups/20-result-card-exerciselist.html).
//
// ⚠️ shared/WodBlockCard.jsx has a SIMILAR-LOOKING but deliberately different flattener: it
// KEEPS rest stations and tags each exercise with `_station` for display. Same shape, different
// contract — do not collapse them (checked #115, plans/52).
export function blockExercises(bl) {
  if (!bl) return []
  const exs =
    bl.type === 'Estações'
      ? (bl.stations || []).filter(st => !st.isRest).flatMap(st => st.exercises || [])
      : bl.exercises || []
  return exs.map(ex => ({ ...ex, note: undefined }))
}

export function toSecs(t) {
  if (!t) return Infinity
  const p = String(t).split(':')
  return p.length === 2
    ? (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0)
    : parseInt(t) || Infinity
}

export function fmtSecs(s) {
  const m = Math.floor(s / 60),
    r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

// mm:ss input mask — powers MaskedTimeInput (#54/C0). Keeps digits only (max 4 →
// up to 99:99, ample for a WOD cap) and fills seconds from the right as the coach
// types: '1'→'1', '123'→'1:23', '1234'→'12:34', '12:34'→'12:34'. A mask, not a
// validator — it never rejects impossible seconds, downstream toSecs() reads it.
export function maskMMSS(raw) {
  const d = String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 4)
  if (d.length <= 2) return d
  return d.slice(0, d.length - 2) + ':' + d.slice(d.length - 2)
}

// The half maskMMSS cannot cover (#115/plans/52). The mask fills from the RIGHT, so one or two
// digits are returned untouched — '14' stays '14', which toSecs then reads as 14 SECONDS. That
// is not hypothetical: 9 of 16 logged times in prod had no colon, including a bare '14' and '18'
// on For Time blocks (docs/reviews/115-results-audit.md).
//
// A bare number in a WOD time field means MINUTES. Applied on BLUR only, never on change —
// expanding while typing would fight the right-fill ('1' → '01:00' makes '1','2','3' → '1:23'
// unreachable). Anything already carrying a colon is left exactly as typed, and empty stays
// empty: this completes a value, it never invents one.
//
//   ''  → ''        '9'    → '09:00'
//   '14'→ '14:00'   '1:23' → '1:23'
export function expandMMSS(v) {
  const s = String(v ?? '').trim()
  if (!s || s.includes(':')) return s
  const d = s.replace(/\D/g, '')
  if (!d) return ''
  return `${d.padStart(2, '0')}:00`
}

export function rankResults(results, blType) {
  const isForTime = isTimeBlock(blType)
  return [...results].sort((a, b) => {
    if (isForTime) {
      const ta = toSecs(a.perfTime),
        tb = toSecs(b.perfTime)
      if (ta !== tb) return ta - tb
      if (ta !== Infinity) return 0
      // Both capped — a bare `Infinity - Infinity` is NaN, which Array.sort treats as
      // "equal", so every DNF used to tie regardless of how far each athlete actually got
      // (#112). The checkpoint (#112) breaks the tie by real progress: rounds completed,
      // then how far into the stopping exercise, then reps within it. A row logged before
      // #112 has no checkpoint — its perfRounds is read in checkpoint's place so an old
      // and a new DNF row still compare sanely against each other.
      const roundsOf = r =>
        r.checkpoint ? Number(r.checkpoint.roundsDone) || 0 : parseInt(r.perfRounds) || 0
      const exIdxOf = r => (r.checkpoint ? Number(r.checkpoint.exIdx) : -1)
      const exRepsOf = r => (r.checkpoint ? Number(r.checkpoint.exReps) || 0 : 0)
      const ra = roundsOf(a),
        rb = roundsOf(b)
      if (ra !== rb) return rb - ra
      const xa = exIdxOf(a),
        xb = exIdxOf(b)
      if (xa !== xb) return xb - xa
      return exRepsOf(b) - exRepsOf(a)
    }
    const ra = parseInt(a.perfRounds) || 0,
      rb = parseInt(b.perfRounds) || 0
    if (ra !== rb) return rb - ra
    return (parseInt(b.perfReps) || 0) - (parseInt(a.perfReps) || 0)
  })
}

export function perfStr(r, blType) {
  // For Time with no time but with rounds = capped before finishing. The three
  // Results copies rendered that as "N rds (DNF)" while this canonical one
  // returned '—', silently hiding the work a capped athlete actually did
  // (rankResults already sorts them last — toSecs('') is Infinity). Absorbed
  // here in #51 so every ranking surface agrees.
  if (isTimeBlock(blType)) {
    if (r.perfTime) return r.perfTime
    // The checkpoint (#112) carries more than perfRounds alone did — how many reps
    // into the stopping exercise, not just which round. Short enough for the TV wall:
    // "3 rds + 7 (DNF)", not the exercise name (that's LoggedResult's detail row).
    if (r.checkpoint) {
      const roundsDone = r.checkpoint.roundsDone ?? 0
      const exReps = Number(r.checkpoint.exReps) || 0
      return exReps > 0 ? `${roundsDone} rds + ${exReps} (DNF)` : `${roundsDone} rds (DNF)`
    }
    return r.perfRounds ? `${r.perfRounds} rds (DNF)` : '—'
  }
  const p = []
  if (r.perfRounds) p.push(`${r.perfRounds} rds`)
  if (r.perfReps) p.push(`${r.perfReps} reps`)
  return p.join(' + ') || '—'
}

// The DNF checkpoint's derived perfReps (#112) — sums the prescribed rep counts of the
// exercises BEFORE `exIdx` in the block, so "stopped at exercise 3, rep 7" becomes a real
// total instead of the coach guessing one. Returns null the moment any preceding exercise's
// reps isn't a plain integer — real prod reps are frequently a scheme ("21-15-9") or a
// dist/cal exercise with no reps at all, and fabricating a number that reads as data is the
// energy_level/#66 failure mode. On null the caller leaves perfReps a manual field.
export function repsBefore(bl, exIdx) {
  const exs = blockExercises(bl)
  let total = 0
  for (let i = 0; i < exIdx; i++) {
    const reps = String(exs[i]?.reps ?? '').trim()
    if (!/^\d+$/.test(reps)) return null
    total += parseInt(reps, 10)
  }
  return total
}

export function fmtIntensity(ins) {
  if (!ins?.mode) return null
  if (ins.mode === 'progression') {
    const steps = ins.steps || [],
      loads = steps.map(st => st.load).filter(Boolean)
    const unit = (steps[0]?.unit || '% RM').replace('% do RM', '% RM')
    return loads.length ? loads.join('/') + ' ' + unit : null
  }
  if (ins.mode === 'pct') return ins.pct ? ins.pct + '% RM' : null
  if (ins.mode === 'gender') {
    const p = []
    ;['Masculino', 'Feminino'].forEach(g => {
      const unit = ins[`${g}_unit`] || 'kg'
      const vals = ['RX', 'Inter', 'SC'].map(k => ins[`${g}_${k}`]).filter(Boolean)
      if (vals.length) p.push(`${g === 'Masculino' ? 'M' : 'F'}: ${vals.join('/')} ${unit}`)
    })
    return p.join(' | ') || null
  }
  return null
}
