// Soft per-box view scope — a `?box=<locationId>` URL param filters the public pages to
// one box's sessions. It is a VIEW FILTER for sharing/testing, NOT access control: the
// data layer is anon-read-all, so a scoped link only tidies what's shown (see docs/plans).
//
// The scope sticks via localStorage so it survives navigation between public pages (each
// is its own HTML entry, so nav is a full reload) — mirroring the `cone_athlete_filter`
// stickiness pattern. `?box=all` / empty clears it.

const KEY = 'cone_box_scope'

// Resolve the active box scope: a fresh `?box=` wins and is persisted; otherwise fall
// back to the last stored scope. Returns a locationId string, or null for "all boxes".
export function getBoxScope() {
  try {
    const p = new URLSearchParams(window.location.search).get('box')
    if (p !== null) {
      if (p === '' || p === 'all') {
        localStorage.removeItem(KEY)
        return null
      }
      localStorage.setItem(KEY, p)
      return p
    }
    return localStorage.getItem(KEY) || null
  } catch {
    return null
  }
}

export function clearBoxScope() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

// A session's box tags, normalized to an array. Canonical field is `locationIds`; a
// session saved before multi-box support only has the singular `locationId` — read-side
// fallback, never written for new saves (Criador always writes `locationIds`).
export function sessionBoxIds(session) {
  if (Array.isArray(session.locationIds)) return session.locationIds
  return session.locationId ? [session.locationId] : []
}

// True if a session belongs in the active scope. A session's own box tags decide which
// single audience sees it — never both:
//   - No tags ("Sem box")   → visible only with no scope active (the general/all view).
//   - One or more tags      → visible only under a scope matching one of those tags,
//                              not in the untagged general view.
// So a box-tagged session is invisible on the plain, unscoped page — it only ever shows
// up via its own box's link.
export function inBoxScope(session, box) {
  const boxes = sessionBoxIds(session)
  return box ? boxes.includes(box) : boxes.length === 0
}
