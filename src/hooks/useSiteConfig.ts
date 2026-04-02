import { useEffect, useState } from 'react'
import { resolveIconSlug } from '../iconRegistry'
import type { AnalyticsConfig, SiteConfig, SiteMetadata, SocialLinkEntry } from '../siteConfig'
import { DEFAULT_PROFILE, DEFAULT_SITE, DEFAULT_SOCIALS } from '../siteConfig'

export interface SiteConfigState {
  loading: boolean
  error: string | null
  site: SiteMetadata
  profile: { readonly avatar: string }
  analytics: AnalyticsConfig | null
  socials: readonly SocialLinkEntry[]
  ogImagePath: string
}

const DEFAULT_OG_PATH = '/api/og'

/** Ensure every entry has an iconSlug (auto-detect from URL if missing). */
function normalizeSocials(
  raw: readonly SocialLinkEntry[],
): SocialLinkEntry[] {
  return raw.map((entry) => ({
    ...entry,
    iconSlug: entry.iconSlug ?? resolveIconSlug(entry.url) ?? undefined,
  }))
}

let cached: SiteConfig | null = null

async function fetchConfig(): Promise<SiteConfig> {
  if (cached) return cached

  const res = await fetch('/siteConfig.json', {
    cache: 'no-cache',
  })

  if (!res.ok) {
    throw new Error(`Failed to load config: ${res.status}`)
  }

  const data = (await res.json()) as SiteConfig
  cached = data
  return data
}

/** Invalidate the in-memory cache so the next mount re-fetches. */
export function invalidateSiteConfig(): void {
  cached = null
}

export function useSiteConfig(): SiteConfigState {
  const [state, setState] = useState<SiteConfigState>(() =>
    cached
      ? {
          loading: false,
          error: null,
          site: { ...DEFAULT_SITE, ...cached.site },
          profile: cached.profile,
          analytics: cached.analytics ?? null,
          socials: normalizeSocials(cached.socials),
          ogImagePath: cached.ogImagePath ?? DEFAULT_OG_PATH,
        }
      : {
          loading: true,
          error: null,
          site: DEFAULT_SITE,
          profile: DEFAULT_PROFILE,
          analytics: null,
          socials: DEFAULT_SOCIALS,
          ogImagePath: DEFAULT_OG_PATH,
        },
  )

  useEffect(() => {
    if (cached) return

    let cancelled = false

    fetchConfig()
      .then((data) => {
        if (cancelled) return
        setState({
          loading: false,
          error: null,
          site: { ...DEFAULT_SITE, ...data.site },
          profile: data.profile,
          analytics: data.analytics ?? null,
          socials: normalizeSocials(data.socials),
          ogImagePath: data.ogImagePath ?? DEFAULT_OG_PATH,
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
