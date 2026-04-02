import { m, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useLinkClickStats } from '../hooks/useLinkClickStats'
import type { SocialLinkEntry } from '../siteConfig'

/**
 * Renders a small heat-bar alongside each link's card, plus an
 * optional summary bar underneath the full list.
 */
export function LinkHeatmap({ socials }: { socials: readonly SocialLinkEntry[] }) {
  const { t } = useTranslation()
  const { stats, totalClicks, getIntensity } = useLinkClickStats()
  const prefersReduced = useReducedMotion()

  if (totalClicks === 0) return null

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {String(t('clickHeatmap'))}
      </p>

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

      <p className="text-right text-xs text-slate-400 dark:text-slate-500">
        {String(t('totalClicks'))}: {totalClicks}
      </p>
    </div>
  )
}
