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
import { acceptLinkId, configuredLinkIds, statsTimeZone } from './_links'
import { fetchUmamiReport } from './_umami'
import { createToken, isStatsEnabled, verifyPassword, verifyToken } from './_token'
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

function json(data: unknown, status = 200, cacheControl?: string): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cacheControl) headers['Cache-Control'] = cacheControl
  return new Response(JSON.stringify(data), { status, headers })
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

async function requireToken(request: Request): Promise<Response | null> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Missing token' }, 401)
  if (!(await verifyToken(auth.slice(7)))) {
    return json({ error: 'Invalid or expired token' }, 401)
  }
  return null
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

  const linkId = acceptLinkId(body.linkId, configuredLinkIds())
  if (!linkId) return json({ error: 'Invalid linkId' }, 400)

  try {
    const timeZone = statsTimeZone()
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

  const denied = await requireToken(request)
  if (denied) return denied

  const days = parseDays(request)
  const timeZone = statsTimeZone()
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
      configuredIds: [...configuredLinkIds()],
    })
    const body = { timezone: timeZone, days, ...report }
    writeCache(cacheKey, body)
    return json(body, 200, PRIVATE_CACHE)
  } catch (error) {
    console.error('Stats data error:', error)
    return json({ error: 'Internal error' }, 500)
  }
}

export async function handleUmami(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  if (!isStatsEnabled()) return json({ error: 'Stats not enabled' }, 501)

  const denied = await requireToken(request)
  if (denied) return denied

  const days = parseDays(request)
  const timeZone = statsTimeZone()
  const cacheKey = `umami:${timeZone}:${days}`
  const cached = readCache(cacheKey)
  if (cached) return json(cached, 200, PRIVATE_CACHE)

  try {
    const range = periodRange(new Date(), days, timeZone)
    const report = await fetchUmamiReport({
      startAt: range.startAt,
      endAt: range.endAt,
      timeZone,
      dates: range.currentDates,
    })
    if (report.configured && !report.unavailable) writeCache(cacheKey, report)
    return json(report, 200, PRIVATE_CACHE)
  } catch (error) {
    console.error('Umami stats error:', error)
    return json({ configured: true, unavailable: true }, 200, 'private, max-age=5')
  }
}
