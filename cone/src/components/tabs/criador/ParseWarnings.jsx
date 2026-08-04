import { WARNING_KINDS } from './textFormat.js'
import s from './textMode.module.css'

// ── ParseWarnings (#129 · plans/61·C) ────────────────────────────────────────
// One rendering for the eight warning kinds textFormat.js can produce, so every
// surface that can produce a kind can also show it. Before this, SessionTextPane
// hand-counted 4 of the 8, WeekImportModal counted 2, BlockTextEditor printed
// every raw per-line message instead of a summary, and `interval-approximated` /
// `preamble` had no consumer anywhere.
//
// `inline`: each kind as its own `· N kind` span, for a status row that already
// has other content on the same line (BlockTextEditor, a per-day import cell).
// Default: one row per kind, for a footer/detail block of its own
// (SessionTextPane's preview footer, a day's expanded preview).
export function ParseWarnings({ warnings, inline = false }) {
  const counts = {}
  ;(warnings || []).forEach(w => {
    counts[w.kind] = (counts[w.kind] || 0) + 1
  })
  const rows = Object.keys(WARNING_KINDS)
    .filter(kind => counts[kind])
    .map(kind => ({ kind, n: counts[kind], cfg: WARNING_KINDS[kind] }))
  if (!rows.length) return null

  if (inline)
    return (
      <>
        {rows.map(({ kind, n, cfg }) => (
          <span key={kind} className={cfg.severity === 'warn' ? s.warnRow : s.infoRow}>
            · {n} {n === 1 ? cfg.labelOne : cfg.label}
          </span>
        ))}
      </>
    )

  return (
    <>
      {rows.map(({ kind, n, cfg }) => (
        <div key={kind} className={cfg.severity === 'warn' ? s.warnRow : s.infoRow}>
          {cfg.severity === 'warn' ? '⚠' : 'ⓘ'} {n} {n === 1 ? cfg.labelOne : cfg.label}
        </div>
      ))}
    </>
  )
}
