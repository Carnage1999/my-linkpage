/**
 * Homepage copy that /manage can override. The dashboard labels stay in the
 * bundled locale files and are not in this list.
 */

import en from '../locales/en.json'
import ru from '../locales/ru.json'
import zhTW from '../locales/zh-TW.json'

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

/** Character caps. Empty means "use the bundled string". */
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

export interface HomepageI18n {
  languages: HomepageLanguage[]
  fallback: string
  detect: boolean
  overrides: Record<string, Record<string, string>>
}

export const DEFAULT_HOMEPAGE_I18N: HomepageI18n = {
  languages: [
    { code: 'en', label: 'English', shortLabel: 'EN' },
    { code: 'ru', label: 'Русский', shortLabel: 'РУ' },
    { code: 'zh-TW', label: '正體中文', shortLabel: '國' },
  ],
  fallback: 'en',
  detect: true,
  overrides: {},
}

const PACKS: Record<string, Record<string, string>> = {
  en: en as unknown as Record<string, string>,
  ru: ru as unknown as Record<string, string>,
  'zh-TW': zhTW as unknown as Record<string, string>,
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

export function bundledPack(code: string): Record<string, string> | null {
  return PACKS[code] ?? null
}

export function bundledValue(code: string, key: string): string {
  return PACKS[code]?.[key] ?? ''
}

/**
 * Map a browser or stored tag onto an enabled homepage language.
 * Chinese defaults to zh-TW when that is the only Chinese language enabled,
 * which matches the previous detector.
 */
export function mapDetected(language: string | undefined, enabled: readonly string[], fallback: string): string {
  if (!language) return fallback
  const lower = language.toLowerCase().replaceAll('_', '-')
  const exact = enabled.find((code) => code.toLowerCase() === lower)
  if (exact) return exact
  const primary = lower.split('-')[0] ?? ''
  const chinese = primary === 'zh' || lower.includes('hans') || lower.includes('hant')
  if (chinese) {
    const traditional =
      lower.includes('hant') || lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-mo')
    const simplified = lower.includes('hans') || lower.startsWith('zh-cn') || lower.startsWith('zh-sg')
    if (traditional) {
      const traditionalCode = enabled.find((code) => code.toLowerCase() === 'zh-tw' || code.toLowerCase() === 'zh-hant')
      if (traditionalCode) return traditionalCode
    }
    if (simplified || lower === 'zh') {
      const simplifiedCode = enabled.find((code) => ['zh-cn', 'zh-hans', 'zh'].includes(code.toLowerCase()))
      if (simplifiedCode) return simplifiedCode
      const traditionalCode = enabled.find((code) => code.toLowerCase() === 'zh-tw')
      if (traditionalCode) return traditionalCode
    }
  }
  const byPrimary = enabled.find((code) => {
    const candidate = code.toLowerCase()
    return candidate === primary || candidate.startsWith(`${primary}-`)
  })
  return byPrimary ?? fallback
}

/**
 * Share-image subtitle. An edited subtitle wins. The saved tagline is the
 * fallback language's line until that subtitle is edited. Other languages use
 * their bundled subtitle.
 */
export function shareSubtitle(input: {
  requested: string | null
  i18n: HomepageI18n
  legacyTagline?: string
}): string {
  const codes = input.i18n.languages.map((language) => language.code)
  const fallback = codes.includes(input.i18n.fallback) ? input.i18n.fallback : (codes[0] ?? 'en')
  const requested = input.requested ? canonicalLocale(input.requested) : null
  const code = requested && codes.includes(requested) ? requested : fallback
  const override = input.i18n.overrides[code]?.subtitle?.trim()
  if (override) return override
  if (code === fallback && input.legacyTagline?.trim()) return input.legacyTagline.trim()
  return bundledValue(code, 'subtitle') || bundledValue(fallback, 'subtitle') || input.legacyTagline?.trim() || 'Links & socials'
}
