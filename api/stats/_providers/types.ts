/**
 * Normalized visitor report shared by every provider.
 * Providers that cannot supply a field leave it null or [].
 */

export const VISITOR_PROVIDERS = ['upstash', 'goatcounter', 'cloudflare', 'umami'] as const
export type VisitorProviderId = (typeof VISITOR_PROVIDERS)[number]

export function isVisitorProvider(value: string): value is VisitorProviderId {
  return (VISITOR_PROVIDERS as readonly string[]).includes(value)
}

export interface VisitorMetric {
  name: string
  count: number
}

export interface VisitorTotals {
  pageviews: number | null
  visitors: number | null
  visits: number | null
  bounceRate: number | null
  avgDuration: number | null
}

export interface VisitorPoint {
  date: string
  pageviews: number
  visitors: number | null
}

export interface VisitorReport {
  provider: VisitorProviderId
  configured: boolean
  unavailable?: boolean
  totals: VisitorTotals | null
  previous: VisitorTotals | null
  timeseries: VisitorPoint[]
  referrers: VisitorMetric[]
  countries: VisitorMetric[]
  devices: VisitorMetric[]
  browsers: VisitorMetric[]
  os: VisitorMetric[]
  /** Per-link event counts when the provider can report them. */
  linkClicks: Record<string, number> | null
}

export interface VisitorQuery {
  startAt: number
  endAt: number
  previousStartAt: number
  previousEndAt: number
  timeZone: string
  dates: readonly string[]
  previousDates: readonly string[]
}

export function emptyReport(provider: VisitorProviderId, configured: boolean): VisitorReport {
  return {
    provider,
    configured,
    totals: null,
    previous: null,
    timeseries: [],
    referrers: [],
    countries: [],
    devices: [],
    browsers: [],
    os: [],
    linkClicks: null,
  }
}

export function topMetrics(rows: VisitorMetric[], limit = 8): VisitorMetric[] {
  return [...rows]
    .filter((row) => row.name.length > 0 && row.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}
