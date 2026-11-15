/**
 * GET /api/stats/scripts
 * Public, non-secret tracker ids from the same site document as /api/site-config.
 */

import { bareUrl, privateBustValue, searchKeys } from '../_canonical'
import { publicCdnHeaders } from './_cache'
import { json } from './_http'
import { hashClientIp } from './_redis'
import { scriptsFromStored } from './_settings'
import { readPublicDocument } from './_site-store'
import { verifyToken } from './_token'

export const config = { runtime: 'edge' }

const NO_STORE = 'private, no-store'

export function __resetScriptCache(): void {
  /* The public response is not cached in the isolate. */
}

function bearer(request: Request): string {
  const header = request.headers.get('authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405)
  const url = new URL(request.url)
  if (searchKeys(url).length > 0) {
    const bust = privateBustValue(url)
    if (!(bust && (await verifyToken(bearer(request))))) {
      return new Response(null, { status: 308, headers: { Location: bareUrl(url).href, 'Cache-Control': NO_STORE } })
    }
  }
  const read = await readPublicDocument(await hashClientIp(request))
  if (read.kind === 'limited') return json({ error: 'Too many requests' }, 429, NO_STORE)
  if (read.kind === 'unavailable' || read.kind === 'invalid') return json({ error: 'Site config is unavailable' }, 503, NO_STORE)
  const scripts = scriptsFromStored(read.kind === 'ready' ? read.settings : null)
  if (read.kind !== 'ready' || privateBustValue(url)) return json(scripts, 200, NO_STORE)
  return json(scripts, 200, undefined, publicCdnHeaders())
}
