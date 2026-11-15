/**
 * Runs before the CDN cache lookup, so a rewritten URL is the cache key.
 * Junk query parameters would otherwise each miss and read Redis.
 *
 * https://vercel.com/docs/routing-middleware
 * https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#rewrite
 */

import { next, rewrite } from '@vercel/functions'
import { bareUrl, canonicalOgUrl, privateBustValue, searchKeys } from './api/_canonical'
import { verifyToken } from './api/stats/_token'

export const config = {
  matcher: ['/api/site-config', '/api/stats/scripts', '/api/og'],
}

function bearer(request: Request): string {
  const header = request.headers.get('authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

export default async function middleware(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next()
  const url = new URL(request.url)

  if (url.pathname === '/api/og') {
    const canonical = canonicalOgUrl(url)
    if (canonical.href === url.href) return next()
    return rewrite(canonical)
  }

  if (url.pathname !== '/api/site-config' && url.pathname !== '/api/stats/scripts') return next()
  if (searchKeys(url).length === 0) return next()
  if (privateBustValue(url) && (await verifyToken(bearer(request)))) return next()
  return rewrite(bareUrl(url))
}
