/**
 * Cache headers for the public site config.
 *
 * When Cache-Control is the only cache header, Vercel strips `s-maxage` and
 * `stale-while-revalidate` and does not store the response (`x-vercel-cache: MISS`).
 * `Vercel-CDN-Cache-Control` is the header Vercel's CDN actually stores, and it is
 * not forwarded to the browser. `CDN-Cache-Control` overrides a `no-cache` from
 * vercel.json. A save deletes the tag so the next request is fresh.
 *
 * https://vercel.com/docs/caching/cache-control-headers
 * https://vercel.com/docs/caching/cdn-cache/purge
 */

export const SITE_CACHE_TAG = 'site-config'
export const SITE_BROWSER_CACHE = 'public, max-age=30'
export const SITE_CDN_CACHE = 'public, s-maxage=300, stale-while-revalidate=600'

export function publicCdnHeaders(etag?: string): Record<string, string> {
  return {
    'Cache-Control': SITE_BROWSER_CACHE,
    'CDN-Cache-Control': SITE_CDN_CACHE,
    'Vercel-CDN-Cache-Control': SITE_CDN_CACHE,
    'Vercel-Cache-Tag': SITE_CACHE_TAG,
    ...(etag ? { ETag: etag } : {}),
  }
}

/** Delete the CDN entry immediately. `invalidateByTag` would still serve one stale copy. */
export async function purgeSiteConfigCache(): Promise<void> {
  try {
    const { dangerouslyDeleteByTag } = await import('@vercel/functions')
    await dangerouslyDeleteByTag(SITE_CACHE_TAG)
  } catch (error) {
    console.error('CDN purge skipped:', error)
  }
}
