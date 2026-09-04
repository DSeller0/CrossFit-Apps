import { useEffect, useRef, useState } from 'react'
import { FORMATS } from './publisher/FormatRail'
import { measureFit, FONT_SCALE_FLOOR, AUTO_SHRINK_STEP, AUTO_SHRINK_MAX_STEPS } from './fitCheck'

const DEFAULT_FONT_SCALE = 1.5

// Fit / manual auto-shrink (#59 · C5·b2 · plans/83 T9), pulled out of
// Publicador.jsx to keep the container under its 800-line ceiling. Owns:
// - `overflowInfo` — reads the off-screen ExportFarm node (`previewRef`, never
//   the transform:scale'd on-screen preview) whenever anything that could change
//   the rendered content changes.
// - `autoShrinking`/`triggerAutoShrink` — a bounded state machine reacting to a
//   fresh `overflowInfo`, never a synchronous while() (the prototype's loop
//   doesn't port to React as-is); it touches ONLY the current format's
//   fontScale (D1) and is never triggered automatically (D3).
// - `shrinkToast` — the one-line announcement auto-shrink owes the coach for a
//   silent-otherwise mutation.
export function useFitAutoShrink({
  previewRef,
  format,
  fontScaleByFormat,
  setFontScaleByFormat,
  watch,
}) {
  const [overflowInfo, setOverflowInfo] = useState(null)
  const [autoShrinking, setAutoShrinking] = useState(false)
  const [shrinkToast, setShrinkToast] = useState('')
  const shrinkStepsRef = useRef(0)

  // Reads a moment after the DOM has had a chance to settle from whatever just
  // changed (`watch` — the container's own content-affecting values).
  //
  // ⚠️ Always sets a FRESH object, even when the fit summary looks identical to
  // the last one — a fixed-canvas format's outer root never changes height (it's
  // pinned by CSS), so two consecutive measurements during an auto-shrink run
  // routinely produce the same `{overflowing, cutBlocks, contentH}` right up
  // until the step that actually clears it. An earlier version deduped by
  // returning the previous object when those fields matched, which kept
  // `overflowInfo`'s REFERENCE identical across steps — React bails out of
  // scheduling a render when a state updater returns the same reference, so the
  // auto-shrink effect below (which only re-evaluates when `overflowInfo`
  // changes) silently stopped after its first step. Caught live, not by a test —
  // this file has no jsdom layout to catch it.
  useEffect(() => {
    const dims = FORMATS.find(f => f.id === format) || FORMATS[0]
    const t = setTimeout(() => {
      setOverflowInfo(measureFit(previewRef.current, dims))
    }, 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `watch` is the container's own explicit dependency bundle (every prop that can change the farm's rendered content); `format`/`previewRef` are read every run regardless.
  }, [format, ...watch])

  // Deliberately does NOT depend on `fontScaleByFormat`/`format`: advancing
  // only on a fresh `overflowInfo`, never on its own state write, is what stops
  // it racing ahead of the DOM it exists to react to.
  useEffect(() => {
    if (!autoShrinking || !overflowInfo) return
    if (!overflowInfo.overflowing) {
      // The effect above just confirmed this format now fits — end the loop
      // and announce the result (D3: auto-shrink must never be silent).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoShrinking(false)
      shrinkStepsRef.current = 0
      const fmtLabel = (FORMATS.find(f => f.id === format) || {}).label || format
      setShrinkToast(
        `Fonte ajustada — ${(fontScaleByFormat[format] ?? DEFAULT_FONT_SCALE).toFixed(2)}× em ${fmtLabel}`,
      )
      return
    }
    const current = fontScaleByFormat[format] ?? DEFAULT_FONT_SCALE
    if (current <= FONT_SCALE_FLOOR + 0.001 || shrinkStepsRef.current >= AUTO_SHRINK_MAX_STEPS) {
      setAutoShrinking(false)
      shrinkStepsRef.current = 0
      return
    }
    shrinkStepsRef.current++
    setFontScaleByFormat(m => ({
      ...m,
      [format]: Math.max(FONT_SCALE_FLOOR, +(current - AUTO_SHRINK_STEP).toFixed(2)),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overflowInfo, autoShrinking])

  return {
    overflowInfo,
    autoShrinking,
    triggerAutoShrink: () => setAutoShrinking(true),
    shrinkToast,
    dismissToast: () => setShrinkToast(''),
  }
}
