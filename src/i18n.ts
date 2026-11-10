import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_HOMEPAGE_I18N, mapDetected } from './i18n/publicCopy'
import en from './locales/en.json'
import ru from './locales/ru.json'
import zhTW from './locales/zh-TW.json'

export const defaultNS = 'translation'

export const resources = {
  en: { translation: en },
  ru: { translation: ru },
  'zh-TW': { translation: zhTW },
} as const

export type AppLanguageCode = keyof typeof resources

const initialLanguages = DEFAULT_HOMEPAGE_I18N.languages.map((language) => language.code)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
    supportedLngs: Object.keys(resources) as AppLanguageCode[],
    // Store updates must re-render. bindI18nStore defaults to '' so
    // addResourceBundle alone does not refresh useTranslation.
    // https://github.com/i18next/react-i18next/blob/master/src/defaults.js
    react: {
      bindI18n: 'languageChanged',
      bindI18nStore: 'added removed',
    },
    // Official detector order checks the query string before localStorage and
    // navigator, so ?lng= on a hreflang link wins.
    // https://github.com/i18next/i18next-browser-languageDetector#detector-options
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (language: string) =>
        mapDetected(language, initialLanguages, DEFAULT_HOMEPAGE_I18N.fallback),
    },
    interpolation: { escapeValue: false },
  })

export default i18n
