// Soft per-box view scope — a `?box=<locationId>` URL param filters the public pages to
// one box's sessions. It is a VIEW FILTER for sharing/testing, NOT access control: the
// data layer is anon-read-all, so a scoped link only tidies what's shown (see docs/plans).
//
// The scope sticks via localStorage so it survives navigation between public pages (each
// is its own HTML entry, so nav is a full reload) — mirroring the `cone_athlete_filter`
// stickiness pattern. `?box=all` / empty clears it.

const KEY = 'cone_box_scope';

// Resolve the active box scope: a fresh `?box=` wins and is persisted; otherwise fall
// back to the last stored scope. Returns a locationId string, or null for "all boxes".
export function getBoxScope() {
  try {
    const p = new URLSearchParams(window.location.search).get('box');
    if (p !== null) {
      if (p === '' || p === 'all') { localStorage.removeItem(KEY); return null; }
      localStorage.setItem(KEY, p);
      return p;
    }
    return localStorage.getItem(KEY) || null;
  } catch { return null; }
}

export function clearBoxScope() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

// True if a session belongs in the active scope. No scope → everything passes; a scoped
// view hides sessions from other boxes AND box-less (legacy/unassigned) sessions.
export function inBoxScope(session, box) {
  return !box || (session.locationId || null) === box;
}
