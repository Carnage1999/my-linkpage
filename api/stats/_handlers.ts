/**
 * Platform-agnostic request handlers for the stats API.
 *
 * Every handler uses the Web Standard API:
 *   (request: Request) => Promise<Response>
 *
 * This works natively on Vercel Edge, Cloudflare Workers/Pages,
 * Netlify Edge Functions, Deno Deploy, Bun, and Node.js 18+.
 *
 * Platform-specific entry points (e.g. api/stats/auth.ts for Vercel)
 * simply re-export these handlers.
 */

import { dateKey, isRedisConfigured, redisCommand, redisPipeline, todayKey } from './_redis'
import { createToken, isStatsEnabled, verifyPassword, verifyToken } from './_token'

// ─── Helpers ─────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─── GET /api/stats/check ────────────────────────────────

export async function handleCheck(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }
  return json({ enabled: isStatsEnabled() && isRedisConfigured() })
}

// ─── POST /api/stats/auth ────────────────────────────────

export async function handleAuth(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  if (!isStatsEnabled()) {
    return json({ error: 'Stats not enabled' }, 501)
  }

  let body: { password?: string }
  try {
    body = (await request.json()) as { password?: string }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { password } = body
  if (!password || typeof password !== 'string') {
    return json({ error: 'Missing password' }, 400)
  }
  if (!verifyPassword(password)) {
    return json({ error: 'Invalid password' }, 401)
  }

  return json({ token: await createToken() })
}

// ─── POST /api/stats/record ─────────────────────────────

export async function handleRecord(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  if (!isStatsEnabled() || !isRedisConfigured()) {
    return json({ error: 'Stats not enabled' }, 501)
  }

  let body: { linkId?: string }
  try {
    body = (await request.json()) as { linkId?: string }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { linkId } = body
  if (!linkId || typeof linkId !== 'string') {
    return json({ error: 'Missing linkId' }, 400)
  }

  // Sanitise: allow only safe characters, max 64 chars
  const safeId = linkId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  if (!safeId) {
    return json({ error: 'Invalid linkId' }, 400)
  }

  try {
    const daily = `link:clicks:daily:${todayKey()}`
    await redisPipeline([
      ['HINCRBY', 'link:clicks:total', safeId, '1'],
      ['HINCRBY', daily, safeId, '1'],
      ['EXPIRE', daily, String(90 * 86400)], // 90 days TTL
    ])
    return json({ ok: true })
  } catch (err) {
    console.error('Stats record error:', err)
    return json({ error: 'Internal error' }, 500)
  }
}

// ─── GET /api/stats/data ─────────────────────────────────

export async function handleData(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }
  if (!isStatsEnabled() || !isRedisConfigured()) {
    return json({ error: 'Stats not enabled' }, 501)
  }

  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return json({ error: 'Missing token' }, 401)
  }
  if (!(await verifyToken(auth.slice(7)))) {
    return json({ error: 'Invalid or expired token' }, 401)
  }

  try {
    const totalResult = await redisCommand(['HGETALL', 'link:clicks:total'])

    const days = 30
    const dailyCommands: string[][] = []
    for (let i = days - 1; i >= 0; i--) {
      dailyCommands.push(['HGETALL', `link:clicks:daily:${dateKey(i)}`])
    }
    const dailyResults = await redisPipeline(dailyCommands)

    // Parse totals — Upstash HGETALL returns flat array [key, val, key, val, …]
    const totals: Record<string, number> = {}
    const totalArr = totalResult.result as string[] | null
    if (totalArr && Array.isArray(totalArr)) {
      for (let i = 0; i < totalArr.length; i += 2) {
        totals[totalArr[i]] = Number(totalArr[i + 1])
      }
    }

    // Parse daily data
    const daily: Array<{ date: string; clicks: Record<string, number> }> = []
    for (let i = 0; i < days; i++) {
      const date = dateKey(days - 1 - i)
      const result = dailyResults[i]?.result as string[] | null
      const clicks: Record<string, number> = {}
      if (result && Array.isArray(result)) {
        for (let j = 0; j < result.length; j += 2) {
          clicks[result[j]] = Number(result[j + 1])
        }
      }
      daily.push({ date, clicks })
    }

    return json({ totals, daily })
  } catch (err) {
    console.error('Stats data error:', err)
    return json({ error: 'Internal error' }, 500)
  }
}
