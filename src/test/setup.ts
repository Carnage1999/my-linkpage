import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { invalidateSiteConfig } from '../hooks/useSiteConfig'

const TEST_SITE_CONFIG = {
  site: {
    name: 'Han-che Wang',
    tagline: 'Links & Socials',
    domain: 'link.w1999.me',
    twitterHandle: '@wang_hanzhe',
  },
  profile: { avatar: '/avatar.jpg' },
  analytics: null,
  socials: [
    { id: 'github', label: 'GitHub', url: 'https://github.com/Carnage1999' },
    { id: 'bluesky', label: 'Bluesky', url: 'https://bsky.app/profile/w1999.me' },
    { id: 'x', label: 'X', url: 'https://x.com/wang_hanzhe' },
    { id: 'line', label: 'Line', url: 'https://line.me/ti/p/Oc10OLyIM0' },
    { id: 'telegram', label: 'Telegram', url: 'https://t.me/WHZ1999' },
    { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/hanzhe-wang/' },
  ],
}

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

beforeEach(() => {
  invalidateSiteConfig()
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/siteConfig.json') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(TEST_SITE_CONFIG),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    }),
  )
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  document.documentElement.lang = 'en'
  vi.clearAllMocks()
})
