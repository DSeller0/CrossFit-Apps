// Device-local export colour selection (#59 C5·b1 step d, plans/82 decision 6) —
// mirrors public/lib/boxScope.js's `cone_box_scope` pattern exactly, one key for the
// Origem pick and one for the Personalizado overrides. SPA-only (Publicador is not
// gallery-rendered), so — unlike exportPalette.js — this may touch localStorage
// directly; it stays out of exportPalette.js on purpose to keep that module pure.
//
// `origin`: null ("meu tema") | a locationId string | '__custom__' (Personalizado).

const KEY_SOURCE = 'cone_export_source'
const KEY_CUSTOM = 'cone_export_custom'

export function getExportSource() {
  try {
    return localStorage.getItem(KEY_SOURCE) || null
  } catch {
    return null
  }
}

export function setExportSource(origin) {
  try {
    if (origin) localStorage.setItem(KEY_SOURCE, origin)
    else localStorage.removeItem(KEY_SOURCE)
  } catch {
    /* ignore */
  }
}

export function getExportCustom() {
  try {
    const raw = localStorage.getItem(KEY_CUSTOM)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setExportCustom(custom) {
  try {
    localStorage.setItem(KEY_CUSTOM, JSON.stringify(custom || {}))
  } catch {
    /* ignore */
  }
}
