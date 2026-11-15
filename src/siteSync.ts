/** Same-browser notice that /manage saved the public site. No polling. */

export const SITE_CHANNEL = 'site-config'

export interface SiteSavedMessage {
  type: 'saved'
  /** Set when the CDN purge did not run, so the next read must skip the cached URL. */
  bust?: boolean
}

let shared: BroadcastChannel | null | undefined

function siteChannel(): BroadcastChannel | null {
  if (shared !== undefined) return shared
  if (typeof BroadcastChannel === 'undefined') {
    shared = null
    return null
  }
  try {
    shared = new BroadcastChannel(SITE_CHANNEL)
  } catch {
    shared = null
  }
  return shared
}

export function notifySiteConfigSaved(bust = false) {
  const message: SiteSavedMessage = { type: 'saved', ...(bust ? { bust: true } : {}) }
  // Leave the channel open. Firefox drops a message when the channel closes in the same turn.
  siteChannel()?.postMessage(message)
}
