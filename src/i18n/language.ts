/**
 * One saved language for the homepage and the dashboard.
 * Order matches i18next-browser-languagedetector: query string, then
 * localStorage, then the browser. The storage key stays `i18nextLng` so a
 * choice made before this change is still honored.
 * https://github.com/i18next/i18next-browser-languageDetector#detector-options
 */

import { useEffect, useState } from 'react'
import { matchEnabled, type HomepageI18n } from './homepage'

export const LANGUAGE_STORAGE_KEY = 'i18nextLng'

const listeners = new Set<() => void>()
let current = readStored() ?? 'en'

function readStored(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(code: string) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
  } catch {
    /* storage can be blocked */
  }
}

export function getUiLanguage(): string {
  return current
}

export function setUiLanguage(code: string) {
  current = code
  writeStored(code)
  for (const listener of listeners) listener()
}

export function subscribeUiLanguage(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useUiLanguage(): readonly [string, (code: string) => void] {
  const [code, setCode] = useState(getUiLanguage)
  useEffect(() => subscribeUiLanguage(() => setCode(getUiLanguage())), [])
  return [code, setUiLanguage] as const
}

/** Pick the homepage language. A `?lng=` link wins over a saved choice. */
export function detectHomepageLanguage(i18n: HomepageI18n): string {
  const enabled = i18n.languages.map((language) => language.code)
  const fallback = enabled.includes(i18n.fallback) ? i18n.fallback : (enabled[0] ?? 'en')
  const query = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lng')
  const stored = readStored()
  const nav = typeof navigator === 'undefined' ? null : navigator.language
  const candidates = i18n.detect ? [query, stored, nav] : [query, stored]
  for (const candidate of candidates) {
    const match = matchEnabled(candidate ?? undefined, enabled)
    if (match) return match
  }
  return fallback
}
