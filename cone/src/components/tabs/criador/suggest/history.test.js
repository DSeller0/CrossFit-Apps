import { describe, test, expect } from 'vitest'
import { SEM_BOX } from '../../../../public/lib/sessions.js'
import { buildRegistryIndex } from '../../../../public/lib/registry.js'
import {
  addDays,
  buildHistory,
  daysBetween,
  inHistoryScope,
  keepSession,
  readBlock,
  readRow,
  weekStartOf,
  weekdayOf,
} from './history.js'
import { REGISTRY, blob, session } from './testFixtures.js'

const index = buildRegistryIndex(REGISTRY)

describe('dates', () => {
  test('weeks start on Sunday; days count across a month end', () => {
    expect(weekdayOf('2026-10-05')).toBe(1)
    expect(weekStartOf('2026-10-09')).toBe('2026-10-04')
    expect(weekStartOf('2026-10-04')).toBe('2026-10-04')
    expect(addDays('2026-09-28', 7)).toBe('2026-10-05')
    expect(daysBetween('2026-09-21', '2026-10-05')).toBe(14)
  })
})

describe('keepSession', () => {
  test('public sessions only, minus the ones the user names as tests', () => {
    expect(keepSession({ blocks: [] })).toBe(true)
    expect(keepSession({ public: true })).toBe(true)
    expect(keepSession({ public: false })).toBe(false)
    expect(keepSession({ sessionName: 'TESTE MOBILE - apagar' })).toBe(false)
    expect(keepSession({ name: 'apagar depois' })).toBe(false)
  })
})

describe('inHistoryScope', () => {
  const untagged = { locationIds: [] }
  const eagles = { locationIds: ['eagles'] }
  const legacy = { locationId: 'eagles' }
  const orphan = { locationIds: ['mserdetyu9xan6rl7gl'] }

  test('SEM_BOX is the untagged sessions; a box is its own tags (legacy locationId too)', () => {
    expect(inHistoryScope(untagged, '2026-10-05', SEM_BOX, [])).toBe(true)
    expect(inHistoryScope(eagles, '2026-10-05', SEM_BOX, [])).toBe(false)
    expect(inHistoryScope(eagles, '2026-10-05', 'eagles', [])).toBe(true)
    expect(inHistoryScope(legacy, '2026-10-05', 'eagles', [])).toBe(true)
  })

  test('an orphan location id feeds neither the main box nor a real box', () => {
    expect(inHistoryScope(orphan, '2026-10-05', SEM_BOX, [])).toBe(false)
    expect(inHistoryScope(orphan, '2026-10-05', 'eagles', [])).toBe(false)
  })

  test('historyFromUntagged links the named main box to the untagged sessions up to `until`', () => {
    const locations = [{ id: 'main', historyFromUntagged: { until: '2026-10-31' } }]
    expect(inHistoryScope(untagged, '2026-10-31', 'main', locations)).toBe(true)
    expect(inHistoryScope(untagged, '2026-11-01', 'main', locations)).toBe(false)
    expect(inHistoryScope(eagles, '2026-10-05', 'main', locations)).toBe(false)
    expect(inHistoryScope(untagged, '2026-10-05', 'other', locations)).toBe(false)
  })
})

describe('buildHistory', () => {
  const sessions = blob([
    session('2026-09-28', 'Core\n15 V-up'),
    session('2026-10-05', 'Core\n15 V-up'), // Monday — the poisoned target in these tests
    session('2026-10-06', 'Core\n15 V-up'),
    session('2026-10-08', 'Core\n15 V-up'),
    session('2026-10-10', 'Core\n15 V-up'),
    session('2026-10-12', 'Core\n15 V-up'), // the next week
    session('2026-10-07', 'Core\n15 V-up', { public: false }),
    session('2026-10-01', 'Core\n15 V-up', { locationIds: ['eagles'] }),
  ])
  const dates = h => h.map(e => e.date)

  test('the target date itself never feeds its own suggestion', () => {
    const live = buildHistory({ sessions, scope: SEM_BOX, date: '2026-10-05' })
    const back = buildHistory({ sessions, scope: SEM_BOX, date: '2026-10-05', lookAhead: false })
    expect(dates(live)).not.toContain('2026-10-05')
    expect(dates(back)).not.toContain('2026-10-05')
  })

  test('live: strictly earlier dates plus the LATER days of the same week, never the next week', () => {
    const h = buildHistory({ sessions, scope: SEM_BOX, date: '2026-10-08' })
    expect(dates(h)).toEqual(['2026-09-28', '2026-10-05', '2026-10-06', '2026-10-10'])
  })

  test('backtest: strictly earlier dates only — it cannot know whether a later day was typed', () => {
    const h = buildHistory({ sessions, scope: SEM_BOX, date: '2026-10-08', lookAhead: false })
    expect(dates(h)).toEqual(['2026-09-28', '2026-10-05', '2026-10-06'])
  })

  test('hidden and other-box sessions stay out; `allBoxes` widens to every box', () => {
    const h = buildHistory({ sessions, scope: SEM_BOX, date: '2026-10-09', lookAhead: false })
    expect(dates(h)).not.toContain('2026-10-07')
    expect(dates(h)).not.toContain('2026-10-01')
    const wide = buildHistory({ sessions, scope: SEM_BOX, date: '2026-10-09', allBoxes: true })
    expect(dates(wide)).toContain('2026-10-01')
    expect(dates(wide)).not.toContain('2026-10-07')
  })

  test('each entry carries its weekday and its Sunday', () => {
    const [first] = buildHistory({ sessions, scope: SEM_BOX, date: '2026-10-05' })
    expect(first).toMatchObject({ date: '2026-09-28', dow: 1, week: '2026-09-27' })
  })
})

describe('readRow', () => {
  test('volume typed into the name is peeled off the way Texto reads it', () => {
    const run = readRow({ name: '800m Run', reps: '', dist: '' }, index)
    expect(run).toMatchObject({ kind: 'single', raw: 'Run', dist: '800', distUnit: 'm' })
    expect(run.entry.name).toBe('Run')
    const sn = readRow({ name: '30 DB Snatch', reps: '' }, index)
    expect(sn).toMatchObject({ reps: '30', raw: 'DB Snatch' })
  })

  test('an unresolved name stays unresolved — never guessed', () => {
    const r = readRow({ name: 'Shoulder Press', reps: '5' }, index)
    expect(r.kind).toBe('single')
    expect(r.entry).toBe(null)
  })

  test('complexes keep every movement; rest rows are rest', () => {
    const cx = readRow(
      {
        isComplex: true,
        complexMovements: [
          { name: 'Power Snatch', reps: '1' },
          { name: 'Overhead Squat', reps: '2' },
        ],
      },
      index,
    )
    expect(cx.kind).toBe('complex')
    expect(cx.movements.map(m => m.entry?.name)).toEqual(['Power Snatch', 'Overhead Squat'])
    expect(readRow({ name: 'Rest', reps: "2'" }, index).kind).toBe('rest')
    expect(readRow({ name: "Rest 2' entre sets" }, index).kind).toBe('rest')
  })

  test('"Rest-pause Bench Press" is a bench press, not a rest', () => {
    const r = readRow({ name: 'Rest-pause Bench Press', reps: '5' }, index)
    expect(r.kind).toBe('single')
  })

  test('an Estações block is read from its stations — the side its type reads', () => {
    const [b] = session('2026-10-01', 'Estações\nGrupo A 4:00\n800m Run\nDescanso 1:00').blocks
    expect(readBlock(b, index).map(r => r.raw)).toEqual(['Run'])
  })
})
