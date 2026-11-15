/**
 * GET /api/stats/session
 * The admin cookie is HttpOnly, so the browser asks whether it is still signed in.
 */

import { json, requireStatsToken } from './_http'
import { isStatsEnabled } from './_token'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  if (!isStatsEnabled()) return json({ error: 'Stats not enabled' }, 501)
  const denied = await requireStatsToken(request)
  if (denied) return denied
  return json({ ok: true }, 200, 'private, no-store')
}
