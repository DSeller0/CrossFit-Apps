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
// zero-length cycle, or an interval block with no rounds to count to.
export function cycleEnd(cfg) {
  const { st, tt } = cycleOf(cfg)
  const len = st + tt
  if (len <= 0) return null
  if (cfg.intervalMode) return Number(cfg.rounds) > 0 ? Number(cfg.rounds) * len : null
  return (cfg.exercises || []).length * (cfg.rounds ?? 1) * len
}
