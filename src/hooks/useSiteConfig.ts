import { useEffect, useSyncExternalStore } from 'react'
import seedFile from '../../public/siteConfig.json'
import { EMPTY_SCRIPTS, type ScriptBundle } from '../analytics/types'
import { DEFAULT_HOMEPAGE_I18N, type HomepageI18n } from '../i18n/homepage'
import { safeAvatarUrl } from '../lib/safeAvatarUrl'
import { safeLinkUrl, safeScriptUrl, safeSvgPath, safeToken } from '../lib/safeUrl'
import { subscribeSiteSaved } from '../siteSync'
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
let current: SiteConfigState = { ...fromConfig(seedFile as SiteConfig & { i18n?: HomepageI18n }, seedScripts, null), loading: true }
const listeners = new Set<() => void>()
let refresh: (signal?: AbortSignal) => Promise<void> = async () => undefined

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

async function revalidate(signal?: AbortSignal) {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (current.etag) headers['If-None-Match'] = current.etag
    // Always the bare path. A save purges that CDN entry, so the next read is fresh.
    // `v` is not sent: an anonymous query would be a separate cache key.
    const response = await fetch('/api/site-config', { headers, cache: 'no-cache', signal })
    if (signal?.aborted || response.status === 304 || !response.ok) return
    const data = (await response.json()) as SiteConfig & { scripts?: ScriptBundle; version?: number }
    const incoming = data.version ?? 0
    if (current.version > 0 && incoming < current.version) return
    publish(fromConfig(data, seedScripts, response.headers.get('etag')))
  } catch {
    /* Keep the last good document when the network or the body is unusable. */
  } finally {
    if (current.loading) publish({ ...current, loading: false })
  }
}

refresh = revalidate

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSiteConfig(): SiteConfigState {
  const state = useSyncExternalStore(subscribe, () => current, () => current)

  useEffect(() => {
    const controller = new AbortController()
    void revalidate(controller.signal).catch(() => undefined)

    const onFocus = () => {
      if (!controller.signal.aborted) void revalidate(controller.signal).catch(() => undefined)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') onFocus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    const unsubscribe = subscribeSiteSaved(() => {
      if (controller.signal.aborted) return
      void revalidate(controller.signal).catch(() => undefined)
    })

    return () => {
      controller.abort()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      unsubscribe()
    }
  }, [])

  return state
}

export { refresh as refreshSiteConfig }
