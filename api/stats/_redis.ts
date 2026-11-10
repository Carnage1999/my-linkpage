/**
 * Upstash Redis REST helpers.
 *
 * Free tier (https://upstash.com/docs/redis/overall/billing): 256 MB,
 * 500,000 commands/month, 10 GB bandwidth, 10 MB max request, 100 MB max record.
 * Each Redis command counts, including commands inside a pipeline or EVAL.
 *
 * One accepted click runs a single EVAL (one HTTP request) that executes
 * about 5 commands: burst SET, window INCR, two HINCRBYs, and a prune GET.
 * The window EXPIRE runs on the first click of the window. A once-per-day
 * prune scans the day hash. A rejected duplicate is 1 command (SET NX).
 * A dashboard read is one pipeline of 2 HGETALLs. Responses are also cached
 * in the isolate for 30 seconds, which costs 0 commands.
 *
 * Required environment variables:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

function getUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL
}

function getToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN
}

export function isRedisConfigured(): boolean {
  return Boolean(getUrl() && getToken())
}

async function redisFetch(path: string, body: unknown): Promise<unknown> {
  const base = getUrl()
  const token = getToken()
  if (!base || !token) throw new Error('Redis is not configured')

  const response = await fetch(path ? `${base}${path}` : base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`Redis error: ${response.status}`)
  return response.json()
}

export async function redisCommand(command: string[]): Promise<{ result: unknown }> {
  return redisFetch('', command) as Promise<{ result: unknown }>
}

export async function redisPipeline(
  commands: string[][],
): Promise<Array<{ result: unknown }>> {
  return redisFetch('/pipeline', commands) as Promise<Array<{ result: unknown }>>
}

const RECORD_SCRIPT = `
local burst = redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[1])
if not burst then
  return 0
end
local n = redis.call('INCR', KEYS[2])
if n == 1 then
  redis.call('EXPIRE', KEYS[2], ARGV[2])
end
if tonumber(n) > tonumber(ARGV[3]) then
  return 0
end
redis.call('HINCRBY', KEYS[3], ARGV[4], 1)
redis.call('HINCRBY', KEYS[4], ARGV[5] .. ':' .. ARGV[4], 1)
local marker = redis.call('GET', KEYS[5])
if marker ~= ARGV[5] then
  local all = redis.call('HGETALL', KEYS[4])
  for i = 1, #all, 2 do
    local field = all[i]
    if string.sub(field, 1, 10) < ARGV[6] then
      redis.call('HDEL', KEYS[4], field)
    end
  end
  redis.call('SET', KEYS[5], ARGV[5], 'EX', ARGV[7])
end
return 1
`

export async function recordClick(input: {
  ipHash: string
  linkId: string
  today: string
  oldest: string
}): Promise<'ok' | 'limited'> {
  const response = await redisCommand([
    'EVAL',
    RECORD_SCRIPT,
    '5',
    `rl:rec:${input.ipHash}:${input.linkId}`,
    `rl:win:${input.ipHash}`,
    'clicks:total',
    'clicks:day',
    'clicks:prune',
    '2',
    '600',
    '30',
    input.linkId,
    input.today,
    input.oldest,
    '172800',
  ])
  return Number(response.result) === 1 ? 'ok' : 'limited'
}

export async function bumpAuthLimit(ipHash: string): Promise<number> {
  const results = await redisPipeline([
    ['INCR', `rl:auth:${ipHash}`],
    ['EXPIRE', `rl:auth:${ipHash}`, '900'],
  ])
  return Number(results[0]?.result ?? 0)
}

export async function readClickHashes(): Promise<{
  totals: unknown
  days: unknown
}> {
  const results = await redisPipeline([
    ['HGETALL', 'clicks:total'],
    ['HGETALL', 'clicks:day'],
  ])
  return { totals: results[0]?.result, days: results[1]?.result }
}

export async function hashClientIp(request: Request): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip =
    (forwarded?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'unknown').trim() ||
    'unknown'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}
