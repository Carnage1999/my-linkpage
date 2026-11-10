import { verifyToken } from './_token'

export function json(data: unknown, status = 200, cacheControl?: string, extra?: Record<string, string>): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (cacheControl) headers['Cache-Control'] = cacheControl
  return new Response(JSON.stringify(data), { status, headers })
}

export async function requireStatsToken(request: Request): Promise<Response | null> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Missing token' }, 401)
  if (!(await verifyToken(auth.slice(7)))) return json({ error: 'Invalid or expired token' }, 401)
  return null
}
