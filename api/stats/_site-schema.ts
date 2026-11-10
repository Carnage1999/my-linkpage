import { DEFAULT_AVATAR, safeAvatarUrl } from '../../src/lib/safeAvatarUrl'
import { safeLinkUrl, safeSvgPath } from '../../src/lib/safeUrl'
import type { SocialLinkEntry } from '../../src/siteConfig'

export { DEFAULT_AVATAR }

export interface PublicSite {
  name: string
  tagline: string
  domain: string
  twitterHandle?: string
}

export interface PublicSiteConfig {
  v: 1
  version: number
  site: PublicSite
  profile: { avatar: string }
  socials: SocialLinkEntry[]
  ogImagePath: string
}

const URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tg:', 'tel:', 'sms:'])
const LINK_ID = /^[a-zA-Z0-9_-]{1,64}$/
const DOMAIN = /^[a-z0-9.-]{1,253}$/i
const HANDLE = /^@?[A-Za-z0-9_]{1,15}$/

export class SiteValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SiteValidationError'
  }
}

function text(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string') throw new SiteValidationError(`${field} is required`)
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max) throw new SiteValidationError(`${field} must be 1–${max} characters`)
  return trimmed
}

export function validateLinkUrl(value: string): string {
  if (value.length > 500) throw new SiteValidationError('Link URL is too long')
  const trimmed = value.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new SiteValidationError('Link URL is invalid')
  }
  if (!URL_PROTOCOLS.has(parsed.protocol)) {
    throw new SiteValidationError('Link URL must use http, https, mailto, tg, tel, or sms')
  }
  const safe = safeLinkUrl(trimmed)
  if (!safe) throw new SiteValidationError('Link URL is invalid')
  return safe
}

/**
 * A bundled public/ image served from this site, or an https URL.
 * There is no binary upload. The default is /avatar.jpg.
 * The same `safeAvatarUrl` check is used for the preview and the homepage.
 */
export function validateAvatar(value: string): string {
  if (value.length > 500) throw new SiteValidationError('Avatar URL is too long')
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_AVATAR
  const safe = safeAvatarUrl(trimmed)
  if (safe === DEFAULT_AVATAR && trimmed !== DEFAULT_AVATAR) {
    if (trimmed.startsWith('/')) throw new SiteValidationError('Choose an image shipped with the site')
    if (!trimmed.toLowerCase().startsWith('https:')) {
      throw new SiteValidationError('A custom avatar URL must use https')
    }
    throw new SiteValidationError('Avatar must be a bundled image or an https URL')
  }
  return safe
}

export function validateSiteConfig(input: unknown, version: number): PublicSiteConfig {
  if (!input || typeof input !== 'object') throw new SiteValidationError('Config must be an object')
  const body = input as Record<string, unknown>
  const site = (body.site ?? {}) as Record<string, unknown>
  const profile = (body.profile ?? {}) as Record<string, unknown>
  const socialsRaw = body.socials
  if (!Array.isArray(socialsRaw) || socialsRaw.length > 40) {
    throw new SiteValidationError('Provide between 0 and 40 links')
  }

  const domain = text(site.domain, 253, 'Domain').toLowerCase()
  if (!DOMAIN.test(domain) || domain.includes('..')) throw new SiteValidationError('Domain is invalid')

  let twitterHandle: string | undefined
  if (typeof site.twitterHandle === 'string' && site.twitterHandle.trim()) {
    const handle = site.twitterHandle.trim()
    if (!HANDLE.test(handle)) throw new SiteValidationError('Twitter handle is invalid')
    twitterHandle = handle.startsWith('@') ? handle : `@${handle}`
  }

  const seen = new Set<string>()
  const socials: SocialLinkEntry[] = socialsRaw.map((entry) => {
    const row = entry as Record<string, unknown>
    const id = text(row.id, 64, 'Link id')
    if (!LINK_ID.test(id)) throw new SiteValidationError(`Invalid link id: ${id}`)
    if (seen.has(id)) throw new SiteValidationError(`Duplicate link id: ${id}`)
    seen.add(id)
    const label = text(row.label, 80, 'Link label')
    const url = validateLinkUrl(text(row.url, 500, 'Link URL'))
    // The path is resolved in the browser when /manage saves, so this edge
    // function does not import the simple-icons package (the 1 MB limit).
    // Stored icons are a simple-icons slug plus that path. LinkedIn is the
    // custom `linkedin` slug. Export names such as `siGithub` are not accepted.
    const requested = typeof row.iconSlug === 'string' ? row.iconSlug.trim() : ''
    if (requested && !/^[a-z0-9]+(?:-[a-z0-9]+){0,8}$/.test(requested)) {
      throw new SiteValidationError(`Unknown icon: ${requested}`)
    }
    const iconPath = safeSvgPath(row.iconPath) ?? undefined
    if (requested && !iconPath) throw new SiteValidationError('Icon path is required')
    if (!requested && iconPath) throw new SiteValidationError('Icon slug is required')
    return {
      id,
      label,
      url,
      ...(requested && iconPath ? { iconSlug: requested, iconPath } : {}),
    }
  })

  return {
    v: 1,
    version,
    site: {
      name: text(site.name, 80, 'Name'),
      tagline: text(site.tagline, 160, 'Tagline'),
      domain,
      ...(twitterHandle ? { twitterHandle } : {}),
    },
    profile: {
      avatar: validateAvatar(typeof profile.avatar === 'string' ? profile.avatar : DEFAULT_AVATAR),
    },
    socials,
    ogImagePath: '/api/og',
  }
}
