import { useEffect, useState } from 'react'
import seedFile from '../../public/siteConfig.json'
import { EMPTY_SCRIPTS, type ScriptBundle } from '../analytics/types'
import { resolveIconSlug } from '../iconRegistry'
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

function scriptsFromAnalytics(analytics: AnalyticsConfig | null | undefined): ScriptBundle {
  if (analytics?.provider === 'plausible' && analytics.plausibleDomain) {
    const src = analytics.plausibleHost
      ? `${analytics.plausibleHost.replace(/\/$/, '')}/js/script.js`
      : 'https://plausible.io/js/script.js'
    return { ...EMPTY_SCRIPTS, plausible: { domain: analytics.plausibleDomain, src } }
  }
  if (analytics?.provider === 'umami' && analytics.umamiWebsiteId) {
    const src = analytics.umamiHost
      ? `${analytics.umamiHost.replace(/\/$/, '')}/script.js`
      : 'https://cloud.umami.is/script.js'
    return { ...EMPTY_SCRIPTS, umami: { websiteId: analytics.umamiWebsiteId, src } }
  }
  return EMPTY_SCRIPTS
}

function fromConfig(data: SiteConfig & { scripts?: ScriptBundle; version?: number }, fallbackScripts: ScriptBundle): SiteConfigState {
  return {
    loading: false,
    error: null,
    site: { ...DEFAULT_SITE, ...data.site },
    profile: data.profile?.avatar ? data.profile : DEFAULT_PROFILE,
    socials: normalizeSocials(data.socials ?? []),
    ogImagePath: data.ogImagePath ?? DEFAULT_OG_PATH,
    scripts: data.scripts ?? fallbackScripts,
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
