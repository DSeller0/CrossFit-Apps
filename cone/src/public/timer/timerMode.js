import { exVolStr, isWodBlock } from '../lib/wod.js'

// ── Timer modes (#228 · plans/99) ─────────────────────────────────────────────
// Timer.jsx used to branch on `cfg.blockType` at about twenty run-time sites, testing EMOM and
// AMRAP before Estações. That held while only a few WOD types reached the timer. An interval
// block of ANY type — and an EMOM that carries its own interval — needs the Estações CYCLE
// (work, then rest, round after round) instead, so which mode a config runs in has to be
// decided in one place, in one order. Pure on purpose: it is the timer's first unit-testable
// seam, and the clock itself (refs, tick, wake lock) stays where it is — that is #191's.
//
//   'cycle'  Estações, or any block with `intervalMode` — a fixed work + rest cycle, repeated
//   'emom'   an EMOM with no interval of its own — a minute at a time
//   'amrap'  AMRAP — counts the cap down
//   'up'     everything else — counts up, to the cap when there is one (a stopwatch when not)
//
// What a block MEANS beyond its mode rides on the config as flags, decided once in
// `timerConfigFor` (schedule/scheduleHelpers.js — the only place the block's type is read) so the
// Timer never has to ask (#242):
//
//   rotate  a cycle whose one pseudo-station is an EMOM with several movements: movement
//           `round % n` is the active one, as in a plain EMOM
//   laps    a cycle whose block is an AMRAP: the athlete counts rounds, so it keeps its LAP button
//           (and the finish screen's round count, and REGISTRAR's prefill, which read the splits)
export function timerMode(cfg) {
  const type = cfg?.blockType
  if (type === 'Estações' || cfg?.intervalMode) return 'cycle'
  if (type === 'EMOM') return 'emom'
  if (type === 'AMRAP') return 'amrap'
  return 'up'
}

// One work + rest cycle in seconds. `cycle` is at least 1, so a zero-length one cannot divide by
// zero when the clock is folded into it.
export function cycleOf(cfg) {
  const st = cfg?.stationTime ?? 45
  const tt = cfg?.transitionTime ?? 15
  return { st, tt, cycle: Math.max(st + tt, 1) }
}

// When a cycle-mode timer ends by itself, in seconds — or null when only FIM ends it: a
// zero-length cycle, an interval block with no rounds to count to, or a cycle with nothing in it
// (no stations, or no rounds) — the product is 0 and `e >= 0` would finish it at 00:00 (#242).
export function cycleEnd(cfg) {
  const { st, tt } = cycleOf(cfg)
  const len = st + tt
  if (len <= 0) return null
  const end = cfg.intervalMode
    ? Number(cfg.rounds) > 0
      ? Number(cfg.rounds) * len
      : null
    : (cfg.exercises || []).length * (cfg.rounds ?? 1) * len
  return end > 0 ? end : null
}

// ── Exercise rows ─────────────────────────────────────────────────────────────
// One movement as the timer prints it. A row reads through the shared volume formatter, so a
// distance comes first and a name that already says it is not repeated (`400m Run`, #242). `load`
// is only on a config saved before `timerExs` stopped passing it; it still prints.
export function exLabel(ex) {
  if (typeof ex === 'string') return ex
  // `timerExs` passes no intensity, so a progression row (sets, no reps) gives the formatter nothing
  // to print — keep the `5x` the timer always said for it.
  const vol =
    exVolStr({ ...ex, reps: ex.reps ? String(ex.reps) : '' }) || (ex.sets > 1 ? `${ex.sets}x` : '')
  const load = ex.load ? ex.load + (ex.unit || 'kg') : ''
  const detail = vol && load ? `${vol} @ ${load}` : vol || load
  return [ex.name || '', detail].filter(Boolean).join(' · ')
}

// ── The setup form ↔ the config (#242) ────────────────────────────────────────
// Timer.jsx seeds its cfg form from the last saved config, and INICIAR builds a config back from it.
// That used to be two hand-written halves that did not agree: a stopwatch's blank cap became 20'
// (`?? 20`), and the fields the form does not show — `intervalMode`, `loggable`, the flags, the
// block and session ids — were dropped, so a form nobody touched ran a different timer than the
// block's own. Both halves live here, pure, and the contract is the round trip:
//
//   cfgFromForm(formFromCfg(cfg), cfg)  deep-equals  cfg
//
// A field the user did not change keeps the config's own value verbatim (so `rounds: '3'` stays
// the string the block stored, and `timeCap: null` stays null). Changing the TYPE or the MOVEMENTS
// rebuilds from the form instead — the config no longer describes that block — and then the
// session/block ids are dropped and `loggable` is recomputed with the block rule (`isWodBlock`).

// An interval config's one pseudo-station IS the block, so the form lists its movements. Real
// Estações keeps one line per station: each string line is one station in cycle mode.
function exLines(cfg) {
  const exs = cfg?.exercises || []
  const list = cfg?.intervalMode ? exs.flatMap(e => e?.exercises ?? [e]) : exs
  return list.map(exLabel)
}

export function formFromCfg(cfg = {}) {
  return {
    type: cfg.blockType || 'For Time',
    cap: cfg.timeCap ?? '',
    rounds: cfg.rounds ?? '',
    label: cfg.blockLabel || '',
    exes: exLines(cfg).join('\n'),
    st: cfg.stationTime ?? 45,
    tt: cfg.transitionTime ?? 15,
    goal: cfg.goal ?? '',
    countdown: cfg.countdown ?? true,
  }
}

// The form's cap field → minutes (decimals kept) or null. A blank cap is NO cap — except where the
// mode counts DOWN from it (AMRAP, a plain EMOM): without one those show 00:00 and never start, so
// they keep the 20 the form always offered. The MODE decides, not the type: an interval EMOM is a
// cycle that ends on its rounds, its Duração only a tag, so blanking it must not invent one.
function capFromForm(raw, mode) {
  const n = parseFloat(String(raw ?? '').replace(',', '.'))
  if (n > 0) return n
  return mode === 'amrap' || mode === 'emom' ? 20 : null
}

// Lines as the textarea's text means them: trimmed, blanks dropped. A stray space or an empty line is
// not an edit, and must not rebuild an interval block into a stopwatch.
const normLines = s =>
  String(s ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

const FORM_TO_CFG = {
  cap: 'timeCap',
  rounds: 'rounds',
  label: 'blockLabel',
  st: 'stationTime',
  tt: 'transitionTime',
  goal: 'goal',
  countdown: 'countdown',
}

export function cfgFromForm(form, base = {}) {
  const seed = formFromCfg(base)
  const stVal = form.st === '' ? 45 : Number(form.st)
  const ttVal = form.tt === '' ? 15 : Number(form.tt)
  const exercises = normLines(form.exes)
  const rebuilt =
    form.type !== seed.type || exercises.join('\n') !== normLines(seed.exes).join('\n')
  const fields = {
    // a rebuilt config has no `intervalMode`, so its mode is the type's own; an untouched one keeps its
    timeCap: capFromForm(form.cap, timerMode(rebuilt ? { blockType: form.type } : base)),
    rounds: parseInt(form.rounds) || null,
    blockLabel: String(form.label ?? '').trim(),
    stationTime: isNaN(stVal) ? 45 : stVal,
    transitionTime: isNaN(ttVal) ? 15 : ttVal,
    goal: String(form.goal ?? '').trim(),
    countdown: form.countdown ?? true,
  }

  if (rebuilt) {
    return {
      blockType: form.type,
      ...fields,
      exercises,
      sessionId: null,
      sessionDate: null,
      athleteId: null,
      blockId: null,
      loggable: isWodBlock({ type: form.type }),
    }
  }

  const out = { ...base }
  for (const [formKey, cfgKey] of Object.entries(FORM_TO_CFG))
    if (String(form[formKey]) !== String(seed[formKey])) out[cfgKey] = fields[cfgKey]
  return out
}
