import { PreviewWriteBlocked } from './_keys'
import { SiteValidationError } from './_site-schema'
import { verifyToken } from './_token'

const MAX_JSON_BODY = 256 * 1024
const SESSION_COOKIE = 'stats_session'

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > MAX_JSON_BODY) throw new SiteValidationError('Request body is too large')
  const text = await request.text()
  if (text.length > MAX_JSON_BODY) throw new SiteValidationError('Request body is too large')
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new SiteValidationError('Request body must be a JSON object')
    }
    return parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof SiteValidationError) throw error
    throw new SiteValidationError('Request body must be JSON')
  }
}

export function requestIsSecure(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (forwarded) return forwarded === 'https'
  return new URL(request.url).protocol === 'https:'
}

export function sessionCookie(token: string, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api',
    'Max-Age=86400',
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

export function clearSessionCookie(secure: boolean): string {
  return [`${SESSION_COOKIE}=`, 'HttpOnly', 'SameSite=Strict', 'Path=/api', 'Max-Age=0', ...(secure ? ['Secure'] : [])].join('; ')
}

function cookieValue(request: Request, name: string): string {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() !== name) continue
    try {
      return decodeURIComponent(part.slice(eq + 1).trim())
    } catch {
      return ''
    }
  }
  return ''
}

function writeOriginAllowed(request: Request): boolean {
  if (request.headers.get('x-site-request') !== '1') return false
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || new URL(request.url).host
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function blockedWriteResponse(error: unknown): Response | null {
  if (!(error instanceof PreviewWriteBlocked)) return null
  return json({ error: error.message }, 503, 'private, no-store')
}

export function json(data: unknown, status = 200, cacheControl?: string, extra?: Record<string, string>): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (cacheControl) headers['Cache-Control'] = cacheControl
  return new Response(JSON.stringify(data), { status, headers })
}

export async function requireStatsToken(request: Request): Promise<Response | null> {
  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const cookie = bearer ? '' : cookieValue(request, SESSION_COOKIE)
  const token = bearer || cookie
  if (!token || !(await verifyToken(token))) return json({ error: 'Missing token' }, 401)
  const method = request.method.toUpperCase()
  if (!bearer && method !== 'GET' && method !== 'HEAD' && !writeOriginAllowed(request)) {
    return json({ error: 'Cross-site request blocked' }, 403)
  }
  return null
}
