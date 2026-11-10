import { useTranslation } from 'react-i18next'
import type { VisitorProviderId } from '../../../../api/stats/_providers/types'
import type { SettingsView } from '../../../../api/stats/_settings'
import { ProviderSettings } from '../ProviderSettings'
import { PROVIDER_ORDER, providerName } from '../providers'

export function AnalyticsTab({
  token,
  settings,
  provider,
  onChoose,
  onSaved,
  dirtyRef,
}: {
  token: string
  settings: SettingsView | null
  provider: VisitorProviderId | null
  onChoose: (id: VisitorProviderId) => void
  onSaved: () => void
  dirtyRef: { current: boolean }
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
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
              onClick={() => onChoose(id)}
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
      <ProviderSettings token={token} settings={settings} onSaved={onSaved} dirtyRef={dirtyRef} />
    </div>
  )
}
