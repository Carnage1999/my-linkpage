import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import handler from '../../api/site-config'
import { SITE_BROWSER_CACHE, SITE_CACHE_TAG, SITE_CDN_CACHE, etagMatches, publicCdnHeaders, purgeSiteConfigCache } from '../../api/stats/_cache'
import { __resetSiteCache } from '../../api/stats/_site-store'
import { __resetScriptCache } from '../../api/stats/scripts'

describe('site config CDN cache', () => {
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
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
    expect(headers['Vercel-Cache-Tag']).toBe(SITE_CACHE_TAG)
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

  it('sends CDN headers and resolved icon paths from GET /api/site-config', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    __resetSiteCache()
    __resetScriptCache()
    const response = await handler(new Request('https://link.example/api/site-config'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(SITE_BROWSER_CACHE)
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(SITE_CDN_CACHE)
    expect(response.headers.get('CDN-Cache-Control')).toBe(SITE_CDN_CACHE)
    expect(response.headers.get('Vercel-Cache-Tag')).toBe(SITE_CACHE_TAG)
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
})
