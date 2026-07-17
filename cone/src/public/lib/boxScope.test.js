import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { inBoxScope, getBoxScope, clearBoxScope } from './boxScope.js'

// inBoxScope is the pure predicate every public page composes onto its `public !== false`
// session filter — the integration-critical half of the per-box soft scoping.
describe('inBoxScope', () => {
  it('passes every session when there is no active scope', () => {
    expect(inBoxScope({ locationId: 'b1' }, null)).toBe(true)
    expect(inBoxScope({ locationId: null }, null)).toBe(true)
    expect(inBoxScope({}, null)).toBe(true)
  })

  it('keeps only sessions belonging to the scoped box', () => {
    expect(inBoxScope({ locationId: 'b1' }, 'b1')).toBe(true)
    expect(inBoxScope({ locationId: 'b2' }, 'b1')).toBe(false)
  })

  it('hides box-less (legacy/unassigned) sessions inside a scoped view', () => {
    expect(inBoxScope({}, 'b1')).toBe(false)
    expect(inBoxScope({ locationId: null }, 'b1')).toBe(false)
    expect(inBoxScope({ locationId: undefined }, 'b1')).toBe(false)
  })
})

// getBoxScope resolves the URL param and the sticky localStorage fallback.
describe('getBoxScope', () => {
  let store
  const setSearch = q => { globalThis.window = { location: { search: q } } }

  beforeEach(() => {
    store = {}
    globalThis.localStorage = {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: k => { delete store[k] },
    }
    setSearch('')
  })
  afterEach(() => { delete globalThis.window; delete globalThis.localStorage })

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
