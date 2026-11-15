/**
 * Public homepage copy lives in the site config (`i18n.texts`).
 * A missing line uses the default language. There is no locale JSON file.
 */

import seedFile from '../../public/siteConfig.json'

export const PUBLIC_KEYS = [
  'pageTitle',
  'title',
  'subtitle',
  'aboutMe',
  'intro',
  'avatarAlt',
  'builtWith',
  'builtWithLabel',
  'visit',
  'copy',
  'copied',
  'language',
  'theme',
  'lightMode',
  'darkMode',
  'skipToContent',
  'opensInNewTab',
] as const

export type PublicKey = (typeof PUBLIC_KEYS)[number]

export const PERSONAL_KEYS: readonly PublicKey[] = [
  'pageTitle',
  'title',
  'subtitle',
  'aboutMe',
  'intro',
  'avatarAlt',
  'builtWith',
  'builtWithLabel',
]

export const KEY_LIMIT: Record<PublicKey, number> = {
  pageTitle: 120,
  title: 80,
  subtitle: 160,
  aboutMe: 80,
  intro: 500,
  avatarAlt: 120,
  builtWith: 80,
  builtWithLabel: 80,
  visit: 40,
  copy: 40,
  copied: 40,
  language: 40,
  theme: 40,
  lightMode: 40,
  darkMode: 40,
  skipToContent: 80,
  opensInNewTab: 80,
}

export interface HomepageLanguage {
  code: string
  label: string
  shortLabel: string
}

export type HomepageTexts = Partial<Record<PublicKey, string>>

export interface HomepageI18n {
  languages: HomepageLanguage[]
  fallback: string
  detect: boolean
  texts: Record<string, HomepageTexts>
}

const seedI18n = (seedFile as { i18n: HomepageI18n }).i18n

export const DEFAULT_HOMEPAGE_I18N: HomepageI18n = {
  languages: seedI18n.languages.map((language) => ({ ...language })),
  fallback: seedI18n.fallback,
  detect: seedI18n.detect,
  texts: structuredClone(seedI18n.texts),
}

const BCP47 = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/

export function isPublicKey(value: string): value is PublicKey {
  return (PUBLIC_KEYS as readonly string[]).includes(value)
}

/** Canonical BCP 47 tag, or null when the code is not one this page accepts. */
export function canonicalLocale(value: string): string | null {
  const trimmed = value.trim().replaceAll('_', '-')
  if (!trimmed || trimmed.length > 35 || trimmed.includes('--')) return null
  const parts = trimmed.split('-')
  if (parts.length > 3) return null
  const [language, ...rest] = parts
  if (!language || !/^[A-Za-z]{2,3}$/.test(language)) return null
  const out = [language.toLowerCase()]
  for (const part of rest) {
    if (/^[A-Za-z]{4}$/.test(part)) out.push(`${part[0]?.toUpperCase() ?? ''}${part.slice(1).toLowerCase()}`)
    else if (/^[A-Za-z]{2}$/.test(part)) out.push(part.toUpperCase())
    else if (/^\d{3}$/.test(part)) out.push(part)
    else return null
  }
  const code = out.join('-')
  return BCP47.test(code) ? code : null
}

export function seedTextsFor(code: string): HomepageTexts {
  return { ...(seedI18n.texts[code] ?? {}) }
}

/**
 * Map a browser or stored tag onto an enabled homepage language.
 * Returns null when nothing enabled matches, so detection can try the next source.
 * Every code uses the same two steps: the full tag, then the primary subtag.
 */
export function matchEnabled(language: string | undefined, enabled: readonly string[]): string | null {
  if (!language) return null
  const lower = language.toLowerCase().replaceAll('_', '-')
  const exact = enabled.find((code) => code.toLowerCase() === lower)
  if (exact) return exact
  const primary = lower.split('-')[0] ?? ''
  if (!primary) return null
  return (
    enabled.find((code) => {
      const candidate = code.toLowerCase()
      return candidate === primary || candidate.startsWith(`${primary}-`)
    }) ?? null
  )
}

export function mapDetected(language: string | undefined, enabled: readonly string[], fallback: string): string {
  return matchEnabled(language, enabled) ?? fallback
}

export function fallbackCode(i18n: HomepageI18n): string {
  const codes = i18n.languages.map((language) => language.code)
  return codes.includes(i18n.fallback) ? i18n.fallback : (codes[0] ?? i18n.fallback)
}

/** Saved line, then the configured default language, then that language's seed. The same steps for every code. */
export function homepageText(i18n: HomepageI18n, code: string, key: PublicKey): string {
  const fallback = fallbackCode(i18n)
  const saved = i18n.texts[code]?.[key]?.trim()
  if (saved) return saved
  if (code !== fallback) {
    const fromDefault = i18n.texts[fallback]?.[key]?.trim()
    if (fromDefault) return fromDefault
  }
  const seeded = seedTextsFor(code)[key]?.trim()
  if (seeded) return seeded
  if (code !== fallback) return seedTextsFor(fallback)[key]?.trim() || ''
  return ''
}

/** Share-image line. It is the requested language's subtitle, then the default language. */
export function shareSubtitle(input: { requested: string | null; i18n: HomepageI18n }): string {
  const fallback = fallbackCode(input.i18n)
  const requested = input.requested ? canonicalLocale(input.requested) : null
  const codes = input.i18n.languages.map((language) => language.code)
  const code = requested && codes.includes(requested) ? requested : fallback
  return homepageText(input.i18n, code, 'subtitle')
}
