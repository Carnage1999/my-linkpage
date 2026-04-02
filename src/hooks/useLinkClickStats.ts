import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'link-click-stats'

// ─── Shared in-memory cache (synced to localStorage) ─────

type ClickStats = Record<string, number>

let cache: ClickStats | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}

function readFromStorage(): ClickStats {
  if (cache) return cache

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? (JSON.parse(raw) as ClickStats) : {}
  } catch {
    cache = {}
  }

  return cache!
}

function writeToStorage(next: ClickStats) {
  cache = next

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota exceeded — degrade gracefully */
  }

  notify()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot(): ClickStats {
  return readFromStorage()
}

const SERVER_SNAPSHOT: ClickStats = {}

function getServerSnapshot(): ClickStats {
  return SERVER_SNAPSHOT
}

// ─── Public hook ─────────────────────────────────────────

/** @internal — only for tests */
export function _resetCache() {
  cache = null
}

export function useLinkClickStats() {
  const stats = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const recordClick = useCallback((linkId: string) => {
    const current = readFromStorage()
    writeToStorage({ ...current, [linkId]: (current[linkId] ?? 0) + 1 })
  }, [])

  const totalClicks = Object.values(stats).reduce((a, b) => a + b, 0)
  const maxClicks = Math.max(...Object.values(stats), 0)

  /** Returns 0-1 intensity for a given link id */
  const getIntensity = useCallback(
    (linkId: string): number => {
      if (maxClicks === 0) return 0
      return (stats[linkId] ?? 0) / maxClicks
    },
    [stats, maxClicks],
  )

  return { stats, totalClicks, maxClicks, recordClick, getIntensity }
}
