/**
 * GET/PUT /api/stats/settings
 * Authenticated. Secrets are write-only. Env vars lock their fields.
 */

import { json, requireStatsToken } from './_http'
import { bumpNamedLimit, hashClientIp, isRedisConfigured } from './_redis'
import { loadEffective, saveSettings, SettingsError, type SettingsPatch } from './_settings'
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
  if (!isRedisConfigured()) return json({ error: 'Redis is not configured' }, 501)

  try {
    const attempts = await bumpNamedLimit('settings', await hashClientIp(request))
    if (attempts > WRITE_LIMIT) return json({ error: 'Too many attempts' }, 429)
    const patch = (await request.json()) as SettingsPatch
    const effective = await saveSettings(patch)
    return json(effective.view)
  } catch (error) {
    if (error instanceof SettingsError) return json({ error: error.message }, 400)
    console.error('Settings save error:', error)
    return json({ error: 'Internal error' }, 500)
  }
}
