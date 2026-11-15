/**
 * POST /api/stats/logout
 * Clears the admin cookie. The token never returns to JavaScript.
 */

import { clearSessionCookie, json, requestIsSecure } from './_http'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  return json({ ok: true }, 200, 'private, no-store', {
    'Set-Cookie': clearSessionCookie(requestIsSecure(request)),
  })
}
