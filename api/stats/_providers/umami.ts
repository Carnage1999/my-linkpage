/**
 * Umami stats.
 * https://docs.umami.is/docs/api
 * Cloud: `x-umami-api-key` against https://api.umami.is/v1
 * Self-hosted login: POST /api/auth/login → { token }, then Authorization: Bearer.
 * The tracker script is https://cloud.umami.is/script.js, not the API host.
 */

import type { UmamiCredentials } from '../_settings'
import { loadEffective } from '../_settings'
import {
  emptyReport,
  topMetrics,
  type VisitorMetric,
  type VisitorReport,
  type VisitorTotals,
} from './types'

const LINK_EVENT = 'Link Click'

let cachedToken: { value: string; expiresAt: number } | null = null
let loginPromise: Promise<string> | null = null

export function __resetUmamiAuth(): void {
  cachedToken = null
  loginPromise = null
}

function asNumber(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function ratio(part: number, whole: number): number | null {
  if (whole <= 0) return null
  return part / whole
}

export function toTotals(raw: unknown): VisitorTotals & { bounces: number; totaltime: number } {
  const source = (raw ?? {}) as Record<string, unknown>
  const visits = asNumber(source.visits)
  const bounces = asNumber(source.bounces)
  const totaltime = asNumber(source.totaltime)
  return {
    pageviews: asNumber(source.pageviews),
    visitors: asNumber(source.visitors),
    visits,
    bounceRate: ratio(bounces, visits),
    avgDuration: ratio(totaltime, visits),
    bounces,
    totaltime,
  }
}

export function toMetrics(raw: unknown): VisitorMetric[] {
  if (!Array.isArray(raw)) return []
  return topMetrics(
    raw.map((entry) => {
      const row = entry as Record<string, unknown>
      return {
        name: String(row.x ?? row.name ?? row.value ?? ''),
        count: asNumber(row.y ?? row.count ?? row.total),
      }
    }),
  )
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
    if (String(row.x ?? '').startsWith(date)) return asNumber(row.y)
  }
  return 0
}

async function login(target: UmamiCredentials): Promise<string> {
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

async function authHeaders(target: UmamiCredentials, forceLogin = false): Promise<Headers> {
  if (target.mode === 'key') {
    return new Headers({ Accept: 'application/json', 'x-umami-api-key': target.apiKey ?? '' })
  }
  if (forceLogin) cachedToken = null
  const token = await login(target)
  return new Headers({ Accept: 'application/json', Authorization: `Bearer ${token}` })
}

async function umamiGet(target: UmamiCredentials, path: string): Promise<unknown> {
  const request = async (forceLogin: boolean) =>
    fetch(`${target.base}${path}`, { headers: await authHeaders(target, forceLogin) })
  let response = await request(false)
  if (response.status === 401 && target.mode === 'login') response = await request(true)
  if (!response.ok) throw new Error(`Umami request failed: ${response.status}`)
  return response.json()
}

function query(params: Record<string, string | number>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) search.set(key, String(value))
  return search.toString()
}

export async function fetchUmamiReport(
  input: { startAt: number; endAt: number; timeZone: string; dates: readonly string[] },
  target?: UmamiCredentials | null,
): Promise<VisitorReport> {
  const resolved = target === undefined ? (await loadEffective()).umami : target
  if (!resolved) return emptyReport('umami', false)
  const range = query({ startAt: input.startAt, endAt: input.endAt, unit: 'day', timezone: input.timeZone })
  const website = `/websites/${encodeURIComponent(resolved.websiteId)}`
  const [statsRaw, referrers, countries, devices, browsers, os, values, series] = await Promise.all([
    umamiGet(resolved, `${website}/stats?${range}`),
    umamiGet(resolved, `${website}/metrics?${range}&${query({ type: 'referrer' })}`),
    umamiGet(resolved, `${website}/metrics?${range}&${query({ type: 'country' })}`),
    umamiGet(resolved, `${website}/metrics?${range}&${query({ type: 'device' })}`),
    umamiGet(resolved, `${website}/metrics?${range}&${query({ type: 'browser' })}`),
    umamiGet(resolved, `${website}/metrics?${range}&${query({ type: 'os' })}`),
    umamiGet(resolved, `${website}/event-data/values?${range}&${query({ event: LINK_EVENT, propertyName: 'id' })}`),
    umamiGet(resolved, `${website}/pageviews?${range}`).catch(() => null),
  ])
  const stats = (statsRaw ?? {}) as { comparison?: unknown }
  const current = toTotals(stats)
  const previous = stats.comparison ? toTotals(stats.comparison) : null
  const body = (series ?? {}) as { pageviews?: unknown; sessions?: unknown }
  return {
    provider: 'umami',
    configured: true,
    totals: current,
    previous,
    timeseries: input.dates.map((date) => ({
      date,
      pageviews: seriesValue(body.pageviews, date),
      visitors: seriesValue(body.sessions, date),
    })),
    referrers: toMetrics(referrers),
    countries: toMetrics(countries),
    devices: toMetrics(devices),
    browsers: toMetrics(browsers),
    os: toMetrics(os),
    linkClicks: toLinkClicks(values),
  }
}

export async function testUmami(target: UmamiCredentials): Promise<void> {
  const now = Date.now()
  await umamiGet(target, `/websites/${encodeURIComponent(target.websiteId)}/stats?${query({ startAt: now - 3_600_000, endAt: now })}`)
}
