import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

// jsdom 28 doesn't provide localStorage without a valid --localstorage-file
// Provide a minimal Storage polyfill if the native one is broken
function ensureLocalStorage() {
  try {
    window.localStorage.setItem('__test__', '1')
    window.localStorage.removeItem('__test__')
  } catch {
    const store: Record<string, string> = {}
    const storage: Storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value)
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key]
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length
      },
    }
    Object.defineProperty(window, 'localStorage', { value: storage, writable: true })
  }
}

// jsdom doesn't implement window.matchMedia
function ensureMatchMedia() {
  if (typeof window.matchMedia === 'function') return
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

beforeAll(() => {
  ensureLocalStorage()
  ensureMatchMedia()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  document.documentElement.lang = 'en'
})
