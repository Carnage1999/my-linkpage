/** Record a configured link click. Prefers sendBeacon so navigation can continue. */
export function recordLinkClick(linkId: string): void {
  const body = JSON.stringify({ linkId })
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon('/api/stats/record', blob)) return
    }
  } catch {
    /* sendBeacon can throw if the payload is rejected; fall through to fetch. */
  }

  void fetch('/api/stats/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}
