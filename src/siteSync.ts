/** Same-browser notice that /manage saved the public site. No polling. */

export const SITE_CHANNEL = 'site-config'

export interface SiteSavedMessage {
  type: 'saved'
  /** Set when the CDN purge did not run, so the next read must skip the cached URL. */
  bust?: boolean
}

let shared: BroadcastChannel | null | undefined
const savedListeners = new Set<(message: SiteSavedMessage) => void>()

function siteChannel(): BroadcastChannel | null {
  if (shared !== undefined) return shared
  if (typeof BroadcastChannel === 'undefined') {
    shared = null
    return null
  }
  try {
    shared = new BroadcastChannel(SITE_CHANNEL)
    shared.onmessage = (event: MessageEvent<SiteSavedMessage>) => {
      if (event.data?.type !== 'saved') return
      for (const listener of savedListeners) listener(event.data)
    }
  } catch {
    shared = null
  }
  return shared
}

/** One channel for the tab. Closing it drops the message in Firefox. */
export function subscribeSiteSaved(listener: (message: SiteSavedMessage) => void): () => void {
  siteChannel()
  savedListeners.add(listener)
  return () => savedListeners.delete(listener)
}

export function notifySiteConfigSaved(bust = false) {
  const message: SiteSavedMessage = { type: 'saved', ...(bust ? { bust: true } : {}) }
  // Leave the channel open. Firefox drops a message when the channel closes in the same turn.
  siteChannel()?.postMessage(message)
}
