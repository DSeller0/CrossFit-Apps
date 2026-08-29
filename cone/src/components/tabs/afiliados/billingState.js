// #162/plans/78 — the invoice STAMP, not an entity. Pure: period keys, the stamp
// reducer, the freeze rule, column assignment. Persisted at
// coach_profile.value.billing[affiliateId][period] = {status, sentAt?, paidAt?,
// total?, currency?} — see CLAUDE.md's Supabase section.
//
// The freeze is the whole correctness argument (plans/78): a `draft` stamp holds
// no total of its own — callers always read it LIVE off `events` via
// `publicador/billing.js`'s `calcTotal`, so editing a past event still moves it.
// `sent`/`paid` read the stamp's OWN frozen total/currency, set once, the moment
// the coach moves it to `sent` — never recomputed after that, even if the
// underlying events change. That fork is enforced by which data source each
// caller reads (InvoiceCard/InvoiceDetail), not by anything in this file — this
// file only decides what the stamp itself says.

import { MONTH_PT } from '../../../public/lib/week.js'
import { eventsForAffiliate } from './affiliateHelpers.js'

/** A date (ISO string or Date) → its 'YYYY-MM' period key. */
export function periodKey(date) {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 'YYYY-MM' → [from, to] ISO bounds for that calendar month. */
export function periodBounds(period) {
  const [y, m] = period.split('-').map(Number)
  const p = n => String(n).padStart(2, '0')
  return {
    from: `${y}-${p(m)}-01`,
    to: `${y}-${p(m)}-${p(new Date(y, m, 0).getDate())}`,
  }
}

/** 'YYYY-MM' → "Agosto 2026". */
export function periodLabel(period) {
  const [y, m] = period.split('-').map(Number)
  return `${MONTH_PT[m - 1]} ${y}`
}

/** The stamp for one (affiliate, period), or null when none exists yet. */
export function stampFor(billing, affiliateId, period) {
  return billing?.[affiliateId]?.[period] || null
}

/**
 * Every stamp in the blob, flattened to `{affiliateId, period, stamp}` rows —
 * feeds the Rascunho/Enviada/Paga columns and Meu perfil's Cobranças emitidas.
 */
export function allStamps(billing) {
  const out = []
  Object.entries(billing || {}).forEach(([affiliateId, periods]) => {
    Object.entries(periods || {}).forEach(([period, stamp]) => {
      if (stamp) out.push({ affiliateId, period, stamp })
    })
  })
  return out
}

/** Immutable write: `billing` with one (affiliate, period) stamp replaced. */
export function setStamp(billing, affiliateId, period, stamp) {
  return {
    ...billing,
    [affiliateId]: { ...(billing?.[affiliateId] || {}), [period]: stamp },
  }
}

/**
 * `calcTotal`'s per-currency result → a single {total, currency} pair, or null
 * when the period mixed currencies (a location's `currency` changed between two
 * snapshotted events). A stamp holds ONE number — the same guard
 * `publicador/events.jsx`'s ReportModal already applies before generating a Pix
 * QR ("Pix needs one amount + one currency") — a mixed period can't be frozen.
 */
export function singleTotal(calcResult) {
  if (!calcResult || calcResult.currencies.length !== 1) return null
  const currency = calcResult.currencies[0]
  return { total: calcResult.totals[currency], currency }
}

/**
 * Moves a stamp to `to`. `computed` is a `{total, currency}` pair (see
 * `singleTotal`) — required (and frozen into the stamp) only when moving to
 * `sent`; ignored otherwise, since `sent`→`paid` keeps whatever was already
 * frozen. `now` is injectable so callers (and tests) don't depend on the wall
 * clock.
 */
export function advance(stamp, to, computed, now = new Date().toISOString()) {
  if (to === 'draft') return { status: 'draft' }
  if (to === 'sent') {
    if (!computed) return stamp
    return { status: 'sent', sentAt: now, total: computed.total, currency: computed.currency }
  }
  if (to === 'paid') {
    if (!stamp) return stamp
    return { ...stamp, status: 'paid', paidAt: now }
  }
  return stamp
}

/**
 * Whether a stamp's status still counts as "a receber" (#163) — true for
 * everything except 'paid' (money already received). A missing/null stamp
 * (nothing invoiced yet — the live 'open'/'draft' state) is still owed, same as
 * 'sent'; only 'paid' is excluded.
 */
export function isReceivable(stamp) {
  return stamp?.status !== 'paid'
}

/**
 * Which Fechamento column an affiliate belongs to for one period — 'open' (has
 * events, no stamp), 'draft'/'sent'/'paid' (the stamp's own status), or null
 * (nothing to show: no stamp and no events).
 */
export function columnOf(loc, period, billing, events) {
  const stamp = stampFor(billing, loc.id, period)
  if (stamp) return stamp.status
  const { from, to } = periodBounds(period)
  return eventsForAffiliate(events, loc, from, to).length > 0 ? 'open' : null
}
