import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { replaceSiteConfig, useSiteConfig } from '../../hooks/useSiteConfig'
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
  tagline: string
  domain: string
  handle: string
  avatarPath: string
  avatarUrl: string
  rows: LinkRow[]
}

function snapshot(state: DraftState): string {
  return JSON.stringify(state)
}

function draftFrom(config: ReturnType<typeof useSiteConfig>): DraftState {
  const avatar = config.profile.avatar
  return {
    name: config.site.name,
    tagline: config.site.tagline,
    domain: config.site.domain,
    handle: config.site.twitterHandle ?? '',
    avatarPath: avatar.startsWith('/') ? avatar : '/avatar.jpg',
    avatarUrl: avatar.startsWith('https://') ? avatar : '',
    rows: rowsFrom(config.socials),
  }
}

export function useSiteDraft(token: string) {
  const { t } = useTranslation()
  const config = useSiteConfig()
  const [state, setState] = useState(() => draftFrom(config))
  const [savedSnap, setSavedSnap] = useState(() => snapshot(draftFrom(config)))
  const [seenVersion, setSeenVersion] = useState(config.version)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (config.version !== seenVersion) {
    setSeenVersion(config.version)
    if (snapshot(state) === savedSnap) {
      const next = draftFrom(config)
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

  async function send(method: 'PUT' | 'POST', body: unknown) {
    setSaving(true)
    setStatus(null)
    try {
      const response = await fetch('/api/site-config', {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as SiteConfig & { error?: string; version?: number }
      if (!response.ok) {
        setStatus(payload.error ?? String(t('manageNetwork')))
        return
      }
      replaceSiteConfig(payload)
      const site = payload.site
      if (!site) {
        setStatus(String(t('manageSaved')))
        return
      }
      const next: DraftState = {
        name: site.name,
        tagline: site.tagline,
        domain: site.domain,
        handle: site.twitterHandle ?? '',
        avatarPath: payload.profile.avatar.startsWith('/') ? payload.profile.avatar : '/avatar.jpg',
        avatarUrl: payload.profile.avatar.startsWith('https://') ? payload.profile.avatar : '',
        rows: rowsFrom(payload.socials),
      }
      setSavedSnap(snapshot(next))
      if (payload.version != null) setSeenVersion(payload.version)
      setState(next)
      setStatus(String(t('manageSaved')))
    } catch {
      setStatus(String(t('manageNetwork')))
    } finally {
      setSaving(false)
    }
  }

  async function socialsForSave() {
    const { resolveStoredIcon } = await import('../../icons/catalog')
    return state.rows.map((row) => {
      const icon = resolveStoredIcon({ url: row.url.trim(), iconSlug: row.iconSlug.trim() || undefined })
      return {
        id: row.id.trim(),
        label: row.label.trim(),
        url: row.url.trim(),
        ...icon,
      }
    })
  }

  function save() {
    const renamed = state.rows.some((row) => row.originalId && row.originalId !== row.id.trim())
    if (renamed && !window.confirm(String(t('manageIdWarn')))) return
    void (async () => {
      try {
        const socials = await socialsForSave()
        await send('PUT', {
          site: { name: state.name, tagline: state.tagline, domain: state.domain, twitterHandle: state.handle },
          profile: { avatar: state.avatarUrl.trim() || state.avatarPath },
          socials,
        })
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(t('manageNetwork')))
      }
    })()
  }

  function exportJson() {
    const body = {
      site: { name: state.name, tagline: state.tagline, domain: state.domain, twitterHandle: state.handle },
      profile: { avatar: state.avatarUrl.trim() || state.avatarPath },
      socials: state.rows.map((row) => ({
        id: row.id,
        label: row.label,
        url: row.url,
        ...(row.iconSlug ? { iconSlug: row.iconSlug } : {}),
      })),
    }
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
    dirty,
    status,
    saving,
    save,
    exportJson,
    importSeed: () => void send('POST', { action: 'import' }),
    resetSeed: () => void send('POST', { action: 'reset' }),
  }
}

export type SiteDraft = ReturnType<typeof useSiteDraft>
