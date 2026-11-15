/**
 * Public site content stored as one JSON document in Upstash.
 * public/siteConfig.json is the seed when Redis is empty or unreachable.
 */

import seedFile from '../../public/siteConfig.json'
import { isRedisConfigured, redisCommand } from './_redis'
import { normalizeConfig, SiteValidationError, type PublicSiteConfig } from './_site-schema'

const KEY = 'site:config'
const CACHE_MS = 60_000

interface ManagedCache {
  at: number
  site: PublicSiteConfig
  settings: unknown | null
}

let cache: ManagedCache | null = null
let cacheGeneration = 0

export function __resetSiteCache(): void {
  cache = null
  cacheGeneration = 0
}

export function siteCacheGeneration(): number {
  return cacheGeneration
}

export function seedSiteConfig(): PublicSiteConfig {
  return normalizeConfig(seedFile, 0)
}

async function load(): Promise<ManagedCache> {
  if (!isRedisConfigured()) return { at: Date.now(), site: seedSiteConfig(), settings: null }
  try {
    const response = await redisCommand(['GET', KEY])
    if (typeof response.result !== 'string' || !response.result) {
      return { at: Date.now(), site: seedSiteConfig(), settings: null }
    }
    const parsed = JSON.parse(response.result) as { version?: number; settings?: unknown }
    return {
      at: Date.now(),
      site: normalizeConfig(parsed, Number(parsed.version) || 1),
      settings: parsed.settings ?? null,
    }
  } catch (error) {
    if (error instanceof SiteValidationError) return { at: Date.now(), site: seedSiteConfig(), settings: null }
    return { at: Date.now(), site: seedSiteConfig(), settings: null }
  }
}

export async function readManaged(options?: { fresh?: boolean }): Promise<ManagedCache> {
  if (!options?.fresh && cache && Date.now() - cache.at < CACHE_MS) return cache
  const generation = cacheGeneration
  const value = await load()
  if (generation !== cacheGeneration && cache) return cache
  cache = value
  return value
}

export async function readRuntimeSite(options?: { fresh?: boolean }): Promise<PublicSiteConfig> {
  return (await readManaged(options)).site
}

/** Writes the site and the settings blob in one Redis SET. `settings: null` leaves settings off the document. */
export async function writeManaged(site: PublicSiteConfig, settings: unknown | null): Promise<void> {
  if (!isRedisConfigured()) throw new Error('Redis is not configured')
  const payload = settings == null ? site : { ...site, settings }
  await redisCommand(['SET', KEY, JSON.stringify(payload)])
  cacheGeneration += 1
  cache = { at: Date.now(), site, settings }
}

export async function writeRuntimeSite(config: PublicSiteConfig): Promise<void> {
  const settings = cache ? cache.settings : (await readManaged({ fresh: true })).settings
  await writeManaged(config, settings)
}

export async function runtimeLinkIds(): Promise<ReadonlySet<string>> {
  const site = await readRuntimeSite()
  return new Set(site.socials.map((link) => link.id))
}
