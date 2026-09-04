import { describe, test, expect } from 'vitest'
import {
  distributeZones,
  zoneCollapseMessage,
  zoneColumnWidths,
  visibleWeekDates,
  ALL_WEEK_DAYS,
  monthCellSessions,
  MONTH_CELL_MAX_ROWS,
} from './layoutHelpers.js'

describe('distributeZones', () => {
  const blocks = [
    { id: 'a', zone: 'Zona 01' },
    { id: 'b', zone: 'Zona 02' },
    { id: 'c', zone: 'Zona 03' },
    { id: 'd', zone: 'Zona 03' },
  ]

  test('3 zonas — every block stays in its own column, nothing collapses', () => {
    const { columns, collapsed, collapseInto } = distributeZones(blocks, 3)
    expect(columns.map(c => c.zone)).toEqual(['Zona 01', 'Zona 02', 'Zona 03'])
    expect(columns.map(c => c.blocks.map(b => b.id))).toEqual([['a'], ['b'], ['c', 'd']])
    expect(collapsed).toEqual([])
    expect(collapseInto).toBeNull()
  })

  test('2 zonas — Zona 03 collapses into Zona 02, and says so', () => {
    const { columns, collapsed, collapseInto } = distributeZones(blocks, 2)
    expect(columns.map(c => c.zone)).toEqual(['Zona 01', 'Zona 02'])
    expect(columns[1].blocks.map(b => b.id)).toEqual(['b', 'c', 'd'])
    expect(collapsed).toEqual([{ zone: 'Zona 03', count: 2 }])
    expect(collapseInto).toBe('Zona 02')
  })

  test('1 zona — Zona 02 and Zona 03 both collapse into Zona 01, nothing dropped', () => {
    const { columns, collapsed, collapseInto } = distributeZones(blocks, 1)
    expect(columns).toHaveLength(1)
    expect(columns[0].blocks.map(b => b.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(collapsed).toEqual([
      { zone: 'Zona 02', count: 1 },
      { zone: 'Zona 03', count: 2 },
    ])
    expect(collapseInto).toBe('Zona 01')
  })

  test('a hidden zone with no blocks reports no collapse for that zone', () => {
    const { collapsed } = distributeZones([{ id: 'a', zone: 'Zona 01' }], 2)
    expect(collapsed).toEqual([])
  })

  test('normalises legacy English zone names via normaliseZone', () => {
    const { columns } = distributeZones([{ id: 'a', zone: 'Zone 02' }], 3)
    expect(columns[1].blocks.map(b => b.id)).toEqual(['a'])
  })

  test('a block with no zone defaults to Zona 01', () => {
    const { columns } = distributeZones([{ id: 'a' }], 3)
    expect(columns[0].blocks.map(b => b.id)).toEqual(['a'])
  })
})

describe('zoneCollapseMessage', () => {
  test('empty string when nothing collapsed', () => {
    expect(zoneCollapseMessage({ collapsed: [], collapseInto: null })).toBe('')
  })

  test('singular vs plural block count', () => {
    expect(
      zoneCollapseMessage({ collapsed: [{ zone: 'Zona 03', count: 1 }], collapseInto: 'Zona 02' }),
    ).toBe('Zona 03 tem 1 bloco — vão para a Zona 02.')
    expect(
      zoneCollapseMessage({ collapsed: [{ zone: 'Zona 03', count: 2 }], collapseInto: 'Zona 02' }),
    ).toBe('Zona 03 tem 2 blocos — vão para a Zona 02.')
  })

  test('joins multiple collapsed zones', () => {
    const msg = zoneCollapseMessage({
      collapsed: [
        { zone: 'Zona 02', count: 1 },
        { zone: 'Zona 03', count: 2 },
      ],
      collapseInto: 'Zona 01',
    })
    expect(msg).toBe('Zona 02 tem 1 bloco · Zona 03 tem 2 blocos — vão para a Zona 01.')
  })
})

describe('zoneColumnWidths', () => {
  test('1 zona is a single full-width column', () => {
    expect(zoneColumnWidths(1)).toEqual(['1fr'])
  })
  test('2 zonas iguais split 50/50', () => {
    expect(zoneColumnWidths(2, 'iguais')).toEqual(['1fr', '1fr'])
  })
  test('2 zonas 30/70', () => {
    expect(zoneColumnWidths(2, '30-70')).toEqual(['3fr', '7fr'])
  })
  test('3 zonas split evenly', () => {
    expect(zoneColumnWidths(3)).toEqual(['1fr', '1fr', '1fr'])
  })
})

describe('visibleWeekDates', () => {
  const weekDates = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 30 + i)) // Sun 30/8..Sat 5/9

  test('all 7 days by default', () => {
    expect(ALL_WEEK_DAYS).toHaveLength(7)
    expect(visibleWeekDates(weekDates, ALL_WEEK_DAYS)).toHaveLength(7)
  })

  test('an empty picker falls back to all 7 rather than rendering nothing', () => {
    expect(visibleWeekDates(weekDates, [])).toHaveLength(7)
  })

  test('unchecking Sáb (index 6) removes exactly that column', () => {
    const visible = visibleWeekDates(weekDates, [0, 1, 2, 3, 4, 5])
    expect(visible).toHaveLength(6)
    expect(visible.every(d => d.getDay() !== 6)).toBe(true)
  })

  test('preserves weekDates order regardless of picker order', () => {
    const visible = visibleWeekDates(weekDates, [5, 0, 3])
    expect(visible.map(d => d.getDay())).toEqual([0, 3, 5])
  })
})

describe('monthCellSessions', () => {
  const locations = [
    { id: 'b1', color: '#ff0000' },
    { id: 'b2', color: '#00ff00' },
  ]

  test('resolves each session title and its box colour via sessionBoxIds', () => {
    const sessions = [
      { id: 's1', mainTraining: 'LPO + cond.', locationIds: ['b1'] },
      { id: 's2', sessionName: 'Open', locationIds: ['b2'] },
    ]
    const { rows, overflow } = monthCellSessions(sessions, locations)
    expect(rows).toEqual([
      { id: 's1', title: 'LPO + cond.', color: '#ff0000' },
      { id: 's2', title: 'Open', color: '#00ff00' },
    ])
    expect(overflow).toBe(0)
  })

  test('falls back to the legacy singular locationId', () => {
    const sessions = [{ id: 's1', mainTraining: 'EMOM', locationId: 'b2' }]
    expect(monthCellSessions(sessions, locations).rows[0].color).toBe('#00ff00')
  })

  test('an untagged session gets a null colour, not a crash', () => {
    const sessions = [{ id: 's1', mainTraining: 'Sem box' }]
    expect(monthCellSessions(sessions, locations).rows[0].color).toBeNull()
  })

  test('truncates past maxRows and reports the overflow count', () => {
    const sessions = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, mainTraining: `S${i}` }))
    const { rows, overflow } = monthCellSessions(sessions, locations, 3)
    expect(MONTH_CELL_MAX_ROWS).toBe(3)
    expect(rows).toHaveLength(3)
    expect(overflow).toBe(2)
  })

  test('sessionName wins over mainTraining when both are present', () => {
    const sessions = [{ id: 's1', mainTraining: 'raw', sessionName: 'Nice name' }]
    expect(monthCellSessions(sessions, locations).rows[0].title).toBe('Nice name')
  })
})
