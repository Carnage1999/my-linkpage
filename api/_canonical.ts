/**
 * Public cache keys include the query string. Only an allowlisted `lng`,
 * or a `v` bust presented with a valid admin token, may vary the response.
 * Everything else is rewritten onto the bare path so it shares one CDN entry.
 */

const LANGUAGE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i

export function searchKeys(url: URL): string[] {
  return [...url.searchParams.keys()]
}

export function bareUrl(url: URL): URL {
  return new URL(url.pathname, url.origin)
}

/** `v` is the only parameter, and it has a value. The caller still checks the token. */
export function privateBustValue(url: URL): string | null {
  const keys = searchKeys(url)
  if (keys.length !== 1 || keys[0] !== 'v') return null
  const value = url.searchParams.get('v')
  return value ? value : null
}

/** Keep a well-formed `lng` and drop every other parameter. */
export function canonicalOgUrl(url: URL): URL {
  const next = bareUrl(url)
  const keys = searchKeys(url)
  const lng = url.searchParams.get('lng')
  if (keys.length === 1 && keys[0] === 'lng' && lng && LANGUAGE.test(lng)) {
    next.searchParams.set('lng', lng)
  }
  return next
}
