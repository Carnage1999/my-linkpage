/**
 * POST /api/stats/pageview
 * One homepage pageview. Stores aggregates only. The raw User-Agent and IP are discarded.
 * Country: x-vercel-ip-country, then cf-ipcountry.
 * https://vercel.com/docs/headers/request-headers
 * https://developers.cloudflare.com/fundamentals/reference/http-headers/
 */

import { dateKeyInTimeZone } from './_dates'
import { json } from './_http'
import { countryFromRequest, referrerHostname } from './_referrer'
import { hashClientIp, isRedisConfigured, recordPageview } from './_redis'
import { readRuntimeSite } from './_site-store'
import { resolveTimeZone } from './_settings'
import { isStatsEnabled } from './_token'
import { parseUserAgent } from './_ua'

export const config = { runtime: 'edge' }

const FIELD = /^[a-z0-9_.:-]{1,80}$/i

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!isStatsEnabled() || !isRedisConfigured()) return json({ error: 'Stats not enabled' }, 501)

  let referrer = ''
  try {
    const body = (await request.json()) as { referrer?: unknown }
    if (typeof body.referrer === 'string') referrer = body.referrer.slice(0, 500)
  } catch {
    referrer = ''
  }

  try {
    const site = await readRuntimeSite()
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
    const ref = referrerHostname(referrer, host.split(',')[0] ?? '', [site.site.domain])
    const agent = parseUserAgent(request.headers.get('user-agent'))
    const country = countryFromRequest(request)
    const fields = ['views', `dev:${agent.device}`, `br:${agent.browser}`, `os:${agent.os}`]
    if (ref) fields.push(`ref:${ref}`)
    if (country) fields.push(`cc:${country}`)
    const safe = fields.filter((field) => FIELD.test(field))
    const timeZone = await resolveTimeZone()
    const outcome = await recordPageview({
      ipHash: await hashClientIp(request),
      today: dateKeyInTimeZone(new Date(), timeZone),
      fields: safe,
    })
    if (outcome === 'limited') return json({ ok: false }, 202)
    return json({ ok: true })
  } catch (error) {
    console.error('Pageview error:', error)
    return json({ error: 'Internal error' }, 500)
  }
}
