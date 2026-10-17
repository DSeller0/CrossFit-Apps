import { groupProgressionSteps, progressionGroupUnit, isWodBlock, intervalOf } from '../lib/wod.js'
import { normExName } from '../lib/registry.js'

// Shared by Schedule.jsx and its extracted schedule/ components (#17) — one
// canonical copy so extraction can't drift the same helper two ways.
//
// `LOG_SCALES` (an alias for SCALES) was removed in #115: both its consumers now render the
// shared ScaleRow, and a re-export that only renamed the canonical constant was one more
// place a fifth scale list could have grown.

export function isRoundBlock(bl) {
  return !isWodBlock(bl) && Number(bl.rounds) > 0
}

// A progression exercise with zero intensity.steps still needs one countable
// row/checkbox slot in the interactive schedule view (so it can be checked off
// like any other exercise) — pad the canonical [] to one placeholder group here,
// consistently, for every Schedule.jsx consumer.
export function progGroups(ex) {
  const g = groupProgressionSteps(ex)
  return g.length ? g : [{ reps: '', loads: [] }]
}

// Is this exercise's load prescribed as a percentage of the athlete's RM? The one rule behind
// "this row gets an RM chip" (ExRow) and "pre-fill its RM from the athlete's PRs"
// (Schedule.jsx autofillRm) — so a row that has nothing to compute from an RM never offers one:
// a plain `75%`, or a progression with at least one loaded `% RM` group. A kg progression
// (`60/70/80 kg`), a gender load and a loadless progression all say no (#209 · #231).
export function usesRm(ex) {
  const ins = ex?.intensity
  if (ins?.mode === 'pct') return !isNaN(parseFloat(ins.pct))
  if (ins?.mode === 'progression')
    return groupProgressionSteps(ex).some(
      g => g.loads.length > 0 && progressionGroupUnit(ex, g.reps) === '% RM',
    )
  return false
}

// The kg an athlete lifts for a list of %-of-RM steps, in their own RM unit: ceil, so 75% of 85 kg
// reads 64 kg and never under-loads the bar. '' when there is no RM or nothing to compute.
export function calcFromRm(exRm, pcts) {
  if (!exRm?.rm || !pcts.length) return ''
  return pcts.map(p => Math.ceil((exRm.rm * p) / 100)).join('/') + ' ' + (exRm.unit || 'kg')
}

export function parseDurMins(d) {
  if (!d) return 0
  const p = String(d).trim()
  if (p.includes(':')) {
    const [m, s] = p.split(':').map(n => parseInt(n) || 0)
    return m + s / 60
  }
  return parseInt(p) || 0
}

// ── Block → timer config (#228 · plans/99) ────────────────────────────────────
// The block half of `openTimer`: WHAT to time, never who is timing it — the session and athlete
// ids and the localStorage hand-off stay in Schedule.jsx. Pure, so each row below is a test.
//
//   Estações                  its stations, as always
//   a valid A cada, any type  the Estações CYCLE, reused rather than a second engine: one pseudo-
//                             station named after the block · `stationTime` the work time (or the
//                             whole interval) · `transitionTime` the rest (or 0) · `rounds` = Rounds,
//                             else the rounds that fit Duração, else null — and null runs until FIM
//   anything else             the block's own type drives it: a WOD type as it always did; any other
//                             type counts up, to its Duração when it has one, as a stopwatch when not
//
// `loggable` is whether the timer's REGISTRAR may offer to log a result. Only a WOD block can be
// logged — `doOpenLog` on schedule.html knows no other — so a Força timer must not offer it.
const timerExName = e =>
  e.isComplex
    ? e.name ||
      (e.complexMovements || [])
        .map(m => m.name)
        .filter(Boolean)
        .join(' + ')
    : e.name
const timerExs = exs =>
  (exs || [])
    .filter(e => e.name || e.isComplex)
    .map(e => ({ name: timerExName(e), sets: e.sets, reps: e.reps }))

export function timerConfigFor(bl) {
  const base = {
    blockType: bl.type || bl.label,
    blockLabel:
      bl.label && bl.label !== bl.type && bl.label !== '-'
        ? bl.label
        : bl.label || bl.type || 'WOD',
    timeCap: bl.duration ? parseInt(bl.duration) : null,
    rounds: bl.rounds || bl.stationRepeat || null,
    blockId: bl.id,
    countdown: true,
    loggable: isWodBlock(bl),
  }

  if (bl.type === 'Estações') {
    const nonRest = (bl.stations || []).filter(st => !st.isRest)
    const rest = (bl.stations || []).filter(st => st.isRest)
    return {
      ...base,
      exercises: nonRest.map(st => ({
        name: st.name || 'Grupo',
        exercises: timerExs(st.exercises),
      })),
      stationTime: nonRest[0]?.duration ? Math.round(parseDurMins(nonRest[0].duration) * 60) : 45,
      transitionTime: rest[0]?.duration ? Math.round(parseDurMins(rest[0].duration) * 60) : 15,
    }
  }

  const exercises = timerExs(bl.exercises)
  const iv = intervalOf(bl)
  if (iv) {
    const fit = Math.floor(((base.timeCap || 0) * 60) / iv.every)
    return {
      ...base,
      intervalMode: true,
      exercises: [{ name: base.blockLabel, exercises }],
      stationTime: iv.work ?? iv.every,
      transitionTime: iv.rest ?? 0,
      rounds: Number(bl.rounds) > 0 ? Number(bl.rounds) : fit > 0 ? fit : null,
    }
  }
  return { ...base, exercises, stationTime: 45, transitionTime: 15 }
}

export function stationsCapMins(bl) {
  const sts = bl.stations || [],
    cycM = sts.reduce((t, s) => t + parseDurMins(s.duration), 0)
  const last = sts[sts.length - 1],
    lastRest = last?.isRest ? parseDurMins(last.duration) : 0
  const rep = bl.stationRepeat || 1,
    betM = parseDurMins(bl.restBetweenCycles)
  const tot = cycM * rep + Math.max(0, rep - 1) * betM - lastRest
  return tot > 0 ? Math.round(tot) : 0
}

export function extractYtId(url) {
  if (!url) return null
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  )
  return m ? m[1] : null
}

// ── Guest check-in names (#71) ────────────────────────────────────────────────
// Must match migration 0008's `jsonb_array_length(v_anon_names) < 20`. The server cap is
// the real bound (it is what an attacker hits); this one exists so a legitimately full
// roster surfaces as a message instead of the RPC's silent no-op.
export const GUEST_CAP = 20

// Returns the EXISTING name a typed one collides with, or null — it never merges or drops
// anything. Two real guests can share a first name and both must land on the roster, so the
// collision is a question for the guest ("are you a different Fulano?"), never a dedupe.
// normExName (lib/registry.js) is the app's one name normalizer — trim/casefold/accent-strip/
// whitespace-collapse — reused here rather than growing a third one.
export function findNameCollision(existing, typed) {
  const k = normExName(typed)
  if (!k) return null
  return (existing || []).find(n => normExName(n) === k) || null
}

// Portuguese name particles, which carry no distinguishing initial: the surname in
// "Fulano da Silva" is Silva, not "da".
const NAME_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'del', 'di', 'du', 'e', 'la'])

// "Fulano da Silva" → "Fulano S."; if that is taken too, drop the particle → "Fulano Silva".
// Returns '' when nothing distinguishing can be derived — a single-token name, or a name with
// no particle to drop (there the second candidate is just what they typed, which is on the
// roster by definition). The prompt then asks the guest to type something themselves rather
// than suggesting a name that would collide all over again.
export function suggestGuestName(typed, existing = []) {
  const parts = String(typed || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length < 2) return ''
  const surname = parts
    .slice(1)
    .reverse()
    .find(p => !NAME_PARTICLES.has(normExName(p)))
  if (!surname) return ''
  return (
    [`${parts[0]} ${surname[0].toUpperCase()}.`, `${parts[0]} ${surname}`].find(
      c => !findNameCollision(existing, c),
    ) || ''
  )
}

// Enter/Space keyboard activation for click-divs (#14)
export function onKey(fn) {
  return e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      fn()
    }
  }
}

// ── Athlete lookup (#207) ─────────────────────────────────────────────────────
// The one validator both Schedule.jsx's `?id=` and `?athlete=` query parameters resolve
// through, so a URL carrying either can never open a false lock or write a value the roster
// doesn't recognise into cone_athlete_filter. Faithful extraction of the equality the
// `?athlete=` branch already used — no trim/lowercase/normalise, on purpose: widening the
// match here would silently accept more URLs than today. Never mutates or reorders `athletes`.
export function findAthleteById(athletes, rawId) {
  const key = String(rawId ?? '')
  if (!key) return null
  return (athletes || []).find(a => String(a.id) === key) || null
}
