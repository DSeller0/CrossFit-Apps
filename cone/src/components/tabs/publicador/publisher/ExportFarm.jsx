import { FORMATS } from './FormatRail'
import { renderArtefact } from './renderArtefact'

// ── ExportFarm — the off-screen html2canvas render target (#59 C5·b1 step d). Reduced
// from 6 always-mounted views to exactly ONE: whichever format is currently selected —
// "the farm reduced to the selected format" per plans/82. ⚠️ Still un-transformed and
// measurable: the on-screen PreviewPane scales its own copy via CSS transform, which
// html2canvas cannot rasterise correctly, so this hidden full-size copy is the real
// target. Never render zero views here — an empty farm means "Baixar" has nothing to
// grab (the old exportWeeklyRef/weeklyRef write-only-ref bug this pass retires).
export default function ExportFarm({ format, previewRef, ...ctx }) {
  const dims = FORMATS.find(f => f.id === format) || FORMATS[0]
  return (
    <div
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden',
      }}
    >
      <div ref={previewRef} style={{ ...ctx.palette, width: `${dims.w}px` }}>
        {renderArtefact(format, ctx)}
      </div>
    </div>
  )
}
