/**
 * Platform-agnostic handlers for the admin dashboard API.
 * Vercel entry points re-export these functions.
 */

import { aggregateClicks, parseRedisHash } from './_aggregate'
import {
  isStatsRange,
  periodRange,
  recentDateKeys,
  RETENTION_DAYS,
  dateKeyInTimeZone,
} from './_dates'
import { json, requireStatsToken } from './_http'
import { acceptLinkId } from './_links'
import { runtimeLinkIds } from './_site-store'
import { resolveTimeZone } from './_settings'
import { createToken, isStatsEnabled, verifyPassword } from './_token'
import {
  bumpAuthLimit,
  hashClientIp,
  isRedisConfigured,
  readClickHashes,
  recordClick,
} from './_redis'

const PRIVATE_CACHE = 'private, max-age=30'
const CACHE_MS = 30_000
const AUTH_LIMIT = 8

const responseCache = new Map<string, { at: number; body: unknown }>()

export function __resetResponseCache(): void {
  responseCache.clear()
}

function readCache(key: string): unknown | undefined {
  const entry = responseCache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.at > CACHE_MS) {
    responseCache.delete(key)
    return undefined
  }
  return entry.body
}

function writeCache(key: string, body: unknown) {
  responseCache.set(key, { at: Date.now(), body })
}

function parseDays(request: Request): number {
  const days = Number(new URL(request.url).searchParams.get('days'))
  return isStatsRange(days) ? days : 30
}

export async function handleCheck(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  return json({ enabled: isStatsEnabled() && isRedisConfigured() })
}

export async function handleAuth(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!isStatsEnabled()) return json({ error: 'Stats not enabled' }, 501)

  if (isRedisConfigured()) {
    try {
      const attempts = await bumpAuthLimit(await hashClientIp(request))
      if (attempts > AUTH_LIMIT) return json({ error: 'Too many attempts' }, 429)
    } catch (error) {
      console.error('Auth rate limit error:', error)
      return json({ error: 'Rate limit unavailable' }, 503)
    }
  }

  let body: { password?: string }
  try {
    body = (await request.json()) as { password?: string }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { password } = body
  if (!password || typeof password !== 'string') return json({ error: 'Missing password' }, 400)
  if (!verifyPassword(password)) return json({ error: 'Invalid password' }, 401)
  return json({ token: await createToken() })
}

export async function handleRecord(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!isStatsEnabled() || !isRedisConfigured()) return json({ error: 'Stats not enabled' }, 501)

  let body: { linkId?: unknown }
  try {
    body = (await request.json()) as { linkId?: unknown }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const linkId = acceptLinkId(body.linkId, await runtimeLinkIds())
  if (!linkId) return json({ error: 'Invalid linkId' }, 400)

  try {
    const timeZone = await resolveTimeZone()
    const now = new Date()
    const outcome = await recordClick({
      ipHash: await hashClientIp(request),
      linkId,
      today: dateKeyInTimeZone(now, timeZone),
      oldest: recentDateKeys(now, RETENTION_DAYS, timeZone)[0],
    })
    if (outcome === 'limited') return json({ error: 'Too many clicks' }, 429)
    return json({ ok: true })
  } catch (error) {
    console.error('Stats record error:', error)
    return json({ error: 'Internal error' }, 500)
  }
}

export async function handleData(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  if (!isStatsEnabled() || !isRedisConfigured()) return json({ error: 'Stats not enabled' }, 501)

  const denied = await requireStatsToken(request)
  if (denied) return denied

  const days = parseDays(request)
  const timeZone = await resolveTimeZone()
  const cacheKey = `data:${timeZone}:${days}`
  const cached = readCache(cacheKey)
  if (cached) return json(cached, 200, PRIVATE_CACHE)

  try {
    const now = new Date()
    const range = periodRange(now, days, timeZone)
    const hashes = await readClickHashes()
    const report = aggregateClicks({
      totals: parseRedisHash(hashes.totals),
      dayFields: parseRedisHash(hashes.days),
      currentDates: range.currentDates,
      previousDates: range.previousDates,
      configuredIds: [...(await runtimeLinkIds())],
    })
    const body = { timezone: timeZone, days, ...report }
    writeCache(cacheKey, body)
    return json(body, 200, PRIVATE_CACHE)
  } catch (error) {
    console.error('Stats data error:', error)
    return json({ error: 'Internal error' }, 500)
  }
}
