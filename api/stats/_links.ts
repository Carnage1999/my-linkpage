import siteConfig from '../../public/siteConfig.json'
import { DEFAULT_STATS_TIMEZONE } from './_dates'

interface SiteConfigFile {
  statsTimezone?: string
  analytics?: { umamiWebsiteId?: string } | null
  socials?: Array<{ id?: string }>
}

const config = siteConfig as SiteConfigFile

export function configuredLinkIds(): ReadonlySet<string> {
  const ids = (config.socials ?? [])
    .map((entry) => entry.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
  return new Set(ids)
}

export function statsTimeZone(): string {
  const fromEnv = process.env.STATS_TIMEZONE?.trim()
  if (fromEnv) return fromEnv
  const fromConfig = config.statsTimezone?.trim()
  return fromConfig || DEFAULT_STATS_TIMEZONE
}

export function configuredUmamiWebsiteId(): string | undefined {
  return config.analytics?.umamiWebsiteId
}

const LINK_ID = /^[a-zA-Z0-9_-]{1,64}$/

/** Accept only an exact id that is present in the deployed site config. */
export function acceptLinkId(raw: unknown, allowed: ReadonlySet<string>): string | null {
  if (typeof raw !== 'string' || !LINK_ID.test(raw)) return null
  if (!allowed.has(raw)) return null
  return raw
}
