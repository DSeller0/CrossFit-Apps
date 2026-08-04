import { useState } from 'react'
import { uid, todayISO, loadRegistry, getTargets } from '../../../utils/storage'
import { sessionBoxIds } from '../../../public/lib/boxScope.js'
import { emptyS, normalizeLegacyCardio, materializeBlocks } from './blockModel.js'

// ── useSessionEditor ──────────────────────────────────────────────────────────
// Everything about THE OPEN SESSION: its form, its blocks, whether the editor is
// open at all, and the four ways it opens or closes (start · new · save · discard).
// The week around it is the container's business, which is why the two places this
// hook touches the week are injected rather than reached for:
//   onOpened({ }) — the container's scrollToEditor, which must stay there (it
//                   measures the pinned chrome and needs editorRef + weekGridRef)
//   onSaved({ savedId, weekOffset }) — jump the week to the saved session and
//                   highlight it; both are week-view state.
// `defaultBoxIds` is the browsing filter's box, so a new session inherits it — the
// coach is almost always building for the box he is looking at.
export function useSessionEditor({ setSessions, defaultBoxIds, onOpened, onSaved }) {
  const [form, setForm] = useState(emptyS())
  const [blocks, setBlocks] = useState([])
  const [editing, setEditing] = useState(null)
  // The editor exists only while a session is open. `editing` alone can't carry this:
  // a NEW session is being edited but has no id/dateKey yet.
  const [editorOpen, setEditorOpen] = useState(false)
  const [metaModal, setMetaModal] = useState(null) // { isEdit, draft }
  const [pendingDate, setPendingDate] = useState(null)
  const [pendingClose, setPendingClose] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [changedBlockFields, setChangedBlockFields] = useState({})
  const [activeTemplateId, setActiveTemplateId] = useState(null)
  // Text mode (#92) is EDITOR UI STATE, never persisted: detalhado→texto
  // serializes, texto→detalhado parses. The blocks stay canonical either way.
  const [sessionMode, setSessionMode] = useState('detalhado') // 'detalhado' | 'texto'

  const markDirty = () => setIsDirty(true)
  // The per-field "changed" marks BlockEditor renders. The diff itself is block-list
  // work (useBlockList); holding the map here is what lets every open/close/apply
  // path clear it in one place.
  const trackBlockChange = (id, fields) =>
    setChangedBlockFields(prev => {
      const cur = new Set(prev[id] || [])
      fields.forEach(f => cur.add(f))
      return { ...prev, [id]: cur }
    })

  // ── Opening / closing the editor ───────────────────────────────────────────
  const startEdit = (s, dateKey) => {
    const targets = getTargets(s)
    const sName = typeof s.mainTraining === 'string' ? s.mainTraining : s.sessionName || ''
    setForm({
      ...s,
      date: dateKey,
      mainTraining: targets,
      sessionName: sName,
      locationIds: sessionBoxIds(s),
    })
    setBlocks(s.blocks?.length ? normalizeLegacyCardio(s.blocks) : [])
    setEditing({ dateKey, id: s.id })
    setEditorOpen(true)
    setIsDirty(false)
    setChangedBlockFields({})
    setActiveTemplateId(null)
    // The week grid stays as it is — opening a session used to auto-collapse it to
    // the strip, but the coach wants the week's contents in view while he edits.
    onOpened?.()
  }

  // A new session inherits the browsing filter's box — the coach is almost always
  // building for the box he is looking at.
  const openNewSession = dateKey =>
    setMetaModal({
      isEdit: false,
      draft: {
        ...emptyS(),
        date: dateKey || todayISO(),
        locationIds: [...defaultBoxIds],
      },
    })

  const closeEditor = () => {
    setForm(emptyS())
    setBlocks([])
    setEditing(null)
    setEditorOpen(false)
    setSessionMode('detalhado')
    setIsDirty(false)
    setChangedBlockFields({})
    setActiveTemplateId(null)
    setPendingClose(false)
  }

  // Closing throws the edit away. That was survivable while the button read
  // "Fechar"; as a red ✕ next to "Salvar" it is one slip away from losing a
  // session's worth of work, so it asks — but only when there IS work.
  const requestClose = () => {
    if (isDirty) setPendingClose(true)
    else closeEditor()
  }
  const cancelClose = () => setPendingClose(false)

  // ── Session meta (date/name/audience/visibility/box/briefing) ──────────────
  const commitMeta = draft => {
    const wasDate = form.date || todayISO()
    setMetaModal(null)

    if (metaModal?.isEdit) {
      // Moving an already-saved session to another day is the one meta change that
      // needs confirming — it rewrites which day the athletes see it on.
      if (editing && draft.date !== wasDate) {
        setPendingDate({ draft, oldDate: wasDate, newDate: draft.date })
        return
      }
      setForm(f => ({ ...f, ...draft }))
      setIsDirty(true)
      return
    }

    // New session — the meta dialog IS the create step.
    setForm(draft)
    setBlocks([])
    setEditing(null)
    setEditorOpen(true)
    setIsDirty(true)
    setChangedBlockFields({})
    setActiveTemplateId(null)
    onOpened?.()
  }

  // The move-to-another-day confirm's two answers. Keeping the day keeps every
  // OTHER meta edit — only the date reverts.
  const keepMetaDate = () => {
    if (pendingDate) setForm(f => ({ ...f, ...pendingDate.draft, date: pendingDate.oldDate }))
    setPendingDate(null)
  }
  const confirmMetaDate = () => {
    if (pendingDate) {
      setForm(f => ({ ...f, ...pendingDate.draft }))
      setIsDirty(true)
    }
    setPendingDate(null)
  }

  const openMetaEdit = () => setMetaModal({ isEdit: true, draft: { ...form } })

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveS = () => {
    const emptyBlocks = blocks.filter(
      bl =>
        bl.type !== 'Estações' &&
        !(bl.exercises || []).some(e => (e.name || '').trim() || e.isComplex),
    )
    if (emptyBlocks.length > 0) {
      alert('Há blocos sem exercícios preenchidos. Adicione ao menos um exercício antes de salvar.')
      return
    }
    const dateKey = form.date || todayISO()
    const savedId = editing?.id || form.id || uid()
    const session = {
      ...form,
      date: dateKey,
      blocks: materializeBlocks(normalizeLegacyCardio(blocks), loadRegistry()),
      id: savedId,
    }

    const targetDate = new Date(dateKey + 'T12:00:00')
    const today = new Date()
    const targetSunday = new Date(targetDate)
    targetSunday.setDate(targetDate.getDate() - targetDate.getDay())
    const thisSunday = new Date(today)
    thisSunday.setDate(today.getDate() - today.getDay())
    const targetWeekOffset = Math.round((targetSunday - thisSunday) / (7 * 24 * 60 * 60 * 1000))

    setSessions(prev => {
      const next = { ...prev }
      if (editing) {
        const oldKey = editing.dateKey
        if (oldKey !== dateKey) next[oldKey] = (next[oldKey] || []).filter(s => s.id !== editing.id)
        if ((next[dateKey] || []).some(s => s.id === editing.id))
          next[dateKey] = next[dateKey].map(s => (s.id === editing.id ? session : s))
        else next[dateKey] = [...(next[dateKey] || []), session]
      } else {
        next[dateKey] = [...(next[dateKey] || []), session]
      }
      return next
    })

    onSaved?.({ savedId, weekOffset: targetWeekOffset })
    closeEditor()
  }

  return {
    form,
    setForm,
    blocks,
    setBlocks,
    editing,
    editorOpen,
    setEditorOpen,
    isDirty,
    markDirty,
    changedBlockFields,
    setChangedBlockFields,
    trackBlockChange,
    activeTemplateId,
    setActiveTemplateId,
    metaModal,
    setMetaModal,
    openMetaEdit,
    pendingDate,
    keepMetaDate,
    confirmMetaDate,
    pendingClose,
    requestClose,
    cancelClose,
    closeEditor,
    sessionMode,
    setSessionMode,
    startEdit,
    openNewSession,
    commitMeta,
    saveS,
  }
}
