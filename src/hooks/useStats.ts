import { useCallback, useEffect, useState } from 'react'
import type { ClickReport } from '../../api/stats/_aggregate'
import type { UmamiReport } from '../../api/stats/_umami'
import type { StatsRange } from '../../api/stats/_dates'

const TOKEN_KEY = 'stats-auth-token'

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
  const [umami, setUmami] = useState<UmamiReport | null>(null)
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

    Promise.all([
      fetch(`/api/stats/data?days=${days}`, { headers }),
      fetch(`/api/stats/umami?days=${days}`, { headers }),
    ])
      .then(async ([dataResponse, umamiResponse]) => {
        if (cancelled) return
        if (dataResponse.status === 401 || umamiResponse.status === 401) {
          setUnauthorized(true)
          return
        }
        if (!dataResponse.ok) {
          setError('data')
          return
        }
        setData((await dataResponse.json()) as DashboardData)
        if (umamiResponse.ok) {
          setUmami((await umamiResponse.json()) as UmamiReport)
        } else {
          setUmami({ configured: true, unavailable: true })
        }
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

  return { data, umami, loading, error, unauthorized, refetch }
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
