/** Same-browser notice that /manage saved the public site. No polling. */

export const SITE_CHANNEL = 'site-config'

export interface SiteSavedMessage {
  type: 'saved'
  /** Set when the CDN purge did not run, so the next read must skip the cached URL. */
  bust?: boolean
}

export function notifySiteConfigSaved(bust = false) {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const channel = new BroadcastChannel(SITE_CHANNEL)
    const message: SiteSavedMessage = { type: 'saved', ...(bust ? { bust: true } : {}) }
    channel.postMessage(message)
    channel.close()
  } catch {
    /* BroadcastChannel can be missing in a locked-down browser */
  }
}
