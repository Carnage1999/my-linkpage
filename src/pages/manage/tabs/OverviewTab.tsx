import { useManageCopy } from '../../../manage/useManageCopy'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { percentChange } from '../../../../api/stats/_dates'
import type { VisitorMetric, VisitorReport } from '../../../../api/stats/_providers/types'
import type { DashboardData } from '../../../hooks/useStats'
import { LinkHeatmap } from '../LinkHeatmap'

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
  const { t } = useManageCopy()
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
  const { t } = useManageCopy()
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
  const { t } = useManageCopy()
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
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-slate-400 dark:fill-slate-500" tickFormatter={(value: string) => value.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="fill-slate-400 dark:fill-slate-500" />
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

export function OverviewTab({
  data,
  report,
  showProvider,
  providerLabel,
  labels,
}: {
  data: DashboardData
  report: VisitorReport | null
  showProvider: boolean
  providerLabel: string
  labels: Map<string, string>
}) {
  const { t } = useManageCopy()
  const linkClicks = report?.linkClicks ?? {}
  const heatmapLinks = data.configuredIds.map((id) => ({
    id,
    label: labels.get(id) ?? id,
    redisClicks: data.periodTotals[id] ?? 0,
    providerClicks: showProvider ? (linkClicks[id] ?? 0) : null,
  }))
  const periodClicks = sumRecord(data.periodTotals)
  const previousClicks = sumRecord(data.previousPeriodTotals)
  const today = data.daily[data.daily.length - 1]
  const todayClicks = sumRecord(today?.clicks)

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {String(t('manageTimezone'))}: {data.timezone}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={String(t('managePeriodClicks'))} value={periodClicks.toLocaleString()} current={periodClicks} previous={previousClicks} />
        <StatCard label={String(t('manageToday'))} value={todayClicks.toLocaleString()} />
        <StatCard label={String(t('manageLinksTracked'))} value={String(data.configuredIds.length)} />
      </div>
      {data.removed.length > 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{String(t('manageRemovedHint', { count: data.removed.length }))}</p>
      ) : null}
      {report?.configured && !report.unavailable ? <VisitorCards report={report} /> : null}
      {report?.configured && report.unavailable ? <p className="text-sm text-slate-500">{String(t('manageUnavailable'))}</p> : null}
      <LinkHeatmap links={heatmapLinks} daily={data.daily} showProvider={showProvider} providerLabel={providerLabel} />
      {data.removed.length > 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">{String(t('manageRemoved'))}</h2>
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
    </div>
  )
}
