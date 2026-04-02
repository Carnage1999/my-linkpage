import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  _resetCache,
  aggregateByDay,
  aggregateByWeek,
  useLinkClickStats,
} from '../hooks/useLinkClickStats'
import type { ClickEvent } from '../hooks/useLinkClickStats'

const STORAGE_KEY = 'link-click-stats'
const TIMELINE_KEY = 'link-click-timeline'

describe('useLinkClickStats', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TIMELINE_KEY)
    _resetCache()
    vi.restoreAllMocks()
  })

  it('starts with empty stats', () => {
    const { result } = renderHook(() => useLinkClickStats())
    expect(result.current.stats).toEqual({})
    expect(result.current.totalClicks).toBe(0)
    expect(result.current.timeline).toEqual([])
  })

  it('records a click and updates stats', () => {
    const { result } = renderHook(() => useLinkClickStats())

    act(() => {
      result.current.recordClick('github')
    })

    expect(result.current.stats).toEqual({ github: 1 })
    expect(result.current.totalClicks).toBe(1)
  })

  it('records a click with timestamp in timeline', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const { result } = renderHook(() => useLinkClickStats())

    act(() => {
      result.current.recordClick('github')
    })

    expect(result.current.timeline).toEqual([
      { linkId: 'github', timestamp: now },
    ])
  })

  it('increments existing click count', () => {
    const { result } = renderHook(() => useLinkClickStats())

    act(() => {
      result.current.recordClick('github')
      result.current.recordClick('github')
      result.current.recordClick('x')
    })

    expect(result.current.stats).toEqual({ github: 2, x: 1 })
    expect(result.current.totalClicks).toBe(3)
  })

  it('returns correct intensity values', () => {
    const { result } = renderHook(() => useLinkClickStats())

    act(() => {
      result.current.recordClick('github')
      result.current.recordClick('github')
      result.current.recordClick('github')
      result.current.recordClick('github')
      result.current.recordClick('x')
    })

    expect(result.current.getIntensity('github')).toBe(1) // max
    expect(result.current.getIntensity('x')).toBe(0.25) // 1/4
    expect(result.current.getIntensity('telegram')).toBe(0) // no clicks
  })

  it('returns 0 intensity when no clicks exist', () => {
    const { result } = renderHook(() => useLinkClickStats())
    expect(result.current.getIntensity('github')).toBe(0)
  })

  it('persists stats to localStorage', () => {
    const { result } = renderHook(() => useLinkClickStats())

    act(() => {
      result.current.recordClick('github')
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored).toEqual({ github: 1 })
  })

  it('persists timeline to localStorage', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const { result } = renderHook(() => useLinkClickStats())

    act(() => {
      result.current.recordClick('github')
    })

    const stored = JSON.parse(localStorage.getItem(TIMELINE_KEY) ?? '[]')
    expect(stored).toEqual([{ linkId: 'github', timestamp: now }])
  })

  it('resets stats and timeline', () => {
    const { result } = renderHook(() => useLinkClickStats())

    act(() => {
      result.current.recordClick('github')
      result.current.recordClick('x')
    })

    expect(result.current.totalClicks).toBe(2)

    act(() => {
      result.current.resetStats()
    })

    expect(result.current.stats).toEqual({})
    expect(result.current.totalClicks).toBe(0)
    expect(result.current.timeline).toEqual([])
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{}')
    expect(localStorage.getItem(TIMELINE_KEY)).toBe('[]')
  })
})

describe('aggregateByDay', () => {
  it('fills missing days with 0', () => {
    const result = aggregateByDay([], 3)
    expect(result).toHaveLength(3)
    expect(result.every((d) => d.clicks === 0)).toBe(true)
  })

  it('counts events per day', () => {
    const now = Date.now()
    const events: ClickEvent[] = [
      { linkId: 'a', timestamp: now },
      { linkId: 'b', timestamp: now },
      { linkId: 'a', timestamp: now - 86_400_000 },
    ]

    const result = aggregateByDay(events, 2)
    expect(result).toHaveLength(2)
    expect(result[0].clicks).toBe(1) // yesterday
    expect(result[1].clicks).toBe(2) // today
  })

  it('excludes events outside range', () => {
    const now = Date.now()
    const events: ClickEvent[] = [
      { linkId: 'a', timestamp: now - 5 * 86_400_000 },
    ]

    const result = aggregateByDay(events, 3)
    expect(result.every((d) => d.clicks === 0)).toBe(true)
  })
})

describe('aggregateByWeek', () => {
  it('fills missing weeks with 0', () => {
    const result = aggregateByWeek([], 4)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.every((d) => d.clicks === 0)).toBe(true)
  })

  it('counts events per week', () => {
    const now = Date.now()
    const events: ClickEvent[] = [
      { linkId: 'a', timestamp: now },
      { linkId: 'b', timestamp: now },
    ]

    const result = aggregateByWeek(events, 2)
    const lastWeek = result[result.length - 1]
    expect(lastWeek.clicks).toBe(2)
  })
})
