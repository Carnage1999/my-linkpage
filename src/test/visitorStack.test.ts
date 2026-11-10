import { afterEach, describe, expect, it, vi } from 'vitest'
import { encryptJson, decryptJson } from '../../api/stats/_crypto'
import { countryFromRequest, referrerHostname } from '../../api/stats/_referrer'
import { validateAvatar, validateSiteConfig } from '../../api/stats/_site-schema'
import { applyPatch, buildEffective, publicScriptsFrom, type SecretBag, type StoredSettings } from '../../api/stats/_settings'
import { parseUserAgent } from '../../api/stats/_ua'
import { fetchCloudflareReport } from '../../api/stats/_providers/cloudflare'
import { fetchGoatcounterReport } from '../../api/stats/_providers/goatcounter'
import { fetchUpstashReport } from '../../api/stats/_providers/upstash'
import handler from '../../api/stats/pageview'

const stored: StoredSettings = { v: 1, goatcounter: { site: 'demo' }, umami: { websiteId: 'from-settings' } }
const secrets: SecretBag = { goatcounterApiKey: 'stored-key', umamiApiKey: 'stored-umami' }

afterEach(() => {
  delete process.env.GOATCOUNTER_SITE
  delete process.env.GOATCOUNTER_API_KEY
  delete process.env.UMAMI_WEBSITE_ID
  delete process.env.UMAMI_API_KEY
  delete process.env.STATS_TIMEZONE
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.STATS_PASSWORD
  vi.unstubAllGlobals()
})

describe('settings precedence and redaction', () => {
  it('lets env override stored values and hides secrets', () => {
    process.env.GOATCOUNTER_SITE = 'from-env'
    process.env.UMAMI_API_KEY = 'env-key'
    const effective = buildEffective(stored, secrets)
    expect(effective.goatcounter?.site).toBe('from-env')
    expect(effective.view.goatcounter.site.locked).toBe(true)
    expect(effective.view.umami.apiKey).toEqual({ state: 'env', hint: null, locked: true })
    expect(effective.view.goatcounter.apiKey).toEqual({ state: 'set', hint: '-key', locked: false })
    expect(JSON.stringify(effective.view)).not.toContain('stored-key')
    expect(JSON.stringify(effective.view)).not.toContain('env-key')
  })

  it('keeps a blank secret and clears only an explicit null', () => {
    const kept = applyPatch(stored, secrets, { goatcounter: { apiKey: '' } })
    expect(kept.secrets.goatcounterApiKey).toBe('stored-key')
    const cleared = applyPatch(stored, secrets, { goatcounter: { apiKey: null } })
    expect(cleared.secrets.goatcounterApiKey).toBeUndefined()
    const ignored = applyPatch(stored, secrets, { goatcounter: { site: 'other' } })
    process.env.GOATCOUNTER_SITE = 'from-env'
    const locked = applyPatch(stored, secrets, { goatcounter: { site: 'other' } })
    expect(ignored.stored.goatcounter?.site).toBe('other')
    expect(locked.stored.goatcounter?.site).toBe('demo')
  })

  it('publishes a script id without the API key', () => {
    const effective = buildEffective(stored, secrets)
    const scripts = publicScriptsFrom(effective)
    expect(scripts.goatcounter?.endpoint).toBe('https://demo.goatcounter.com/count')
    expect(scripts.umami?.websiteId).toBe('from-settings')
    expect(JSON.stringify(scripts)).not.toContain('stored')
  })
})

describe('encryption', () => {
  it('round-trips a secret bag and fails after the key changes', async () => {
    const payload = await encryptJson('password', { goatcounterApiKey: 'abc' })
    expect(payload).not.toContain('abc')
    await expect(decryptJson('password', payload)).resolves.toEqual({ goatcounterApiKey: 'abc' })
    await expect(decryptJson('other-password', payload)).resolves.toBeNull()
  })
})

describe('avatar and request parsing', () => {
  it('accepts a bundled image or https, and rejects other paths', () => {
    expect(validateAvatar('/avatar.jpg')).toBe('/avatar.jpg')
    expect(validateAvatar('')).toBe('/avatar.jpg')
    expect(validateAvatar('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg')
    expect(() => validateAvatar('/og-image.png')).toThrow(/shipped/)
    expect(() => validateAvatar('http://cdn.example/a.jpg')).toThrow(/https/)
  })

  it('keeps a referrer host and drops the raw user agent pieces we do not store', () => {
    expect(referrerHostname('https://Github.com/path?q=1', 'link.w1999.me')).toBe('github.com')
    expect(referrerHostname('https://link.w1999.me/manage', 'preview.vercel.app', ['link.w1999.me'])).toBeNull()
    expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toEqual({
      browser: 'safari',
      os: 'ios',
      device: 'mobile',
    })
    const request = new Request('https://link.w1999.me/', { headers: { 'x-vercel-ip-country': 'TW' } })
    expect(countryFromRequest(request)).toBe('TW')
  })

  it('rejects a site config whose avatar is not bundled', () => {
    expect(() =>
      validateSiteConfig({ site: { name: 'A', tagline: 'B', domain: 'example.com' }, profile: { avatar: '/secret.png' }, socials: [] }, 1),
    ).toThrow(/shipped/)
  })

  it('rejects a legacy icon export name', () => {
    expect(() =>
      validateSiteConfig(
        {
          site: { name: 'A', tagline: 'B', domain: 'example.com' },
          profile: { avatar: '/avatar.jpg' },
          socials: [{ id: 'github', label: 'GitHub', url: 'https://github.com/x', iconSlug: 'siGithub', iconPath: 'M0 0' }],
        },
        1,
      ),
    ).toThrow(/Unknown icon/)
  })
})

describe('provider normalizers', () => {
  it('maps GoatCounter totals to visitors and link events', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        Response.json(
          String(url).includes('/stats/hits?')
            ? { hits: [{ count: 3, event: true, path: 'link:github', path_id: 1 }] }
            : String(url).includes('/stats/total')
              ? { total: 9, stats: [{ day: '2026-11-10', daily: 4 }] }
              : { stats: [{ path: 'Firefox', count: 2 }] },
        ),
      ),
    )
    const report = await fetchGoatcounterReport(
      { startAt: 1, endAt: 2, previousStartAt: 0, previousEndAt: 1, dates: ['2026-11-10'] },
      { site: 'demo', apiKey: 'key' },
    )
    expect(report.totals?.visitors).toBe(9)
    expect(report.totals?.pageviews).toBeNull()
    expect(report.linkClicks).toEqual({ github: 3 })
    expect(report.devices).toEqual([])
  })

  it('maps Cloudflare count to pageviews and visits separately', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: {
            viewer: {
              accounts: [
                {
                  current: [{ count: 20, sum: { visits: 11 } }],
                  previous: [{ count: 5, sum: { visits: 2 } }],
                  series: [{ count: 20, dimensions: { date: '2026-11-10' } }],
                  referrers: [{ count: 4, dimensions: { refererHost: 'github.com' } }],
                  countries: [],
                  devices: [{ count: 7, dimensions: { deviceType: 'desktop' } }],
                  browsers: [],
                  systems: [],
                },
              ],
            },
          },
        }),
      ),
    )
    const report = await fetchCloudflareReport(
      { startAt: 1, endAt: 2, previousStartAt: 0, previousEndAt: 1, dates: ['2026-11-10'] },
      { accountId: 'acc', apiToken: 'token', siteTag: 'tag' },
    )
    expect(report.totals).toMatchObject({ pageviews: 20, visits: 11, visitors: null })
    expect(report.linkClicks).toBeNull()
    expect(report.referrers).toEqual([{ name: 'github.com', count: 4 }])
  })

  it('sums Upstash pageview hashes without inventing visitors', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    let call = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        call += 1
        const result = call === 1 ? ['views', '4', 'ref:github.com', '3', 'cc:TW', '4'] : ['views', '1']
        return Response.json([{ result }])
      }),
    )
    const report = await fetchUpstashReport({ dates: ['2026-11-10'], previousDates: ['2026-11-09'] })
    expect(report.totals?.pageviews).toBe(4)
    expect(report.previous?.pageviews).toBe(1)
    expect(report.totals?.visitors).toBeNull()
    expect(report.referrers).toEqual([{ name: 'github.com', count: 3 }])
  })
})

describe('pageview endpoint', () => {
  it('stores aggregates and drops the raw user agent', async () => {
    process.env.STATS_PASSWORD = 'secret'
    process.env.STATS_TIMEZONE = 'Asia/Taipei'
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    const bodies: unknown[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : null
        bodies.push(body)
        const result = Array.isArray(body) && body[0] === 'EVAL' ? 1 : null
        return Response.json({ result })
      }),
    )
    const response = await handler(
      new Request('https://link.w1999.me/api/stats/pageview', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          'x-vercel-ip-country': 'TW',
          host: 'link.w1999.me',
        },
        body: JSON.stringify({ referrer: 'https://news.ycombinator.com/item?id=1' }),
      }),
    )
    expect(response.status).toBe(200)
    const command = bodies.find((body) => Array.isArray(body) && body[0] === 'EVAL') as string[]
    expect(command).toContain('views')
    expect(command).toContain('br:chrome')
    expect(command).toContain('os:windows')
    expect(command).toContain('cc:TW')
    expect(command).toContain('ref:news.ycombinator.com')
    expect(command.join(' ')).not.toContain('Mozilla')
  })
})
