// Result-domain (not WOD- or session-domain, so it doesn't live in wod.js/sessions.js) —
// the one place a block entry's merge shape is declared. #118/plans/53: every writer that
// persists a block entry was building a fresh object literal off a fixed key whitelist, so
// any key the reader/writer didn't know about (a `checkpoint` or `exerciseRows`) was silently
// destroyed by the next re-log from a different surface. See CLAUDE.md's "a load/read path
// never writes" note, which this extends to "a write path never truncates".

// Keys that belong to ONE athlete's performance on a block. Declaring this list once is the
// whole point — `clearAthleteKeys` resets exactly these when a form switches which athlete
// it's editing, so a future field (`finished`/`checkpoint` #112, `exerciseRows` #116) is added
// here once and every reset site follows automatically instead of needing to be found by hand.
const ATHLETE_KEY_DEFAULTS = {
  rpe: null,
  scale: null,
  perfTime: '',
  perfRounds: '',
  perfReps: '',
  // #112 — the DNF/where-you-stopped checkpoint. `finished` is only meaningful on a time
  // block; `checkpoint` is present only when the coach actually recorded one. Both null by
  // default, same as rpe/scale, rather than a hollow object (goalStr's "undefined, never a
  // hollow object" convention).
  finished: null,
  checkpoint: null,
}

export const ATHLETE_KEYS = Object.keys(ATHLETE_KEY_DEFAULTS)

// `{ ...prev, ...patch }` — unknown keys on `prev` (a field this version of the app doesn't
// know about) survive untouched. Identity fields (`blockId`/`blockType`/`blockLabel`) come
// from `patch` whenever `patch` sets them, so a renamed or retyped block re-labels correctly
// instead of being stuck on the previous save's label.
export function mergeBlockEntry(prev, patch) {
  return { ...(prev || {}), ...patch }
}

// Resets every ATHLETE_KEYS field on `entry` to its declared empty value, leaving every other
// key (identity fields, and any field this version doesn't know about) untouched. Used when a
// form switches which athlete it's editing — clearing by an inline key list is what let the
// outgoing athlete's rpe/scale/perfTime ride into the incoming athlete's submission before.
export function clearAthleteKeys(entry) {
  return { ...(entry || {}), ...ATHLETE_KEY_DEFAULTS }
}
