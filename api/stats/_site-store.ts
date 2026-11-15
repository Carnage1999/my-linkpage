/**
 * Public site content stored as one JSON document in Upstash.
 * public/siteConfig.json is the seed when Redis is empty or unreachable.
 */

import seedFile from '../../public/siteConfig.json'
import { PreviewWriteBlocked, redisKey } from './_keys'
import { isRedisConfigured, redisCommand } from './_redis'
import { normalizeConfig, SiteValidationError, type PublicSiteConfig } from './_site-schema'

function siteKey(): string {
  return redisKey('site:config')
}
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
    const response = await redisCommand(['GET', siteKey()])
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

export type PublicRead =
  | { kind: 'ready'; site: PublicSiteConfig; settings: unknown | null }
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'unavailable' }
  | { kind: 'limited' }

/** One document read per CDN miss, plus the rate-limit counter. 60/minute/IP. */
const PUBLIC_LIMIT = 60

/**
 * INCR the per-IP counter, then GET the document only when the caller is
 * still under the limit. Keys arrive as KEYS[]; the script builds none.
 */
export const PUBLIC_READ = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
if tonumber(n) > tonumber(ARGV[2]) then
  return {0, ''}
end
local raw = redis.call('GET', KEYS[2])
if not raw then
  return {1, ''}
end
return {1, raw}
`

/**
 * The public CDN miss. One EVAL, so scripts are derived from this document
 * instead of a second settings read. Nothing is stored in the isolate: a
 * save purges the CDN and the next miss reads Redis.
 */
export async function readPublicDocument(ipHash: string): Promise<PublicRead> {
  if (!isRedisConfigured()) return { kind: 'empty' }
  try {
    const response = await redisCommand([
      'EVAL',
      PUBLIC_READ,
      '2',
      redisKey(`rl:pub:${ipHash}`),
      siteKey(),
      '60',
      String(PUBLIC_LIMIT),
    ])
    const pair = Array.isArray(response.result) ? response.result : null
    if (!pair) return { kind: 'unavailable' }
    if (Number(pair[0]) !== 1) return { kind: 'limited' }
    const raw = pair[1]
    if (typeof raw !== 'string' || raw === '') return { kind: 'empty' }
    return classifyPublic(raw)
  } catch (error) {
    if (error instanceof PreviewWriteBlocked) return { kind: 'unavailable' }
    return { kind: 'unavailable' }
  }
}

function classifyPublic(raw: string): PublicRead {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'invalid' }
  }
  try {
    const record = parsed as { version?: unknown; settings?: unknown }
    const version = typeof record.version === 'number' ? record.version : 1
    return { kind: 'ready', site: normalizeConfig(parsed, version), settings: record.settings ?? null }
  } catch (error) {
    if (error instanceof SiteValidationError) return { kind: 'invalid' }
    return { kind: 'unavailable' }
  }
}

/** Bytes of the stored document. Throws only when Redis itself fails. */
export async function readManagedRaw(): Promise<string | null> {
  if (!isRedisConfigured()) throw new Error('Redis is not configured')
  const response = await redisCommand(['GET', siteKey()])
  if (typeof response.result !== 'string' || !response.result) return null
  return response.result
}

/** Compare-and-set the raw JSON. The caller does not need the old document to parse. */
export async function replaceManagedRaw(expectedRaw: string | null, nextRaw: string): Promise<boolean> {
  if (!isRedisConfigured()) throw new Error('Redis is not configured')
  const response = await redisCommand(['EVAL', COMPARE_AND_SET, '1', siteKey(), expectedRaw ?? '', nextRaw])
  if (Number(response.result) !== 1) return false
  cacheGeneration += 1
  cache = null
  return true
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
  const raw = await readManagedRaw()
  if (raw == null) return { raw: null, site: seedSiteConfig(), settings: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new SiteValidationError('Stored site config is not valid JSON')
  }
  try {
    const record = parsed as { version?: unknown; settings?: unknown }
    return {
      raw,
      site: normalizeConfig(parsed, typeof record.version === 'number' ? record.version : 1),
      settings: record.settings ?? null,
    }
  } catch (error) {
    if (error instanceof SiteValidationError) throw error
    throw new SiteValidationError('Stored site config is invalid')
  }
}

/**
 * One EVAL: GET the document and SET the replacement only when the bytes
 * still match the copy the save read. Two saves that read the same version
 * cannot both write. The script runs GET plus SET (two commands), the same
 * count as the previous check-then-SET, and a lost race stops after GET.
 */
export const COMPARE_AND_SET = `
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
    siteKey(),
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
