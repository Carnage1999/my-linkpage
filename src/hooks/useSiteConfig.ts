import { useEffect, useState } from 'react'
import seedFile from '../../public/siteConfig.json'
import { EMPTY_SCRIPTS, type ScriptBundle } from '../analytics/types'
import { DEFAULT_HOMEPAGE_I18N, type HomepageI18n } from '../i18n/homepage'
import { safeAvatarUrl } from '../lib/safeAvatarUrl'
import { safeLinkUrl, safeScriptUrl, safeSvgPath, safeToken } from '../lib/safeUrl'
import { SITE_CHANNEL, type SiteSavedMessage } from '../siteSync'
import type { AnalyticsConfig, SiteConfig, SiteMetadata, SocialLinkEntry } from '../siteConfig'
import { DEFAULT_PROFILE, DEFAULT_SITE } from '../siteConfig'

export interface SiteConfigState {
  loading: boolean
  error: string | null
  site: SiteMetadata
  profile: { readonly avatar: string }
  socials: readonly SocialLinkEntry[]
  ogImagePath: string
  scripts: ScriptBundle
  version: number
  etag: string | null
  i18n: HomepageI18n
}

const DEFAULT_OG_PATH = '/api/og'

function normalizeSocials(raw: readonly SocialLinkEntry[]): SocialLinkEntry[] {
  return raw.map((entry) => {
    const iconPath = safeSvgPath(entry.iconPath)
    return { ...entry, ...(iconPath ? { iconPath } : { iconPath: undefined }) }
  })
}

function scriptFrom(value: string | undefined, fallback: string): string | null {
  return safeScriptUrl(value && value.trim() ? value : fallback)
}

function scriptsFromAnalytics(analytics: AnalyticsConfig | null | undefined): ScriptBundle {
  if (analytics?.provider === 'umami' && analytics.umamiWebsiteId) {
    const websiteId = safeToken(analytics.umamiWebsiteId)
    const src = scriptFrom(
      analytics.umamiHost ? `${analytics.umamiHost.replace(/\/$/, '')}/script.js` : undefined,
      'https://cloud.umami.is/script.js',
    )
    if (websiteId && src) return { ...EMPTY_SCRIPTS, umami: { websiteId, src } }
  }
  return EMPTY_SCRIPTS
}

function sanitizeScripts(bundle: ScriptBundle): ScriptBundle {
  const umamiSrc = bundle.umami ? safeScriptUrl(bundle.umami.src) : null
  const umamiId = bundle.umami ? safeToken(bundle.umami.websiteId) : null
  const goat = bundle.goatcounter ? safeScriptUrl(bundle.goatcounter.endpoint) : null
  const cloudflare = bundle.cloudflare ? safeToken(bundle.cloudflare.token) : null
  return {
    umami: umamiSrc && umamiId ? { websiteId: umamiId, src: umamiSrc } : null,
    goatcounter: goat ? { endpoint: goat } : null,
    cloudflare: cloudflare ? { token: cloudflare } : null,
  }
}

function readI18n(value: unknown): HomepageI18n {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return structuredClone(DEFAULT_HOMEPAGE_I18N)
  const body = value as Partial<HomepageI18n>
  if (!Array.isArray(body.languages) || body.languages.length === 0) return structuredClone(DEFAULT_HOMEPAGE_I18N)
  return {
    languages: body.languages,
    fallback: typeof body.fallback === 'string' ? body.fallback : body.languages[0].code,
    detect: body.detect !== false,
    texts: body.texts ?? {},
  }
}

function fromConfig(
  data: SiteConfig & { scripts?: ScriptBundle; version?: number; i18n?: HomepageI18n },
  fallbackScripts: ScriptBundle,
  etag: string | null,
): SiteConfigState {
  return {
    loading: false,
    error: null,
    site: { ...DEFAULT_SITE, ...data.site },
    profile: { avatar: safeAvatarUrl(data.profile?.avatar || DEFAULT_PROFILE.avatar) },
    socials: normalizeSocials(data.socials ?? []).flatMap((entry) => {
      const url = safeLinkUrl(entry.url)
      return url ? [{ ...entry, url }] : []
    }),
    ogImagePath: data.ogImagePath ?? DEFAULT_OG_PATH,
    scripts: sanitizeScripts(data.scripts ?? fallbackScripts),
    version: data.version ?? 0,
    etag,
    i18n: readI18n(data.i18n),
  }
}

const seedScripts = scriptsFromAnalytics((seedFile as SiteConfig).analytics)
let current = fromConfig(seedFile as SiteConfig & { i18n?: HomepageI18n }, seedScripts, null)
const listeners = new Set<() => void>()
let refresh: (bust?: boolean) => Promise<void> = async () => undefined

function publish(next: SiteConfigState) {
  current = next
  for (const listener of listeners) listener()
}

/** Drop the in-memory copy so the next read starts from the repo seed. */
export function invalidateSiteConfig(): void {
  publish(fromConfig(seedFile as SiteConfig, seedScripts, null))
}

export function replaceSiteConfig(data: SiteConfig & { scripts?: ScriptBundle; version?: number }): void {
  publish(fromConfig(data, current.scripts, current.etag))
}

async function revalidate(bust = false) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (!bust && current.etag) headers['If-None-Match'] = current.etag
  const url = bust ? `/api/site-config?v=${current.version}` : '/api/site-config'
  const response = await fetch(url, { headers, cache: 'no-cache' })
  if (response.status === 304) return
  if (!response.ok) return
  const data = (await response.json()) as SiteConfig & { scripts?: ScriptBundle; version?: number }
  publish(fromConfig(data, seedScripts, response.headers.get('etag')))
}

refresh = revalidate

export function useSiteConfig(): SiteConfigState {
  const [state, setState] = useState(current)

  useEffect(() => {
    const sync = () => setState(current)
    listeners.add(sync)
    let cancelled = false
    void revalidate().catch(() => undefined)

    const onFocus = () => {
      if (!cancelled) void revalidate().catch(() => undefined)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') onFocus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(SITE_CHANNEL)
        channel.addEventListener('message', (event: MessageEvent<SiteSavedMessage>) => {
          if (event.data?.type !== 'saved' || cancelled) return
          void revalidate(Boolean(event.data.bust)).catch(() => undefined)
        })
      } catch {
        channel = null
      }
    }

    return () => {
      cancelled = true
      listeners.delete(sync)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      channel?.close()
    }
  }, [])

  return state
}

export { refresh as refreshSiteConfig }
