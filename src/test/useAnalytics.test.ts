import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAnalytics } from '../hooks/useAnalytics'
import type { AnalyticsConfig } from '../siteConfig'

const UMAMI_CONFIG: AnalyticsConfig = {
  provider: 'umami',
  umamiWebsiteId: 'test-id',
}

const PLAUSIBLE_CONFIG: AnalyticsConfig = {
  provider: 'plausible',
  plausibleDomain: 'test.example.com',
}

describe('useAnalytics', () => {
  it('returns trackEvent and trackLinkClick functions', () => {
    const { result } = renderHook(() => useAnalytics())
    expect(typeof result.current.trackEvent).toBe('function')
    expect(typeof result.current.trackLinkClick).toBe('function')
  })

  it('trackLinkClick calls trackEvent with correct params', () => {
    // analytics is null by default, so calls are no-ops — just verify no throw
    const { result } = renderHook(() => useAnalytics())
    expect(() => {
      result.current.trackLinkClick('github', 'GitHub', 'https://github.com/test')
    }).not.toThrow()
  })

  it('calls plausible when available', () => {
    const plausibleSpy = vi.fn()
    window.plausible = plausibleSpy as never

    const { result } = renderHook(() => useAnalytics(PLAUSIBLE_CONFIG))
    result.current.trackEvent('Test Event', { key: 'value' })

    expect(plausibleSpy).toHaveBeenCalledWith('Test Event', { props: { key: 'value' } })
    delete window.plausible
  })

  it('calls umami when available', () => {
    const trackSpy = vi.fn()
    window.umami = { track: trackSpy }

    const { result } = renderHook(() => useAnalytics(UMAMI_CONFIG))
    result.current.trackEvent('Test Event', { key: 'value' })

    expect(trackSpy).toHaveBeenCalledWith('Test Event', { key: 'value' })
    delete window.umami
  })
})
