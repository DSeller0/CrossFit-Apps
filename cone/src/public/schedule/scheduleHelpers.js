import { groupProgressionSteps, isWodBlock } from '../lib/wod.js'
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

export function parseDurMins(d) {
  if (!d) return 0
  const p = String(d).trim()
  if (p.includes(':')) {
    const [m, s] = p.split(':').map(n => parseInt(n) || 0)
    return m + s / 60
  }
  return parseInt(p) || 0
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
