/**
 * HMAC-based token helpers for stats dashboard authentication.
 *
 * Uses the Web Crypto API — works on Vercel Edge, Cloudflare Workers,
 * Netlify Edge Functions, Deno Deploy, and Node.js 18+.
 *
 * Required environment variable:
 *   STATS_PASSWORD — dashboard access password (feature disabled if unset)
 *
 * Token format: `{hmac_hex}.{timestamp_ms}`
 * Expires after 24 hours.
 */

const encoder = new TextEncoder()
const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

function getPassword(): string | undefined {
  return process.env.STATS_PASSWORD
}

export function isStatsEnabled(): boolean {
  return !!getPassword()
}

async function hmacSha256(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const ab = encoder.encode(a)
  const bb = encoder.encode(b)
  let result = 0
  for (let i = 0; i < ab.length; i++) {
    result |= ab[i] ^ bb[i]
  }
  return result === 0
}

export async function createToken(): Promise<string> {
  const ts = Date.now().toString()
  const hmac = await hmacSha256(getPassword()!, ts)
  return `${hmac}.${ts}`
}

export async function verifyToken(token: string): Promise<boolean> {
  const password = getPassword()
  if (!password) return false

  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) return false

  const hmacHex = token.slice(0, dotIndex)
  const ts = token.slice(dotIndex + 1)
  const timestamp = Number(ts)

  if (Number.isNaN(timestamp)) return false
  if (Date.now() - timestamp > TOKEN_MAX_AGE) return false

  const expected = await hmacSha256(password, ts)
  return timingSafeEqual(hmacHex, expected)
}

export function verifyPassword(password: string): boolean {
  const expected = getPassword()
  if (!expected) return false
  return timingSafeEqual(expected, password)
}
