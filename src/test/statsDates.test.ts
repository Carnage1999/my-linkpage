import { describe, expect, it } from 'vitest'
import { aggregateClicks } from '../../api/stats/_aggregate'
import {
  dateKeyInTimeZone,
  percentChange,
  periodRange,
  startOfZonedDay,
} from '../../api/stats/_dates'

const TAIPEI = 'Asia/Taipei'

describe('stats dates', () => {
  it('uses Asia/Taipei calendar days rather than UTC', () => {
    expect(dateKeyInTimeZone(new Date('2026-11-09T15:59:59.000Z'), TAIPEI)).toBe('2026-11-09')
    expect(dateKeyInTimeZone(new Date('2026-11-09T16:00:00.000Z'), TAIPEI)).toBe('2026-11-10')
    expect(startOfZonedDay(new Date('2026-11-09T16:30:00.000Z'), TAIPEI)).toBe(
      Date.parse('2026-11-09T16:00:00.000Z'),
    )
  })

  it('builds a current period and the previous period of the same length', () => {
    const now = new Date('2026-11-10T02:00:00.000Z')
    const range = periodRange(now, 7, TAIPEI)
    expect(range.currentDates).toHaveLength(7)
    expect(range.previousDates).toHaveLength(7)
    expect(range.currentDates[6]).toBe('2026-11-10')
    expect(range.previousDates[6]).toBe('2026-11-03')
    expect(range.currentDates.some((date) => range.previousDates.includes(date))).toBe(false)
    expect(range.startAt).toBe(startOfZonedDay(new Date('2026-11-04T04:00:00.000Z'), TAIPEI))
    expect(range.endAt).toBe(Date.parse('2026-11-10T16:00:00.000Z'))
    expect(dateKeyInTimeZone(new Date(range.endAt), TAIPEI)).toBe('2026-11-11')
    expect(dateKeyInTimeZone(new Date(range.endAt - 1), TAIPEI)).toBe('2026-11-10')
  })

  it('returns null when the previous period has no baseline', () => {
    expect(percentChange(4, 0)).toBeNull()
    expect(percentChange(0, 0)).toBe(0)
    expect(percentChange(15, 10)).toBe(50)
  })
})

describe('aggregateClicks', () => {
  it('counts only the selected dates and separates removed link ids', () => {
    const report = aggregateClicks({
      totals: { github: 9, retired: 4 },
      dayFields: {
        '2026-11-10:github': 3,
        '2026-11-09:github': 2,
        '2026-11-03:github': 4,
        '2026-11-10:retired': 1,
      },
      currentDates: ['2026-11-09', '2026-11-10'],
      previousDates: ['2026-11-03', '2026-11-04'],
      configuredIds: ['github', 'x'],
    })

    expect(report.periodTotals).toEqual({ github: 5, retired: 1 })
    expect(report.previousPeriodTotals).toEqual({ github: 4 })
    expect(report.configuredIds).toEqual(['github', 'x'])
    expect(report.removed).toEqual([{ id: 'retired', total: 4, period: 1 }])
    expect(report.daily.map((day) => day.clicks.github ?? 0)).toEqual([2, 3])
  })
})
