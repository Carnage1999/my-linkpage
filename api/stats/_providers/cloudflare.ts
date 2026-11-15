/**
 * Cloudflare Web Analytics via the GraphQL Analytics API.
 * https://developers.cloudflare.com/web-analytics/
 * https://developers.cloudflare.com/analytics/graphql-api/
 * Dataset: rumPageloadEventsAdaptiveGroups. `count` is pageviews, `sum.visits` is visits.
 * The beacon snippet is the public site tag, not the API token:
 * https://developers.cloudflare.com/web-analytics/get-started/#sites-proxied-through-cloudflare
 */

import type { EffectiveSettings } from '../_settings'
import { loadEffective } from '../_settings'
import { emptyReport, topMetrics, type VisitorMetric, type VisitorReport, type VisitorTotals } from './types'

const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql'

const QUERY = `
query WebAnalytics($accountTag: String!, $siteTag: String!, $start: Time!, $end: Time!, $prevStart: Time!, $prevEnd: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      current: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { siteTag: $siteTag, datetime_geq: $start, datetime_lt: $end, bot: 0 }) {
        count
        sum { visits }
      }
      previous: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { siteTag: $siteTag, datetime_geq: $prevStart, datetime_lt: $prevEnd, bot: 0 }) {
        count
        sum { visits }
      }
      series: rumPageloadEventsAdaptiveGroups(limit: 100, filter: { siteTag: $siteTag, datetime_geq: $start, datetime_lt: $end, bot: 0 }, orderBy: [date_ASC]) {
        count
        dimensions { date }
      }
      referrers: rumPageloadEventsAdaptiveGroups(limit: 8, filter: { siteTag: $siteTag, datetime_geq: $start, datetime_lt: $end, bot: 0 }, orderBy: [count_DESC]) {
        count
        dimensions { refererHost }
      }
      countries: rumPageloadEventsAdaptiveGroups(limit: 8, filter: { siteTag: $siteTag, datetime_geq: $start, datetime_lt: $end, bot: 0 }, orderBy: [count_DESC]) {
        count
        dimensions { countryName }
      }
      devices: rumPageloadEventsAdaptiveGroups(limit: 8, filter: { siteTag: $siteTag, datetime_geq: $start, datetime_lt: $end, bot: 0 }, orderBy: [count_DESC]) {
        count
        dimensions { deviceType }
      }
      browsers: rumPageloadEventsAdaptiveGroups(limit: 8, filter: { siteTag: $siteTag, datetime_geq: $start, datetime_lt: $end, bot: 0 }, orderBy: [count_DESC]) {
        count
        dimensions { userAgentBrowser }
      }
      systems: rumPageloadEventsAdaptiveGroups(limit: 8, filter: { siteTag: $siteTag, datetime_geq: $start, datetime_lt: $end, bot: 0 }, orderBy: [count_DESC]) {
        count
        dimensions { userAgentOS }
      }
    }
  }
}`

interface Group {
  count?: number
  sum?: { visits?: number }
  dimensions?: Record<string, string | undefined>
}

interface Payload {
  errors?: Array<{ message?: string }>
  data?: { viewer?: { accounts?: Array<Record<string, Group[]>> } }
}

function stamp(ms: number): string {
  return new Date(ms).toISOString()
}

async function graphql(
  creds: { accountId: string; apiToken: string; siteTag: string },
  variables: Record<string, string>,
): Promise<Payload> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query: QUERY, variables: { accountTag: creds.accountId, siteTag: creds.siteTag, ...variables } }),
  })
  const body = (await response.json().catch(() => ({}))) as Payload
  if (!response.ok || (body.errors && body.errors.length > 0)) {
    throw new Error(body.errors?.[0]?.message || `Cloudflare request failed: ${response.status}`)
  }
  return body
}

function named(groups: Group[] | undefined, key: string): VisitorMetric[] {
  return topMetrics((groups ?? []).map((group) => ({ name: String(group.dimensions?.[key] ?? ''), count: Number(group.count ?? 0) })))
}

function totals(groups: Group[] | undefined): VisitorTotals {
  const row = groups?.[0]
  return {
    pageviews: Number(row?.count ?? 0),
    visitors: null,
    visits: Number(row?.sum?.visits ?? 0),
    bounceRate: null,
    avgDuration: null,
  }
}

export async function fetchCloudflareReport(
  input: { startAt: number; endAt: number; previousStartAt: number; previousEndAt: number; dates: readonly string[] },
  creds?: NonNullable<EffectiveSettings['cloudflare']> | null,
): Promise<VisitorReport> {
  const resolved = creds === undefined ? (await loadEffective()).cloudflare : creds
  if (!resolved) return emptyReport('cloudflare', false)
  const body = await graphql(resolved, {
    start: stamp(input.startAt),
    end: stamp(input.endAt),
    prevStart: stamp(input.previousStartAt),
    prevEnd: stamp(input.previousEndAt),
  })
  const account = body.data?.viewer?.accounts?.[0] ?? {}
  const byDate = new Map(
    (account.series ?? []).map((group) => [String(group.dimensions?.date ?? '').slice(0, 10), Number(group.count ?? 0)]),
  )
  return {
    provider: 'cloudflare',
    configured: true,
    totals: totals(account.current),
    previous: totals(account.previous),
    timeseries: input.dates.map((date) => ({ date, pageviews: byDate.get(date) ?? 0, visitors: null })),
    referrers: named(account.referrers, 'refererHost'),
    countries: named(account.countries, 'countryName'),
    devices: named(account.devices, 'deviceType'),
    browsers: named(account.browsers, 'userAgentBrowser'),
    os: named(account.systems, 'userAgentOS'),
    linkClicks: null,
  }
}

export async function testCloudflare(creds: NonNullable<EffectiveSettings['cloudflare']>): Promise<void> {
  const end = Date.now()
  await graphql(creds, {
    start: stamp(end - 3_600_000),
    end: stamp(end),
    prevStart: stamp(end - 7_200_000),
    prevEnd: stamp(end - 3_600_000),
  })
}
