import { useState } from 'react'
import { uid, todayISO, loadSettings, saveSettings } from '../../../utils/storage'

// ── useBoxWarnings (#53) ──────────────────────────────────────────────────────
// "Avisos do box" for index.html — a dated list. Each: { id, date, message, box, active }
// where box is a locationId or 'all' (gym-wide). Lives in settings.value (anon-readable;
// locations is anon-locked #81 and the index is public). The index shows the 3 most recent
// active in-scope ones.
export function useBoxWarnings() {
  const [boxWarnings, setBoxWarnings] = useState(() => {
    const w = loadSettings().boxWarnings
    return Array.isArray(w) ? w : []
  })

  // Read-merge-write the whole settings blob (mirrors Config.jsx) so theme/gymName survive.
  const persistWarnings = list => {
    setBoxWarnings(list)
    saveSettings({ ...loadSettings(), boxWarnings: list })
  }
  // Returns the new id — mobile's "+ Adicionar" opens the edit sheet straight onto
  // the row it just created, rather than leaving the coach to find it in the list.
  const addWarning = key => {
    const id = uid()
    persistWarnings([{ id, date: todayISO(), box: key, message: '', active: true }, ...boxWarnings])
    return id
  }
  const patchWarning = (id, patch) =>
    persistWarnings(boxWarnings.map(w => (w.id === id ? { ...w, ...patch } : w)))
  const removeWarning = id => persistWarnings(boxWarnings.filter(w => w.id !== id))

  return { boxWarnings, addWarning, patchWarning, removeWarning }
}
