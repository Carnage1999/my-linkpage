import { afterEach, describe, expect, it, vi } from 'vitest'
import { __resetUmamiAuth, fetchUmamiReport, toLinkClicks, toMetrics, toTotals } from '../../api/stats/_umami'

const calls: Array<{ url: string; headers: Headers }> = []

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  delete process.env.UMAMI_API_KEY
  delete process.env.UMAMI_API_URL
  delete process.env.UMAMI_WEBSITE_ID
  delete process.env.UMAMI_USERNAME
  delete process.env.UMAMI_PASSWORD
  __resetUmamiAuth()
  vi.unstubAllGlobals()
})

describe('umami parsers', () => {
  it('normalizes stats, metrics, and link click properties', () => {
    expect(toTotals({ pageviews: 10, visitors: 4, visits: 5, bounces: 1, totaltime: 50 })).toMatchObject({
      pageviews: 10,
      bounceRate: 0.2,
      avgDuration: 10,
    })
    expect(toMetrics([{ x: 'US', y: 3 }, { name: '', count: 1 }])).toEqual([{ name: 'US', count: 3 }])
    expect(toLinkClicks([{ value: 'github', total: 4 }])).toEqual({ github: 4 })
  })
})

describe('umami client', () => {
  it('stays quiet when credentials are missing', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const report = await fetchUmamiReport({
      startAt: 1,
      endAt: 2,
      timeZone: 'Asia/Taipei',
      dates: ['2026-11-10'],
    })
    expect(report).toEqual({ configured: false })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls Umami Cloud with the API key header and never a password', async () => {
    process.env.UMAMI_API_KEY = 'cloud-key'
    process.env.UMAMI_WEBSITE_ID = 'site-1'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), headers: new Headers(init?.headers) })
        if (String(url).includes('/stats?')) {
          return json({
            pageviews: 8,
            visitors: 3,
            visits: 4,
            bounces: 1,
            totaltime: 40,
            comparison: { pageviews: 2, visitors: 1, visits: 1, bounces: 0, totaltime: 10 },
          })
        }
        if (String(url).includes('/event-data/values')) return json([{ value: 'github', total: 6 }])
        if (String(url).includes('/pageviews')) {
          return json({ pageviews: [{ x: '2026-11-10', y: 8 }], sessions: [{ x: '2026-11-10', y: 3 }] })
        }
        return json([{ x: 'direct', y: 2 }])
      }),
    )
    calls.length = 0

    const report = await fetchUmamiReport({
      startAt: 10,
      endAt: 20,
      timeZone: 'Asia/Taipei',
      dates: ['2026-11-10'],
    })

    expect(report.configured).toBe(true)
    expect(report.pageviews).toBe(8)
    expect(report.previous?.pageviews).toBe(2)
    expect(report.linkClicks).toEqual({ github: 6 })
    expect(calls.every((call) => call.url.startsWith('https://api.umami.is/v1/websites/site-1/'))).toBe(true)
    expect(calls.every((call) => call.headers.get('x-umami-api-key') === 'cloud-key')).toBe(true)
    expect(calls.some((call) => call.url.includes('/auth/login'))).toBe(false)
    expect(JSON.stringify(calls)).not.toContain('cloud-key-password')
  })

  it('logs in once for self-hosted username auth and reuses the token', async () => {
    process.env.UMAMI_API_URL = 'https://umami.example.com'
    process.env.UMAMI_WEBSITE_ID = 'site-2'
    process.env.UMAMI_USERNAME = 'admin'
    process.env.UMAMI_PASSWORD = 's3cret'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), headers: new Headers(init?.headers) })
        if (String(url).endsWith('/auth/login')) return json({ token: 'session-token' })
        if (String(url).includes('/stats?')) {
          return json({ pageviews: 1, visitors: 1, visits: 1, bounces: 0, totaltime: 5 })
        }
        if (String(url).includes('/event-data/values')) return json([])
        if (String(url).includes('/pageviews')) return json({ pageviews: [], sessions: [] })
        return json([])
      }),
    )
    calls.length = 0
    const input = { startAt: 1, endAt: 2, timeZone: 'Asia/Taipei', dates: ['2026-11-10'] }

    await fetchUmamiReport(input)
    await fetchUmamiReport(input)

    const logins = calls.filter((call) => call.url === 'https://umami.example.com/api/auth/login')
    expect(logins).toHaveLength(1)
    expect(logins[0]?.headers.get('authorization')).toBeNull()
    const statsCalls = calls.filter((call) => call.url.includes('/websites/site-2/stats'))
    expect(statsCalls.length).toBeGreaterThan(0)
    expect(statsCalls.every((call) => call.headers.get('authorization') === 'Bearer session-token')).toBe(true)
    expect(calls.some((call) => call.url.includes('s3cret'))).toBe(false)
  })
})
