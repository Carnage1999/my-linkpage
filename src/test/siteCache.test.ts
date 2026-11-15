import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import handler from '../../api/site-config'
import { SITE_BROWSER_CACHE, SITE_CACHE_TAG, SITE_CDN_CACHE, etagMatches, publicCdnHeaders, purgeSiteConfigCache, siteCacheTag } from '../../api/stats/_cache'
import { __resetSiteCache } from '../../api/stats/_site-store'
import { __resetScriptCache } from '../../api/stats/scripts'
import { installMemoryRedis } from './memoryRedis'

const REQUEST_CONTEXT = Symbol.for('@vercel/request-context')

describe('site config CDN cache', () => {
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.REDIS_KEY_PREFIX
    delete (globalThis as Record<symbol, unknown>)[REQUEST_CONTEXT]
    __resetSiteCache()
    __resetScriptCache()
  })

  it('keeps the browser header short and the CDN header long', async () => {
    const headers = publicCdnHeaders('"site-1"')
    expect(headers['Cache-Control']).toBe(SITE_BROWSER_CACHE)
    expect(headers['Cache-Control']).toMatch(/max-age=0/)
    expect(headers['Cache-Control']).not.toMatch(/s-maxage|stale-while-revalidate/)
    expect(headers['Vercel-CDN-Cache-Control']).toBe(SITE_CDN_CACHE)
    expect(headers['CDN-Cache-Control']).toBe(SITE_CDN_CACHE)
    expect(headers['Vercel-Cache-Tag']).toBe(siteCacheTag())
    expect(siteCacheTag()).toBe(SITE_CACHE_TAG)
    expect(headers.ETag).toBe('"site-1"')
    expect(headers['Vercel-CDN-Cache-Control']).not.toMatch(/stale-while-revalidate/)
    expect(etagMatches('W/"site-1"', '"site-1"')).toBe(true)
    expect(etagMatches('W/"site-1", "other"', '"site-1"')).toBe(true)
    expect(etagMatches('"site-2"', '"site-1"')).toBe(false)
    expect(await purgeSiteConfigCache()).toBe('unavailable')
  })

  it('does not apply the SPA no-cache rule to /api', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: Array<{ source: string }> }
    const sources = vercel.headers.map((rule) => rule.source)
    expect(sources).toContain('/((?!assets/|api/).*)')
    expect(sources).not.toContain('/((?!assets/).*)')
    expect(sources).toContain('/manage')
  })

  it('sends the seed with no-store when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    __resetSiteCache()
    __resetScriptCache()
    const response = await handler(new Request('https://link.example/api/site-config'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBeNull()
    expect(response.headers.get('Vercel-Cache-Tag')).toBeNull()
    const body = (await response.json()) as {
      socials: Array<{ id: string; iconSlug?: string; iconPath?: string }>
      scripts: Record<string, unknown>
      i18n: { texts: Record<string, { title?: string }>; languages: Array<{ code: string }> }
    }
    expect(body.socials).toHaveLength(6)
    for (const link of body.socials) {
      expect(link.iconSlug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(link.iconPath?.length).toBeGreaterThan(20)
    }
    const github = body.socials.find((link) => link.id === 'github')
    expect(github?.iconSlug).toBe('github')
    const linkedin = body.socials.find((link) => link.id === 'linkedin')
    expect(linkedin?.iconSlug).toBe('linkedin')
    expect(body.scripts).not.toHaveProperty('plausible')
    expect(body.i18n).not.toHaveProperty('overrides')
    expect(body.i18n.texts.en?.title).toBe("Hi, I'm Wang")
    expect(body.i18n.languages.map((language) => language.code)).toEqual(['en', 'ru', 'zh-TW'])
    expect(JSON.stringify(body).length).toBeLessThan(1_000_000)
  })

  it('caches a stored document and ignores a junk query', async () => {
    const redis = installMemoryRedis()
    const seed = JSON.parse(readFileSync('public/siteConfig.json', 'utf8')) as { version?: number }
    redis.store.set('site:config', JSON.stringify({ ...seed, version: 31 }))
    const stored = await handler(new Request('https://link.example/api/site-config'))
    expect(stored.status).toBe(200)
    expect(stored.headers.get('Cache-Control')).toBe(SITE_BROWSER_CACHE)
    expect(stored.headers.get('Vercel-CDN-Cache-Control')).toBe(SITE_CDN_CACHE)
    expect(stored.headers.get('Vercel-Cache-Tag')).toBe(siteCacheTag())
    const junk = await handler(new Request('https://link.example/api/site-config?v=nope&lng=zz&utm=1'))
    expect(junk.status).toBe(308)
    expect(junk.headers.get('Cache-Control')).toBe('private, no-store')
    expect(junk.headers.get('Location')).toBe('https://link.example/api/site-config')
    expect(redis.commands.filter((command) => command[0] === 'EVAL')).toHaveLength(1)
    redis.restore()
  })

  it('purges preview:site-config when the Redis prefix is preview:', async () => {
    process.env.REDIS_KEY_PREFIX = 'preview:'
    expect(siteCacheTag()).toBe('preview:site-config')
    expect(publicCdnHeaders()['Vercel-Cache-Tag']).toBe('preview:site-config')

    const redis = installMemoryRedis()
    const seed = JSON.parse(readFileSync('public/siteConfig.json', 'utf8')) as { version?: number }
    redis.store.set('preview:site:config', JSON.stringify({ ...seed, version: 31 }))
    const response = await handler(new Request('https://link.example/api/site-config'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Vercel-Cache-Tag')).toBe('preview:site-config')

    const purged: Array<{ tag: string | string[]; options?: { revalidationDeadlineSeconds?: number } }> = []
    ;(globalThis as Record<symbol, unknown>)[REQUEST_CONTEXT] = {
      get: () => ({
        purge: {
          dangerouslyDeleteByTag: async (tag: string | string[], options?: { revalidationDeadlineSeconds?: number }) => {
            purged.push({ tag, options })
          },
        },
      }),
    }
    expect(await purgeSiteConfigCache()).toBe('ok')
    expect(purged).toEqual([{ tag: 'preview:site-config', options: { revalidationDeadlineSeconds: 0 } }])
    redis.restore()
  })
})
