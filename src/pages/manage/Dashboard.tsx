import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { percentChange, type StatsRange } from '../../../api/stats/_dates'
import type { VisitorMetric, VisitorProviderId, VisitorReport } from '../../../api/stats/_providers/types'
import { useDashboard, useVisitorReport, useVisitorSettings } from '../../hooks/useStats'
import { useSiteConfig } from '../../hooks/useSiteConfig'
import { ProviderSettings } from './ProviderSettings'
import { SiteEditor } from './SiteEditor'
import type { AppLanguageCode } from '../../i18n'
import { buildClickCsv } from './clickCsv'
import { LinkHeatmap } from './LinkHeatmap'

const RANGES: StatsRange[] = [7, 30, 90]
const LANGUAGES: Array<{ code: AppLanguageCode; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'zh-TW', label: '繁' },
  { code: 'ru', label: 'РУ' },
]

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  const rounded = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(rounded / 60)
  const rest = rounded % 60
  return `${minutes}m ${rest}s`
}

function formatRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `${Math.round(rate * 100)}%`
}

function sumRecord(record: Record<string, number> | undefined): number {
  return Object.values(record ?? {}).reduce((sum, count) => sum + count, 0)
}

function Delta({ current, previous }: { current: number; previous: number | null | undefined }) {
  const { t } = useTranslation()
  if (previous == null) return null
  const change = percentChange(current, previous)
  if (change == null) {
    return <p className="mt-0.5 text-sm text-slate-400">{String(t('manageNew'))}</p>
  }
  const sign = change > 0 ? '+' : ''
  const tone =
    change > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : change < 0
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-400'
  return (
    <p className={`mt-0.5 text-sm ${tone}`}>
      {sign}
      {change}% {String(t('manageVsPrevious'))}
    </p>
  )
}

function StatCard({
  label,
  value,
  current,
  previous,
}: {
  label: string
  value: string
  current?: number
  previous?: number | null
}) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/80">
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
      {current != null ? <Delta current={current} previous={previous} /> : null}
    </div>
  )
}

function MetricList({ title, metrics }: { title: string; metrics: readonly VisitorMetric[] }) {
  const max = Math.max(...metrics.map((metric) => metric.count), 1)
  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
        {title}
      </h2>
      {metrics.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">—</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {metrics.map((metric) => (
            <li key={metric.name} className="flex items-center gap-3 text-sm">
              <span className="w-28 truncate text-slate-700 dark:text-slate-200">{metric.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-slate-900 dark:bg-slate-100"
                  style={{ width: `${Math.max((metric.count / max) * 100, metric.count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-slate-500 tabular-nums">{metric.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function countText(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString()
}

function VisitorCards({ report }: { report: VisitorReport }) {
  const { t } = useTranslation()
  const totals = report.totals
  const previous = report.previous
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label={String(t('managePageviews'))} value={countText(totals?.pageviews)} current={totals?.pageviews ?? undefined} previous={previous?.pageviews} />
      <StatCard label={String(t('manageVisitors'))} value={countText(totals?.visitors)} current={totals?.visitors ?? undefined} previous={previous?.visitors} />
      <StatCard label={String(t('manageVisits'))} value={countText(totals?.visits)} current={totals?.visits ?? undefined} previous={previous?.visits} />
      <StatCard label={String(t('manageBounce'))} value={formatRate(totals?.bounceRate)} current={totals?.bounceRate ?? undefined} previous={previous?.bounceRate} />
      <StatCard label={String(t('manageAvgTime'))} value={formatDuration(totals?.avgDuration)} />
    </div>
  )
}

function VisitorBreakdowns({ report }: { report: VisitorReport }) {
  const { t } = useTranslation()
  const series = report.timeseries
  return (
    <div className="space-y-4">
      {series.length > 0 ? (
        <section className="h-56 rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
          <h2 className="mb-2 text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {String(t('managePageviews'))}
          </h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                className="fill-slate-400 dark:fill-slate-500"
                tickFormatter={(value: string) => value.slice(5)}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                className="fill-slate-400 dark:fill-slate-500"
              />
              <Tooltip />
              <Bar dataKey="pageviews" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricList title={String(t('manageReferrers'))} metrics={report.referrers ?? []} />
        <MetricList title={String(t('manageCountries'))} metrics={report.countries ?? []} />
        <MetricList title={String(t('manageDevices'))} metrics={report.devices ?? []} />
        <MetricList title={String(t('manageBrowsers'))} metrics={report.browsers ?? []} />
        <MetricList title={String(t('manageOs'))} metrics={report.os ?? []} />
      </div>
    </div>
  )
}

const PROVIDER_ORDER: VisitorProviderId[] = ['upstash', 'goatcounter', 'cloudflare', 'umami']

function preferredProvider(settings: { providers: Array<{ id: VisitorProviderId; configured: boolean }>; defaultProvider: VisitorProviderId | null } | null): VisitorProviderId | null {
  if (!settings) return null
  const configured = new Set(settings.providers.filter((item) => item.configured).map((item) => item.id))
  let saved: string | null = null
  try {
    saved = localStorage.getItem('manage-visitor-provider')
  } catch {
    /* localStorage can be blocked */
  }
  return (
    [saved, settings.defaultProvider, ...PROVIDER_ORDER].find(
      (id): id is VisitorProviderId => Boolean(id && configured.has(id as VisitorProviderId)),
    ) ?? null
  )
}

function providerName(id: VisitorProviderId, translate: (key: 'manageUpstash' | 'manageGoatcounter' | 'manageCloudflare' | 'manageUmami') => string): string {
  if (id === 'upstash') return translate('manageUpstash')
  if (id === 'goatcounter') return translate('manageGoatcounter')
  if (id === 'cloudflare') return translate('manageCloudflare')
  return translate('manageUmami')
}

export function Dashboard({ token, logout }: { token: string; logout: () => void }) {
  const { t, i18n: i18nInstance } = useTranslation()
  const { socials, version } = useSiteConfig()
  const [days, setDays] = useState<StatsRange>(30)
  const [chosen, setChosen] = useState<VisitorProviderId | null>(null)
  const { data, loading, error, unauthorized, refetch } = useDashboard(token, days)
  const { settings, unauthorized: settingsDenied, reload } = useVisitorSettings(token)
  const provider = chosen ?? preferredProvider(settings)
  const { report, unauthorized: visitorDenied } = useVisitorReport(token, days, provider)

  useEffect(() => {
    if (unauthorized || settingsDenied || visitorDenied) logout()
  }, [unauthorized, settingsDenied, visitorDenied, logout])

  const labels = useMemo(() => new Map(socials.map((social) => [social.id, social.label])), [socials])

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-300" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="space-y-4 text-center">
          <p className="text-sm font-medium text-red-500">{String(t('manageNetwork'))}</p>
          <button type="button" onClick={logout} className="text-sm text-slate-500 underline">
            {String(t('manageSignOut'))}
          </button>
        </div>
      </div>
    )
  }

  const showProvider = Boolean(report?.configured && !report.unavailable && report.linkClicks)
  const linkClicks = report?.linkClicks ?? {}
  const providerLabel = provider ? providerName(provider, (key) => String(t(key))) : ''
  const heatmapLinks = data.configuredIds.map((id) => ({
    id,
    label: labels.get(id) ?? id,
    redisClicks: data.periodTotals[id] ?? 0,
    providerClicks: showProvider ? (linkClicks[id] ?? 0) : null,
  }))
  const clicks = data
  const periodClicks = sumRecord(clicks.periodTotals)
  const previousClicks = sumRecord(clicks.previousPeriodTotals)
  const today = clicks.daily[clicks.daily.length - 1]
  const todayClicks = sumRecord(today?.clicks)

  function exportCsv() {
    const csv = buildClickCsv(
      [
        ...heatmapLinks.map((link) => ({
          id: link.id,
          label: link.label,
          status: 'active' as const,
          redisClicks: link.redisClicks,
          providerClicks: link.providerClicks,
        })),
        ...clicks.removed.map((link) => ({
          id: link.id,
          label: link.id,
          status: 'removed' as const,
          redisClicks: link.period,
          providerClicks: showProvider ? (linkClicks[link.id] ?? 0) : null,
        })),
      ],
      clicks.daily.flatMap((day) =>
        clicks.configuredIds.map((id) => ({
          date: day.date,
          id,
          label: labels.get(id) ?? id,
          redisClicks: day.clicks[id] ?? 0,
        })),
      ),
      report && provider
        ? {
            provider,
            rows: (['referrers', 'countries', 'devices', 'browsers', 'os'] as const).flatMap((kind) =>
              (report[kind] ?? []).map((row) => ({ kind, name: row.name, count: row.count })),
            ),
          }
        : undefined,
    )
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `clicks-${days}d.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 p-4 sm:px-6">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              {String(t('manageBack'))}
            </a>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              {String(t('manageTitle'))}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
              {LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => void i18nInstance.changeLanguage(language.code)}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                    i18nInstance.language === language.code
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500'
                  }`}
                  aria-pressed={i18nInstance.language === language.code}
                >
                  {language.label}
                </button>
              ))}
            </div>
            <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700" role="group" aria-label={String(t('manageRange'))}>
              {RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDays(range)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    days === range
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500'
                  }`}
                  aria-pressed={days === range}
                >
                  {range}
                </button>
              ))}
            </div>
            <button type="button" onClick={exportCsv} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {String(t('manageExportCsv'))}
            </button>
            <button type="button" onClick={() => void refetch()} disabled={loading} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
              {loading ? String(t('manageRefreshing')) : String(t('manageRefresh'))}
            </button>
            <button type="button" onClick={logout} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {String(t('manageSignOut'))}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {String(t('manageTimezone'))}: {data.timezone}
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={String(t('managePeriodClicks'))}
            value={periodClicks.toLocaleString()}
            current={periodClicks}
            previous={previousClicks}
          />
          <StatCard label={String(t('manageToday'))} value={todayClicks.toLocaleString()} />
          <StatCard label={String(t('manageLinksTracked'))} value={String(data.configuredIds.length)} />
        </div>
        {data.removed.length > 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {String(t('manageRemovedHint', { count: data.removed.length }))}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2" role="group" aria-label={String(t('manageProvider'))}>
          {PROVIDER_ORDER.map((id) => {
            const status = settings?.providers.find((item) => item.id === id)
            const enabled = Boolean(status?.configured)
            return (
              <button
                key={id}
                type="button"
                disabled={!enabled}
                title={enabled ? undefined : status?.missing.join(', ')}
                onClick={() => {
                  setChosen(id)
                  try {
                    localStorage.setItem('manage-visitor-provider', id)
                  } catch {
                    /* ignore */
                  }
                }}
                className={`rounded-xl border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                  provider === id
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
                aria-pressed={provider === id}
              >
                {providerName(id, (key) => String(t(key)))}
              </button>
            )
          })}
        </div>
        {settings?.providers.some((item) => !item.configured) ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {String(t('manageMissing'))}:{' '}
            {settings.providers
              .filter((item) => !item.configured)
              .map((item) => `${providerName(item.id, (key) => String(t(key)))} (${item.missing.join(', ')})`)
              .join(' · ')}
          </p>
        ) : null}

        {report?.configured && !report.unavailable ? <VisitorCards report={report} /> : null}
        {report?.configured && report.unavailable ? (
          <p className="text-sm text-slate-500">{String(t('manageUnavailable'))}</p>
        ) : null}

        <LinkHeatmap links={heatmapLinks} daily={data.daily} showProvider={showProvider} providerLabel={providerLabel} />

        {data.removed.length > 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
              {String(t('manageRemoved'))}
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {data.removed.map((link) => (
                <li key={link.id} className="flex justify-between gap-3">
                  <span>{link.id}</span>
                  <span className="font-mono tabular-nums">{link.period.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {report?.configured && !report.unavailable ? <VisitorBreakdowns report={report} /> : null}
        <SiteEditor key={version} token={token} />
        <ProviderSettings token={token} settings={settings} onSaved={() => void reload()} />
      </div>
    </div>
  )
}
