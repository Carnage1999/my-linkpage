import { useEffect, useState } from 'react'
import { useManageCopy } from '../../manage/useManageCopy'
import { notifySiteConfigSaved } from '../../siteSync'
import type { SettingsPatch, SettingsView } from '../../../api/stats/_settings'
import { VISITOR_PROVIDERS, type VisitorProviderId } from '../../../api/stats/_providers/types'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

function secretPlaceholder(field: { state: string; hint: string | null }, unset: string, managed: string): string {
  if (field.state === 'env') return managed
  if (field.state === 'set') return field.hint ? `••••${field.hint}` : '••••'
  return unset
}

export function ProviderSettings({
  token,
  settings,
  onSaved,
  dirtyRef,
}: {
  token: string
  settings: SettingsView | null
  onSaved: () => void
  dirtyRef?: { current: boolean }
}) {
  if (!settings) return null
  return <ProviderForm key={JSON.stringify(settings)} token={token} settings={settings} onSaved={onSaved} dirtyRef={dirtyRef} />
}

function ProviderForm({
  token,
  settings,
  onSaved,
  dirtyRef,
}: {
  token: string
  settings: SettingsView
  onSaved: () => void
  dirtyRef?: { current: boolean }
}) {
  const { t } = useManageCopy()
  const [timezone, setTimezone] = useState(settings.timezone.value)
  const [defaultProvider, setDefaultProvider] = useState(settings.defaultProvider ?? '')
  const [inject, setInject] = useState(settings.inject)
  const [goatSite, setGoatSite] = useState(settings.goatcounter.site.value)
  const [cfAccount, setCfAccount] = useState(settings.cloudflare.accountId.value)
  const [cfTag, setCfTag] = useState(settings.cloudflare.siteTag.value)
  const [umamiUrl, setUmamiUrl] = useState(settings.umami.apiUrl.value)
  const [umamiId, setUmamiId] = useState(settings.umami.websiteId.value)
  const [umamiUser, setUmamiUser] = useState(settings.umami.username.value)
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [cleared, setCleared] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function secretValue(key: string): string | null | undefined {
    if (cleared[key]) return null
    const value = secrets[key]?.trim()
    return value ? value : undefined
  }

  function patch(): SettingsPatch {
    return {
      timezone,
      defaultProvider: defaultProvider ? (defaultProvider as VisitorProviderId) : null,
      inject,
      goatcounter: { site: goatSite, apiKey: secretValue('goat') },
      cloudflare: { accountId: cfAccount, siteTag: cfTag, apiToken: secretValue('cf') },
      umami: {
        apiUrl: umamiUrl,
        websiteId: umamiId,
        username: umamiUser,
        apiKey: secretValue('umamiKey'),
        password: secretValue('umamiPassword'),
      },
    }
  }

  async function save() {
    setSaving(true)
    setStatus(null)
    try {
      const response = await fetch('/api/stats/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch()),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        setStatus(body.error ?? String(t('manageNetwork')))
        return
      }
      setSecrets({})
      setCleared({})
      onSaved()
      notifySiteConfigSaved(response.headers.get('x-site-purge') !== 'ok')
      setStatus(String(t('manageSaved')))
    } catch {
      setStatus(String(t('manageNetwork')))
    } finally {
      setSaving(false)
    }
  }

  async function test(provider: VisitorProviderId) {
    setStatus(null)
    try {
      const response = await fetch('/api/stats/provider-test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, draft: patch() }),
      })
      const body = (await response.json()) as { ok?: boolean; error?: string }
      setStatus(body.ok ? String(t('manageTestOk')) : `${String(t('manageTestFail'))}: ${body.error ?? ''}`)
    } catch {
      setStatus(String(t('manageNetwork')))
    }
  }

  const managed = String(t('manageManagedByEnv'))
  const unset = String(t('manageSecretUnset'))
  const dirty =
    timezone !== settings.timezone.value ||
    defaultProvider !== (settings.defaultProvider ?? '') ||
    JSON.stringify(inject) !== JSON.stringify(settings.inject) ||
    goatSite !== settings.goatcounter.site.value ||
    cfAccount !== settings.cloudflare.accountId.value ||
    cfTag !== settings.cloudflare.siteTag.value ||
    umamiUrl !== settings.umami.apiUrl.value ||
    umamiId !== settings.umami.websiteId.value ||
    umamiUser !== settings.umami.username.value ||
    Object.values(secrets).some((value) => value.trim() !== '') ||
    Object.values(cleared).some(Boolean)
  useEffect(() => {
    if (dirtyRef) dirtyRef.current = dirty
  })

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">{String(t('manageSettings'))}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{String(t('manageKeepSecret'))}</p>
      <label className="block text-sm text-slate-600 dark:text-slate-300">
        {String(t('manageTimezoneField'))}
        <input className={inputClass} value={timezone} disabled={settings.timezone.locked} onChange={(event) => setTimezone(event.target.value)} />
        {settings.timezone.locked ? <span className="text-xs text-slate-400">{managed}</span> : null}
      </label>
      <label className="block text-sm text-slate-600 dark:text-slate-300">
        {String(t('manageDefaultProvider'))}
        <select className={inputClass} value={defaultProvider} onChange={(event) => setDefaultProvider(event.target.value)}>
          <option value="">{String(t('manageProviderAuto'))}</option>
          {VISITOR_PROVIDERS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
        <legend className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{String(t('manageInject'))}</legend>
        {(['umami', 'goatcounter', 'cloudflare'] as const).map((id) => (
          <label key={id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inject[id]}
              onChange={(event) => setInject((current) => ({ ...current, [id]: event.target.checked }))}
            />
            {id}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600 dark:text-slate-300">
          GoatCounter site
          <input className={inputClass} value={goatSite} disabled={settings.goatcounter.site.locked} onChange={(event) => setGoatSite(event.target.value)} />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          GOATCOUNTER_API_KEY
          <input
            className={inputClass}
            type="password"
            autoComplete="off"
            disabled={settings.goatcounter.apiKey.locked}
            placeholder={secretPlaceholder(settings.goatcounter.apiKey, unset, managed)}
            value={secrets.goat ?? ''}
            onChange={(event) => setSecrets((current) => ({ ...current, goat: event.target.value }))}
          />
          <button type="button" className="text-xs text-slate-400 underline" onClick={() => setCleared((current) => ({ ...current, goat: true }))}>
            {String(t('manageClearSecret'))}
          </button>
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          CLOUDFLARE_ACCOUNT_ID
          <input className={inputClass} value={cfAccount} disabled={settings.cloudflare.accountId.locked} onChange={(event) => setCfAccount(event.target.value)} />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          CLOUDFLARE_WA_SITE_TAG
          <input className={inputClass} value={cfTag} disabled={settings.cloudflare.siteTag.locked} onChange={(event) => setCfTag(event.target.value)} />
        </label>
        <label className="text-sm text-slate-600 md:col-span-2 dark:text-slate-300">
          CLOUDFLARE_API_TOKEN
          <input
            className={inputClass}
            type="password"
            autoComplete="off"
            disabled={settings.cloudflare.apiToken.locked}
            placeholder={secretPlaceholder(settings.cloudflare.apiToken, unset, managed)}
            value={secrets.cf ?? ''}
            onChange={(event) => setSecrets((current) => ({ ...current, cf: event.target.value }))}
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          UMAMI_API_URL
          <input className={inputClass} value={umamiUrl} disabled={settings.umami.apiUrl.locked} onChange={(event) => setUmamiUrl(event.target.value)} />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          UMAMI_WEBSITE_ID
          <input className={inputClass} value={umamiId} disabled={settings.umami.websiteId.locked} onChange={(event) => setUmamiId(event.target.value)} />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          UMAMI_USERNAME
          <input className={inputClass} value={umamiUser} disabled={settings.umami.username.locked} onChange={(event) => setUmamiUser(event.target.value)} />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          UMAMI_API_KEY
          <input
            className={inputClass}
            type="password"
            autoComplete="off"
            disabled={settings.umami.apiKey.locked}
            placeholder={secretPlaceholder(settings.umami.apiKey, unset, managed)}
            value={secrets.umamiKey ?? ''}
            onChange={(event) => setSecrets((current) => ({ ...current, umamiKey: event.target.value }))}
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Umami password
          <input
            className={inputClass}
            type="password"
            autoComplete="off"
            disabled={settings.umami.password.locked}
            placeholder={secretPlaceholder(settings.umami.password, unset, managed)}
            value={secrets.umamiPassword ?? ''}
            onChange={(event) => setSecrets((current) => ({ ...current, umamiPassword: event.target.value }))}
          />
        </label>
      </div>

      {status ? <p className="text-sm text-slate-500">{status}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
          {saving ? String(t('manageSaving')) : String(t('manageSave'))}
        </button>
        {VISITOR_PROVIDERS.map((id) => (
          <button key={id} type="button" onClick={() => void test(id)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
            {String(t('manageTest'))} {id}
          </button>
        ))}
      </div>
    </section>
  )
}
