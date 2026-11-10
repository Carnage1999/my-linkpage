/**
 * GoatCounter API v0.
 * https://www.goatcounter.com/help/api
 * https://www.goatcounter.com/api.json
 * Auth: Authorization: Bearer. Rate limit 4 requests/second.
 * `total` on /stats/total is visitors (including events), not a separate pageview count.
 * There is no device-type stats page, so devices stays empty.
 * Script: https://www.goatcounter.com/help/js
 */

import type { EffectiveSettings } from '../_settings'
import { loadEffective } from '../_settings'
import { emptyReport, topMetrics, type VisitorMetric, type VisitorReport } from './types'

interface HitStat {
  count?: number
  event?: boolean
  path?: string
  path_id?: number
  title?: string
  daily?: number
  day?: string
}

function hourStamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 13) + ':00:00Z'
}

async function goatGet(site: string, apiKey: string, path: string): Promise<unknown> {
  const response = await fetch(`https://${site}.goatcounter.com/api/v0${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
  const body = (await response.json().catch(() => ({}))) as { error?: string; errors?: Record<string, unknown> }
  if (!response.ok || body.error || body.errors) {
    throw new Error(body.error || `GoatCounter request failed: ${response.status}`)
  }
  return body
}

function metricsFrom(raw: unknown): VisitorMetric[] {
  const stats = ((raw ?? {}) as { stats?: HitStat[] }).stats ?? []
  return topMetrics(stats.map((row) => ({ name: String(row.path ?? row.title ?? ''), count: Number(row.count ?? 0) })))
}

export async function fetchGoatcounterReport(
  input: { startAt: number; endAt: number; previousStartAt: number; previousEndAt: number; dates: readonly string[] },
  creds?: { site: string; apiKey: string } | null,
): Promise<VisitorReport> {
  const resolved = creds === undefined ? (await loadEffective()).goatcounter : creds
  if (!resolved) return emptyReport('goatcounter', false)
  const start = hourStamp(input.startAt)
  const end = hourStamp(input.endAt)
  const range = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  const get = (path: string) => goatGet(resolved.site, resolved.apiKey, path)

  const total = (await get(`/stats/total?${range}`)) as { total?: number; stats?: Array<{ day?: string; daily?: number }> }
  const hits = (await get(`/stats/hits?${range}&limit=50`)) as { hits?: HitStat[] }
  const browsers = await get(`/stats/browsers?${range}`).catch(() => ({ stats: [] }))
  const systems = await get(`/stats/systems?${range}`).catch(() => ({ stats: [] }))
  const locations = await get(`/stats/locations?${range}`).catch(() => ({ stats: [] }))
  const previous = (await get(
    `/stats/total?start=${encodeURIComponent(hourStamp(input.previousStartAt))}&end=${encodeURIComponent(hourStamp(input.previousEndAt))}`,
  ).catch(() => null)) as { total?: number } | null

  const events = (hits.hits ?? []).filter((hit) => hit.event)
  const linkClicks: Record<string, number> = {}
  for (const hit of events) {
    const path = hit.path ?? ''
    if (!path.startsWith('link:')) continue
    linkClicks[path.slice(5)] = Number(hit.count ?? 0)
  }

  const page = (hits.hits ?? []).find((hit) => !hit.event)
  let referrers: VisitorMetric[] = []
  if (page?.path_id) {
    const refs = (await get(`/stats/hits/${page.path_id}?${range}`).catch(() => null)) as {
      refs?: Array<{ name?: string; count?: number }>
    } | null
    referrers = topMetrics((refs?.refs ?? []).map((ref) => ({ name: String(ref.name ?? ''), count: Number(ref.count ?? 0) })))
  }

  const byDay = new Map((total.stats ?? []).map((row) => [String(row.day ?? '').slice(0, 10), Number(row.daily ?? 0)]))
  const visitors = Number(total.total ?? 0)

  return {
    provider: 'goatcounter',
    configured: true,
    totals: { pageviews: null, visitors, visits: null, bounceRate: null, avgDuration: null },
    previous: previous
      ? { pageviews: null, visitors: Number(previous.total ?? 0), visits: null, bounceRate: null, avgDuration: null }
      : null,
    timeseries: input.dates.map((date) => ({ date, pageviews: byDay.get(date) ?? 0, visitors: byDay.get(date) ?? 0 })),
    referrers,
    countries: metricsFrom(locations),
    devices: [],
    browsers: metricsFrom(browsers),
    os: metricsFrom(systems),
    linkClicks,
  }
}

export async function testGoatcounter(site: string, apiKey: string): Promise<void> {
  await goatGet(site, apiKey, '/me')
}

export type { EffectiveSettings }
