import type { VisitorProviderId } from '../../../api/stats/_providers/types'

export const PROVIDER_ORDER: VisitorProviderId[] = ['upstash', 'goatcounter', 'cloudflare', 'umami']

export function preferredProvider(settings: { providers: Array<{ id: VisitorProviderId; configured: boolean }>; defaultProvider: VisitorProviderId | null } | null): VisitorProviderId | null {
  if (!settings) return null
  const configured = new Set(settings.providers.filter((item) => item.configured).map((item) => item.id))
  let saved: string | null = null
  try {
    saved = localStorage.getItem('manage-visitor-provider')
  } catch {
    /* localStorage can be blocked */
  }
  return (
    [saved, settings.defaultProvider, ...PROVIDER_ORDER].find(
      (id): id is VisitorProviderId => Boolean(id && configured.has(id as VisitorProviderId)),
    ) ?? null
  )
}

export function providerName(id: VisitorProviderId, translate: (key: 'manageUpstash' | 'manageGoatcounter' | 'manageCloudflare' | 'manageUmami') => string): string {
  if (id === 'upstash') return translate('manageUpstash')
  if (id === 'goatcounter') return translate('manageGoatcounter')
  if (id === 'cloudflare') return translate('manageCloudflare')
  return translate('manageUmami')
}
