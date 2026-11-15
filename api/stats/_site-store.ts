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

export interface ManagedDocument {
  raw: string | null
  site: PublicSiteConfig
  settings: unknown | null
}

/**
 * Read used by a save. A Redis or JSON failure throws, so a blip cannot look
 * like an empty database and overwrite the stored document with the seed.
 */
export async function readManagedStrict(): Promise<ManagedDocument> {
  if (!isRedisConfigured()) throw new Error('Redis is not configured')
  const response = await redisCommand(['GET', KEY])
  if (typeof response.result !== 'string' || !response.result) {
    return { raw: null, site: seedSiteConfig(), settings: null }
  }
  const parsed = JSON.parse(response.result) as { version?: number; settings?: unknown }
  return {
    raw: response.result,
    site: normalizeConfig(parsed, Number(parsed.version) || 1),
    settings: parsed.settings ?? null,
  }
}

/**
 * One EVAL: GET the document and SET the replacement only when the bytes
 * still match the copy the save read. Two saves that read the same version
 * cannot both write. The script runs GET plus SET (two commands), the same
 * count as the previous check-then-SET, and a lost race stops after GET.
 */
const COMPARE_AND_SET = `
local raw = redis.call('GET', KEYS[1])
local expected = ARGV[1]
if expected == '' then
  if raw and raw ~= '' then
    return 0
  end
else
  if raw ~= expected then
    return 0
  end
end
redis.call('SET', KEYS[1], ARGV[2])
return 1
`

/** Writes the site and settings in one compare-and-set. `settings: null` leaves settings off the document. */
export async function compareAndSetManaged(
  expectedRaw: string | null,
  site: PublicSiteConfig,
  settings: unknown | null,
): Promise<boolean> {
  if (!isRedisConfigured()) throw new Error('Redis is not configured')
  const payload = settings == null ? site : { ...site, settings }
  const response = await redisCommand([
    'EVAL',
    COMPARE_AND_SET,
    '1',
    KEY,
    expectedRaw ?? '',
    JSON.stringify(payload),
  ])
  if (Number(response.result) !== 1) return false
  cacheGeneration += 1
  cache = { at: Date.now(), site, settings }
  return true
}

export async function runtimeLinkIds(): Promise<ReadonlySet<string>> {
  const site = await readRuntimeSite()
  return new Set(site.socials.map((link) => link.id))
}
