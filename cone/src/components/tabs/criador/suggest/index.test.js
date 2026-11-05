import { describe, test, expect } from 'vitest'
import { SEM_BOX } from '../../../../public/lib/sessions.js'
import { parseSession, serializeBlock, serializeSession } from '../textFormat.js'
import { ENGINE_VERSION, THIN_WEEKDAY_SESSIONS, suggestSession, suggestionRecord } from './index.js'
import { REGISTRY, blob, session, standardBox, stripIds } from './testFixtures.js'

// Twelve weeks, 07/06 → 29/08; the suggested week is the next one.
const WEEK = { mon: '2026-08-31', tue: '2026-09-01', wed: '2026-09-02', fri: '2026-09-04' }
const box = standardBox()
const suggest = (over = {}) =>
  suggestSession({ sessions: box, registry: REGISTRY, scope: SEM_BOX, date: WEEK.mon, ...over })
const texts = r => r.blocks.map(b => serializeBlock(b))

describe('suggestSession', () => {
  test('a session in the box order, a why per block, and the meta the pane reads', () => {
    const r = suggest()
    expect(r.blocks.map(b => b.type)).toEqual([
      'Core',
      'Força',
      'LPO',
      'Acessórios',
      'For Time',
      'Cardio',
    ])
    expect(r.why).toHaveLength(r.blocks.length)
    r.why.forEach(lines => expect(lines.length).toBeGreaterThan(1))
    expect(r.why[0][0]).toBe('Core em 12 de 12 segundas (100%).')
    expect(r.meta).toMatchObject({
      engineVersion: ENGINE_VERSION,
      seedKey: `${SEM_BOX}|2026-08-31`,
      historyCount: 48,
      weekdayCount: 12,
      thin: false,
      overBudget: false,
      structure: [
        'Aquecimento',
        'Core',
        'Força',
        'LPO',
        'Acessórios',
        'EMOM',
        'For Time',
        'Cardio',
      ],
    })
    expect(r.meta.estimateMin).toBeGreaterThan(0)
  })

  test('deterministic per scope|date|blockType|variant — the same day reads the same', () => {
    Object.values(WEEK).forEach(date =>
      expect(stripIds(suggest({ date }))).toEqual(stripIds(suggest({ date }))),
    )
  })

  test('blocks are fresh: new ids on every block, exercise and movement', () => {
    const a = suggest()
    const b = suggest()
    expect(a.blocks[0].id).not.toBe(b.blocks[0].id)
    const ids = a.blocks.flatMap(bl => [bl.id, ...(bl.exercises || []).map(e => e.id)])
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('"↻ Outra" re-rolls its own block and nothing else', () => {
    const base = suggest()
    for (const type of ['LPO', 'Força', 'Core', 'For Time']) {
      const r = suggest({ variants: { [type]: 1 } })
      r.blocks.forEach((b, i) => {
        if (b.type === type) return
        expect(serializeBlock(b)).toBe(texts(base)[i])
        expect(r.why[i]).toEqual(base.why[i])
      })
    }
    // Core draws from six movements, so its re-roll really is another block. (In this fixture
    // every LPO slot has exactly one drill — a re-roll there can only redraw the same one.)
    const core = suggest({ variants: { Core: 1 } })
    expect(serializeBlock(core.blocks[0])).not.toBe(texts(base)[0])
  })

  test('the poison test: a session dated D changes nothing in D’s suggestion', () => {
    const poison = session(
      WEEK.mon,
      "Força\n5x5 Deadlift 95%\n\nLPO – Jerk\n3 Split Jerk 90%\n\nAMRAP 20'\n50 Burpee",
    )
    const poisoned = { ...box, [WEEK.mon]: [poison] }
    for (const lookAhead of [true, false]) {
      const clean = suggestSession({
        sessions: box,
        registry: REGISTRY,
        scope: SEM_BOX,
        date: WEEK.mon,
        lookAhead,
      })
      const dirty = suggestSession({
        sessions: poisoned,
        registry: REGISTRY,
        scope: SEM_BOX,
        date: WEEK.mon,
        lookAhead,
      })
      expect(stripIds(dirty)).toEqual(stripIds(clean))
    }
  })

  test('the backtest view never sees a later day of the week; the live one does', () => {
    const later = { ...box, [WEEK.wed]: [session(WEEK.wed, 'Força\n3x3 Back Squat 70/80/90%')] }
    const run = (sessions, lookAhead) =>
      stripIds(
        suggestSession({ sessions, registry: REGISTRY, scope: SEM_BOX, date: WEEK.mon, lookAhead }),
      )
    expect(run(later, false)).toEqual(run(box, false))
    expect(run(later, true).meta.historyCount).toBe(run(box, true).meta.historyCount + 1)
  })

  test('every generated session round-trips Texto with 0 warnings and comes back unchanged', () => {
    const cases = [
      ...Object.values(WEEK).map(date => ({ date })),
      { variants: { LPO: 1, Força: 1, Core: 2 } },
      { options: { pattern: 'Puxar' } },
      { options: { lpoLift: 'Clean' } },
      { date: WEEK.tue, options: { blockTypes: ['Aquecimento', 'Força', 'EMOM', 'Cardio'] } },
    ]
    for (const c of cases) {
      const r = suggest(c)
      expect(r.blocks.length).toBeGreaterThan(0)
      const text = serializeSession(r)
      const back = parseSession(text, { registry: REGISTRY })
      expect(back.warnings).toEqual([])
      expect(serializeSession(back)).toBe(text)
    }
  })

  test('no %RM ends in anything but 0 or 5, whatever the history wrote', () => {
    const offGrid = standardBox({
      tweak: (d, w, t) => t.replace(/85%/g, '87%').replace(/90%/g, '92%'),
    })
    const pcts = []
    for (const date of Object.values(WEEK)) {
      const r = suggestSession({ sessions: offGrid, registry: REGISTRY, scope: SEM_BOX, date })
      r.blocks.forEach(b =>
        (b.exercises || []).forEach(ex => {
          const ins = ex.intensity
          if (ins?.mode === 'pct') pcts.push(Number(ins.pct))
          if (ins?.mode === 'progression')
            ins.steps.filter(s => /%/.test(s.unit)).forEach(s => pcts.push(Number(s.load)))
        }),
      )
    }
    expect(pcts.length).toBeGreaterThan(10)
    expect(pcts.filter(p => p % 5)).toEqual([])
  })

  test('the canonical order follows a durable move, from a fixture whose Acessórios moved', () => {
    // Acessórios opens the day for six weeks, then moves after LPO for six.
    const moveUp = t => {
      const parts = t.split('\n\n')
      const i = parts.findIndex(p => p.startsWith('Acessórios'))
      const [acc] = parts.splice(i, 1)
      parts.splice(1, 0, acc)
      return parts.join('\n\n')
    }
    const moved = standardBox({ tweak: (d, w, t) => (w < 6 ? moveUp(t) : t) })
    const types = date =>
      suggestSession({ sessions: moved, registry: REGISTRY, scope: SEM_BOX, date }).blocks.map(
        b => b.type,
      )
    expect(types('2026-07-20')).toEqual([
      'Core',
      'Acessórios',
      'Força',
      'LPO',
      'For Time',
      'Cardio',
    ])
    expect(types(WEEK.mon)).toEqual(['Core', 'Força', 'LPO', 'Acessórios', 'For Time', 'Cardio'])
  })
})

describe('thin data', () => {
  test('a box with no sessions returns no blocks, historyCount 0 and a reason', () => {
    const r = suggestSession({ sessions: box, registry: REGISTRY, scope: 'garra', date: WEEK.mon })
    expect(r.blocks).toEqual([])
    expect(r.why).toEqual([])
    expect(r.meta).toMatchObject({ historyCount: 0, weekdayCount: 0, thin: true })
    expect(r.meta.thinReason).toBe('Nenhuma sessão no histórico deste box.')
  })

  test(`fewer than ${THIN_WEEKDAY_SESSIONS} sessions on the weekday is thin, and says so`, () => {
    const one = blob([session('2026-08-24', "Core\n3 rounds\n15 V-up\n\nCardio\n40' Run")])
    const r = suggestSession({ sessions: one, registry: REGISTRY, scope: SEM_BOX, date: WEEK.mon })
    expect(r.meta).toMatchObject({ weekdayCount: 1, thin: true })
    expect(r.meta.thinReason).toBe(
      `Só 1 segunda no histórico deste box (mínimo ${THIN_WEEKDAY_SESSIONS}).`,
    )
  })

  test('the fallbacks: every weekday of the box, or every box', () => {
    const thursday = '2026-09-03' // the box never trains on a Thursday
    const plain = suggestSession({
      sessions: box,
      registry: REGISTRY,
      scope: SEM_BOX,
      date: thursday,
    })
    expect(plain.blocks).toEqual([])
    expect(plain.meta.thin).toBe(true)
    const wide = suggestSession({
      sessions: box,
      registry: REGISTRY,
      scope: SEM_BOX,
      date: thursday,
      options: { widen: 'weekdays' },
    })
    expect(wide.blocks.length).toBeGreaterThan(0)
    expect(wide.meta.thin).toBe(false)
    const other = suggestSession({
      sessions: box,
      registry: REGISTRY,
      scope: 'garra',
      date: WEEK.mon,
      options: { widen: 'boxes' },
    })
    expect(other.blocks.length).toBeGreaterThan(0)
  })
})

describe('options', () => {
  test('blockTypes picks the blocks, still in the box order', () => {
    const r = suggest({ options: { blockTypes: ['Cardio', 'Força', 'Benchmark'] } })
    expect(r.blocks.map(b => b.type)).toEqual(['Força', 'Cardio'])
    expect(r.why[0][0]).toBe('Força: escolhido por você.')
    expect(r.meta.skipped).toEqual([{ type: 'Benchmark', reason: 'Benchmark não é gerado.' }])
  })

  test('budgetMin only warns — it never trims a block', () => {
    const free = suggest()
    const tight = suggest({ options: { budgetMin: 20 } })
    expect(tight.meta.overBudget).toBe(true)
    expect(tight.meta.estimateMin).toBe(free.meta.estimateMin)
    expect(texts(tight)).toEqual(texts(free))
    expect(suggest({ options: { budgetMin: 600 } }).meta.overBudget).toBe(false)
  })
})

describe('suggestionRecord', () => {
  test('the provenance snapshot Phase 3 saves on the session', () => {
    const r = suggest({ variants: { LPO: 1 } })
    const rec = suggestionRecord({
      scope: SEM_BOX,
      date: WEEK.mon,
      options: {},
      variants: { LPO: 1 },
      blocks: r.blocks,
      at: '2026-08-30T12:00:00.000Z',
    })
    expect(rec).toEqual({
      engine: 'synth',
      version: ENGINE_VERSION,
      at: '2026-08-30T12:00:00.000Z',
      seedKey: `${SEM_BOX}|2026-08-31`,
      variants: { LPO: 1 },
      options: {},
      text: serializeSession(r),
    })
  })
})
