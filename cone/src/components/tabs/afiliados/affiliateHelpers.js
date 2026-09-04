// Afiliados' pure helpers (#56/C2 · plans/75; #161/plans/77). Extracted out of the
// 1199-line Serviços tab — the convention resultadosHelpers / exerciciosHelpers /
// stateBackup / billing set. No React, no client.
//
// ⚠️ These format and parse only. The money ARITHMETIC lives in
// publicador/billing.js (`calcTotal`/`sumByCurrency`, #149/plans/71) and stays
// there: `locations[].rate` means what the coach charges that box, and the
// Relatório is its only consumer. Nothing here should ever compute a total —
// `eventsForAffiliate` below picks the right EVENTS for an affiliate, it does not
// sum them.

import { MONTH_PT } from '../../../public/lib/week.js'
import { rateAsOf } from '../publicador/billing.js'

/** 'box' | 'personal' → the label the coach reads. */
export const typeLabel = type => (type === 'box' ? 'Aula / Box' : 'Personal')

/**
 * The compact per-row label: "R$ 40/hora", or a stated absence. With `isoDate`
 * (#154), reads the version that was in effect on that date instead of the
 * current one — `startEdit`/the affiliate rows still call this with no date,
 * which is the current/head rate, unchanged from before rate history existed.
 */
export function rateLabel(loc, isoDate) {
  const src = isoDate ? (rateAsOf(loc, isoDate) ?? loc) : loc
  if (!src?.rate) return 'Sem taxa configurada'
  const per = src.rateUnit === 'per_hour' ? 'hora' : 'sessão'
  return `${src.currency || 'R$'} ${src.rate}/${per}`
}

// #154 — an ISO date old enough to predate any real rate history, used to
// backfill a location's PRE-versioning rate as its first entry (see
// `appendRateVersion`).
const RATE_HISTORY_EPOCH = '1970-01-01'

/**
 * The `rateHistory` array `saveLoc` should persist after an edit — appends a
 * version dated `today` ONLY when rate/rateUnit/currency actually changed
 * (renaming a location or recolouring it shouldn't mint a version). The FIRST
 * versioned edit on a location with no prior history backfills the OLD values
 * as one entry dated `RATE_HISTORY_EPOCH` — without that backfill, an event
 * dated before today has no version covering it and `calcTotal`'s `?? loc`
 * fallback would read the location's brand-new rate: the exact
 * retroactive-repricing bug #154 exists to close, on the very first edit.
 * Returns `loc.rateHistory` unchanged (possibly `undefined`) when nothing
 * about the rate changed.
 */
export function appendRateVersion(loc, next, today) {
  const changed =
    next.rate !== (loc.rate || 0) ||
    next.rateUnit !== loc.rateUnit ||
    next.currency !== loc.currency
  if (!changed) return loc.rateHistory
  const prior =
    loc.rateHistory && loc.rateHistory.length
      ? loc.rateHistory
      : [
          {
            rate: loc.rate || 0,
            rateUnit: loc.rateUnit || 'per_session',
            currency: loc.currency || 'R$',
            from: RATE_HISTORY_EPOCH,
          },
        ]
  return [...prior, { ...next, from: today }]
}

/** Reais (a float, as stored on the location) → integer centavos. */
export const toCentavos = v => Math.round((parseFloat(v) || 0) * 100)

/**
 * Centavos → the pt-BR display string the currency field shows. Zero renders as
 * EMPTY, not "R$ 0,00" — an unset rate and a genuinely free service look different,
 * and the placeholder carries the former.
 */
export function centavosDisplay(centavos, currency = 'R$') {
  if (!centavos) return ''
  return (
    currency +
    ' ' +
    (centavos / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

/**
 * Keystrokes → centavos. Digits only, right-to-left (typing "4000" means R$ 40,00),
 * capped at 8 digits so a leaned-on key can't produce a nonsense rate.
 */
export function digitsToCentavos(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  return digits === '' ? 0 : parseInt(digits.slice(-8), 10)
}

/** The public per-box link — a SOFT view scope (#80), never access control. */
export const boxLink = (locId, origin) => `${origin}/CrossFit-Apps/index.html?box=${locId}`

/** [from, to] ISO bounds for a calendar month (default: the current one) + its pt-BR label. */
export function monthBounds(date = new Date()) {
  const y = date.getFullYear()
  const m = date.getMonth()
  const p = n => String(n).padStart(2, '0')
  const from = `${y}-${p(m + 1)}-01`
  const to = `${y}-${p(m + 1)}-${p(new Date(y, m + 1, 0).getDate())}`
  return { from, to, label: MONTH_PT[m] }
}

/**
 * This affiliate's events within [from, to] (inclusive ISO dates). A box-type
 * affiliate's events carry `locationId`; a personal-type one never does (the coach
 * picks an athlete instead, `publicador/events.jsx`'s EventFormInner) — matched on
 * a shared id with `loc.athleteIds` instead. Mirrors ReportModal's own resolution
 * without its per-athlete grouping: that view bills per athlete (so a shared session
 * counts once per athlete), this one reads per AFFILIATE.
 */
export function eventsForAffiliate(events, loc, from, to) {
  const result = []
  Object.entries(events || {}).forEach(([date, evs]) => {
    if (date < from || date > to) return
    ;(evs || []).forEach(ev => {
      const match =
        loc.type === 'personal'
          ? ev.type === 'personal' &&
            (ev.athleteIds || []).some(id => (loc.athleteIds || []).includes(id))
          : ev.locationId === loc.id
      if (match) result.push({ ...ev, date })
    })
  })
  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''),
  )
}

/**
 * The affiliate an event belongs to, regardless of type (#162/plans/78 —
 * `Minha semana`'s week grid needs to colour a cell by affiliate without
 * knowing in advance which one). A box event carries `locationId` directly; a
 * personal one never does (the coach picks an athlete instead), so it resolves
 * through the first athlete on a personal affiliate that includes them — the
 * same reverse lookup `publicador/events.jsx`'s `EventFormInner` already does
 * at booking time (`persSvc`).
 */
export function resolveEventLoc(ev, locs) {
  if (ev.locationId) return locs.find(l => l.id === ev.locationId) || null
  if (ev.type === 'personal' && (ev.athleteIds || []).length) {
    return (
      locs.find(l => l.type === 'personal' && (l.athleteIds || []).includes(ev.athleteIds[0])) ||
      null
    )
  }
  return null
}
