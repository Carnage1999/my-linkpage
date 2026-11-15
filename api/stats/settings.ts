/**
 * GET/PUT /api/stats/settings
 * Authenticated. Secrets are write-only. Env vars lock their fields.
 */

import { purgeSiteConfigCache } from './_cache'
import { blockedWriteResponse, json, requireStatsToken } from './_http'
import { previewWritesBlocked } from './_keys'
import { bumpNamedLimit, hashClientIp, isRedisConfigured } from './_redis'
import { commitManagedConfig, loadEffective, SettingsError } from './_settings'
import { SiteConflictError, SiteValidationError } from './_site-schema'
import { isStatsEnabled } from './_token'

export const config = { runtime: 'edge' }

const WRITE_LIMIT = 20

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (!isStatsEnabled()) return json({ error: 'Stats not enabled' }, 501)
  const denied = await requireStatsToken(request)
  if (denied) return denied

  if (request.method === 'GET') {
    const effective = await loadEffective()
    return json(effective.view, 200, 'private, no-store')
  }

  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405)
  if (previewWritesBlocked()) return json({ error: 'Preview writes require REDIS_KEY_PREFIX' }, 503, 'private, no-store')
  if (!isRedisConfigured()) return json({ error: 'Redis is not configured' }, 501)

  try {
    const attempts = await bumpNamedLimit('settings', await hashClientIp(request))
    if (attempts > WRITE_LIMIT) return json({ error: 'Too many attempts' }, 429)
    const committed = await commitManagedConfig(await request.json())
    const purge = await purgeSiteConfigCache()
    return json(committed.effective.view, 200, 'private, no-store', { 'x-site-purge': purge })
  } catch (error) {
    const blocked = blockedWriteResponse(error)
    if (blocked) return blocked
    if (error instanceof SiteConflictError) return json({ error: error.message, version: error.version }, 409)
    if (error instanceof SettingsError || error instanceof SiteValidationError) return json({ error: error.message }, 400)
    console.error('Settings save error:', error)
    return json({ error: 'Internal error' }, 500)
  }
}
