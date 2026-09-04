// The one block-header renderer for every export artefact (#59 · C5·b2 · plans/83
// T5) — Nu · Acento · Contorno · Faixa · Etiqueta. Each view keeps its own
// font-size/letter-spacing rhythm (they scale by different CSS custom properties —
// Daily's `--fs`/`--bts`, Mobile's `mfs()`) and passes it in as `titleStyle`/
// `metaStyle`; this component owns only the STRUCTURAL treatment — border, band,
// or chip — so the five shapes stay defined in exactly one place. `wrapperStyle`
// is the companion export for 'contorno', which is the one treatment that wraps
// the whole block (header + exercises), not just the header row.
//
// wrapperStyle() (the 'contorno' companion) lives in blockTreatments.js — this
// file exports only the component, per react-refresh/only-export-components.
//
// CLIENT-FREE — renders in the gallery.
export default function BlockHeader({
  treatment,
  hdrColor,
  onAccentColor,
  divColor,
  title,
  meta,
  titleStyle = {},
  metaStyle = {},
  padding,
}) {
  if (!title && !meta) return null
  const pad = padding || '0 0 6px'

  if (treatment === 'faixa') {
    return (
      <div
        style={{
          background: hdrColor,
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ ...titleStyle, color: onAccentColor }}>{title}</span>
        {meta && <span style={{ ...metaStyle, color: onAccentColor, opacity: 0.85 }}>{meta}</span>}
      </div>
    )
  }

  if (treatment === 'etiqueta') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: pad }}>
        {title && (
          <span
            style={{
              ...titleStyle,
              color: onAccentColor,
              background: hdrColor,
              borderRadius: 2,
              padding: '2px 8px',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
        )}
        <span style={{ flex: 1, height: 1, background: divColor }} aria-hidden="true" />
        {meta && <span style={{ ...metaStyle, color: hdrColor }}>{meta}</span>}
      </div>
    )
  }

  if (treatment === 'contorno') {
    return (
      <div
        style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', padding: pad }}
      >
        <span style={{ ...titleStyle, color: hdrColor }}>{title}</span>
        {meta && <span style={{ ...metaStyle, color: hdrColor }}>{meta}</span>}
      </div>
    )
  }

  if (treatment === 'acento') {
    return (
      <div
        style={{
          borderLeft: `3px solid ${hdrColor}`,
          paddingLeft: 10,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ ...titleStyle, color: hdrColor }}>{title}</span>
        {meta && <span style={{ ...metaStyle, color: hdrColor }}>{meta}</span>}
      </div>
    )
  }

  // 'nu' — plain text, just a thin divider from the block above it.
  return (
    <div
      style={{
        borderTop: `1px solid ${divColor}`,
        paddingTop: 6,
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ ...titleStyle, color: hdrColor }}>{title}</span>
      {meta && <span style={{ ...metaStyle, color: hdrColor }}>{meta}</span>}
    </div>
  )
}
