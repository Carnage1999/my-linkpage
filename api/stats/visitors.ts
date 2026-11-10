/**
 * GET /api/stats/visitors?provider=&days=
 * Authenticated. Never returns third-party credentials.
 */

import { isStatsRange, periodRange, startOfDateKey } from './_dates'
import { json, requireStatsToken } from './_http'
import { fetchVisitorReport } from './_providers'
import { isVisitorProvider, type VisitorQuery } from './_providers/types'
import { resolveTimeZone } from './_settings'
import { isStatsEnabled } from './_token'

export const config = { runtime: 'edge' }

const cache = new Map<string, { at: number; body: unknown }>()

export function __resetVisitorCache(): void {
  cache.clear()
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  if (!isStatsEnabled()) return json({ error: 'Stats not enabled' }, 501)

  const denied = await requireStatsToken(request)
  if (denied) return denied

  const params = new URL(request.url).searchParams
  const provider = params.get('provider') ?? ''
  if (!isVisitorProvider(provider)) return json({ error: 'Unknown provider' }, 400)
  const daysValue = Number(params.get('days'))
  const days = isStatsRange(daysValue) ? daysValue : 30
  const timeZone = await resolveTimeZone()
  const key = `${provider}:${timeZone}:${days}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < 60_000) return json(hit.body, 200, 'private, max-age=60')

  try {
    const range = periodRange(new Date(), days, timeZone)
    const query: VisitorQuery = {
      startAt: range.startAt,
      endAt: range.endAt,
      previousStartAt: startOfDateKey(range.previousDates[0], timeZone),
      previousEndAt: range.startAt,
      timeZone,
      dates: range.currentDates,
      previousDates: range.previousDates,
    }
    const report = await fetchVisitorReport(provider, query)
    if (report.configured && !report.unavailable) cache.set(key, { at: Date.now(), body: report })
    return json(report, 200, 'private, max-age=60')
  } catch (error) {
    console.error('Visitor report error:', error)
    return json({ provider, configured: true, unavailable: true, totals: null, previous: null, timeseries: [], referrers: [], countries: [], devices: [], browsers: [], os: [], linkClicks: null }, 200, 'private, max-age=5')
  }
}
