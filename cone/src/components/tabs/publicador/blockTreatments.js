// The 5 Blocos card treatments (#59 · C5·b2 · plans/83 T5) — pure list + the
// title-building logic 3 mobile views duplicated byte-for-byte (MobileBlock,
// MegaManBlock, MobileWeeklySingleDay), hoisted here so BlockHeader.jsx and every
// export view build the same string. Every treatment keys off `--a-hdr` alone —
// family block-colouring is DROPPED (plans/82 measurement: fails 3:1 on both light
// themes) and must not come back here either.
export const BLOCK_TREATMENTS = [
  { id: 'nu', label: 'Nu' },
  { id: 'acento', label: 'Acento' },
  { id: 'contorno', label: 'Contorno' },
  { id: 'faixa', label: 'Faixa' },
  { id: 'etiqueta', label: 'Etiqueta' },
]

// 'acento' is what Weekly/Calendar already rendered pre-b2 (a left border) —
// picking it as the default keeps the visual change minimal for the 2 formats
// that already had a treatment, rather than introducing a bigger jump on day one.
export const DEFAULT_BLOCK_TREATMENT = 'acento'

export const DEFAULT_BLOCK_CONTENT = { intensity: true, notes: true }

export function blockTitle(bl) {
  const lbl = bl.label && bl.label !== '-' ? bl.label : null
  const typ = bl.type && bl.type !== '-' ? bl.type : null
  return lbl && typ && lbl !== typ ? `${lbl} · ${typ}` : lbl || typ || ''
}

// The one companion to BlockHeader.jsx for 'contorno', the sole treatment that
// wraps the whole block (header + exercises) rather than just the header row.
export function wrapperStyle(treatment, hdrColor) {
  if (treatment === 'contorno') {
    return { border: `1px solid ${hdrColor}`, borderRadius: 3 }
  }
  return {}
}
