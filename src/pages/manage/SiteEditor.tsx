import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import publicImages from '../../generated/public-images.json'
import { ICON_SLUGS } from '../../iconRegistry'
import { replaceSiteConfig, useSiteConfig } from '../../hooks/useSiteConfig'
import { DEFAULT_PROFILE } from '../../siteConfig'

interface Row {
  key: string
  originalId: string
  id: string
  label: string
  url: string
  iconSlug: string
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

function rowsFrom(socials: readonly { id: string; label: string; url: string; iconSlug?: string }[]): Row[] {
  return socials.map((link) => ({
    key: link.id,
    originalId: link.id,
    id: link.id,
    label: link.label,
    url: link.url,
    iconSlug: link.iconSlug ?? '',
  }))
}

export function SiteEditor({ token }: { token: string }) {
  const { t } = useTranslation()
  const config = useSiteConfig()
  const [name, setName] = useState(config.site.name)
  const [tagline, setTagline] = useState(config.site.tagline)
  const [domain, setDomain] = useState(config.site.domain)
  const [handle, setHandle] = useState(config.site.twitterHandle ?? '')
  const initialAvatar = config.profile.avatar || DEFAULT_PROFILE.avatar
  const bundled = initialAvatar.startsWith('/') ? initialAvatar : DEFAULT_PROFILE.avatar
  const [avatarPath, setAvatarPath] = useState(publicImages.includes(bundled) ? bundled : DEFAULT_PROFILE.avatar)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar.startsWith('https://') ? initialAvatar : '')
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(config.socials))
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const preview = avatarUrl.trim() || avatarPath

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function move(index: number, direction: -1 | 1) {
    setRows((current) => {
      const next = [...current]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  async function send(method: 'PUT' | 'POST', body: unknown) {
    setSaving(true)
    setStatus(null)
    try {
      const response = await fetch('/api/site-config', {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as { error?: string; socials?: Row[] }
      if (!response.ok) {
        setStatus(payload.error ?? String(t('manageNetwork')))
        return
      }
      replaceSiteConfig(payload as never)
      setStatus(String(t('manageSaved')))
    } catch {
      setStatus(String(t('manageNetwork')))
    } finally {
      setSaving(false)
    }
  }

  function save() {
    const renamed = rows.some((row) => row.originalId && row.originalId !== row.id.trim())
    if (renamed && !window.confirm(String(t('manageIdWarn')))) return
    void send('PUT', {
      site: { name, tagline, domain, twitterHandle: handle },
      profile: { avatar: avatarUrl.trim() || avatarPath },
      socials: rows.map((row) => ({
        id: row.id.trim(),
        label: row.label.trim(),
        url: row.url.trim(),
        ...(row.iconSlug ? { iconSlug: row.iconSlug } : {}),
      })),
    })
  }

  function exportJson() {
    const body = {
      site: { name, tagline, domain, twitterHandle: handle },
      profile: { avatar: avatarUrl.trim() || avatarPath },
      socials: rows.map((row) => ({ id: row.id, label: row.label, url: row.url, ...(row.iconSlug ? { iconSlug: row.iconSlug } : {}) })),
    }
    const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'site-config.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">{String(t('manageSite'))}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{String(t('manageRedeploy'))}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {String(t('manageName'))}
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {String(t('manageTagline'))}
          <input className={inputClass} value={tagline} onChange={(event) => setTagline(event.target.value)} />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {String(t('manageDomain'))}
          <input className={inputClass} value={domain} onChange={(event) => setDomain(event.target.value)} />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {String(t('manageHandle'))}
          <input className={inputClass} value={handle} onChange={(event) => setHandle(event.target.value)} />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">{String(t('manageAvatar'))}</p>
        <div className="flex flex-wrap items-end gap-3">
          <img src={preview} alt="" className="size-16 rounded-full object-cover" />
          <div className="flex flex-wrap gap-2">
            {publicImages.map((path) => (
              <label key={path} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="radio"
                  name="avatar"
                  checked={!avatarUrl && avatarPath === path}
                  onChange={() => {
                    setAvatarPath(path)
                    setAvatarUrl('')
                  }}
                />
                <img src={path} alt="" className="size-8 rounded-full object-cover" />
              </label>
            ))}
          </div>
        </div>
        <label className="block text-sm text-slate-600 dark:text-slate-300">
          {String(t('manageAvatarCustom'))}
          <input
            className={inputClass}
            value={avatarUrl}
            placeholder="https://"
            onChange={(event) => setAvatarUrl(event.target.value)}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{String(t('manageLinks'))}</h3>
          <button
            type="button"
            className="text-sm text-slate-500 underline"
            onClick={() =>
              setRows((current) => [
                ...current,
                { key: `new-${current.length}-${Date.now()}`, originalId: '', id: '', label: '', url: 'https://', iconSlug: '' },
              ])
            }
          >
            {String(t('manageAddLink'))}
          </button>
        </div>
        {rows.map((row, index) => (
          <div key={row.key} className="grid gap-2 rounded-xl border border-slate-200/70 p-3 sm:grid-cols-5 dark:border-slate-800">
            <input className={inputClass} aria-label="id" value={row.id} onChange={(event) => updateRow(row.key, { id: event.target.value })} />
            <input className={inputClass} aria-label="label" value={row.label} onChange={(event) => updateRow(row.key, { label: event.target.value })} />
            <input className={inputClass} aria-label="url" value={row.url} onChange={(event) => updateRow(row.key, { url: event.target.value })} />
            <select className={inputClass} aria-label="icon" value={row.iconSlug} onChange={(event) => updateRow(row.key, { iconSlug: event.target.value })}>
              <option value="">{String(t('manageIconAuto'))}</option>
              {ICON_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" className="text-sm text-slate-500" onClick={() => move(index, -1)} aria-label="up">↑</button>
              <button type="button" className="text-sm text-slate-500" onClick={() => move(index, 1)} aria-label="down">↓</button>
              <button type="button" className="text-sm text-rose-500" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>
                {String(t('manageDelete'))}
              </button>
            </div>
          </div>
        ))}
      </div>

      {status ? <p className="text-sm text-slate-500">{status}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={save} className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
          {saving ? String(t('manageSaving')) : String(t('manageSave'))}
        </button>
        <button type="button" onClick={() => void send('POST', { action: 'import' })} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
          {String(t('manageImport'))}
        </button>
        <button type="button" onClick={() => void send('POST', { action: 'reset' })} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
          {String(t('manageReset'))}
        </button>
        <button type="button" onClick={exportJson} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
          {String(t('manageExport'))}
        </button>
      </div>
    </section>
  )
}
