import { useEffect, useRef, useState } from 'react'
import type { SecretWrites, SettingsInput, SettingsView } from '../../../api/stats/_settings'
import { replaceSiteConfig, useSiteConfig } from '../../hooks/useSiteConfig'
import { canonicalLocale, type HomepageI18n, type PublicKey } from '../../i18n/homepage'
import { useManageCopy } from '../../manage/useManageCopy'
import { notifySiteConfigSaved } from '../../siteSync'
import type { SiteConfig } from '../../siteConfig'

export interface LinkRow {
  key: string
  originalId: string
  id: string
  label: string
  url: string
  iconSlug: string
  iconPath?: string
}

export const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

function rowsFrom(socials: readonly { id: string; label: string; url: string; iconSlug?: string; iconPath?: string }[]): LinkRow[] {
  return socials.map((link) => ({
    key: link.id,
    originalId: link.id,
    id: link.id,
    label: link.label,
    url: link.url,
    iconSlug: link.iconSlug ?? '',
    iconPath: link.iconPath,
  }))
}

interface DraftState {
  name: string
  domain: string
  handle: string
  avatarPath: string
  avatarUrl: string
  rows: LinkRow[]
  i18n: HomepageI18n
}

function snapshot(state: DraftState): string {
  return JSON.stringify(state)
}

function documentFrom(state: DraftState) {
  return {
    site: { name: state.name, domain: state.domain, twitterHandle: state.handle },
    profile: { avatar: state.avatarUrl.trim() || state.avatarPath },
    socials: state.rows.map((row) => ({
      id: row.id.trim(),
      label: row.label.trim(),
      url: row.url.trim(),
      ...(row.iconSlug.trim() && row.iconPath ? { iconSlug: row.iconSlug.trim(), iconPath: row.iconPath } : {}),
    })),
    i18n: structuredClone(state.i18n),
  }
}

function draftFrom(config: ReturnType<typeof useSiteConfig>): DraftState {
  const avatar = config.profile.avatar
  return {
    name: config.site.name,
    domain: config.site.domain,
    handle: config.site.twitterHandle ?? '',
    avatarPath: avatar.startsWith('/') ? avatar : '/avatar.jpg',
    avatarUrl: avatar.startsWith('https://') ? avatar : '',
    rows: rowsFrom(config.socials),
    i18n: config.i18n,
  }
}

export function settingsFromView(view: SettingsView): SettingsInput {
  return {
    timezone: view.timezone.value,
    defaultProvider: view.defaultProvider,
    inject: view.inject,
    umami: {
      apiUrl: view.umami.apiUrl.value,
      websiteId: view.umami.websiteId.value,
      username: view.umami.username.value,
    },
    goatcounter: { site: view.goatcounter.site.value },
    cloudflare: { accountId: view.cloudflare.accountId.value, siteTag: view.cloudflare.siteTag.value },
  }
}

export function useSiteDraft(token: string, settings: SettingsView | null, onSaved?: () => void) {
  const { t } = useManageCopy()
  const config = useSiteConfig()
  const [state, setState] = useState(() => draftFrom(config))
  const [savedSnap, setSavedSnap] = useState(() => snapshot(draftFrom(config)))
  const [seenVersion, setSeenVersion] = useState(config.version)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [baseVersion, setBaseVersion] = useState(config.version)
  const savingRef = useRef(false)
  const settingsRef = useRef<SettingsInput | null>(settings ? settingsFromView(settings) : null)

  useEffect(() => {
    if (settings) settingsRef.current = settingsFromView(settings)
  }, [settings])

  if (config.version > seenVersion) {
    setSeenVersion(config.version)
    if (snapshot(state) === savedSnap) {
      const next = draftFrom(config)
      setBaseVersion(config.version)
      setSavedSnap(snapshot(next))
      setState(next)
    }
  }

  const dirty = snapshot(state) !== savedSnap

  function patch(partial: Partial<DraftState>) {
    setState((current) => ({ ...current, ...partial }))
  }

  function updateRow(key: string, rowPatch: Partial<LinkRow>) {
    setState((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.key === key ? { ...row, ...rowPatch } : row)),
    }))
  }

  function move(index: number, direction: -1 | 1) {
    setState((current) => {
      const next = [...current.rows]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...current, rows: next }
    })
  }

  async function send(method: 'PUT' | 'POST', body: unknown, sentSnap?: string) {
    savingRef.current = true
    setSaving(true)
    setStatus(null)
    try {
      const response = await fetch('/api/site-config', {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as SiteConfig & { error?: string; version?: number; i18n?: HomepageI18n }
      if (!response.ok) {
        setStatus(payload.error ?? String(t('manageNetwork')))
        return
      }
      replaceSiteConfig(payload)
      notifySiteConfigSaved(response.headers.get('x-site-purge') !== 'ok')
      onSaved?.()
      const site = payload.site
      if (!site) {
        setStatus(String(t('manageSaved')))
        return
      }
      setBaseVersion(payload.version ?? baseVersion)
      const next: DraftState = {
        name: site.name,
        domain: site.domain,
        handle: site.twitterHandle ?? '',
        avatarPath: payload.profile.avatar.startsWith('/') ? payload.profile.avatar : '/avatar.jpg',
        avatarUrl: payload.profile.avatar.startsWith('https://') ? payload.profile.avatar : '',
        rows: rowsFrom(payload.socials),
        i18n: payload.i18n ?? state.i18n,
      }
      if (payload.version != null) setSeenVersion(payload.version)
      setSavedSnap(snapshot(next))
      setState((current) => (sentSnap == null || snapshot(current) === sentSnap ? next : current))
      setStatus(String(t('manageSaved')))
    } catch {
      setStatus(String(t('manageNetwork')))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function save(override?: { settings: SettingsInput; secrets?: SecretWrites }): boolean {
    if (savingRef.current) return false
    const loaded = override?.settings ?? settingsRef.current
    if (!loaded) {
      setStatus(String(t('manageNetwork')))
      return false
    }
    settingsRef.current = loaded
    const editing = state
    const savedVersion = baseVersion
    const renamed = editing.rows.some((row) => row.originalId && row.originalId !== row.id.trim())
    if (renamed && !window.confirm(String(t('manageIdWarn')))) return false
    savingRef.current = true
    setSaving(true)
    void (async () => {
      try {
        const { resolveStoredIcon } = await import('../../icons/catalog')
        const socials = editing.rows.map((row) => {
          const icon = resolveStoredIcon({ url: row.url.trim(), iconSlug: row.iconSlug.trim() || undefined })
          return {
            id: row.id.trim(),
            label: row.label.trim(),
            url: row.url.trim(),
            ...icon,
          }
        })
        await send(
          'PUT',
          {
            ...documentFrom(editing),
            socials,
            settings: loaded,
            ...(override?.secrets ? { secrets: override.secrets } : {}),
            baseVersion: savedVersion,
          },
          snapshot(editing),
        )
      } catch (error) {
        savingRef.current = false
        setSaving(false)
        setStatus(error instanceof Error ? error.message : String(t('manageNetwork')))
      }
    })()
    return true
  }

  function exportJson() {
    const body = documentFrom(state)
    const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'site-config.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return {
    ...state,
    patch,
    updateRow,
    move,
    setRows: (rows: LinkRow[]) => patch({ rows }),
    setDetect: (detect: boolean) => setState((current) => ({ ...current, i18n: { ...current.i18n, detect } })),
    setFallback: (fallback: string) => setState((current) => ({ ...current, i18n: { ...current.i18n, fallback } })),
    setText: (code: string, key: PublicKey, value: string) =>
      setState((current) => {
        const texts = { ...current.i18n.texts }
        texts[code] = { ...(texts[code] ?? {}), [key]: value }
        return { ...current, i18n: { ...current.i18n, texts } }
      }),
    moveLanguage: (index: number, direction: -1 | 1) =>
      setState((current) => {
        const languages = [...current.i18n.languages]
        const target = index + direction
        if (target < 0 || target >= languages.length) return current
        const [item] = languages.splice(index, 1)
        if (!item) return current
        languages.splice(target, 0, item)
        return { ...current, i18n: { ...current.i18n, languages } }
      }),
    removeLanguage: (code: string) =>
      setState((current) => {
        if (current.i18n.languages.length <= 1) return current
        const languages = current.i18n.languages.filter((language) => language.code !== code)
        const fallback = current.i18n.fallback === code ? languages[0]?.code ?? current.i18n.fallback : current.i18n.fallback
        const texts = { ...current.i18n.texts }
        delete texts[code]
        return { ...current, i18n: { ...current.i18n, languages, fallback, texts } }
      }),
    addLanguage: (code: string, label: string, shortLabel: string) => {
      const canonical = canonicalLocale(code)
      if (!canonical || !label.trim() || !shortLabel.trim()) return { ok: false as const, error: 'invalid' as const }
      if (label.trim().length > 40 || shortLabel.trim().length > 12) return { ok: false as const, error: 'invalid' as const }
      if (state.i18n.languages.some((language) => language.code === canonical)) return { ok: false as const, error: 'duplicate' as const }
      setState((current) => ({
        ...current,
        i18n: {
          ...current.i18n,
          languages: [...current.i18n.languages, { code: canonical, label: label.trim(), shortLabel: shortLabel.trim() }],
          texts: { ...current.i18n.texts, [canonical]: {} },
        },
      }))
      return { ok: true as const, code: canonical }
    },
    dirty,
    status,
    saving,
    ready: settings != null,
    save,
    exportJson,
    importSeed: () => void send('POST', { action: 'import' }),
    resetSeed: () => void send('POST', { action: 'reset' }),
  }
}

export type SiteDraft = ReturnType<typeof useSiteDraft>
