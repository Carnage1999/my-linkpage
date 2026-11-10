import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_SCRIPTS } from '../analytics/types'
import { useAnalytics } from '../hooks/useAnalytics'

const UMAMI = { ...EMPTY_SCRIPTS, umami: { websiteId: 'test-id', src: 'https://cloud.umami.is/script.js' } }
const PLAUSIBLE = { ...EMPTY_SCRIPTS, plausible: { domain: 'test.example.com', src: 'https://plausible.io/js/script.js' } }

describe('useAnalytics', () => {
  it('returns trackEvent and trackLinkClick functions', () => {
    const { result } = renderHook(() => useAnalytics())
    expect(typeof result.current.trackEvent).toBe('function')
    expect(typeof result.current.trackLinkClick).toBe('function')
  })

  it('trackLinkClick is a no-op without a script', () => {
    const { result } = renderHook(() => useAnalytics())
    expect(() => {
      result.current.trackLinkClick('github', 'GitHub', 'https://github.com/test')
    }).not.toThrow()
  })

  it('calls plausible when that script is enabled', () => {
    const plausibleSpy = vi.fn()
    window.plausible = plausibleSpy as never

    const { result } = renderHook(() => useAnalytics(PLAUSIBLE))
    result.current.trackEvent('Test Event', { key: 'value' })

    expect(plausibleSpy).toHaveBeenCalledWith('Test Event', { props: { key: 'value' } })
    delete window.plausible
  })

  it('calls umami when that script is enabled', () => {
    const trackSpy = vi.fn()
    window.umami = { track: trackSpy }

    const { result } = renderHook(() => useAnalytics(UMAMI))
    result.current.trackEvent('Test Event', { key: 'value' })

    expect(trackSpy).toHaveBeenCalledWith('Test Event', { key: 'value' })
    delete window.umami
  })

  it('sends a goatcounter event for a link id', () => {
    const count = vi.fn()
    window.goatcounter = { count }
    const bundle = { ...EMPTY_SCRIPTS, goatcounter: { endpoint: 'https://demo.goatcounter.com/count' } }
    const { result } = renderHook(() => useAnalytics(bundle))
    result.current.trackLinkClick('github', 'GitHub', 'https://github.com/test')
    expect(count).toHaveBeenCalledWith({ path: 'link:github', title: 'GitHub', event: true })
    delete window.goatcounter
  })
})
