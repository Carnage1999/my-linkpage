/**
 * DIY visitor aggregates in Upstash Redis.
 * https://upstash.com/docs/redis/features/restapi
 * Daily hashes `pv:YYYY-MM-DD` store counts only: views, referrer host, country, device, browser, OS.
 * Unique visitors are not stored.
 */

import { parseRedisHash } from '../_aggregate'
import { readPageviewDays } from '../_redis'
import { isRedisConfigured } from '../_redis'
import { emptyReport, topMetrics, type VisitorMetric, type VisitorReport } from './types'

function sumField(rows: Array<Record<string, number>>, prefix: string): VisitorMetric[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const [field, value] of Object.entries(row)) {
      if (!field.startsWith(prefix)) continue
      const name = field.slice(prefix.length)
      counts.set(name, (counts.get(name) ?? 0) + value)
    }
  }
  return topMetrics([...counts].map(([name, count]) => ({ name, count })))
}

function views(row: Record<string, number> | undefined): number {
  return row?.views ?? 0
}

export async function fetchUpstashReport(input: {
  dates: readonly string[]
  previousDates: readonly string[]
}): Promise<VisitorReport> {
  if (!isRedisConfigured()) return emptyReport('upstash', false)
  const currentRaw = await readPageviewDays(input.dates)
  const previousRaw = await readPageviewDays(input.previousDates)
  const current = currentRaw.map((row) => parseRedisHash(row))
  const previous = previousRaw.map((row) => parseRedisHash(row))
  const pageviews = current.reduce((sum, row) => sum + views(row), 0)
  const previousViews = previous.reduce((sum, row) => sum + views(row), 0)
  return {
    provider: 'upstash',
    configured: true,
    totals: { pageviews, visitors: null, visits: null, bounceRate: null, avgDuration: null },
    previous: { pageviews: previousViews, visitors: null, visits: null, bounceRate: null, avgDuration: null },
    timeseries: input.dates.map((date, index) => ({ date, pageviews: views(current[index]), visitors: null })),
    referrers: sumField(current, 'ref:'),
    countries: sumField(current, 'cc:'),
    devices: sumField(current, 'dev:'),
    browsers: sumField(current, 'br:'),
    os: sumField(current, 'os:'),
    linkClicks: null,
  }
}
