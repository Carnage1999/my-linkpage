import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// jsdom doesn't provide localStorage without a valid --localstorage-file
function ensureLocalStorage() {
  try {
    window.localStorage.setItem('__test__', '1')
    window.localStorage.removeItem('__test__')
  } catch {
    const store = new Map<string, string>()
    const storage: Storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    }
    vi.stubGlobal('localStorage', storage)
  }
}

// jsdom doesn't implement window.matchMedia
function ensureMatchMedia() {
  if (typeof window.matchMedia === 'function') return
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }))
  )
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
  vi.clearAllMocks()
})
