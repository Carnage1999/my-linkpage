import { useCallback, useEffect, useState } from 'react'

const TOKEN_KEY = 'stats-auth-token'

export interface StatsData {
  totals: Record<string, number>
  daily: Array<{ date: string; clicks: Record<string, number> }>
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
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (password: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stats/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'Authentication failed')
        return false
      }
      const data = (await res.json()) as { token: string }
      setToken(data.token)
      try {
        sessionStorage.setItem(TOKEN_KEY, data.token)
      } catch {
        /* no-op */
      }
      return true
    } catch {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    try {
      sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      /* no-op */
    }
  }, [])

  return { token, loading, error, login, logout, isAuthenticated: !!token }
}

export function useStatsData(token: string | null) {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestKey, setRequestKey] = useState(0)
  const requestId = `${token ?? ''}:${requestKey}`
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)

  if (token && activeRequestId !== requestId) {
    setActiveRequestId(requestId)
    setLoading(true)
    setError(null)
  }

  const refetch = useCallback(() => {
    setRequestKey((key) => key + 1)
  }, [])

  useEffect(() => {
    if (!token) return

    let cancelled = false

    fetch('/api/stats/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          const body = (await res.json()) as { error?: string }
          setError(body.error ?? 'Failed to fetch stats')
          return
        }
        const body = (await res.json()) as StatsData
        setData(body)
      })
      .catch(() => {
        if (!cancelled) setError('Network error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, requestKey])

  return { data, loading, error, refetch }
}

export function useStatsEnabled() {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/stats/check')
      .then((r) => r.json() as Promise<{ enabled: boolean }>)
      .then((d) => setEnabled(d.enabled))
      .catch(() => setEnabled(false))
  }, [])

  return enabled
}
