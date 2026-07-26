// #109/plans/45 — initRegistry used to write during load (saveRegistry called from
// inside the function whenever a migration/re-sort was needed). Extracted so it can be
// tested in isolation and so the write decision moves to the caller: these tests pin
// that initRegistry itself never touches storage, only loadRegistry + `needsSave`.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../utils/storage', () => ({ loadRegistry: vi.fn() }))

import { loadRegistry } from '../../utils/storage'
import { initRegistry, BLOCK_ORDER, sortCat, getExName } from './exerciciosHelpers.js'

const emptyReg = () => Object.fromEntries(BLOCK_ORDER.map(n => [n, []]))

describe('initRegistry', () => {
  beforeEach(() => { loadRegistry.mockReset() })

  it('needsSave is false for an already-migrated, already-sorted registry (zero writes on a normal load)', () => {
    const reg = emptyReg()
    reg['Força'] = [{ name: 'Agachamento' }, { name: 'Levantamento Terra' }]
    loadRegistry.mockReturnValue(reg)

    const { registry, needsSave } = initRegistry()
    expect(needsSave).toBe(false)
    expect(registry['Força']).toEqual(reg['Força'])
  })

  it('needsSave is true and migration is lossless when entries are still bare strings', () => {
    const raw = emptyReg()
    raw['Força'] = ['Zercada', 'Agachamento']
    loadRegistry.mockReturnValue(raw)

    const { registry, needsSave } = initRegistry()
    expect(needsSave).toBe(true)
    expect(registry['Força'].map(e => e.name)).toEqual(['Agachamento', 'Zercada'])
  })

  it('needsSave is true when a category is missing from the stored registry', () => {
    const raw = emptyReg()
    delete raw['Skill']
    loadRegistry.mockReturnValue(raw)

    const { registry, needsSave } = initRegistry()
    expect(needsSave).toBe(true)
    expect(registry['Skill']).toEqual([])
  })

  it('needsSave is true on a first-ever load (nothing stored yet)', () => {
    loadRegistry.mockReturnValue(null)

    const { registry, needsSave } = initRegistry()
    expect(needsSave).toBe(true)
    BLOCK_ORDER.forEach(n => expect(registry[n]).toEqual([]))
  })

  it('re-sorts accented names with localeCompare(pt) and flags needsSave when order changes', () => {
    const raw = emptyReg()
    raw['Força'] = [{ name: 'Órbita' }, { name: 'Agachamento' }, { name: 'Ávila' }]
    loadRegistry.mockReturnValue(raw)

    const { registry, needsSave } = initRegistry()
    expect(needsSave).toBe(true)
    expect(registry['Força'].map(e => e.name)).toEqual(['Agachamento', 'Ávila', 'Órbita'])
  })
})

describe('sortCat / getExName', () => {
  it('sorts a mix of string and object entries by name, pt locale', () => {
    expect(sortCat(['Zumba', { name: 'Agachamento' }]).map(getExName)).toEqual(['Agachamento', 'Zumba'])
  })
})
