/**
 * Avatar URLs that are safe to put in <img src>.
 *
 * Accepts only an exact path from the build-time public image manifest,
 * or an https URL from `safeHttpsUrl` (which rejects javascript:, data:,
 * blob:, protocol-relative URLs, and credentials). Anything else is the
 * bundled default /avatar.jpg.
 */

import publicImages from '../generated/public-images.json'
import { safeHttpsUrl, stripHtmlBreakout } from './safeUrl'

export const DEFAULT_AVATAR = '/avatar.jpg'

const MANIFEST: readonly string[] = publicImages

function manifestEntry(value: string): string | null {
  for (const entry of MANIFEST) {
    if (entry === value) return entry
  }
  return null
}

/**
 * The avatar src to render or store.
 * Never returns the caller's string unchanged unless it is an exact manifest path.
 */
export function safeAvatarUrl(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_AVATAR
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 500) return DEFAULT_AVATAR
  const bundled = manifestEntry(trimmed)
  if (bundled) return stripHtmlBreakout(bundled)
  return safeHttpsUrl(trimmed) ?? DEFAULT_AVATAR
}
