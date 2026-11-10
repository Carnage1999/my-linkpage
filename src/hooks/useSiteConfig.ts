import { useEffect, useState } from 'react'
import seedFile from '../../public/siteConfig.json'
import { EMPTY_SCRIPTS, type ScriptBundle } from '../analytics/types'
import { resolveIconSlug } from '../iconRegistry'
import { safeAvatarUrl } from '../lib/safeAvatarUrl'
import { safeHostname, safeLinkUrl, safeScriptUrl, safeToken } from '../lib/safeUrl'
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
}

const DEFAULT_OG_PATH = '/api/og'

function normalizeSocials(raw: readonly SocialLinkEntry[]): SocialLinkEntry[] {
  return raw.map((entry) => ({
    ...entry,
    iconSlug: entry.iconSlug ?? resolveIconSlug(entry.url) ?? undefined,
  }))
}

function scriptFrom(value: string | undefined, fallback: string): string | null {
  return safeScriptUrl(value && value.trim() ? value : fallback)
}

function scriptsFromAnalytics(analytics: AnalyticsConfig | null | undefined): ScriptBundle {
  if (analytics?.provider === 'plausible' && analytics.plausibleDomain) {
    const domain = safeHostname(analytics.plausibleDomain)
    const src = scriptFrom(
      analytics.plausibleHost ? `${analytics.plausibleHost.replace(/\/$/, '')}/js/script.js` : undefined,
      'https://plausible.io/js/script.js',
    )
    if (domain && src) return { ...EMPTY_SCRIPTS, plausible: { domain, src } }
  }
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
  const plausibleSrc = bundle.plausible ? safeScriptUrl(bundle.plausible.src) : null
  const plausibleDomain = bundle.plausible ? safeHostname(bundle.plausible.domain) : null
  return {
    umami: umamiSrc && umamiId ? { websiteId: umamiId, src: umamiSrc } : null,
    goatcounter: goat ? { endpoint: goat } : null,
    cloudflare: cloudflare ? { token: cloudflare } : null,
    plausible: plausibleSrc && plausibleDomain ? { domain: plausibleDomain, src: plausibleSrc } : null,
  }
}

function fromConfig(data: SiteConfig & { scripts?: ScriptBundle; version?: number }, fallbackScripts: ScriptBundle): SiteConfigState {
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
  }
}

const seedScripts = scriptsFromAnalytics((seedFile as SiteConfig).analytics)
let current = fromConfig(seedFile as SiteConfig, seedScripts)
const listeners = new Set<() => void>()

function publish(next: SiteConfigState) {
  current = next
  for (const listener of listeners) listener()
}

/** Drop the in-memory copy so the next read starts from the repo seed. */
export function invalidateSiteConfig(): void {
  publish(fromConfig(seedFile as SiteConfig, seedScripts))
}

export function replaceSiteConfig(data: SiteConfig & { scripts?: ScriptBundle; version?: number }): void {
  publish(fromConfig(data, current.scripts))
}

export function useSiteConfig(): SiteConfigState {
  const [state, setState] = useState(current)

  useEffect(() => {
    const sync = () => setState(current)
    listeners.add(sync)
    let cancelled = false
    fetch('/api/site-config', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) return
        const data = (await response.json()) as SiteConfig & { scripts?: ScriptBundle; version?: number }
        if (cancelled) return
        publish(fromConfig(data, seedScripts))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      listeners.delete(sync)
    }
  }, [])

  return state
}
