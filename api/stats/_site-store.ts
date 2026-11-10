/**
 * Public site content stored as one JSON document in Upstash.
 * public/siteConfig.json is the seed when Redis is empty or unreachable.
 */

import seedFile from '../../public/siteConfig.json'
import { isRedisConfigured, redisCommand } from './_redis'
import { SiteValidationError, validateSiteConfig, type PublicSiteConfig } from './_site-schema'

const KEY = 'site:config'
const CACHE_MS = 60_000

let cache: { at: number; value: PublicSiteConfig } | null = null

export function __resetSiteCache(): void {
  cache = null
}

export function seedSiteConfig(): PublicSiteConfig {
  return validateSiteConfig(seedFile, 0)
}

async function load(): Promise<PublicSiteConfig> {
  if (!isRedisConfigured()) return seedSiteConfig()
  try {
    const response = await redisCommand(['GET', KEY])
    if (typeof response.result !== 'string' || !response.result) return seedSiteConfig()
    const parsed = JSON.parse(response.result) as { version?: number }
    return validateSiteConfig(parsed, Number(parsed.version) || 1)
  } catch (error) {
    if (error instanceof SiteValidationError) return seedSiteConfig()
    return seedSiteConfig()
  }
}

export async function readRuntimeSite(): Promise<PublicSiteConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value
  const value = await load()
  cache = { at: Date.now(), value }
  return value
}

export async function writeRuntimeSite(config: PublicSiteConfig): Promise<void> {
  if (!isRedisConfigured()) throw new Error('Redis is not configured')
  await redisCommand(['SET', KEY, JSON.stringify(config)])
  cache = { at: Date.now(), value: config }
}

export async function runtimeLinkIds(): Promise<ReadonlySet<string>> {
  const site = await readRuntimeSite()
  return new Set(site.socials.map((link) => link.id))
}
