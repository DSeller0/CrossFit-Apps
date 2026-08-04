import { useState, useMemo } from 'react'
import { uid, toISO, todayISO, loadTemplates, saveTemplates } from '../../../utils/storage'
import { cloneBlocks, normalizeLegacyCardio } from './blockModel.js'

// ── useTemplates ──────────────────────────────────────────────────────────────
// The saved-template list and the recurring generator that fans one of them across
// a date range. Templates are an EDITOR feature — saving one reads the open
// session's blocks, applying one writes them — so the editor API arrives as one
// `editor` argument (useSessionEditor's return) rather than a dozen setters.
// `activeTemplateId` stays on the editor: every open/close/create path clears it.
export function useTemplates({ editor, setSessions, defaultBoxIds }) {
  const [templates, setTemplates] = useState(loadTemplates)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateFlash, setTemplateFlash] = useState(null)
  const [showUpdateTemplateModal, setShowUpdateTemplateModal] = useState(false)
  const [recurringTpl, setRecurringTpl] = useState(null)
  const [recurDays, setRecurDays] = useState(new Set([1, 3, 5]))
  const [recurStart, setRecurStart] = useState(todayISO)
  const [recurEnd, setRecurEnd] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 28)
    return toISO(d)
  })
  const [recurDone, setRecurDone] = useState(null)

  const saveAsTemplate = () => {
    const name = (editor.form.sessionName || '').trim() || `Template ${templates.length + 1}`
    const tpl = { id: uid(), name, blocks: cloneBlocks(editor.blocks) }
    const updated = [...templates, tpl]
    setTemplates(updated)
    saveTemplates(updated)
    editor.setActiveTemplateId(tpl.id)
    setTemplateFlash(name)
    setTimeout(() => setTemplateFlash(null), 2000)
  }

  const applyTemplate = tpl => {
    editor.setBlocks(normalizeLegacyCardio(cloneBlocks(tpl.blocks)))
    editor.setForm(f => ({ ...f, sessionName: f.sessionName || tpl.name }))
    setShowTemplateModal(false)
    editor.setActiveTemplateId(tpl.id)
    editor.setChangedBlockFields({})
    // A template applied from the week view has to land somewhere — open the editor.
    if (!editor.editorOpen) editor.setEditorOpen(true)
    editor.markDirty()
  }

  const deleteTemplate = id => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    saveTemplates(updated)
  }

  const updateTemplate = () => {
    if (!editor.activeTemplateId) return
    setTemplates(prev => {
      const updated = prev.map(t =>
        t.id === editor.activeTemplateId ? { ...t, blocks: cloneBlocks(editor.blocks) } : t,
      )
      saveTemplates(updated)
      return updated
    })
    editor.setActiveTemplateId(null)
    setShowUpdateTemplateModal(false)
  }

  const activeTemplateName = templates.find(t => t.id === editor.activeTemplateId)?.name || ''

  // Recurring
  const recurPreviewDates = useMemo(() => {
    if (!recurStart || !recurEnd) return []
    const out = []
    const cur = new Date(recurStart + 'T12:00:00')
    const end = new Date(recurEnd + 'T12:00:00')
    while (cur <= end) {
      if (recurDays.has(cur.getDay())) out.push(toISO(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return out
  }, [recurStart, recurEnd, recurDays])

  const applyRecurring = () => {
    if (!recurringTpl || !recurPreviewDates.length) return
    setSessions(prev => {
      const next = { ...prev }
      recurPreviewDates.forEach(dateKey => {
        const session = {
          id: uid(),
          date: dateKey,
          sessionName: recurringTpl.name,
          mainTraining: [],
          locationIds: [...defaultBoxIds],
          blocks: cloneBlocks(recurringTpl.blocks),
        }
        next[dateKey] = [...(next[dateKey] || []), session]
      })
      return next
    })
    setRecurDone(recurPreviewDates.length)
    setTimeout(() => {
      setRecurDone(null)
      setRecurringTpl(null)
    }, 2500)
  }

  return {
    templates,
    showTemplateModal,
    setShowTemplateModal,
    templateFlash,
    showUpdateTemplateModal,
    setShowUpdateTemplateModal,
    activeTemplateName,
    saveAsTemplate,
    applyTemplate,
    deleteTemplate,
    updateTemplate,
    recurringTpl,
    setRecurringTpl,
    recurDays,
    setRecurDays,
    recurStart,
    setRecurStart,
    recurEnd,
    setRecurEnd,
    recurPreviewDates,
    recurDone,
    applyRecurring,
  }
}
