/**
 * GET /api/site-config — public site content plus non-secret script ids.
 * PUT /api/site-config — authenticated replace.
 * POST /api/site-config — { action: "reset", confirm: true, baseVersion } writes the repo seed.
 *
 * Stays on the Edge runtime. The full simple-icons package is over the 1 MB
 * Edge limit, so this function only stores the SVG path that /manage resolved
 * at save time. Vercel's CDN caches the GET. A hit does not call Redis.
 */

import { bareUrl, privateBustValue, searchKeys } from './_canonical'
import { etagMatches, publicCdnHeaders, purgeSiteConfigCache } from './stats/_cache'
import { blockedWriteResponse, json, readJsonObject, requireStatsToken } from './stats/_http'
import { previewWritesBlocked } from './stats/_keys'
import { bumpNamedLimit, hashClientIp, isRedisConfigured } from './stats/_redis'
import { commitManagedConfig, publicScriptsFrom, scriptsFromStored, SettingsError } from './stats/_settings'
import { normalizeConfig, SiteConflictError, SiteValidationError } from './stats/_site-schema'
import { readManagedRaw, readPublicDocument, replaceManagedRaw, seedSiteConfig } from './stats/_site-store'
import { isStatsEnabled, verifyToken } from './stats/_token'

const NO_STORE = 'private, no-store'

export const config = { runtime: 'edge' }

function etag(version: number, scripts: unknown): string {
  const payload = `${version}:${JSON.stringify(scripts)}`
  let hash = 2166136261
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `"site-${(hash >>> 0).toString(16)}"`
}

function bearer(request: Request): string {
  const header = request.headers.get('authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

/** Local preview has no middleware, so a non-canonical GET is a no-store redirect and never a cache entry. */
async function canonicalGet(request: Request): Promise<'public' | 'private' | Response> {
  const url = new URL(request.url)
  if (searchKeys(url).length === 0) return 'public'
  const bust = privateBustValue(url)
  if (bust && (await verifyToken(bearer(request)))) return 'private'
  return new Response(null, {
    status: 308,
    headers: { Location: bareUrl(url).href, 'Cache-Control': NO_STORE },
  })
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })

  if (request.method === 'GET') {
    const mode = await canonicalGet(request)
    if (mode instanceof Response) return mode
    const read = await readPublicDocument(await hashClientIp(request))
    if (read.kind === 'limited') return json({ error: 'Too many requests' }, 429, NO_STORE)
    if (read.kind === 'unavailable' || read.kind === 'invalid') {
      return json({ error: 'Site config is unavailable' }, 503, NO_STORE)
    }
    const site = read.kind === 'ready' ? read.site : seedSiteConfig()
    const scripts = scriptsFromStored(read.kind === 'ready' ? read.settings : null)
    const tag = etag(site.version, scripts)
    if (mode === 'private' || read.kind !== 'ready') {
      return json({ ...site, scripts }, 200, NO_STORE)
    }
    if (etagMatches(request.headers.get('if-none-match'), tag)) {
      return new Response(null, { status: 304, headers: publicCdnHeaders(tag) })
    }
    return json({ ...site, scripts }, 200, undefined, publicCdnHeaders(tag))
  }

  if (!isStatsEnabled()) return json({ error: 'Stats not enabled' }, 501)
  const denied = await requireStatsToken(request)
  if (denied) return denied
  if (previewWritesBlocked()) return json({ error: 'Preview writes require REDIS_KEY_PREFIX' }, 503, 'private, no-store')
  if (!isRedisConfigured()) return json({ error: 'Redis is not configured' }, 501)

  try {
    const attempts = await bumpNamedLimit('site', await hashClientIp(request))
    if (attempts > 20) return json({ error: 'Too many attempts' }, 429)
  } catch (error) {
    const blocked = blockedWriteResponse(error)
    if (blocked) return blocked
    console.error('Site config rate limit error:', error)
    return json({ error: 'Rate limit unavailable' }, 503)
  }

  try {
    let saved
    const body = await readJsonObject(request)
    if (request.method === 'POST') {
      if (body.action !== 'reset') return json({ error: 'Unknown action' }, 400)
      if (body.confirm !== true) throw new SiteValidationError('confirm is required')
      if (typeof body.baseVersion !== 'number' || !Number.isInteger(body.baseVersion)) {
        throw new SiteValidationError('baseVersion is required')
      }
      const baseVersion = body.baseVersion
      const raw = await readManagedRaw()
      let version = 0
      let settings: unknown = null
      let readable = false
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { version?: unknown; settings?: unknown }
          version = normalizeConfig(parsed, typeof parsed.version === 'number' ? parsed.version : 1).version
          settings = parsed.settings ?? null
          readable = true
        } catch {
          readable = false
        }
      }
      if (readable && baseVersion !== version) throw new SiteConflictError(version)
      const nextVersion = (readable ? version : baseVersion) + 1
      const seeded = { ...seedSiteConfig(), version: nextVersion }
      const next = readable && settings && typeof settings === 'object' ? { ...seeded, settings } : seeded
      const wrote = await replaceManagedRaw(raw, JSON.stringify(next))
      if (!wrote) throw new SiteConflictError(readable ? version : 0)
      saved = { ...seeded, scripts: scriptsFromStored(readable ? settings : null) }
    } else if (request.method === 'PUT') {
      const committed = await commitManagedConfig(body)
      saved = { ...committed.site, scripts: publicScriptsFrom(committed.effective) }
    } else {
      return json({ error: 'Method not allowed' }, 405)
    }
    const purge = await purgeSiteConfigCache()
    return json(saved, 200, NO_STORE, { 'x-site-purge': purge })
  } catch (error) {
    const blocked = blockedWriteResponse(error)
    if (blocked) return blocked
    if (error instanceof SiteConflictError) return json({ error: error.message, version: error.version }, 409)
    if (error instanceof SiteValidationError || error instanceof SettingsError) return json({ error: error.message }, 400)
    console.error('Site config save error:', error)
    return json({ error: 'Internal error' }, 500)
  }
}
