import type { SocialLinkEntry } from '../../src/siteConfig'
import publicImages from '../../src/generated/public-images.json'

export const DEFAULT_AVATAR = '/avatar.jpg'
const BUNDLED_IMAGES = new Set<string>(publicImages)

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
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new SiteValidationError('Link URL is invalid')
  }
  if (!URL_PROTOCOLS.has(url.protocol)) {
    throw new SiteValidationError('Link URL must use http, https, mailto, tg, tel, or sms')
  }
  if (value.length > 500) throw new SiteValidationError('Link URL is too long')
  return value.trim()
}

/**
 * A bundled public/ image served from this site, or an https URL.
 * There is no binary upload. The default is /avatar.jpg.
 */
export function validateAvatar(value: string): string {
  const trimmed = value.trim() || DEFAULT_AVATAR
  if (trimmed.length > 500) throw new SiteValidationError('Avatar URL is too long')
  if (trimmed.startsWith('/')) {
    if (BUNDLED_IMAGES.has(trimmed)) return trimmed
    throw new SiteValidationError('Choose an image shipped with the site')
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new SiteValidationError('Avatar must be a bundled image or an https URL')
  }
  if (url.protocol !== 'https:') throw new SiteValidationError('A custom avatar URL must use https')
  return trimmed
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
    const iconSlug = typeof row.iconSlug === 'string' && row.iconSlug.trim() ? row.iconSlug.trim().slice(0, 40) : undefined
    return { id, label, url, ...(iconSlug ? { iconSlug } : {}) }
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
