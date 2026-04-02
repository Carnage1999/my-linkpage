import { useCallback, useMemo, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'link-click-stats'
const TIMELINE_KEY = 'link-click-timeline'

// ─── Types ───────────────────────────────────────────────

export type ClickStats = Record<string, number>

export interface ClickEvent {
  linkId: string
  timestamp: number
}

export interface DailyCount {
  date: string
  clicks: number
}

// ─── Shared in-memory cache (synced to localStorage) ─────

let cache: ClickStats | null = null
let timelineCache: ClickEvent[] | null = null
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

function readTimelineFromStorage(): ClickEvent[] {
  if (timelineCache) return timelineCache

  try {
    const raw = localStorage.getItem(TIMELINE_KEY)
    timelineCache = raw ? (JSON.parse(raw) as ClickEvent[]) : []
  } catch {
    timelineCache = []
  }

  return timelineCache!
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

function writeTimelineToStorage(next: ClickEvent[]) {
  timelineCache = next

  try {
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(next))
  } catch {
    /* quota exceeded — degrade gracefully */
  }
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

// ─── Helpers ─────────────────────────────────────────────

function toDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toWeekKey(ts: number): string {
  const d = new Date(ts)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday-based week
  const monday = new Date(d)
  monday.setDate(diff)
  return toDateKey(monday.getTime())
}

export function aggregateByDay(events: ClickEvent[], days: number): DailyCount[] {
  const now = Date.now()
  const cutoff = now - days * 86_400_000
  const filtered = events.filter((e) => e.timestamp >= cutoff)

  const map = new Map<string, number>()
  for (const e of filtered) {
    const key = toDateKey(e.timestamp)
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  // Fill in missing days
  const result: DailyCount[] = []
  for (let i = days - 1; i >= 0; i--) {
    const key = toDateKey(now - i * 86_400_000)
    result.push({ date: key, clicks: map.get(key) ?? 0 })
  }

  return result
}

export function aggregateByWeek(events: ClickEvent[], weeks: number): DailyCount[] {
  const now = Date.now()
  const cutoff = now - weeks * 7 * 86_400_000
  const filtered = events.filter((e) => e.timestamp >= cutoff)

  const map = new Map<string, number>()
  for (const e of filtered) {
    const key = toWeekKey(e.timestamp)
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  const result: DailyCount[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const key = toWeekKey(now - i * 7 * 86_400_000)
    if (!result.some((r) => r.date === key)) {
      result.push({ date: key, clicks: map.get(key) ?? 0 })
    }
  }

  return result
}

// ─── Public hook ─────────────────────────────────────────

/** @internal — only for tests */
export function _resetCache() {
  cache = null
  timelineCache = null
}

export function useLinkClickStats() {
  const stats = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const timeline = readTimelineFromStorage()

  const recordClick = useCallback((linkId: string) => {
    const current = readFromStorage()
    writeToStorage({ ...current, [linkId]: (current[linkId] ?? 0) + 1 })

    const currentTimeline = readTimelineFromStorage()
    writeTimelineToStorage([
      ...currentTimeline,
      { linkId, timestamp: Date.now() },
    ])
  }, [])

  const resetStats = useCallback(() => {
    writeToStorage({})
    writeTimelineToStorage([])
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

  const dailyData = useMemo(() => aggregateByDay(timeline, 14), [timeline])
  const weeklyData = useMemo(() => aggregateByWeek(timeline, 8), [timeline])

  return {
    stats,
    timeline,
    totalClicks,
    maxClicks,
    recordClick,
    resetStats,
    getIntensity,
    dailyData,
    weeklyData,
  }
}
