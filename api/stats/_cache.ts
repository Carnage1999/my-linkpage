/**
 * Cache headers for the public site config.
 *
 * The browser must revalidate. `max-age=0, must-revalidate` does that with the
 * ETag, so a tab never keeps a stale copy. `Vercel-CDN-Cache-Control` is what
 * Vercel's CDN stores, and it is not forwarded to the browser, so the CDN can
 * still answer repeat reads without calling Redis. There is no
 * stale-while-revalidate: that window is what kept serving the previous body
 * after a save.
 *
 * A save calls dangerouslyDeleteByTag with revalidationDeadlineSeconds 0, which
 * deletes every URL carrying this tag (the site config path, a trailing slash,
 * and the public scripts path) instead of serving one stale copy.
 *
 * https://vercel.com/docs/caching/cache-control-headers
 * https://vercel.com/docs/caching/cdn-cache/purge
 * https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
 */

export const SITE_CACHE_TAG = 'site-config'
export const SITE_BROWSER_CACHE = 'public, max-age=0, must-revalidate'
export const SITE_CDN_CACHE = 'public, s-maxage=300'

const REQUEST_CONTEXT = Symbol.for('@vercel/request-context')

export type PurgeResult = 'ok' | 'unavailable' | 'failed'

export function publicCdnHeaders(etag?: string): Record<string, string> {
  return {
    'Cache-Control': SITE_BROWSER_CACHE,
    'CDN-Cache-Control': SITE_CDN_CACHE,
    'Vercel-CDN-Cache-Control': SITE_CDN_CACHE,
    'Vercel-Cache-Tag': SITE_CACHE_TAG,
    ...(etag ? { ETag: etag } : {}),
  }
}

export function etagMatches(header: string | null, tag: string): boolean {
  if (!header) return false
  return header.split(',').some((part) => part.trim().replace(/^W\//, '') === tag)
}

interface PurgeApi {
  dangerouslyDeleteByTag?: (tag: string | string[], options?: { revalidationDeadlineSeconds?: number }) => Promise<void>
}

function requestPurgeApi(): PurgeApi | null {
  const holder = globalThis as typeof globalThis & { [REQUEST_CONTEXT]?: { get?: () => { purge?: PurgeApi } } }
  return holder[REQUEST_CONTEXT]?.get?.()?.purge ?? null
}

/** Delete every cached URL for this tag. Returns whether the runtime accepted it. */
export async function purgeSiteConfigCache(): Promise<PurgeResult> {
  const api = requestPurgeApi()
  if (!api?.dangerouslyDeleteByTag) return 'unavailable'
  try {
    await api.dangerouslyDeleteByTag(SITE_CACHE_TAG, { revalidationDeadlineSeconds: 0 })
    return 'ok'
  } catch (error) {
    console.error('CDN purge failed:', error)
    return 'failed'
  }
}
