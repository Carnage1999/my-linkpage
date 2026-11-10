import { useUiLanguage } from '../i18n/language'
import { isManageLanguage, manageText, type ManageKey } from './copy'

export function useManageCopy() {
  const [language, setLanguage] = useUiLanguage()
  const active = isManageLanguage(language) ? language : 'en'
  const t = (key: ManageKey, vars?: Record<string, string | number>) => manageText(active, key, vars)
  return { t, language: active, setLanguage }
}
