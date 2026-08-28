// Afiliados' pure helpers (#56/C2 · plans/75). Extracted out of the 1199-line
// Serviços tab — the convention resultadosHelpers / exerciciosHelpers / stateBackup
// / billing set. No React, no client.
//
// ⚠️ These format and parse only. The money ARITHMETIC lives in
// publicador/billing.js (`calcTotal`/`sumByCurrency`, #149/plans/71) and stays
// there: `locations[].rate` means what the coach charges that box, and the
// Relatório is its only consumer. Nothing here should ever compute a total.

/** 'box' | 'personal' → the label the coach reads. */
export const typeLabel = type => (type === 'box' ? 'Aula / Box' : 'Personal')

/** The compact per-row label: "R$ 40/hora", or a stated absence. */
export function rateLabel(loc) {
  if (!loc?.rate) return 'Sem taxa configurada'
  const per = loc.rateUnit === 'per_hour' ? 'hora' : 'sessão'
  return `${loc.currency || 'R$'} ${loc.rate}/${per}`
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
