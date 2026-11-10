import {
  bundledValue,
  canonicalLocale,
  DEFAULT_HOMEPAGE_I18N,
  isPublicKey,
  KEY_LIMIT,
  type HomepageI18n,
  type HomepageLanguage,
} from '../../src/i18n/publicCopy'
import { DEFAULT_AVATAR, safeAvatarUrl } from '../../src/lib/safeAvatarUrl'
import { safeLinkUrl, safeSvgPath } from '../../src/lib/safeUrl'
import type { SocialLinkEntry } from '../../src/siteConfig'

export { DEFAULT_AVATAR }

export interface PublicSite {
  name: string
  /** Legacy share-image subtitle. The homepage subtitle is an i18n override. */
  tagline?: string
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
  i18n: HomepageI18n
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

function validateI18n(value: unknown): HomepageI18n {
  if (value == null) return structuredClone(DEFAULT_HOMEPAGE_I18N)
  if (typeof value !== 'object' || Array.isArray(value)) throw new SiteValidationError('Languages must be an object')
  const body = value as Record<string, unknown>
  const languagesRaw = body.languages
  if (!Array.isArray(languagesRaw) || languagesRaw.length < 1 || languagesRaw.length > 12) {
    throw new SiteValidationError('Choose between 1 and 12 languages')
  }
  const seen = new Set<string>()
  const languages: HomepageLanguage[] = languagesRaw.map((entry) => {
    const row = entry as Record<string, unknown>
    const code = canonicalLocale(typeof row.code === 'string' ? row.code : '')
    if (!code) throw new SiteValidationError('Locale code must be a BCP 47 tag, such as fr or pt-BR')
    if (seen.has(code)) throw new SiteValidationError(`Duplicate language: ${code}`)
    seen.add(code)
    return {
      code,
      label: text(row.label, 40, 'Language name'),
      shortLabel: text(row.shortLabel, 12, 'Language short name'),
    }
  })
  const fallback = canonicalLocale(typeof body.fallback === 'string' ? body.fallback : '')
  if (!fallback || !seen.has(fallback)) throw new SiteValidationError('Default language must be one of the enabled languages')
  if (typeof body.detect !== 'boolean') throw new SiteValidationError('Browser detection must be true or false')

  const overrides: Record<string, Record<string, string>> = {}
  const rawOverrides = body.overrides ?? {}
  if (typeof rawOverrides !== 'object' || Array.isArray(rawOverrides)) {
    throw new SiteValidationError('Text overrides must be an object')
  }
  for (const [rawCode, pack] of Object.entries(rawOverrides as Record<string, unknown>)) {
    const code = canonicalLocale(rawCode)
    if (!code || !seen.has(code)) throw new SiteValidationError(`Unknown language: ${rawCode}`)
    if (!pack || typeof pack !== 'object' || Array.isArray(pack)) throw new SiteValidationError('Text overrides must be an object')
    const strings: Record<string, string> = {}
    for (const [key, raw] of Object.entries(pack as Record<string, unknown>)) {
      if (!isPublicKey(key)) throw new SiteValidationError(`Unknown text: ${key}`)
      if (typeof raw !== 'string') throw new SiteValidationError(`${key} must be text`)
      const trimmed = raw.trim()
      if (!trimmed) continue
      if (trimmed.length > KEY_LIMIT[key]) throw new SiteValidationError(`${key} must be at most ${KEY_LIMIT[key]} characters`)
      if (trimmed === bundledValue(code, key)) continue
      strings[key] = trimmed
    }
    if (Object.keys(strings).length > 0) overrides[code] = strings
  }

  return { languages, fallback, detect: body.detect, overrides }
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

  let tagline: string | undefined
  if (typeof site.tagline === 'string' && site.tagline.trim()) tagline = text(site.tagline, 160, 'Tagline')

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
      ...(tagline ? { tagline } : {}),
      domain,
      ...(twitterHandle ? { twitterHandle } : {}),
    },
    profile: {
      avatar: validateAvatar(typeof profile.avatar === 'string' ? profile.avatar : DEFAULT_AVATAR),
    },
    socials,
    ogImagePath: '/api/og',
    i18n: validateI18n(body.i18n),
  }
}
