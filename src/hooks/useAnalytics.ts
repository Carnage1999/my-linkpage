import { useCallback, useEffect } from 'react'
import { EMPTY_SCRIPTS, type ScriptBundle } from '../analytics/types'
import { safeScriptUrl, safeToken } from '../lib/safeUrl'

interface UmamiTracker {
  track(event: string, data?: Record<string, string | number>): void
}

interface GoatCounter {
  count(event: { path: string; title?: string; event?: boolean }): void
}

declare global {
  interface Window {
    umami?: UmamiTracker
    goatcounter?: GoatCounter
  }
}

const injected = new Set<string>()

function appendScript(key: string, setup: (script: HTMLScriptElement) => void): void {
  if (injected.has(key) || typeof document === 'undefined') return
  injected.add(key)
  const script = document.createElement('script')
  script.defer = true
  setup(script)
  document.head.appendChild(script)
}

export function injectScripts(bundle: ScriptBundle): void {
  if (bundle.umami) {
    const websiteId = safeToken(bundle.umami.websiteId)
    const src = safeScriptUrl(bundle.umami.src)
    if (websiteId && src) {
      appendScript(`umami:${websiteId}`, (script) => {
        script.src = src
        script.setAttribute('data-website-id', websiteId)
      })
    }
  }

  if (bundle.goatcounter) {
    const endpoint = safeScriptUrl(bundle.goatcounter.endpoint)
    if (endpoint) {
      appendScript(`goatcounter:${endpoint}`, (script) => {
        script.src = 'https://gc.zgo.at/count.js'
        script.setAttribute('data-goatcounter', endpoint)
      })
    }
  }

  if (bundle.cloudflare) {
    const token = safeToken(bundle.cloudflare.token)
    const src = safeScriptUrl('https://static.cloudflareinsights.com/beacon.min.js')
    if (token && src) {
      appendScript(`cloudflare:${token}`, (script) => {
        script.src = src
        script.setAttribute('data-cf-beacon', JSON.stringify({ token, spa: false }))
      })
    }
  }
}

export function trackScripts(bundle: ScriptBundle, name: string, props?: Record<string, string>): void {
  if (bundle.umami) window.umami?.track(name, props)
  if (bundle.goatcounter && props?.id) {
    window.goatcounter?.count({ path: `link:${props.id}`, title: props.label ?? name, event: true })
  }
}

export function useAnalytics(scripts: ScriptBundle = EMPTY_SCRIPTS) {
  useEffect(() => {
    injectScripts(scripts)
  }, [scripts])

  const trackEvent = useCallback(
    (name: string, props?: Record<string, string>) => {
      trackScripts(scripts, name, props)
    },
    [scripts],
  )

  const trackLinkClick = useCallback(
    (linkId: string, label: string, url: string) => {
      trackEvent('Link Click', { id: linkId, label, url })
    },
    [trackEvent],
  )

  return { trackEvent, trackLinkClick }
}
