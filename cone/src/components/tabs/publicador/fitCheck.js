// Fit / overflow detection (#59 · C5·b2 · plans/83 T9). html2canvas crops silently
// whenever content exceeds a fixed canvas height, and nothing said so before this
// pass. `measureFit` reads the OFF-SCREEN farm node (ExportFarm's own ref, already
// un-transformed and real-size — the on-screen PreviewPane copy is
// `transform:scale`d and returns scaled metrics, so it must never be the source).
//
// Dia/Semana/Mês have a fixed 1920×1080 canvas with `overflow:hidden` on the
// artefact's own root — a real clip. Dia mobile/Semana mobile render at
// `width:1080, height:auto`, so nothing ever literally crops there; instead we
// measure against the height a 9:16 Story/Reel would have (`w * 16/9`) and warn
// when the coach is about to publish something taller than that convention — the
// message says so honestly (`clips:false`) rather than claiming a crop that can't
// happen (the #61a "never fabricate a fact" rule, applied to a UI warning).
export const FONT_SCALE_FLOOR = 0.5
export const FONT_SCALE_CEIL = 3
export const AUTO_SHRINK_STEP = 0.05
export const AUTO_SHRINK_MAX_STEPS = 24

export function targetHeight(dims) {
  return dims.h || Math.round(dims.w * (16 / 9))
}

// Blocks are tagged `data-fitblock` by every export view (a generic, view-agnostic
// marker) so this stays one function instead of one per view.
//
// ⚠️ Fixed-canvas formats clip PER NESTED CONTAINER, not at the outer root: Dia's
// `.dvWrap` is a flex column with an explicit height, and each zone column
// (`.dvZone`/`.dvZoneBody`) has its OWN `overflow:hidden` — a flex child never
// grows its own `scrollHeight` past a box an explicit-height ancestor already
// pinned, so `root.scrollHeight` reads exactly `dims.h` even while a zone is
// visibly cutting content (caught live, not in a unit test — this file has no
// jsdom layout to catch it). The fix walks every `[data-fitblock]` element and
// asks whether ITS OWN nearest `overflow:hidden` ancestor is actually hiding it,
// which is correct regardless of how deep that ancestor sits in the tree.
export function measureFit(farmEl, dims) {
  if (!farmEl) return null
  const root = farmEl.firstElementChild
  if (!root) return null
  const targetH = targetHeight(dims)
  const clips = !!dims.h
  const contentH = root.scrollHeight

  if (!clips) {
    return { overflowing: contentH > targetH + 1, contentH, targetH, clips, cutBlocks: 0 }
  }

  let cutBlocks = 0
  root.querySelectorAll('[data-fitblock]').forEach(el => {
    let node = el.parentElement
    while (node && node !== root.parentElement) {
      const cs = getComputedStyle(node)
      if (cs.overflowY === 'hidden' || cs.overflow === 'hidden') {
        const bound = node.getBoundingClientRect()
        const target = el.getBoundingClientRect()
        if (target.bottom > bound.bottom + 1) cutBlocks++
        break
      }
      node = node.parentElement
    }
  })
  return { overflowing: cutBlocks > 0, contentH, targetH, clips, cutBlocks }
}

// The one-line fact for the size ConfirmReview (D2) — folds into b1's existing
// "Baixar imagem" prompt rather than opening a second dialog.
export function describeOverflow(fit) {
  if (!fit || !fit.overflowing) return ''
  if (fit.clips) {
    return fit.cutBlocks
      ? `os ${fit.cutBlocks} último${fit.cutBlocks === 1 ? '' : 's'} bloco${fit.cutBlocks === 1 ? '' : 's'} ficam cortados`
      : 'parte do conteúdo fica cortada'
  }
  return 'a imagem ficará mais alta que o formato Stories (9:16) recomendado'
}

export const FIT_FLOOR_MESSAGE =
  'não cabe nem no tamanho mínimo; tente 4:5, altura livre, ou menos blocos.'
