import type { EffectiveSettings } from '../_settings'
import { loadEffective } from '../_settings'
import { fetchCloudflareReport, testCloudflare } from './cloudflare'
import { fetchGoatcounterReport, testGoatcounter } from './goatcounter'
import { emptyReport, type VisitorProviderId, type VisitorQuery, type VisitorReport } from './types'
import { fetchUmamiReport, testUmami } from './umami'
import { fetchUpstashReport } from './upstash'
import { redisPing } from '../_redis'

export async function fetchVisitorReport(provider: VisitorProviderId, query: VisitorQuery): Promise<VisitorReport> {
  if (provider === 'upstash') return fetchUpstashReport(query)
  if (provider === 'goatcounter') return fetchGoatcounterReport(query)
  if (provider === 'cloudflare') return fetchCloudflareReport(query)
  if (provider === 'umami') return fetchUmamiReport(query)
  return emptyReport(provider, false)
}

export async function testVisitorProvider(
  provider: VisitorProviderId,
  effective: EffectiveSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (provider === 'upstash') {
      if (!effective.upstash) return { ok: false, error: 'Redis is not configured' }
      const pong = await redisPing()
      return pong ? { ok: true } : { ok: false, error: 'Redis did not respond' }
    }
    if (provider === 'goatcounter') {
      if (!effective.goatcounter) return { ok: false, error: 'GoatCounter is not configured' }
      await testGoatcounter(effective.goatcounter.site, effective.goatcounter.apiKey)
      return { ok: true }
    }
    if (provider === 'cloudflare') {
      if (!effective.cloudflare) return { ok: false, error: 'Cloudflare Web Analytics is not configured' }
      await testCloudflare(effective.cloudflare)
      return { ok: true }
    }
    if (!effective.umami) return { ok: false, error: 'Umami is not configured' }
    await testUmami(effective.umami)
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed'
    return { ok: false, error: message.replace(/Bearer\s+\S+/gi, 'Bearer').slice(0, 180) }
  }
}

export async function currentEffective(): Promise<EffectiveSettings> {
  return loadEffective()
}
