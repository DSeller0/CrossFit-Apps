import { useState, useRef } from 'react'
import { uid } from '../../../utils/storage'
import { normalizeLegacyCardio, emptyBlock } from './blockModel.js'

// ── useBlockList ──────────────────────────────────────────────────────────────
// The block list inside the open session: add · copy · update · delete · reorder,
// plus the UI state that goes with it (which blocks are collapsed, where the picker
// will insert, the drag refs). `blocks`/`setBlocks` belong to useSessionEditor —
// they are the session's content and every open/close/save path touches them — so
// they arrive as arguments rather than being owned here.
//
// ⚠️ Nothing here is reset on close, and that is deliberate: `collapsedBlocks`,
// `insertAtIdx` and `showBlockPicker` survive closing the editor exactly as they did
// before this hook existed (collapsed state is keyed by block id, so it cannot leak
// between sessions).
export function useBlockList({ blocks, setBlocks, markDirty, trackBlockChange, fireUndo }) {
  const [collapsedBlocks, setCollapsedBlocks] = useState({})
  const [showBlockPicker, setShowBlockPicker] = useState(false)
  const [insertAtIdx, setInsertAtIdx] = useState(null)
  // Named *Ref because eslint-plugin-react-hooks identifies refs by that suffix: passed
  // down as a prop, an unsuffixed ref reads to the rule as a plain (immutable) prop and
  // every `.current =` in a child's drag handler trips react-hooks/immutability. Writing
  // a ref from an event handler is correct — drag state must be readable synchronously in
  // `drop` and must not re-render on every dragover — so the name is the fix, not a disable.
  const dragBlkIdxRef = useRef(null)
  const [dragOverBlkIdx, setDragOverBlkIdx] = useState(null)

  const addBlock = typeOrBlock => {
    const rawBlk =
      typeof typeOrBlock === 'string' ? emptyBlock(typeOrBlock) : { ...typeOrBlock, id: uid() }
    // Benchmark blocks (buildBenchmarkBlock) can still carry legacy cardio-mode Run legs (Helen, Murph...) — normalize on insert.
    const newBlk = normalizeLegacyCardio([rawBlk])[0]
    setBlocks(b => {
      if (insertAtIdx === null) return [...b, newBlk]
      const next = [...b]
      next.splice(insertAtIdx + 1, 0, newBlk)
      return next
    })
    setInsertAtIdx(null)
    setShowBlockPicker(false)
    markDirty()
  }

  const copyBlock = id => {
    setBlocks(b => {
      const idx = b.findIndex(x => x.id === id)
      if (idx < 0) return b
      const orig = b[idx]
      const copy = {
        ...orig,
        id: uid(),
        exercises: (orig.exercises || []).map(ex => ({ ...ex, id: uid() })),
      }
      const next = [...b]
      next.splice(idx + 1, 0, copy)
      return next
    })
    markDirty()
  }

  const updBlock = (id, upd) => {
    const old = blocks.find(x => x.id === id)
    setBlocks(b => b.map(x => (x.id === id ? upd : x)))
    markDirty()
    if (!old) return
    const newFields = new Set()
    ;['label', 'type', 'duration', 'rounds', 'notes', 'zone', 'ladderMode', 'goal'].forEach(f => {
      if (JSON.stringify(upd[f]) !== JSON.stringify(old[f])) newFields.add(f)
    })
    const oldExs = old.exercises || []
    ;(upd.exercises || []).forEach(ex => {
      const oldEx = oldExs.find(x => x.id === ex.id)
      if (!oldEx || JSON.stringify(ex) !== JSON.stringify(oldEx)) newFields.add(`ex:${ex.id}`)
    })
    if (!newFields.size) return
    trackBlockChange(id, newFields)
  }

  const delBlock = id => {
    const idx = blocks.findIndex(x => x.id === id)
    if (blocks.length <= 1 || idx < 0) return
    const deleted = blocks[idx]
    setBlocks(b => b.filter(x => x.id !== id))
    markDirty()
    fireUndo('Bloco removido', () => {
      setBlocks(b => {
        const n = [...b]
        n.splice(idx, 0, deleted)
        return n
      })
    })
  }

  const reorderBlocks = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx === null || toIdx === null) return
    setBlocks(prev => {
      const arr = [...prev]
      const [mv] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, mv)
      return arr
    })
    markDirty()
  }

  return {
    collapsedBlocks,
    setCollapsedBlocks,
    showBlockPicker,
    setShowBlockPicker,
    insertAtIdx,
    setInsertAtIdx,
    dragBlkIdxRef,
    dragOverBlkIdx,
    setDragOverBlkIdx,
    addBlock,
    copyBlock,
    updBlock,
    delBlock,
    reorderBlocks,
  }
}
