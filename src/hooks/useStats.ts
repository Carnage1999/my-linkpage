import { useCallback, useEffect, useState } from 'react'
import type { ClickReport } from '../../api/stats/_aggregate'
import type { StatsRange } from '../../api/stats/_dates'
import type { VisitorProviderId, VisitorReport } from '../../api/stats/_providers/types'
import type { SettingsView } from '../../api/stats/_settings'

const TOKEN_KEY = 'stats-auth-token'

/** Record a configured link click. Prefers sendBeacon so navigation can continue. */
export function recordLinkClick(linkId: string): void {
  const body = JSON.stringify({ linkId })
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon('/api/stats/record', blob)) return
    }
  } catch {
    /* sendBeacon can throw if the payload is rejected; fall through to fetch. */
  }

  void fetch('/api/stats/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}

let pageviewSent = false

/** One pageview per page load. Strict Mode can run effects twice; the flag keeps it to one beacon. */
export function recordPageview(): void {
  if (pageviewSent) return
  pageviewSent = true
  const body = JSON.stringify({ referrer: document.referrer || '' })
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon('/api/stats/pageview', blob)) return
    }
  } catch {
    /* fall through */
  }
  void fetch('/api/stats/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}

export type AuthError = 'bad-password' | 'rate-limited' | 'disabled' | 'network' | null

export interface DashboardData extends ClickReport {
  timezone: string
  days: number
}

export function useStatsAuth() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AuthError>(null)

  const login = useCallback(async (password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/stats/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        if (response.status === 401) setError('bad-password')
        else if (response.status === 429) setError('rate-limited')
        else if (response.status === 501) setError('disabled')
        else setError('network')
        return false
      }
      const data = (await response.json()) as { token: string }
      setToken(data.token)
      try {
        sessionStorage.setItem(TOKEN_KEY, data.token)
      } catch {
        /* sessionStorage can be blocked; the in-memory token still works. */
      }
      return true
    } catch {
      setError('network')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setError(null)
    try {
      sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  return { token, loading, error, login, logout, isAuthenticated: Boolean(token) }
}

export function useDashboard(token: string | null, days: StatsRange) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [requestKey, setRequestKey] = useState(0)
  const requestId = `${token ?? ''}:${days}:${requestKey}`
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)

  if (!token && unauthorized) {
    setUnauthorized(false)
  }

  if (token && activeRequestId !== requestId) {
    setActiveRequestId(requestId)
    setLoading(true)
    setError(null)
    setUnauthorized(false)
  }

  const refetch = useCallback(() => {
    setRequestKey((key) => key + 1)
  }, [])

  useEffect(() => {
    if (!token) return

    let cancelled = false
    const headers = { Authorization: `Bearer ${token}` }

    fetch(`/api/stats/data?days=${days}`, { headers })
      .then(async (dataResponse) => {
        if (cancelled) return
        if (dataResponse.status === 401) {
          setUnauthorized(true)
          return
        }
        if (!dataResponse.ok) {
          setError('data')
          return
        }
        setData((await dataResponse.json()) as DashboardData)
      })
      .catch(() => {
        if (!cancelled) setError('network')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, days, requestKey])

  return { data, loading, error, unauthorized, refetch }
}

export function useVisitorSettings(token: string | null) {
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [requestKey, setRequestKey] = useState(0)

  const reload = useCallback(() => {
    setRequestKey((key) => key + 1)
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch('/api/stats/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (cancelled) return
        if (response.status === 401) {
          setUnauthorized(true)
          return
        }
        if (response.ok) setSettings((await response.json()) as SettingsView)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [token, requestKey])

  return { settings, unauthorized, reload }
}

export function useVisitorReport(token: string | null, days: StatsRange, provider: VisitorProviderId | null) {
  const [entry, setEntry] = useState<{ key: string; report: VisitorReport } | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const key = provider ? `${provider}:${days}` : ''
  const report = entry?.key === key ? entry.report : null

  useEffect(() => {
    if (!token || !provider) return
    let cancelled = false
    const requestKey = `${provider}:${days}`
    fetch(`/api/stats/visitors?provider=${provider}&days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (cancelled) return
        if (response.status === 401) {
          setUnauthorized(true)
          return
        }
        if (!response.ok) {
          setEntry({
            key: requestKey,
            report: {
              provider,
              configured: true,
              unavailable: true,
              totals: null,
              previous: null,
              timeseries: [],
              referrers: [],
              countries: [],
              devices: [],
              browsers: [],
              os: [],
              linkClicks: null,
            },
          })
          return
        }
        setEntry({ key: requestKey, report: (await response.json()) as VisitorReport })
      })
      .catch(() => {
        if (!cancelled) {
          setEntry({
            key: requestKey,
            report: {
              provider,
              configured: true,
              unavailable: true,
              totals: null,
              previous: null,
              timeseries: [],
              referrers: [],
              countries: [],
              devices: [],
              browsers: [],
              os: [],
              linkClicks: null,
            },
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [token, days, provider])

  return { report, unauthorized }
}

export function useStatsEnabled() {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/stats/check')
      .then((response) => response.json() as Promise<{ enabled?: boolean }>)
      .then((body) => setEnabled(Boolean(body.enabled)))
      .catch(() => setEnabled(false))
  }, [])

  return enabled
}
