import { describe, test, expect } from 'vitest'
import { SEM_BOX } from '../../../../public/lib/sessions.js'
import { parseSession, serializeSession } from '../textFormat.js'
import { ENGINE_VERSION, suggestSession } from './index.js'
import {
  bumpAll,
  bumpVariant,
  budgetNote,
  checkedTypes,
  confirmRows,
  focusNoteOf,
  highlightParts,
  initialControls,
  isTouched,
  optionsOf,
  recordFor,
  scopeOf,
  summaryLine,
  toggleBlockType,
  weekdayLabel,
  widenNote,
} from './paneModel.js'
import { REGISTRY, standardBox } from './testFixtures.js'

const STRUCTURE = ['Aquecimento', 'Core', 'Força', 'LPO', 'Acessórios', 'For Time', 'Cardio']
const DAY = ['Core', 'Força', 'LPO', 'Acessórios', 'For Time', 'Cardio']

describe('scopeOf', () => {
  test('no tag is the Sem box history; a tag is its own box', () => {
    expect(scopeOf([])).toEqual({ scope: SEM_BOX, extra: 0 })
    expect(scopeOf(undefined)).toEqual({ scope: SEM_BOX, extra: 0 })
    expect(scopeOf(['eagles'])).toEqual({ scope: 'eagles', extra: 0 })
  })

  test('two or more tags use the first and say how many were left out', () => {
    expect(scopeOf(['eagles', 'garra', 'x'])).toEqual({ scope: 'eagles', extra: 2 })
  })
})

describe('optionsOf — an untouched pane sends the engine nothing', () => {
  test('initial controls → {}', () => {
    expect(optionsOf(initialControls())).toEqual({})
    expect(isTouched(initialControls())).toBe(false)
  })

  test('each control maps to its engine option; an empty or zero budget is dropped', () => {
    const c = {
      ...initialControls(),
      lpoLift: 'Clean',
      pattern: 'Puxar',
      budget: '90',
      widen: 'boxes',
      blockTypes: ['Força'],
    }
    expect(optionsOf(c)).toEqual({
      lpoLift: 'Clean',
      pattern: 'Puxar',
      budgetMin: 90,
      widen: 'boxes',
      blockTypes: ['Força'],
    })
    expect(optionsOf({ ...initialControls(), budget: '0' })).toEqual({})
    expect(optionsOf({ ...initialControls(), budget: '' })).toEqual({})
  })

  test('a bumped variant alone makes the pane "touched"', () => {
    expect(isTouched(bumpVariant(initialControls(), 'LPO'))).toBe(true)
  })
})

describe('the block list', () => {
  test('shows the engine’s day types until the user makes a list of their own', () => {
    expect(checkedTypes(initialControls(), DAY)).toBe(DAY)
  })

  test('the first untick materialises the day’s types into an explicit list', () => {
    const c = toggleBlockType(initialControls(), 'Core', DAY, STRUCTURE)
    expect(c.blockTypes).toEqual(['Força', 'LPO', 'Acessórios', 'For Time', 'Cardio'])
    expect(optionsOf(c).blockTypes).toEqual(c.blockTypes)
  })

  test('a ticked type lands where the box’s structure puts it, not at the end', () => {
    const c = toggleBlockType(initialControls(), 'Aquecimento', DAY, STRUCTURE)
    expect(c.blockTypes[0]).toBe('Aquecimento')
    expect(c.blockTypes).toHaveLength(DAY.length + 1)
  })

  test('the LAST ticked block cannot be unticked — an empty list means "not chosen" to the engine', () => {
    const one = { ...initialControls(), blockTypes: ['Força'] }
    expect(toggleBlockType(one, 'Força', DAY, STRUCTURE)).toBe(one)
    const auto = toggleBlockType(initialControls(), 'Core', ['Core'], STRUCTURE)
    expect(auto.blockTypes).toBe(null)
  })

  test('a type outside the structure sorts last instead of crashing', () => {
    const c = toggleBlockType(
      { ...initialControls(), blockTypes: ['Core'] },
      'Skill',
      DAY,
      STRUCTURE,
    )
    expect(c.blockTypes).toEqual(['Core', 'Skill'])
  })
})

describe('re-rolls', () => {
  test('↻ Outra bumps one block’s variant; ↻ Outra sessão bumps every block the day has', () => {
    const one = bumpVariant(bumpVariant(initialControls(), 'LPO'), 'LPO')
    expect(one.variants).toEqual({ LPO: 2 })
    expect(bumpAll(one, ['Core', 'LPO']).variants).toEqual({ Core: 1, LPO: 3 })
  })

  test('never mutates the controls it was given', () => {
    const c = initialControls()
    bumpVariant(c, 'LPO')
    expect(c.variants).toEqual({})
  })
})

describe('display strings', () => {
  test('summaryLine reads the controls back in one line', () => {
    expect(summaryLine(initialControls())).toBe('LPO automático · sem foco · sem limite')
    expect(
      summaryLine({ ...initialControls(), lpoLift: 'Clean', pattern: 'Puxar', budget: '90' }),
    ).toBe('LPO Clean · foco Puxar · 90 min')
  })

  test('budgetNote carries the figures only when the engine says it is over', () => {
    const c = { ...initialControls(), budget: '90' }
    expect(budgetNote({ overBudget: true, estimateMin: 103 }, c)).toEqual({
      estimate: 103,
      budget: 90,
      over: 13,
    })
    expect(budgetNote({ overBudget: false, estimateMin: 80 }, c)).toBe(null)
    expect(budgetNote({ overBudget: true, estimateMin: 103 }, initialControls())).toBe(null)
  })

  test('focusNoteOf picks the engine’s "foco ignorado" sentence off a block’s why', () => {
    const why = [
      'Força em 18 de 22 segundas (82%).',
      'Nenhum levantamento de Puxar no histórico — foco ignorado no Força.',
    ]
    expect(focusNoteOf(why)).toBe(why[1])
    expect(focusNoteOf(['x'])).toBe(null)
    expect(focusNoteOf(undefined)).toBe(null)
  })

  test('widenNote names what the history was widened to', () => {
    const meta = { historyCount: 189, weekdayCount: 36 }
    expect(widenNote({ widen: 'weekdays' }, meta, 'terças')).toBe(
      'Usando todos os dias do box — 189 sessões.',
    )
    expect(widenNote({ widen: 'boxes' }, meta, 'terças')).toBe(
      'Usando o histórico de todos os boxes — 36 terças em 189 sessões.',
    )
    expect(widenNote({ widen: null }, meta, 'terças')).toBe(null)
  })

  test('highlightParts marks numbers (decimal comma, percent) and keeps every character', () => {
    const line = "Meta 13' = 0,82 × cap (mediana de 8) · p 40%"
    const parts = highlightParts(line)
    expect(parts.map(p => p.text).join('')).toBe(line)
    expect(parts.filter(p => p.num).map(p => p.text)).toEqual(['13', '0,82', '8', '40%'])
  })

  test('weekdayLabel names the day the pane is about', () => {
    expect(weekdayLabel('2026-11-09')).toEqual({
      name: 'segunda',
      cap: 'Segunda',
      plural: 'segundas',
      dd: '09/11',
    })
    expect(weekdayLabel('2026-11-10').plural).toBe('terças')
    expect(weekdayLabel('2026-11-15').name).toBe('domingo')
  })

  test('confirmRows names what is about to be replaced — a linked Benchmark included', () => {
    const current = [
      { type: 'Aquecimento' },
      { type: 'Benchmark', benchmarkRef: 'Fran' },
      { type: '' },
    ]
    expect(confirmRows(current, 6)).toEqual([
      { label: 'Blocos atuais', value: '3 — Aquecimento, Fran, sem tipo' },
      { label: 'Blocos sugeridos', value: '6' },
    ])
  })
})

// The pane's whole contract with the engine, on a synthetic week (backups are personal data).
describe('against the engine', () => {
  const sessions = standardBox()
  const date = '2026-08-31'
  const run = c =>
    suggestSession({
      sessions,
      registry: REGISTRY,
      scope: SEM_BOX,
      date,
      options: optionsOf(c),
      variants: c.variants,
    })

  test('untouched controls give exactly the engine’s default session', () => {
    const a = run(initialControls())
    const b = suggestSession({ sessions, registry: REGISTRY, scope: SEM_BOX, date })
    expect(a.blocks.map(x => serializeSession({ blocks: [x] }))).toEqual(
      b.blocks.map(x => serializeSession({ blocks: [x] })),
    )
  })

  test('unticking a block removes it; ↻ Outra changes only its own block', () => {
    const base = run(initialControls())
    const dayTypes = base.meta.dayTypes
    const without = run(toggleBlockType(initialControls(), 'Core', dayTypes, base.meta.structure))
    expect(without.blocks.map(b => b.type)).toEqual(dayTypes.filter(t => t !== 'Core'))
    const rolled = run(bumpVariant(initialControls(), 'Core'))
    rolled.blocks.forEach((b, i) => {
      if (b.type !== 'Core')
        expect(serializeSession({ blocks: [b] })).toBe(
          serializeSession({ blocks: [base.blocks[i]] }),
        )
    })
  })

  test('the record Aplicar hands up carries the controls and re-parses to the applied blocks', () => {
    const c = bumpVariant({ ...initialControls(), lpoLift: 'Clean' }, 'LPO')
    const r = run(c)
    const rec = recordFor({
      scope: SEM_BOX,
      date,
      controls: c,
      blocks: r.blocks,
      at: '2026-08-30T12:00:00.000Z',
    })
    expect(rec).toMatchObject({
      engine: 'synth',
      version: ENGINE_VERSION,
      at: '2026-08-30T12:00:00.000Z',
      seedKey: `${SEM_BOX}|${date}`,
      options: { lpoLift: 'Clean' },
      variants: { LPO: 1 },
    })
    expect(rec.text).toBe(serializeSession({ blocks: r.blocks }))
    expect(parseSession(rec.text, { registry: REGISTRY }).warnings).toEqual([])
  })
})
