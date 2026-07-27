import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { inBoxScope, sessionBoxIds, getBoxScope, clearBoxScope } from './boxScope.js'

// inBoxScope is the pure predicate every public page composes onto its `public !== false`
// session filter — the integration-critical half of the per-box soft scoping.
//
// A session's own box tags decide a single audience: untagged sessions show only in the
// general/all view (no scope active); tagged sessions show only under a scope matching
// one of their tags — never in both.
describe('inBoxScope', () => {
  it('shows only box-less sessions when there is no active scope', () => {
    expect(inBoxScope({}, null)).toBe(true)
    expect(inBoxScope({ locationId: null }, null)).toBe(true)
    expect(inBoxScope({ locationIds: [] }, null)).toBe(true)
  })

  it('hides box-tagged sessions from the unscoped (all) view', () => {
    expect(inBoxScope({ locationId: 'b1' }, null)).toBe(false)
    expect(inBoxScope({ locationIds: ['b1'] }, null)).toBe(false)
    expect(inBoxScope({ locationIds: ['b1', 'b2'] }, null)).toBe(false)
  })

  it('keeps only sessions tagged with the scoped box (legacy singular field)', () => {
    expect(inBoxScope({ locationId: 'b1' }, 'b1')).toBe(true)
    expect(inBoxScope({ locationId: 'b2' }, 'b1')).toBe(false)
  })

  it('keeps sessions tagged with the scoped box among several (array field)', () => {
    expect(inBoxScope({ locationIds: ['b1', 'b2'] }, 'b1')).toBe(true)
    expect(inBoxScope({ locationIds: ['b1', 'b2'] }, 'b2')).toBe(true)
    expect(inBoxScope({ locationIds: ['b1', 'b2'] }, 'b3')).toBe(false)
  })

  it('hides box-less (legacy/unassigned) sessions inside a scoped view', () => {
    expect(inBoxScope({}, 'b1')).toBe(false)
    expect(inBoxScope({ locationId: null }, 'b1')).toBe(false)
    expect(inBoxScope({ locationId: undefined }, 'b1')).toBe(false)
    expect(inBoxScope({ locationIds: [] }, 'b1')).toBe(false)
  })
})

describe('sessionBoxIds', () => {
  it('prefers the locationIds array when present', () => {
    expect(sessionBoxIds({ locationIds: ['b1', 'b2'] })).toEqual(['b1', 'b2'])
    expect(sessionBoxIds({ locationIds: [], locationId: 'b1' })).toEqual([])
  })

  it('falls back to wrapping the legacy singular locationId', () => {
    expect(sessionBoxIds({ locationId: 'b1' })).toEqual(['b1'])
    expect(sessionBoxIds({ locationId: null })).toEqual([])
    expect(sessionBoxIds({})).toEqual([])
  })
})

// getBoxScope resolves the URL param and the sticky localStorage fallback.
describe('getBoxScope', () => {
  let store
  const setSearch = q => {
    globalThis.window = { location: { search: q } }
  }

  beforeEach(() => {
    store = {}
    globalThis.localStorage = {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v)
      },
      removeItem: k => {
        delete store[k]
      },
    }
    setSearch('')
  })
  afterEach(() => {
    delete globalThis.window
    delete globalThis.localStorage
  })

  it('reads ?box= and persists it as the sticky scope', () => {
    setSearch('?box=box-01')
    expect(getBoxScope()).toBe('box-01')
    expect(store.cone_box_scope).toBe('box-01')
  })

  it('falls back to the stored scope when the URL has no ?box=', () => {
    store.cone_box_scope = 'box-02'
    setSearch('')
    expect(getBoxScope()).toBe('box-02')
  })

  it('URL ?box= overrides a previously stored scope', () => {
    store.cone_box_scope = 'box-02'
    setSearch('?box=box-01')
    expect(getBoxScope()).toBe('box-01')
    expect(store.cone_box_scope).toBe('box-01')
  })

  it('?box=all and ?box= (empty) clear the scope', () => {
    store.cone_box_scope = 'box-02'
    setSearch('?box=all')
    expect(getBoxScope()).toBe(null)
    expect('cone_box_scope' in store).toBe(false)

    store.cone_box_scope = 'box-03'
    setSearch('?box=')
    expect(getBoxScope()).toBe(null)
    expect('cone_box_scope' in store).toBe(false)
  })

  it('returns null with no param and nothing stored', () => {
    expect(getBoxScope()).toBe(null)
  })

  it('clearBoxScope removes the stored scope', () => {
    store.cone_box_scope = 'box-02'
    clearBoxScope()
    expect('cone_box_scope' in store).toBe(false)
  })
})
