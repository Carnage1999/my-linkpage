/**
 * GET /api/stats/scripts
 * Public, non-secret tracker ids. Cached so a visit does not read Redis.
 */

import { publicCdnHeaders } from './_cache'
import { json } from './_http'
import { loadEffective, publicScriptsFrom } from './_settings'

export const config = { runtime: 'edge' }

let cache: { at: number; body: unknown } | null = null

export function __resetScriptCache(): void {
  cache = null
}

export async function scriptPayload(options?: { fresh?: boolean }) {
  if (!options?.fresh && cache && Date.now() - cache.at < 60_000) return cache.body
  const body = publicScriptsFrom(await loadEffective(options))
  cache = { at: Date.now(), body }
  return body
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  const body = await scriptPayload({ fresh: true })
  return json(body, 200, undefined, publicCdnHeaders())
}
