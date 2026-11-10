import { useEffect, useMemo, useRef, useState } from 'react'
import { useManageCopy } from '../../manage/useManageCopy'
import { useSearchParams } from 'react-router-dom'
import type { StatsRange } from '../../../api/stats/_dates'
import type { VisitorProviderId } from '../../../api/stats/_providers/types'
import { useDashboard, useVisitorReport, useVisitorSettings } from '../../hooks/useStats'
import { useSiteConfig } from '../../hooks/useSiteConfig'
import { MANAGE_LANGUAGES } from '../../manage/copy'
import { buildClickCsv } from './clickCsv'
import { preferredProvider, providerName } from './providers'
import { AnalyticsTab } from './tabs/AnalyticsTab'
import { DataTab } from './tabs/DataTab'
import { LanguagesTab } from './tabs/LanguagesTab'
import { LinksTab } from './tabs/LinksTab'
import { OverviewTab } from './tabs/OverviewTab'
import { SiteTab } from './tabs/SiteTab'
import { useSiteDraft } from './useSiteDraft'

const RANGES: StatsRange[] = [7, 30, 90]
const TABS = ['overview', 'site', 'languages', 'links', 'analytics', 'data'] as const
type ManageTab = (typeof TABS)[number]

const TAB_LABEL = {
  overview: 'manageTabOverview',
  site: 'manageTabSite',
  languages: 'manageTabLanguages',
  links: 'manageTabLinks',
  analytics: 'manageTabAnalytics',
  data: 'manageTabData',
} as const

function isTab(value: string | null): value is ManageTab {
  return TABS.some((tab) => tab === value)
}

export function Dashboard({ token, logout }: { token: string; logout: () => void }) {
  const { t, language, setLanguage } = useManageCopy()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const tab: ManageTab = isTab(rawTab) ? rawTab : 'overview'
  const { socials } = useSiteConfig()
  const [days, setDays] = useState<StatsRange>(30)
  const [chosen, setChosen] = useState<VisitorProviderId | null>(null)
  const { data, loading, error, unauthorized, refetch } = useDashboard(token, days)
  const { settings, unauthorized: settingsDenied, reload } = useVisitorSettings(token)
  const provider = chosen ?? preferredProvider(settings)
  const { report, unauthorized: visitorDenied } = useVisitorReport(token, days, provider)
  const draft = useSiteDraft(token)
  const analyticsDirty = useRef(false)

  useEffect(() => {
    if (unauthorized || settingsDenied || visitorDenied) logout()
  }, [unauthorized, settingsDenied, visitorDenied, logout])

  const labels = useMemo(() => new Map(socials.map((social) => [social.id, social.label])), [socials])

  function selectTab(next: ManageTab) {
    if (next === tab) return
    const contentDirty = draft.dirty
    const providerDirty = tab === 'analytics' && analyticsDirty.current
    if ((contentDirty || providerDirty) && !window.confirm(String(t('manageUnsaved')))) return
    analyticsDirty.current = false
    const params = new URLSearchParams(searchParams)
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params)
    requestAnimationFrame(() => document.getElementById(`manage-tab-${next}`)?.focus())
  }

  function onTabKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = TABS.indexOf(tab)
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? (index + TABS.length - 1) % TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? TABS.length - 1
              : -1
    if (next < 0) return
    event.preventDefault()
    selectTab(TABS[next])
  }

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

  const clicks = data
  const showProvider = Boolean(report?.configured && !report.unavailable && report.linkClicks)
  const linkClicks = report?.linkClicks ?? {}
  const providerLabel = provider ? providerName(provider, (key) => String(t(key))) : ''

  function exportCsv() {
    const csv = buildClickCsv(
      [
        ...clicks.configuredIds.map((id) => ({
          id,
          label: labels.get(id) ?? id,
          status: 'active' as const,
          redisClicks: clicks.periodTotals[id] ?? 0,
          providerClicks: showProvider ? (linkClicks[id] ?? 0) : null,
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
              {MANAGE_LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code)}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                    language === item.code
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500'
                  }`}
                  aria-pressed={language === item.code}
                >
                  {item.shortLabel}
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
                    days === range ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'
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

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div
          role="tablist"
          aria-label={String(t('manageTabs'))}
          className="flex gap-1 overflow-x-auto"
          onKeyDown={onTabKey}
        >
          {TABS.map((id) => (
            <button
              key={id}
              id={`manage-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`manage-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => selectTab(id)}
              className={`min-h-11 shrink-0 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap ${
                tab === id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {String(t(TAB_LABEL[id]))}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`manage-panel-${tab}`} aria-labelledby={`manage-tab-${tab}`}>
          {tab === 'overview' ? (
            <OverviewTab data={data} report={report} showProvider={showProvider} providerLabel={providerLabel} labels={labels} />
          ) : null}
          {tab === 'site' ? <SiteTab draft={draft} /> : null}
          {tab === 'languages' ? <LanguagesTab draft={draft} /> : null}
          {tab === 'links' ? <LinksTab draft={draft} /> : null}
          {tab === 'analytics' ? (
            <AnalyticsTab
              token={token}
              settings={settings}
              provider={provider}
              dirtyRef={analyticsDirty}
              onSaved={() => void reload()}
              onChoose={(id) => {
                setChosen(id)
                try {
                  localStorage.setItem('manage-visitor-provider', id)
                } catch {
                  /* ignore */
                }
              }}
            />
          ) : null}
          {tab === 'data' ? <DataTab draft={draft} /> : null}
        </div>
      </div>
    </div>
  )
}
