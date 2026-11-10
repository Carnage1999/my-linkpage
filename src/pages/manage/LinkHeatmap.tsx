import { m, useReducedMotion } from 'motion/react'
import { useManageCopy } from '../../manage/useManageCopy'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyClicks } from '../../../api/stats/_aggregate'

export interface HeatmapLink {
  id: string
  label: string
  redisClicks: number
  providerClicks: number | null
}

export function LinkHeatmap({
  links,
  daily,
  showProvider,
  providerLabel,
}: {
  links: readonly HeatmapLink[]
  daily: readonly DailyClicks[]
  showProvider: boolean
  providerLabel: string
}) {
  const { t } = useManageCopy()
  const prefersReduced = useReducedMotion()
  const maxClicks = Math.max(...links.map((link) => link.redisClicks), 0)
  const chartData = daily.map((day) => ({
    date: day.date,
    clicks: Object.values(day.clicks).reduce((sum, count) => sum + count, 0),
  }))

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
      <div className="flex items-end justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
          {String(t('clickHeatmap'))}
        </p>
        {showProvider ? (
          <p className="max-w-md text-right text-xs text-slate-500 dark:text-slate-400">
            {String(t('manageCompareNote'))}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-800/60 dark:text-slate-400">
              <th className="p-2 font-semibold">{String(t('manageLink'))}</th>
              <th className="p-2 text-right font-semibold">{String(t('manageRedis'))}</th>
              {showProvider ? (
                <th className="p-2 text-right font-semibold">{providerLabel}</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {links.map((link) => {
              const width = maxClicks === 0 ? 0 : (link.redisClicks / maxClicks) * 100
              return (
                <tr key={link.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/40">
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate font-medium text-slate-900 dark:text-white">
                        {link.label}
                      </span>
                      <div className="relative hidden h-2.5 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-200/60 sm:block dark:bg-slate-800/60">
                        <m.div
                          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-amber-400 to-rose-500 dark:from-cyan-400 dark:to-indigo-500"
                          initial={false}
                          animate={{ width: `${Math.max(width, link.redisClicks > 0 ? 4 : 0)}%` }}
                          transition={
                            prefersReduced
                              ? { duration: 0 }
                              : { type: 'spring', stiffness: 300, damping: 30 }
                          }
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-slate-700 tabular-nums dark:text-slate-200">
                    {link.redisClicks.toLocaleString()}
                  </td>
                  {showProvider ? (
                    <td className="px-2 py-3 text-right font-mono text-slate-700 tabular-nums dark:text-slate-200">
                      {(link.providerClicks ?? 0).toLocaleString()}
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  className="[stop-color:var(--color-amber-400)] dark:[stop-color:var(--color-cyan-400)]"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  className="[stop-color:var(--color-amber-400)] dark:[stop-color:var(--color-cyan-400)]"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
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
              fill="url(#clickGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
