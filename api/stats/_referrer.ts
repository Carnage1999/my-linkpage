/**
 * Keep only the referrer hostname.
 * Drops the path, query, and any same-origin host (the page itself).
 */

function bareHost(value: string): string {
  return value.toLowerCase().replace(/:\d+$/, '').trim()
}

export function referrerHostname(
  raw: string | null | undefined,
  pageHost: string,
  extraHosts: readonly string[] = [],
): string | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase()
  const blocked = new Set([bareHost(pageHost), ...extraHosts.map(bareHost)].filter(Boolean))
  if (!host || blocked.has(host)) return null
  return host
}

/** Two-letter country from the edge, or null. Never an IP. */
export function countryFromRequest(request: Request): string | null {
  // https://vercel.com/docs/headers/request-headers — x-vercel-ip-country
  // https://developers.cloudflare.com/fundamentals/reference/http-headers/ — CF-IPCountry
  const header =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry')
  const fromCf = (request as Request & { cf?: { country?: string } }).cf?.country
  const code = (header ?? fromCf ?? '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return null
  return code
}
