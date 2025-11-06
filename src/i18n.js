import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// 我把翻譯檔放在 src/locales 下，透過 import 載入
import en from './locales/en.json'
import ru from './locales/ru.json'
import zhTW from './locales/zh-TW.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      'zh-TW': { translation: zhTW }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'zh-TW'],
    detection: {
      order: ['localStorage', 'navigator', 'path', 'querystring'],
      caches: ['localStorage']
    },
    interpolation: { escapeValue: false }
  })

export default i18n
