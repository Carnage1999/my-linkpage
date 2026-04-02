import { m, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useLinkClickStats } from '../hooks/useLinkClickStats'
import type { SocialLinkEntry } from '../siteConfig'

type TimeRange = 'daily' | 'weekly'

/**
 * Renders a heat-bar per link, a trend chart (daily/weekly), and a reset button.
 */
export function LinkHeatmap({ socials }: { socials: readonly SocialLinkEntry[] }) {
  const { t } = useTranslation()
  const {
    stats,
    totalClicks,
    getIntensity,
    resetStats,
    dailyData,
    weeklyData,
  } = useLinkClickStats()
  const prefersReduced = useReducedMotion()
  const [range, setRange] = useState<TimeRange>('daily')
  const [showConfirm, setShowConfirm] = useState(false)

  if (totalClicks === 0) return null

  const chartData = range === 'daily' ? dailyData : weeklyData

  function handleReset() {
    resetStats()
    setShowConfirm(false)
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {String(t('clickHeatmap'))}
        </p>

        {showConfirm ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-600"
            >
              {String(t('confirmReset'))}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {String(t('cancel'))}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-500 dark:border-slate-600 dark:text-slate-400 dark:hover:border-red-400 dark:hover:text-red-400"
          >
            {String(t('resetStats'))}
          </button>
        )}
      </div>

      <ul className="space-y-2" aria-label={String(t('clickHeatmap'))}>
        {socials.map((social) => {
          const count = stats[social.id] ?? 0
          const intensity = getIntensity(social.id)

          return (
            <li key={social.id} className="flex items-center gap-3">
              <span className="w-20 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                {social.label}
              </span>

              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                <m.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 dark:from-cyan-400 dark:to-indigo-500"
                  initial={false}
                  animate={{ width: `${Math.max(intensity * 100, count > 0 ? 4 : 0)}%` }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 300, damping: 30 }
                  }
                />
              </div>

              <span className="w-8 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {count}
              </span>
            </li>
          )
        })}
      </ul>

      {/* Trend chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {String(t('clickTrend'))}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setRange('daily')}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                range === 'daily'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {String(t('daily'))}
            </button>
            <button
              type="button"
              onClick={() => setRange('weekly')}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                range === 'weekly'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {String(t('weekly'))}
            </button>
          </div>
        </div>

        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" className="[stop-color:theme(colors.amber.400)] dark:[stop-color:theme(colors.cyan.400)]" stopOpacity={0.3} />
                  <stop offset="95%" className="[stop-color:theme(colors.amber.400)] dark:[stop-color:theme(colors.cyan.400)]" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
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
                fill="url(#clickGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-right text-xs text-slate-400 dark:text-slate-500">
        {String(t('totalClicks'))}: {totalClicks}
      </p>
    </div>
  )
}
