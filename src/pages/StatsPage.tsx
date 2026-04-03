import {
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react'
import { useMemo, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsConfig, SocialLinkEntry } from '../siteConfig'
import type { StatsData } from '../hooks/useStats'
import {
  useStatsAuth,
  useStatsData,
} from '../hooks/useStats'
import { useSiteConfig } from '../hooks/useSiteConfig'

// ─── Login Form ──────────────────────────────────────────

function LoginForm({
  onLogin,
  loading,
  error,
}: {
  onLogin: (password: string) => void
  loading: boolean
  error: string | null
}) {
  const [password, setPassword] = useState('')

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Stats Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter the dashboard password to continue.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onLogin(password)
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="stats-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <input
              id="stats-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-cyan-400 dark:focus:ring-cyan-400/30"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-red-500">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/80">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">
          {sub}
        </p>
      ) : null}
    </div>
  )
}

// ─── Analytics Embed ─────────────────────────────────────

function AnalyticsEmbed({ analytics }: { analytics: AnalyticsConfig | null }) {
  if (!analytics) return null

  if (analytics.provider === 'umami' && analytics.umamiWebsiteId) {
    const host = analytics.umamiHost ?? 'https://cloud.umami.is'
    const shareUrl = `${host}/share/${analytics.umamiWebsiteId}`
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Umami Analytics
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
          <iframe
            title="Umami Analytics"
            src={shareUrl}
            className="h-[600px] w-full border-0"
            loading="lazy"
          />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-600 dark:hover:text-slate-300"
          >
            Open in new tab →
          </a>
        </p>
      </div>
    )
  }

  if (analytics.provider === 'plausible' && analytics.plausibleDomain) {
    const host = analytics.plausibleHost ?? 'https://plausible.io'
    const shareUrl = `${host}/${analytics.plausibleDomain}`
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Plausible Analytics
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
          <iframe
            title="Plausible Analytics"
            src={`${shareUrl}?embed=true&theme=system`}
            className="h-[600px] w-full border-0"
            loading="lazy"
          />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-600 dark:hover:text-slate-300"
          >
            Open in new tab →
          </a>
        </p>
      </div>
    )
  }

  return null
}

// ─── Link Table ──────────────────────────────────────────

function LinkTable({
  socials,
  totals,
}: {
  socials: readonly SocialLinkEntry[]
  totals: Record<string, number>
}) {
  const sorted = useMemo(() => {
    return [...socials].sort(
      (a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0),
    )
  }, [socials, totals])

  const maxClicks = Math.max(...Object.values(totals), 1)

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Per-Link Clicks
      </h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900/60">
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                Link
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                Clicks
              </th>
              <th className="hidden px-4 py-3 sm:table-cell">
                <span className="sr-only">Bar</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {sorted.map((social) => {
              const count = totals[social.id] ?? 0
              const pct = maxClicks > 0 ? (count / maxClicks) * 100 : 0
              return (
                <tr
                  key={social.id}
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {social.label}
                      </p>
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                        {social.url}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {count.toLocaleString()}
                  </td>
                  <td className="hidden w-48 px-4 py-3 sm:table-cell">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                      <div
                        ref={(el) => {
                          if (el) el.style.width = `${Math.max(pct, count > 0 ? 4 : 0)}%`
                        }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all dark:from-cyan-400 dark:to-indigo-500"
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Trend Chart ─────────────────────────────────────────

function TrendChart({ daily }: { daily: StatsData['daily'] }) {
  const chartData = useMemo(
    () =>
      daily.map((d) => ({
        date: d.date,
        clicks: Object.values(d.clicks).reduce((a, b) => a + b, 0),
      })),
    [daily],
  )

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Daily Trend (30 days)
      </h2>
      <div className="h-56 w-full rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="statsTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  className="[stop-color:theme(colors.amber.400)] dark:[stop-color:theme(colors.cyan.400)]"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  className="[stop-color:theme(colors.amber.400)] dark:[stop-color:theme(colors.cyan.400)]"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-slate-200 dark:stroke-slate-800"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              className="fill-slate-400 dark:fill-slate-500"
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10 }}
              className="fill-slate-400 dark:fill-slate-500"
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="clicks"
              className="stroke-amber-500 dark:stroke-cyan-400"
              strokeWidth={2}
              fill="url(#statsTrendGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Per-Link Daily Chart ────────────────────────────────

function PerLinkChart({
  daily,
  socials,
}: {
  daily: StatsData['daily']
  socials: readonly SocialLinkEntry[]
}) {
  const chartData = useMemo(() => {
    return daily.map((d) => {
      const entry: Record<string, string | number> = { date: d.date }
      for (const s of socials) {
        entry[s.label] = d.clicks[s.id] ?? 0
      }
      return entry
    })
  }, [daily, socials])

  const colors = [
    '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899',
    '#f97316', '#06b6d4', '#84cc16', '#6366f1',
  ]

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Per-Link Daily Clicks
      </h2>
      <div className="h-64 w-full rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-slate-200 dark:stroke-slate-800"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              className="fill-slate-400 dark:fill-slate-500"
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10 }}
              className="fill-slate-400 dark:fill-slate-500"
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            {socials.map((s, i) => (
              <Bar
                key={s.id}
                dataKey={s.label}
                stackId="a"
                fill={colors[i % colors.length]}
                radius={i === socials.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Dashboard Shell ─────────────────────────────────────

function Dashboard({
  token,
  logout,
  socials,
  analytics,
}: {
  token: string
  logout: () => void
  socials: readonly SocialLinkEntry[]
  analytics: AnalyticsConfig | null
}) {
  const { data, loading, error, refetch } = useStatsData(token)

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-300" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm space-y-4 text-center">
          <p className="text-sm font-medium text-red-500">{error}</p>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-slate-500 underline hover:text-slate-700 dark:text-slate-400"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  const totals = data?.totals ?? {}
  const daily = data?.daily ?? []
  const totalClicks = Object.values(totals).reduce((a, b) => a + b, 0)
  const todaysClicks = daily.length > 0
    ? Object.values(daily[daily.length - 1].clicks).reduce((a, b) => a + b, 0)
    : 0
  const linksTracked = Object.keys(totals).length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4 sm:px-6">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back
            </a>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Stats Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} />
          <StatCard label="Today" value={todaysClicks.toLocaleString()} />
          <StatCard
            label="Links Tracked"
            value={linksTracked}
            sub={`${socials.length} configured`}
          />
        </div>

        {/* Tabs: Click Stats / Analytics */}
        <TabGroup>
          <TabList className="flex gap-1 rounded-2xl border border-slate-200/60 bg-white p-1 dark:border-slate-800/60 dark:bg-slate-900/80">
            <Tab className="rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none data-[selected]:bg-slate-900 data-[selected]:text-white data-[selected]:shadow-sm dark:data-[selected]:bg-white dark:data-[selected]:text-slate-900 [&:not([data-selected])]:text-slate-500 [&:not([data-selected])]:hover:bg-slate-100 dark:[&:not([data-selected])]:text-slate-400 dark:[&:not([data-selected])]:hover:bg-slate-800">
              Click Stats
            </Tab>
            {analytics ? (
              <Tab className="rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none data-[selected]:bg-slate-900 data-[selected]:text-white data-[selected]:shadow-sm dark:data-[selected]:bg-white dark:data-[selected]:text-slate-900 [&:not([data-selected])]:text-slate-500 [&:not([data-selected])]:hover:bg-slate-100 dark:[&:not([data-selected])]:text-slate-400 dark:[&:not([data-selected])]:hover:bg-slate-800">
                {analytics.provider === 'umami' ? 'Umami' : 'Plausible'} Analytics
              </Tab>
            ) : null}
          </TabList>

          <TabPanels className="mt-6">
            {/* Click Stats Panel */}
            <TabPanel className="space-y-8">
              <TrendChart daily={daily} />
              <PerLinkChart daily={daily} socials={socials} />
              <LinkTable socials={socials} totals={totals} />
            </TabPanel>

            {/* Analytics Embed Panel */}
            {analytics ? (
              <TabPanel>
                <AnalyticsEmbed analytics={analytics} />
              </TabPanel>
            ) : null}
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  )
}

// ─── Page Component ──────────────────────────────────────

function useThemeSync() {
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])
}

export function StatsPage() {
  useThemeSync()
  const { loading: configLoading, socials, analytics } = useSiteConfig()
  const { token, loading, error, login, logout, isAuthenticated } =
    useStatsAuth()

  if (configLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-300" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={(pw) => void login(pw)} loading={loading} error={error} />
  }

  return (
    <Dashboard
      token={token!}
      logout={logout}
      socials={socials}
      analytics={analytics}
    />
  )
}
