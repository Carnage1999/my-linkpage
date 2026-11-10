/**
 * POST /api/stats/provider-test
 * Tries the provider with the effective config plus an unsaved draft. Nothing is stored.
 */

import { json, requireStatsToken } from './_http'
import { testVisitorProvider } from './_providers'
import { isVisitorProvider } from './_providers/types'
import { bumpNamedLimit, hashClientIp } from './_redis'
import { draftCredentials, loadEffective, SettingsError, type SettingsPatch } from './_settings'
import { isStatsEnabled } from './_token'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!isStatsEnabled()) return json({ error: 'Stats not enabled' }, 501)
  const denied = await requireStatsToken(request)
  if (denied) return denied

  try {
    const attempts = await bumpNamedLimit('settings', await hashClientIp(request))
    if (attempts > 20) return json({ error: 'Too many attempts' }, 429)
    const body = (await request.json()) as { provider?: string; draft?: SettingsPatch }
    if (!body.provider || !isVisitorProvider(body.provider)) return json({ error: 'Unknown provider' }, 400)
    const effective = draftCredentials(await loadEffective(), body.draft)
    const result = await testVisitorProvider(body.provider, effective)
    return json(result)
  } catch (error) {
    if (error instanceof SettingsError) return json({ ok: false, error: error.message })
    console.error('Provider test error:', error)
    return json({ ok: false, error: 'Connection failed' })
  }
}
