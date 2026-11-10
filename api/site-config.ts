/**
 * GET /api/site-config — public site content plus non-secret script ids.
 * PUT /api/site-config — authenticated replace.
 * POST /api/site-config — { action: "import" | "reset" } writes the repo seed.
 *
 * Node.js runtime, not Edge: resolving icons imports the full simple-icons
 * package, and that bundle is over the 1 MB Edge limit
 * (https://vercel.com/docs/functions/runtimes/node-js).
 * The response is still cached on Vercel's CDN. A hit does not call Redis.
 */

import { resolveStoredIcon } from '../src/icons/catalog'
import { safeSvgPath } from '../src/lib/safeUrl'
import type { SocialLinkEntry } from '../src/siteConfig'
import { publicCdnHeaders, purgeSiteConfigCache } from './stats/_cache'
import { json, requireStatsToken } from './stats/_http'
import { bumpNamedLimit, hashClientIp, isRedisConfigured } from './stats/_redis'
import { SiteValidationError, validateSiteConfig, type PublicSiteConfig } from './stats/_site-schema'
import { readRuntimeSite, seedSiteConfig, writeRuntimeSite } from './stats/_site-store'
import { isStatsEnabled } from './stats/_token'
import { __resetScriptCache, scriptPayload } from './stats/scripts'

function withIcons(site: PublicSiteConfig): PublicSiteConfig {
  const socials: SocialLinkEntry[] = site.socials.map((link) => {
    try {
      const icon = resolveStoredIcon({ url: link.url, iconSlug: link.iconSlug })
      const iconPath = safeSvgPath(icon.iconPath) ?? undefined
      return {
        id: link.id,
        label: link.label,
        url: link.url,
        ...(icon.iconSlug ? { iconSlug: icon.iconSlug } : {}),
        ...(iconPath ? { iconPath } : {}),
      }
    } catch {
      return link
    }
  })
  return { ...site, socials }
}

function etag(version: number): string {
  return `"site-${version}"`
}

export async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })

  if (request.method === 'GET') {
    const site = withIcons(await readRuntimeSite())
    const tag = etag(site.version)
    if (request.headers.get('if-none-match') === tag) {
      return new Response(null, { status: 304, headers: publicCdnHeaders(tag) })
    }
    const scripts = await scriptPayload()
    return json({ ...site, scripts }, 200, undefined, publicCdnHeaders(tag))
  }

  if (!isStatsEnabled()) return json({ error: 'Stats not enabled' }, 501)
  const denied = await requireStatsToken(request)
  if (denied) return denied
  if (!isRedisConfigured()) return json({ error: 'Redis is not configured' }, 501)

  try {
    const attempts = await bumpNamedLimit('site', await hashClientIp(request))
    if (attempts > 20) return json({ error: 'Too many attempts' }, 429)
  } catch (error) {
    console.error('Site config rate limit error:', error)
    return json({ error: 'Rate limit unavailable' }, 503)
  }

  try {
    const current = await readRuntimeSite()
    if (request.method === 'POST') {
      const body = (await request.json()) as { action?: string }
      if (body.action !== 'import' && body.action !== 'reset') return json({ error: 'Unknown action' }, 400)
      const next = withIcons({ ...seedSiteConfig(), version: current.version + 1 })
      await writeRuntimeSite(next)
    } else if (request.method === 'PUT') {
      const next = withIcons(validateSiteConfig(await request.json(), current.version + 1))
      await writeRuntimeSite(next)
    } else {
      return json({ error: 'Method not allowed' }, 405)
    }
    __resetScriptCache()
    await purgeSiteConfigCache()
    const saved = withIcons(await readRuntimeSite())
    return json(saved, 200, 'private, no-store')
  } catch (error) {
    if (error instanceof SiteValidationError) return json({ error: error.message }, 400)
    console.error('Site config save error:', error)
    return json({ error: 'Internal error' }, 500)
  }
}

export default { fetch: handler }
