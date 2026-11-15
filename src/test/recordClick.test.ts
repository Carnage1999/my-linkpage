import { afterEach, describe, expect, it, vi } from 'vitest'
import { recordLinkClick } from '../hooks/useStats'
import { buildClickCsv } from '../pages/manage/clickCsv'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recordLinkClick', () => {
  it('sends the link id with sendBeacon', async () => {
    const beacon = vi.fn<(url: string, payload: Blob) => boolean>(() => true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    recordLinkClick('github')
    expect(beacon).toHaveBeenCalledOnce()
    const [url, payload] = beacon.mock.calls[0]
    expect(url).toBe('/api/stats/record')
    expect(await payload.text()).toBe('{"linkId":"github"}')
  })

  it('falls back to a keepalive fetch when sendBeacon declines', () => {
    const beacon = vi.fn(() => false)
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    vi.stubGlobal('fetch', fetchMock)
    recordLinkClick('github')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/stats/record',
      expect.objectContaining({ method: 'POST', keepalive: true }),
    )
  })
})

describe('buildClickCsv', () => {
  it('marks removed links and keeps umami counts in their own column', () => {
    const csv = buildClickCsv(
      [
        { id: 'github', label: 'GitHub', status: 'active', redisClicks: 5, providerClicks: 2 },
        { id: 'old', label: 'old', status: 'removed', redisClicks: 1, providerClicks: null },
      ],
      [{ date: '2026-11-10', id: 'github', label: 'GitHub', redisClicks: 5 }],
    )
    expect(csv).toContain('period,,github,GitHub,active,5,2')
    expect(csv).toContain('period,,old,old,removed,1,')
    expect(csv).toContain('day,2026-11-10,github,GitHub,active,5,')
  })
})
