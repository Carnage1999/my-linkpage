import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { _resetCache, useLinkClickStats } from '../hooks/useLinkClickStats'

const STORAGE_KEY = 'link-click-stats'

describe('useLinkClickStats', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    _resetCache()
  })

  it('starts with empty stats', () => {
    const { result } = renderHook(() => useLinkClickStats())
    expect(result.current.stats).toEqual({})
    expect(result.current.totalClicks).toBe(0)
  })

  it('records a click and updates stats', () => {
    const { result } = renderHook(() => useLinkClickStats())

    act(() => {
      result.current.recordClick('github')
    })

    expect(result.current.stats).toEqual({ github: 1 })
    expect(result.current.totalClicks).toBe(1)
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
})
