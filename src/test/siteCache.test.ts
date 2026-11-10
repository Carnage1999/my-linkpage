import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import siteConfig from '../../api/site-config'
import { SITE_BROWSER_CACHE, SITE_CACHE_TAG, SITE_CDN_CACHE, publicCdnHeaders } from '../../api/stats/_cache'
import { __resetSiteCache } from '../../api/stats/_site-store'
import { __resetScriptCache } from '../../api/stats/scripts'

describe('site config CDN cache', () => {
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    __resetSiteCache()
    __resetScriptCache()
  })

  it('keeps the browser header short and the CDN header long', () => {
    const headers = publicCdnHeaders('"site-1"')
    expect(headers['Cache-Control']).toBe(SITE_BROWSER_CACHE)
    expect(headers['Cache-Control']).not.toMatch(/s-maxage|stale-while-revalidate/)
    expect(headers['Vercel-CDN-Cache-Control']).toBe(SITE_CDN_CACHE)
    expect(headers['CDN-Cache-Control']).toBe(SITE_CDN_CACHE)
    expect(headers['Vercel-Cache-Tag']).toBe(SITE_CACHE_TAG)
    expect(headers.ETag).toBe('"site-1"')
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
    const response = await siteConfig.fetch(new Request('https://link.example/api/site-config'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=30')
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(SITE_CDN_CACHE)
    expect(response.headers.get('CDN-Cache-Control')).toBe(SITE_CDN_CACHE)
    expect(response.headers.get('Vercel-Cache-Tag')).toBe(SITE_CACHE_TAG)
    const body = (await response.json()) as {
      socials: Array<{ id: string; iconSlug?: string; iconPath?: string }>
      scripts: Record<string, unknown>
    }
    const github = body.socials.find((link) => link.id === 'github')
    expect(github?.iconPath).toBeTruthy()
    expect(github?.iconSlug).toBeUndefined()
    expect(body.scripts).not.toHaveProperty('plausible')
  })
})
