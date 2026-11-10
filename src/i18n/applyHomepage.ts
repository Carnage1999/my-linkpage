/**
 * Merge homepage overrides into the shared i18next instance.
 *
 * i18next-browser-languagedetector's default order is querystring, cookie,
 * localStorage, sessionStorage, navigator, htmlTag. This app uses querystring
 * (`?lng=`), then localStorage (`i18nextLng`), and adds navigator only when
 * auto-detect is on. A link such as `?lng=zh-TW` therefore beats the browser
 * language. The detector then caches that choice, which is why it wins on the
 * next visit with no query string.
 * https://github.com/i18next/i18next-browser-languageDetector#detector-options
 * https://www.i18next.com/how-to/faq
 *
 * react-i18next re-renders on `languageChanged` and, with bindI18nStore set,
 * on resource-store `added` / `removed`. The store binding defaults to empty,
 * so writing a bundle without one of those events leaves the old string on screen.
 * https://github.com/i18next/react-i18next/blob/master/src/defaults.js
 *
 * Only public homepage keys are replaced. Dashboard strings stay on the
 * bundled locale files. A language with no file falls back to `fallbackLng`.
 */

import i18n from '../i18n'
import { bundledPack, isPublicKey, mapDetected, type HomepageI18n } from './publicCopy'

const BUNDLED_CODES = ['en', 'ru', 'zh-TW']

interface Detector {
  init: (services: unknown, options: Record<string, unknown>, i18nOptions: unknown) => void
}

function bundleFor(code: string, overrides: Record<string, string> | undefined): Record<string, string> {
  const pack: Record<string, string> = { ...(bundledPack(code) ?? {}) }
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (!isPublicKey(key)) continue
    const trimmed = value.trim()
    if (!trimmed || trimmed === pack[key]) continue
    pack[key] = trimmed
  }
  return pack
}

let applied = ''

export function applyHomepageI18n(settings: HomepageI18n): void {
  const enabled = settings.languages.map((language) => language.code)
  const fallback = enabled.includes(settings.fallback) ? settings.fallback : (enabled[0] ?? 'en')
  const signature = JSON.stringify({ enabled, fallback, detect: settings.detect, overrides: settings.overrides })
  if (signature === applied) return
  applied = signature

  const supported = [...new Set([...enabled, ...BUNDLED_CODES, 'cimode'])]
  i18n.options.fallbackLng = [fallback]
  i18n.options.supportedLngs = supported
  const languageUtils = (i18n.services as { languageUtils?: { supportedLngs?: string[] | false; clearCache?: () => void } }).languageUtils
  if (languageUtils) {
    languageUtils.supportedLngs = supported
    languageUtils.clearCache?.()
  }

  for (const code of Object.keys(i18n.store?.data ?? {})) {
    if (!supported.includes(code)) i18n.removeResourceBundle(code, 'translation')
  }
  for (const code of supported) {
    if (code === 'cimode') continue
    const overrides = enabled.includes(code) ? settings.overrides[code] : undefined
    // The store starts as the imported locale module. addResourceBundle's deep
    // extend writes into that object, which would change the bundled defaults.
    // Remove first, then add a copy. Both events are synchronous, and
    // useTranslation reads the store only after this function returns.
    if (i18n.hasResourceBundle(code, 'translation')) i18n.removeResourceBundle(code, 'translation')
    i18n.addResourceBundle(code, 'translation', bundleFor(code, overrides), true, true)
  }

  const detector = (i18n.services as { languageDetector?: Detector }).languageDetector
  detector?.init(
    i18n.services,
    {
      order: settings.detect ? ['querystring', 'localStorage', 'navigator'] : ['querystring', 'localStorage'],
      caches: ['localStorage'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (language: string) => mapDetected(language, enabled, fallback),
    },
    i18n.options,
  )

  const current = i18n.resolvedLanguage || i18n.language
  const nextLanguage = current && supported.includes(current) ? current : fallback
  // changeLanguage emits languageChanged after the translator points at the
  // updated store, which is what useTranslation subscribes to by default.
  void i18n.changeLanguage(nextLanguage)
}

export function resetHomepageI18nForTests(): void {
  applied = ''
}
