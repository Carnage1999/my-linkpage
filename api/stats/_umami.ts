/**
 * Server-side Umami client.
 *
 * Cloud:  UMAMI_API_KEY as `x-umami-api-key` against https://api.umami.is/v1
 *          (or UMAMI_API_URL when it is set).
 * Self-hosted API key: same header, UMAMI_API_URL such as https://umami.example.com
 * Self-hosted login: UMAMI_USERNAME + UMAMI_PASSWORD. The bearer token stays
 * in this isolate and is never sent to the browser.
 *
 * UMAMI_WEBSITE_ID overrides the public siteConfig website id.
 */

import { configuredUmamiWebsiteId } from './_links'

export interface UmamiMetric {
  name: string
  count: number
}

export interface UmamiTotals {
  pageviews: number
  visitors: number
  visits: number
  bounces: number
  totaltime: number
  bounceRate: number | null
  avgDuration: number | null
}

export interface UmamiReport {
  configured: boolean
  unavailable?: boolean
  pageviews?: number
  visitors?: number
  visits?: number
  bounces?: number
  totaltime?: number
  bounceRate?: number | null
  avgDuration?: number | null
  previous?: UmamiTotals | null
  referrers?: UmamiMetric[]
  countries?: UmamiMetric[]
  devices?: UmamiMetric[]
  browsers?: UmamiMetric[]
  linkClicks?: Record<string, number>
  pageviewsSeries?: Array<{ date: string; pageviews: number; visitors: number }>
}

interface UmamiTarget {
  base: string
  websiteId: string
  mode: 'key' | 'login'
  apiKey?: string
  username?: string
  password?: string
}

const LINK_EVENT = 'Link Click'

let cachedToken: { value: string; expiresAt: number } | null = null
let loginPromise: Promise<string> | null = null

export function __resetUmamiAuth(): void {
  cachedToken = null
  loginPromise = null
}

export function umamiTarget(): UmamiTarget | null {
  const websiteId = process.env.UMAMI_WEBSITE_ID?.trim() || configuredUmamiWebsiteId()
  const apiKey = process.env.UMAMI_API_KEY?.trim()
  const username = process.env.UMAMI_USERNAME?.trim()
  const password = process.env.UMAMI_PASSWORD
  if (!websiteId) return null
  if (!apiKey && !(username && password)) return null

  const configured = process.env.UMAMI_API_URL?.trim().replace(/\/$/, '')
  if (apiKey) {
    return {
      base: apiBase(configured, 'key'),
      websiteId,
      mode: 'key',
      apiKey,
    }
  }

  return {
    base: apiBase(configured, 'login'),
    websiteId,
    mode: 'login',
    username,
    password,
  }
}

function apiBase(configured: string | undefined, mode: 'key' | 'login'): string {
  if (mode === 'login') {
    const origin = configured ?? ''
    if (!origin) throw new Error('UMAMI_API_URL is required for username login')
    return origin.endsWith('/api') ? origin : `${origin}/api`
  }

  const origin = configured || 'https://api.umami.is'
  if (origin.endsWith('/v1') || origin.endsWith('/api')) return origin
  if (origin.includes('api.umami.is')) return `${origin}/v1`
  return `${origin}/api`
}

async function login(target: UmamiTarget): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value
  if (!loginPromise) {
    loginPromise = (async () => {
      const response = await fetch(`${target.base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: target.username, password: target.password }),
      })
      if (!response.ok) throw new Error(`Umami login failed: ${response.status}`)
      const body = (await response.json()) as { token?: string }
      if (!body.token) throw new Error('Umami login did not return a token')
      cachedToken = { value: body.token, expiresAt: Date.now() + 50 * 60 * 1000 }
      return body.token
    })().finally(() => {
      loginPromise = null
    })
  }
  return loginPromise
}

async function authHeaders(target: UmamiTarget, forceLogin = false): Promise<Headers> {
  if (target.mode === 'key') {
    return new Headers({
      Accept: 'application/json',
      'x-umami-api-key': target.apiKey ?? '',
    })
  }
  if (forceLogin) cachedToken = null
  const token = await login(target)
  return new Headers({
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  })
}

async function umamiGet(target: UmamiTarget, path: string): Promise<unknown> {
  const request = async (forceLogin: boolean) => {
    const headers = await authHeaders(target, forceLogin)
    return fetch(`${target.base}${path}`, { headers })
  }

  let response = await request(false)
  if (response.status === 401 && target.mode === 'login') {
    response = await request(true)
  }
  if (!response.ok) throw new Error(`Umami request failed: ${response.status}`)
  return response.json()
}

function query(params: Record<string, string | number>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value))
  }
  return search.toString()
}

function asNumber(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function ratio(part: number, whole: number): number | null {
  if (whole <= 0) return null
  return part / whole
}

export function toTotals(raw: unknown): UmamiTotals {
  const source = (raw ?? {}) as Record<string, unknown>
  const visits = asNumber(source.visits)
  const bounces = asNumber(source.bounces)
  const totaltime = asNumber(source.totaltime)
  return {
    pageviews: asNumber(source.pageviews),
    visitors: asNumber(source.visitors),
    visits,
    bounces,
    totaltime,
    bounceRate: ratio(bounces, visits),
    avgDuration: ratio(totaltime, visits),
  }
}

export function toMetrics(raw: unknown): UmamiMetric[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      const row = entry as Record<string, unknown>
      const name = String(row.x ?? row.name ?? row.value ?? '')
      const count = asNumber(row.y ?? row.count ?? row.total)
      return { name, count }
    })
    .filter((entry) => entry.name.length > 0)
    .slice(0, 8)
}

export function toLinkClicks(raw: unknown): Record<string, number> {
  const clicks: Record<string, number> = {}
  if (!Array.isArray(raw)) return clicks
  for (const entry of raw) {
    const row = entry as Record<string, unknown>
    const id = String(row.value ?? row.x ?? row.name ?? '')
    const count = asNumber(row.total ?? row.y ?? row.count)
    if (id) clicks[id] = count
  }
  return clicks
}

function seriesValue(raw: unknown, date: string): number {
  if (!Array.isArray(raw)) return 0
  for (const entry of raw) {
    const row = entry as Record<string, unknown>
    const label = String(row.x ?? '')
    if (label.startsWith(date)) return asNumber(row.y)
  }
  return 0
}

export function toPageviewSeries(
  raw: unknown,
  dates: readonly string[],
): Array<{ date: string; pageviews: number; visitors: number }> {
  const body = (raw ?? {}) as { pageviews?: unknown; sessions?: unknown }
  return dates.map((date) => ({
    date,
    pageviews: seriesValue(body.pageviews, date),
    visitors: seriesValue(body.sessions, date),
  }))
}

export async function fetchUmamiReport(input: {
  startAt: number
  endAt: number
  timeZone: string
  dates: readonly string[]
}): Promise<UmamiReport> {
  const target = umamiTarget()
  if (!target) return { configured: false }

  const range = query({
    startAt: input.startAt,
    endAt: input.endAt,
    unit: 'day',
    timezone: input.timeZone,
  })
  const website = `/websites/${encodeURIComponent(target.websiteId)}`

  const [statsRaw, referrers, countries, devices, browsers, values, series] =
    await Promise.all([
      umamiGet(target, `${website}/stats?${range}`),
      umamiGet(target, `${website}/metrics?${range}&${query({ type: 'referrer' })}`),
      umamiGet(target, `${website}/metrics?${range}&${query({ type: 'country' })}`),
      umamiGet(target, `${website}/metrics?${range}&${query({ type: 'device' })}`),
      umamiGet(target, `${website}/metrics?${range}&${query({ type: 'browser' })}`),
      umamiGet(
        target,
        `${website}/event-data/values?${range}&${query({
          event: LINK_EVENT,
          propertyName: 'id',
        })}`,
      ),
      umamiGet(target, `${website}/pageviews?${range}`).catch(() => null),
    ])

  const stats = (statsRaw ?? {}) as { comparison?: unknown }
  const current = toTotals(stats)
  const previous = stats.comparison ? toTotals(stats.comparison) : null

  return {
    configured: true,
    ...current,
    previous,
    referrers: toMetrics(referrers),
    countries: toMetrics(countries),
    devices: toMetrics(devices),
    browsers: toMetrics(browsers),
    linkClicks: toLinkClicks(values),
    pageviewsSeries: series ? toPageviewSeries(series, input.dates) : [],
  }
}
