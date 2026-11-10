import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetResponseCache, handleAuth, handleData, handleRecord } from '../../api/stats/_handlers'
import { dateKeyInTimeZone } from '../../api/stats/_dates'

const calls: Array<{ url: string; body: unknown }> = []
let authAttempts = 1
let evalResult = 1

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  calls.length = 0
  authAttempts = 1
  evalResult = 1
  __resetResponseCache()
  process.env.STATS_PASSWORD = 'secret'
  process.env.STATS_TIMEZONE = 'Asia/Taipei'
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : null
      calls.push({ url: String(url), body })
      if (String(url).endsWith('/pipeline')) {
        const command = (body as string[][])[0]?.[0]
        if (command === 'INCR') {
          return jsonResponse([{ result: authAttempts }, { result: 1 }])
        }
        const today = dateKeyInTimeZone(new Date(), 'Asia/Taipei')
        return jsonResponse([
          { result: ['github', '5', 'retired', '2'] },
          { result: [`${today}:github`, '3', `${today}:retired`, '1'] },
        ])
      }
      return jsonResponse({ result: evalResult })
    }),
  )
})

afterEach(() => {
  delete process.env.STATS_PASSWORD
  delete process.env.STATS_TIMEZONE
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  __resetResponseCache()
  vi.unstubAllGlobals()
})

describe('stats handlers', () => {
  it('rejects link ids that are not in site config', async () => {
    const response = await handleRecord(
      new Request('http://localhost/api/stats/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId: 'not-a-real-link' }),
      }),
    )
    expect(response.status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('records a configured link with one rate-limited script', async () => {
    const response = await handleRecord(
      new Request('http://localhost/api/stats/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.8' },
        body: JSON.stringify({ linkId: 'github' }),
      }),
    )
    expect(response.status).toBe(200)
    const command = calls[0]?.body as string[]
    expect(command[0]).toBe('EVAL')
    expect(command).toContain('github')
    expect(command.some((part) => part.startsWith('rl:rec:'))).toBe(true)
    expect(command).toContain('clicks:total')
    expect(command).toContain('clicks:day')
  })

  it('returns 429 when the click rate limit trips', async () => {
    evalResult = 0
    const response = await handleRecord(
      new Request('http://localhost/api/stats/record', {
        method: 'POST',
        body: JSON.stringify({ linkId: 'github' }),
      }),
    )
    expect(response.status).toBe(429)
  })

  it('rate limits password attempts before checking the password', async () => {
    authAttempts = 9
    const response = await handleAuth(
      new Request('http://localhost/api/stats/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'secret' }),
      }),
    )
    expect(response.status).toBe(429)
    const command = calls[0]?.body as string[][]
    expect(command[0][0]).toBe('INCR')
    expect(command[1][0]).toBe('EXPIRE')
  })

  it('rejects a wrong password and accepts the right one', async () => {
    const denied = await handleAuth(
      new Request('http://localhost/api/stats/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'nope' }),
      }),
    )
    expect(denied.status).toBe(401)

    const allowed = await handleAuth(
      new Request('http://localhost/api/stats/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'secret' }),
      }),
    )
    expect(allowed.status).toBe(200)
    const body = (await allowed.json()) as { token: string }
    expect(body.token).toContain('.')
  })

  it('requires a token and reports removed links separately from configured ones', async () => {
    const anonymous = await handleData(new Request('http://localhost/api/stats/data'))
    expect(anonymous.status).toBe(401)

    const login = await handleAuth(
      new Request('http://localhost/api/stats/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'secret' }),
      }),
    )
    const { token } = (await login.json()) as { token: string }
    const response = await handleData(
      new Request('http://localhost/api/stats/data?days=7', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=30')
    const report = (await response.json()) as {
      configuredIds: string[]
      removed: Array<{ id: string }>
      days: number
    }
    expect(report.days).toBe(7)
    expect(report.configuredIds).toContain('github')
    expect(report.configuredIds).not.toContain('retired')
    expect(report.removed.map((link) => link.id)).toContain('retired')

    calls.length = 0
    await handleData(
      new Request('http://localhost/api/stats/data?days=7', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    )
    expect(calls).toHaveLength(0)
  })
})
