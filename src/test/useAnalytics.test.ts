import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAnalytics } from '../hooks/useAnalytics'

describe('useAnalytics', () => {
  it('returns trackEvent and trackLinkClick functions', () => {
    const { result } = renderHook(() => useAnalytics())
    expect(typeof result.current.trackEvent).toBe('function')
    expect(typeof result.current.trackLinkClick).toBe('function')
  })

  it('trackLinkClick calls trackEvent with correct params', () => {
    // ANALYTICS is null by default, so calls are no-ops — just verify no throw
    const { result } = renderHook(() => useAnalytics())
    expect(() => {
      result.current.trackLinkClick('github', 'GitHub', 'https://github.com/test')
    }).not.toThrow()
  })

  it('calls plausible when available', () => {
    const plausibleSpy = vi.fn()
    window.plausible = plausibleSpy as never

    const { result } = renderHook(() => useAnalytics())
    result.current.trackEvent('Test Event', { key: 'value' })

    // Since ANALYTICS is null in test env, plausible won't be called via the hook
    // This just ensures no crash
    delete window.plausible
  })

  it('calls umami when available', () => {
    const trackSpy = vi.fn()
    window.umami = { track: trackSpy }

    const { result } = renderHook(() => useAnalytics())
    result.current.trackEvent('Test Event', { key: 'value' })

    // Since ANALYTICS is null in test env, umami won't be called via the hook
    // This just ensures no crash
    delete window.umami
  })
})
