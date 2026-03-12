import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
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

function normalizeDetectedLanguage(language: string | undefined): AppLanguageCode {
  if (!language) {
    return 'en'
  }

  const normalizedLanguage = language.toLowerCase()

  if (
    normalizedLanguage === 'zh' ||
    normalizedLanguage.startsWith('zh-cn') ||
    normalizedLanguage.startsWith('zh-sg') ||
    normalizedLanguage.includes('hans') ||
    normalizedLanguage.startsWith('zh-tw') ||
    normalizedLanguage.startsWith('zh-hk') ||
    normalizedLanguage.startsWith('zh-mo') ||
    normalizedLanguage.includes('hant')
  ) {
    return 'zh-TW'
  }

  if (normalizedLanguage.startsWith('ru')) {
    return 'ru'
  }

  if (normalizedLanguage.startsWith('en')) {
    return 'en'
  }

  return 'en'
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
    supportedLngs: Object.keys(resources) as AppLanguageCode[],
    detection: {
      order: ['localStorage', 'navigator', 'path', 'querystring'],
      caches: ['localStorage'],
      convertDetectedLanguage: (language) =>
        normalizeDetectedLanguage(language),
    },
    interpolation: { escapeValue: false },
  })

export default i18n
