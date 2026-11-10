/**
 * Merge homepage overrides into the shared i18next instance.
 *
 * i18next-browser-languagedetector reads `detection.order`. Its default order
 * includes `navigator` (the browser's languages). This app keeps a saved
 * choice in `localStorage` (`i18nextLng`) first, then `?lng=`, and adds
 * `navigator` only when auto-detect is on. The detector's cache is why a
 * language chosen once wins over a later browser setting.
 * https://github.com/i18next/i18next-browser-languageDetector#detector-options
 * https://www.i18next.com/how-to/faq
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
    const overrides = enabled.includes(code) ? settings.overrides[code] : undefined
    i18n.removeResourceBundle(code, 'translation')
    i18n.addResourceBundle(code, 'translation', bundleFor(code, overrides), true, true)
  }

  const detector = (i18n.services as { languageDetector?: Detector }).languageDetector
  detector?.init(
    i18n.services,
    {
      order: settings.detect ? ['localStorage', 'navigator', 'querystring'] : ['localStorage', 'querystring'],
      caches: ['localStorage'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (language: string) => mapDetected(language, enabled, fallback),
    },
    i18n.options,
  )

  const current = i18n.resolvedLanguage || i18n.language
  if (current && !supported.includes(current)) {
    void i18n.changeLanguage(fallback)
    return
  }
  i18n.emit('languageChanged', i18n.language)
}

export function resetHomepageI18nForTests(): void {
  applied = ''
}
