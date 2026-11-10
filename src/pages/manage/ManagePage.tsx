import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuthError } from '../../hooks/useStats'
import { useStatsAuth } from '../../hooks/useStats'
import { useSiteConfig } from '../../hooks/useSiteConfig'
import { Dashboard } from './Dashboard'

function useNoIndex(title: string) {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const previous = document.title
    document.title = title
    return () => {
      meta.remove()
      document.title = previous
    }
  }, [title])
}

function useThemeSync() {
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', saved === 'dark' || (!saved && prefersDark))
  }, [])
}

function LoginForm({
  onLogin,
  loading,
  error,
}: {
  onLogin: (password: string) => void
  loading: boolean
  error: AuthError
}) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const message =
    error === 'bad-password'
      ? t('manageBadPassword')
      : error === 'rate-limited'
        ? t('manageRateLimited')
        : error === 'disabled'
          ? t('manageDisabled')
          : error === 'network'
            ? t('manageNetwork')
            : null

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {String(t('manageTitle'))}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{String(t('manageSubtitle'))}</p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onLogin(password)
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="manage-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {String(t('managePassword'))}
            </label>
            <input
              id="manage-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-xs focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-cyan-400 dark:focus:ring-cyan-400/30"
            />
          </div>
          {message ? <p className="text-sm font-medium text-red-500">{String(message)}</p> : null}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {loading ? String(t('manageSigningIn')) : String(t('manageSignIn'))}
          </button>
        </form>
      </div>
    </div>
  )
}

export function ManagePage() {
  const { t } = useTranslation()
  useNoIndex(String(t('manageTitle')))
  useThemeSync()
  const { loading: configLoading } = useSiteConfig()
  const { token, loading, error, login, logout, isAuthenticated } = useStatsAuth()

  if (configLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-300" />
      </div>
    )
  }

  if (!isAuthenticated || !token) {
    return <LoginForm onLogin={(password) => void login(password)} loading={loading} error={error} />
  }

  return <Dashboard token={token} logout={logout} />
}
