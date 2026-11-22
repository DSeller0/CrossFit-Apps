import {
  groupProgressionSteps,
  progressionGroupUnit,
  isWodBlock,
  intervalOf,
  noteEverySecs,
} from '../lib/wod.js'
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
//
// What a block MEANS beyond its mode rides on the config as flags (#242) — THIS is the one place the
// block's type is read, and `timerMode`'s three other modes plus these two flags are all the Timer
// branches on (see timer/timerMode.js):
//
//   rotate  an interval EMOM with several movements — one per round, as a plain EMOM rotates per minute
//   laps    an interval AMRAP — it counts rounds, so it keeps LAP
//
// And one rule about Duração: a LEGACY block has none to speak of (`isLegacyEveryCap`).
const timerExName = e =>
  e.isComplex
    ? e.name ||
      (e.complexMovements || [])
        .map(m => m.name)
        .filter(Boolean)
        .join(' + ')
    : e.name
// The name is trimmed and a blank one drops the row, so a `'  '` row — or a complex with no
// movements — never reaches the timer. `dist`/`distUnit` ride along: `400m Run` was `Run` (#242).
const timerExs = exs =>
  (exs || [])
    .map(e => ({
      name: String(timerExName(e) ?? '').trim(),
      sets: e.sets,
      reps: e.reps,
      dist: e.dist,
      distUnit: e.distUnit,
    }))
    .filter(e => e.name)

// Duração in minutes, decimals kept (prod has 2.3) — or null. `parseInt` truncated it, so EMOM
// 01:30 × Duração 7.5 was four rounds, not five (#242).
const capMins = d => {
  const n = parseFloat(String(d ?? '').replace(',', '.'))
  return n > 0 ? n : null
}

// A block from before #228 has no `interval` field: "A cada 1'30" 3 Sets" lives in its notes, and
// the text parser wrote the NEAREST WHOLE MINUTE into Duração — `max(1, round(every / 60))`
// (textFormat.js at 4edc639). #228 made Duração a real cap, so the timer read that rounded figure
// as one and stopped the block after a single interval (#242): rounds 3 · A cada 1'30" · Duração 2
// ended at 2:00 of a 4:30 block.
//
// So a block is legacy only when Duração IS that rounded interval. ⚠️ Anything else is a real total
// and keeps its cap — `E2MOM` with Duração 12 is a 12-minute block, and so is `A cada 3'` × 5 rounds
// with Duração 15. Estações times itself station by station, and a block with a real interval
// carries its own rounds, so neither is ever legacy — nor is an AMRAP, which counts DOWN from its
// Duração: with none the clock would sit at 00:00 for good, so it keeps the rounded one it always had.
// Running the note as a real interval timer is deliberately NOT done: it would change every old
// block's behaviour, and none of them is current.
function isLegacyEveryCap(bl, cap) {
  if (!cap || bl.type === 'Estações' || bl.type === 'AMRAP' || intervalOf(bl)) return false
  const every = noteEverySecs(bl.notes) ?? noteEverySecs(bl.label)
  return every != null && cap === Math.max(1, Math.round(every / 60))
}

// The placeholder label `-` is no name (blkLabel in lib/wod.js draws the same line).
const realName = s => (s && s !== '-' ? s : '')

export function timerConfigFor(bl) {
  const cap = capMins(bl.duration)
  const base = {
    blockType: bl.type || bl.label,
    blockLabel: realName(bl.label) || realName(bl.type) || 'WOD',
    timeCap: isLegacyEveryCap(bl, cap) ? null : cap,
    // `stationRepeat` is Estações' own (its branch below): a count-up timer ends at its last LAP, so
    // a stale one on a block converted from Estações would be a hidden lap limit.
    rounds: bl.rounds || null,
    blockId: bl.id,
    countdown: true,
    loggable: isWodBlock(bl),
  }

  if (bl.type === 'Estações') {
    const nonRest = (bl.stations || []).filter(st => !st.isRest)
    const rest = (bl.stations || []).filter(st => st.isRest)
    return {
      ...base,
      // stationRepeat first, as BlockDetail and stationsCapMins read it (#242)
      rounds: bl.stationRepeat || bl.rounds || null,
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
    // whole seconds first: 2.3 min × 60 is 137.99999999999997 in floating point
    const fit = Math.floor(Math.round((base.timeCap || 0) * 60) / iv.every)
    return {
      ...base,
      intervalMode: true,
      exercises: [{ name: base.blockLabel, exercises }],
      stationTime: iv.work ?? iv.every,
      transitionTime: iv.rest ?? 0,
      rounds: Number(bl.rounds) > 0 ? Number(bl.rounds) : fit > 0 ? fit : null,
      rotate: base.blockType === 'EMOM' && exercises.length > 1,
      laps: base.blockType === 'AMRAP',
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
