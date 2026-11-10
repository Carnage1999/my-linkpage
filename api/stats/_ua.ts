/**
 * Tiny User-Agent classifier. The raw header is never stored.
 * Covers the browsers and OS families this page actually sees.
 */

export interface ParsedAgent {
  browser: string
  os: string
  device: 'desktop' | 'mobile' | 'tablet'
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedAgent {
  const ua = userAgent ?? ''
  const device: ParsedAgent['device'] = /iPad|Tablet/i.test(ua)
    ? 'tablet'
    : /Mobile|Android|iPhone/i.test(ua)
      ? 'mobile'
      : 'desktop'

  let browser = 'other'
  if (/Edg\//.test(ua)) browser = 'edge'
  else if (/OPR\/|Opera/.test(ua)) browser = 'opera'
  else if (/Firefox\//.test(ua)) browser = 'firefox'
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'chrome'
  else if (/Safari\//.test(ua)) browser = 'safari'

  let os = 'other'
  if (/Android/.test(ua)) os = 'android'
  else if (/iPhone|iPad|iOS/.test(ua)) os = 'ios'
  else if (/Windows/.test(ua)) os = 'windows'
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macos'
  else if (/CrOS/.test(ua)) os = 'chromeos'
  else if (/Linux/.test(ua)) os = 'linux'

  return { browser, os, device }
}
