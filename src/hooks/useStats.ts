import { useCallback, useEffect, useState } from 'react'
import type { ClickReport } from '../../api/stats/_aggregate'
import type { StatsRange } from '../../api/stats/_dates'
import type { VisitorProviderId, VisitorReport } from '../../api/stats/_providers/types'
import type { SettingsView } from '../../api/stats/_settings'

/** Sentinel for an HttpOnly session. It is not a bearer token and is never sent. */
export const SESSION_TOKEN = 'cookie'

export function dashboardRequest(token: string, init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers)
  if (token !== SESSION_TOKEN) headers.set('Authorization', `Bearer ${token}`)
  headers.set('X-Site-Request', '1')
  if (init.body != null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return { ...init, credentials: 'same-origin', headers }
}

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
  const [token, setToken] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AuthError>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/stats/session', { credentials: 'same-origin', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return
        const body = (await response.json()) as { ok?: unknown }
        // A static host can answer unknown /api paths with index.html and status 200.
        if (body?.ok === true) setToken(SESSION_TOKEN)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false)
      })
    return () => controller.abort()
  }, [])

  const login = useCallback(async (password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/stats/auth', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Site-Request': '1' },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        if (response.status === 401) setError('bad-password')
        else if (response.status === 429) setError('rate-limited')
        else if (response.status === 501) setError('disabled')
        else setError('network')
        return false
      }
      setToken(SESSION_TOKEN)
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
    void fetch('/api/stats/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-Site-Request': '1' } }).catch(
      () => undefined,
    )
  }, [])

  return { token, checking, loading, error, login, logout, isAuthenticated: Boolean(token) }
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

    const controller = new AbortController()
    fetch(`/api/stats/data?days=${days}`, dashboardRequest(token, { signal: controller.signal }))
      .then(async (dataResponse) => {
        if (controller.signal.aborted) return
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
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return
        setError('network')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
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
    const controller = new AbortController()
    fetch('/api/stats/settings', dashboardRequest(token, { signal: controller.signal }))
      .then(async (response) => {
        if (controller.signal.aborted) return
        if (response.status === 401) {
          setUnauthorized(true)
          return
        }
        if (response.ok) setSettings((await response.json()) as SettingsView)
      })
      .catch(() => undefined)
    return () => controller.abort()
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
    const controller = new AbortController()
    const requestKey = `${provider}:${days}`
    fetch(`/api/stats/visitors?provider=${provider}&days=${days}`, dashboardRequest(token, { signal: controller.signal }))
      .then(async (response) => {
        if (controller.signal.aborted) return
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
        if (!controller.signal.aborted) {
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
    return () => controller.abort()
  }, [token, days, provider])

  return { report, unauthorized }
}

export function useStatsEnabled() {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/stats/check', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<{ enabled?: boolean }>
      })
      .then((body) => {
        if (!controller.signal.aborted) setEnabled(Boolean(body.enabled))
      })
      .catch(() => {
        if (!controller.signal.aborted) setEnabled(false)
      })
    return () => controller.abort()
  }, [])

  return enabled
}
