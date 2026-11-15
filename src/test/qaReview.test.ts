import { readFileSync } from 'node:fs'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/site-config'
import { encryptJson } from '../../api/stats/_crypto'
import settingsHandler from '../../api/stats/settings'
import { previewDraft, __resetSettingsCache } from '../../api/stats/_settings'
import { __resetSiteCache } from '../../api/stats/_site-store'
import { referrerHostname } from '../../api/stats/_referrer'
import { createToken, verifyToken } from '../../api/stats/_token'
import { __resetScriptCache } from '../../api/stats/scripts'
import { safeSvgPath } from '../lib/safeUrl'
import { useSiteConfig } from '../hooks/useSiteConfig'
import { installMemoryRedis } from './memoryRedis'

const seed = JSON.parse(readFileSync('public/siteConfig.json', 'utf8')) as Record<string, unknown>
const SETTINGS = {
  timezone: 'Asia/Taipei',
  defaultProvider: null,
  inject: { umami: true, goatcounter: true, cloudflare: false },
  umami: { apiUrl: 'https://cloud.umami.is', websiteId: 'site', username: '' },
  goatcounter: { site: 'hanche' },
  cloudflare: { accountId: '', siteTag: '' },
}

describe('public reads and recovery', () => {
  afterEach(() => {
    delete process.env.STATS_PASSWORD
    delete process.env.VERCEL_ENV
    delete process.env.REDIS_KEY_PREFIX
    __resetSiteCache()
    __resetScriptCache()
    __resetSettingsCache()
  })

  it('rejects writes that have no token', async () => {
    process.env.STATS_PASSWORD = 'persist-secret'
    const redis = installMemoryRedis()
    const put = await handler(new Request('https://link.example/api/site-config', { method: 'PUT', body: '{}' }))
    const saved = await settingsHandler(new Request('https://link.example/api/stats/settings', { method: 'PUT', body: '{}' }))
    expect(put.status).toBe(401)
    expect(saved.status).toBe(401)
    expect(redis.writes).toEqual([])
    redis.restore()
  })

  it('returns 503 no-store for a broken or invalid document and never caches it', async () => {
    const redis = installMemoryRedis()
    redis.store.set('site:config', '{')
    const invalid = await handler(new Request('https://link.example/api/site-config'))
    expect(invalid.status).toBe(503)
    expect(invalid.headers.get('Cache-Control')).toBe('private, no-store')
    expect(invalid.headers.get('Vercel-CDN-Cache-Control')).toBeNull()

    redis.store.set('site:config', JSON.stringify({ version: 'nope' }))
    const schema = await handler(new Request('https://link.example/api/site-config', { headers: { 'x-forwarded-for': '198.51.100.8' } }))
    expect(schema.status).toBe(503)
    expect(schema.headers.get('Cache-Control')).toBe('private, no-store')

    redis.restore()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('redis down') }))
    process.env.UPSTASH_REDIS_REST_URL = 'http://127.0.0.1:9'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'memory'
    const down = await handler(new Request('https://link.example/api/site-config', { headers: { 'x-forwarded-for': '198.51.100.9' } }))
    expect(down.status).toBe(503)
    expect(down.headers.get('Cache-Control')).toBe('private, no-store')
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('keeps the bundled homepage when the config response is 503', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'down' }), { status: 503, headers: { 'Cache-Control': 'private, no-store' } })))
    const { result } = renderHook(() => useSiteConfig())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.site.name).toBe('Han-che Wang')
    expect(result.current.socials.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('resets a corrupt document from the raw bytes and conflicts on a stale version', async () => {
    process.env.STATS_PASSWORD = 'persist-secret'
    const redis = installMemoryRedis()
    const token = await createToken()
    redis.store.set('site:config', '{')
    const recovered = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Site-Request': '1' },
        body: JSON.stringify({ action: 'reset', confirm: true, baseVersion: 0 }),
      }),
    )
    expect(recovered.status).toBe(200)
    const saved = JSON.parse(String(redis.store.get('site:config'))) as { version: number; socials: unknown[] }
    expect(saved.version).toBe(1)
    expect(saved.socials).toHaveLength(6)

    redis.store.set('site:config', JSON.stringify({ ...seed, version: 8 }))
    const before = redis.store.get('site:config')
    const conflict = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', confirm: true, baseVersion: 3 }),
      }),
    )
    expect(conflict.status).toBe(409)
    expect(redis.store.get('site:config')).toBe(before)

    const unconfirmed = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', baseVersion: 8 }),
      }),
    )
    expect(unconfirmed.status).toBe(400)
    const imported = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', confirm: true, baseVersion: 8 }),
      }),
    )
    expect(imported.status).toBe(400)
    expect(await imported.json()).toMatchObject({ error: 'Unknown action' })
    const missingVersion = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', confirm: true }),
      }),
    )
    expect(missingVersion.status).toBe(400)
    expect(redis.store.get('site:config')).toBe(before)

    const bad = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': '400000' },
        body: '{',
      }),
    )
    expect(bad.status).toBe(400)
    redis.restore()
  })

  it('does not write when the legacy settings read or decrypt fails', async () => {
    process.env.STATS_PASSWORD = 'persist-secret'
    const redis = installMemoryRedis()
    const token = await createToken()
    const stored = JSON.stringify({ ...seed, version: 4 })
    redis.store.set('site:config', stored)
    const original = redis.store.get.bind(redis.store)
    redis.store.get = ((key: string) => {
      if (key === 'stats:settings') throw new Error('redis down')
      return original(key)
    }) as typeof redis.store.get
    const failed = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...seed, baseVersion: 4, settings: SETTINGS }),
      }),
    )
    expect(failed.status).toBe(400)
    expect(redis.store.get('site:config')).toBe(stored)

    redis.store.get = original
    const cipher = JSON.stringify({
      ...seed,
      version: 4,
      settings: { ...SETTINGS, secrets: 'not-a-ciphertext' },
    })
    redis.store.set('site:config', cipher)
    const undecryptable = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...seed, baseVersion: 4, settings: SETTINGS }),
      }),
    )
    expect(undecryptable.status).toBe(400)
    expect(redis.store.get('site:config')).toBe(cipher)
    redis.restore()
  })

  it('drops a secret when its provider origin changes', async () => {
    process.env.STATS_PASSWORD = 'persist-secret'
    const redis = installMemoryRedis()
    const secrets = await encryptJson('persist-secret', { umamiApiKey: 'old-key', goatcounterApiKey: 'goat-key' })
    redis.store.set(
      'site:config',
      JSON.stringify({ ...seed, version: 4, settings: { ...SETTINGS, secrets } }),
    )
    const moved = await previewDraft({
      settings: {
        ...SETTINGS,
        umami: { ...SETTINGS.umami, apiUrl: 'https://evil.example' },
        goatcounter: { site: 'other' },
      },
    })
    expect(moved.umami?.mode === 'key' ? moved.umami.apiKey : null).toBeNull()
    expect(moved.goatcounter).toBeNull()

    const kept = await previewDraft({ settings: SETTINGS })
    expect(kept.umami && 'apiKey' in kept.umami ? kept.umami.apiKey : null).toBe('old-key')
    redis.restore()
  })

  it('rejects a future token, an oversized icon path, and an IP referrer', async () => {
    process.env.STATS_PASSWORD = 'persist-secret'
    const now = Date.now
    Date.now = () => now() + 120_000
    const token = await createToken()
    Date.now = now
    expect(await verifyToken(token)).toBe(false)
    expect(safeSvgPath('M'.repeat(60_001))).toBeNull()
    expect(referrerHostname('https://203.0.113.9/a', 'link.w1999.me')).toBeNull()
    expect(referrerHostname('https://[2001:db8::1]/a', 'link.w1999.me')).toBeNull()
    expect(referrerHostname('https://example.com/path?q=1', 'link.w1999.me')).toBe('example.com')
  })

  it('blocks a cookie write that has no same-origin header', async () => {
    process.env.STATS_PASSWORD = 'persist-secret'
    const redis = installMemoryRedis()
    const token = await createToken()
    const blocked = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'POST',
        headers: { Cookie: `stats_session=${encodeURIComponent(token)}`, 'Content-Type': 'application/json', Origin: 'https://evil.example' },
        body: JSON.stringify({ action: 'reset', confirm: true, baseVersion: 0 }),
      }),
    )
    expect(blocked.status).toBe(403)
    expect(redis.writes.filter((key) => key === 'site:config')).toEqual([])
    redis.restore()
  })
})
