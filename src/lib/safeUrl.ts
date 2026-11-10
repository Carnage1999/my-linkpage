/**
 * Shared URL and SVG checks for anything that reaches the DOM.
 *
 * CodeQL `js/xss-through-dom` treats a typed string that lands in `src` or
 * `href` as HTML. `new URL()` plus a protocol allow-list drops `javascript:`,
 * `data:`, `blob:`, and protocol-relative values. The final replace strips
 * the characters that would break out of an HTML attribute. Every returned
 * string is either that checked URL or a constant.
 */

/** Drop characters that break out of an HTML attribute. */
export function stripHtmlBreakout(value: string): string {
  return value.replace(/[<>"']/g, '')
}

function hasControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 31 || code === 127) return true
  }
  return false
}

function parseAbsolute(value: string): URL | null {
  if (!value || value.length > 2000) return null
  if (value.startsWith('//') || value.startsWith('\\') || value.includes('\\'))
    return null
  if (hasControlChar(value)) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function hasCredentials(url: URL): boolean {
  return url.username !== '' || url.password !== ''
}

/**
 * An https URL with a host and no credentials.
 * Returns the parser's href, never the original string.
 */
export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = parseAbsolute(value.trim())
  if (!url) return null
  if (url.protocol !== 'https:') return null
  if (hasCredentials(url) || url.hostname === '') return null
  return stripHtmlBreakout(url.href)
}

const LINK_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'tg:',
  'tel:',
  'sms:',
])

/**
 * A link href: http(s), mailto, tg, tel, or sms. No credentials.
 * Returns null when the value must not be used as an href.
 */
export function safeLinkUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 500) return null
  const url = parseAbsolute(trimmed)
  if (!url || !LINK_PROTOCOLS.has(url.protocol) || hasCredentials(url))
    return null
  if (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.hostname === ''
  )
    return null
  return stripHtmlBreakout(url.href)
}

/** A script src. https only, same credential and scheme rules as safeHttpsUrl. */
export function safeScriptUrl(value: unknown): string | null {
  return safeHttpsUrl(value)
}

const SVG_PATH = /^[MmZzLlHhVvCcSsQqTtAaEe0-9\s,.\-+]+$/

/**
 * An SVG path `d` value. Commands and numbers only, so it cannot close the
 * attribute or the element.
 */
export function safeSvgPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 60_000)
    return null
  const match = SVG_PATH.exec(value)
  if (!match) return null
  return stripHtmlBreakout(match[0])
}

/** A short token safe to put in a data attribute (website id, site tag). */
export function safeToken(value: unknown, max = 64): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > max)
    return null
  const match = /^[A-Za-z0-9_-]+$/.exec(value)
  if (!match) return null
  return match[0]
}

/** A hostname safe to put in a data attribute. */
export function safeHostname(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  if (!/^[a-z0-9.-]{1,253}$/.test(trimmed)) return null
  if (
    trimmed.startsWith('.') ||
    trimmed.endsWith('.') ||
    trimmed.includes('..')
  )
    return null
  return trimmed
}
