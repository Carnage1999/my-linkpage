/**
 * Upstash Redis REST API helpers for server-side click tracking.
 *
 * Uses only fetch() — works on Vercel Edge, Cloudflare Workers,
 * Netlify Edge Functions, Deno Deploy, and Node.js 18+.
 *
 * Required environment variables:
 *   UPSTASH_REDIS_REST_URL   — e.g. https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN — bearer token
 */

function getUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL
}

function getToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN
}

export function isRedisConfigured(): boolean {
  return !!(getUrl() && getToken())
}

export async function redisCommand(
  command: string[],
): Promise<{ result: unknown }> {
  const res = await fetch(getUrl()!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!res.ok) throw new Error(`Redis error: ${res.status}`)

  return res.json() as Promise<{ result: unknown }>
}

export async function redisPipeline(
  commands: string[][],
): Promise<Array<{ result: unknown }>> {
  const res = await fetch(`${getUrl()}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!res.ok) throw new Error(`Redis error: ${res.status}`)

  return res.json() as Promise<Array<{ result: unknown }>>
}

export function todayKey(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function dateKey(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
