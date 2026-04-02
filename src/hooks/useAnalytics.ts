import { useCallback, useEffect, useRef } from 'react'
import { ANALYTICS } from '../siteConfig'

// ─── Plausible / Umami type augmentations ────────────────

interface PlausibleFn {
  (event: string, options?: { props?: Record<string, string> }): void
  q?: unknown[][]
}

interface UmamiTracker {
  track(event: string, data?: Record<string, string | number>): void
}

declare global {
  interface Window {
    plausible?: PlausibleFn
    umami?: UmamiTracker
  }
}

// ─── Script loader (idempotent) ──────────────────────────

let scriptInjected = false

function injectScript(): void {
  if (scriptInjected || typeof document === 'undefined') return
  scriptInjected = true

  const cfg = ANALYTICS
  if (!cfg) return

  const script = document.createElement('script')
  script.defer = true
  script.setAttribute('data-cf-beacon', '') // Won't hurt if unused

  if (cfg.provider === 'plausible' && cfg.plausibleDomain) {
    script.src = cfg.plausibleHost
      ? `${cfg.plausibleHost}/js/script.js`
      : 'https://plausible.io/js/script.js'
    script.setAttribute('data-domain', cfg.plausibleDomain)

    // Stub so calls before script loads are queued
    window.plausible =
      window.plausible ??
      Object.assign(
        ((...args: unknown[]) => {
          ;(window.plausible!.q = window.plausible!.q ?? []).push(
            args as unknown[],
          )
        }) as PlausibleFn,
        { q: [] as unknown[][] },
      )
  } else if (cfg.provider === 'umami' && cfg.umamiWebsiteId) {
    script.src = cfg.umamiHost
      ? `${cfg.umamiHost}/script.js`
      : 'https://cloud.umami.is/script.js'
    script.setAttribute('data-website-id', cfg.umamiWebsiteId)
  } else {
    scriptInjected = false
    return
  }

  document.head.appendChild(script)
}

// ─── Public hook ─────────────────────────────────────────

export function useAnalytics() {
  const ready = useRef(false)

  useEffect(() => {
    if (!ready.current) {
      injectScript()
      ready.current = true
    }
  }, [])

  const trackEvent = useCallback(
    (name: string, props?: Record<string, string>) => {
      const cfg = ANALYTICS
      if (!cfg) return

      if (cfg.provider === 'plausible') {
        window.plausible?.(name, props ? { props } : undefined)
      } else if (cfg.provider === 'umami') {
        window.umami?.track(name, props)
      }
    },
    [],
  )

  const trackLinkClick = useCallback(
    (linkId: string, label: string, url: string) => {
      trackEvent('Link Click', { id: linkId, label, url })
    },
    [trackEvent],
  )

  return { trackEvent, trackLinkClick }
}
