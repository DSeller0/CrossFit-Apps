// #149/#104(c) · plans/71 — the only money arithmetic in the app, extracted so it can be
// tested. Deliberately NOT exportHelpers.js: that module reads `window.SpeechRecognition` at
// module-evaluation time, `vite.config.js` runs tests under `environment: 'node'` with no
// `setupFiles`, and jsdom isn't a devDependency, so importing it under vitest throws before
// any test runs. This module imports nothing (no React, no client, no storage) — keep it that
// way so it stays trivially testable.

// Named `fmtDateNum` (not `fmtDate`) so it doesn't shadow `public/lib/week.js`'s
// `fmtDate` ("Dom 5 Jul") — this one returns dd/mm/yy, a different format for a
// different surface (#166).
export function fmtDateNum(iso) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function fmtMoney(total, currency) {
  return `${currency} ${total.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function fmtDur(min) {
  return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? (min % 60) + 'min' : ''}` : min + 'min'
}

// `groupTotals` is an array of `{total, currency}` entries (or falsy — skipped) — either
// per-event (calcTotal's own use, below) or per-group (summing a whole report's groups into
// one grand total). Same primitive both times, which is what keeps the PDF footer and the
// on-screen preview from re-deriving the total two different ways and drifting apart.
export function sumByCurrency(groupTotals) {
  const totals = {}
  groupTotals.forEach(t => {
    if (!t) return
    totals[t.currency] = (totals[t.currency] || 0) + t.total
  })
  // Currency is a free-text field with no validation (Servicos.jsx) — 'R$' and 'R$ ' are
  // different buckets here on purpose; trimming it is an input-hygiene fix, not this row's.
  const currencies = Object.keys(totals).filter(c => totals[c] > 0)
  const label = currencies.map(c => `${c} ${totals[c].toLocaleString('pt-BR')}`).join(' + ')
  return { totals, currencies, label }
}

// #154 — the versioned half #104(c) deferred. `loc.rateHistory` is
// `[{rate, rateUnit, currency, from}, …]`, `from` an ISO date the version took
// effect on, appended in chronological order (never resorted — `saveLoc` in
// `afiliados/Afiliados.jsx` is the one writer). Returns the entry in effect ON
// `isoDate` — the last one whose `from` is `<= isoDate` — or `null` when the
// location has no history at all, or `isoDate` predates every recorded version
// (a location edited before #154 shipped, or an event dated before tracking
// started): `calcTotal`'s `?? loc` is what supplies a rate for those, same as
// pre-#154 behavior. A same-day double-edit resolves to whichever was appended
// LAST, since a forward scan keeps overwriting `match` on each `from <=` hit.
export function rateAsOf(loc, isoDate) {
  const hist = loc?.rateHistory
  if (!hist || !hist.length || !isoDate) return null
  let match = null
  for (const v of hist) {
    if (v.from <= isoDate) match = v
  }
  return match
}

// #104(c)/#154 — the ONE precedence chain: a booked event's own frozen rate wins
// over everything; next, the location's rate AS OF the event's own date (so a rate
// change today can't retroactively re-price a past event that never got a
// snapshot); finally the location's current rate, for an event dated before any
// recorded history. `calcTotal` and `events.jsx`'s per-event PDF "Valor" cell both
// call this rather than re-deriving the `??` chain — the two independently
// writing it out was exactly the "PDF disagrees with the total under it" shape
// #104(b)/#149 already had to close once.
export function effectiveRateSource(ev, loc) {
  return ev.rateSnapshot ?? rateAsOf(loc, ev.date) ?? loc
}

export function calcTotal(evs, loc) {
  const perEvent = evs.map(ev => {
    const src = effectiveRateSource(ev, loc)
    if (!src || !src.rate) return null
    // #104(a) — fractional hours, not Math.floor: a 90-minute per_hour class billed as one
    // hour flat (fmtDur prints "1h30min" for the same event, so the PDF disagreed with
    // itself about how long the class was). Math.max(1, …) is kept — a session under an
    // hour still bills a minimum of one.
    const hrs = src.rateUnit === 'per_hour' ? Math.max(1, (ev.durationMin || 60) / 60) : 1
    const total = src.rateUnit === 'per_hour' ? hrs * src.rate : src.rate
    return { total, currency: src.currency || 'R$' }
  })
  // A mixed-currency group (a location's `currency` changed between two snapshotted events)
  // is exactly what a flat `{total, currency}` return can't represent — so this is the same
  // per-currency shape sumByCurrency already builds, not a second one.
  return sumByCurrency(perEvent)
}
