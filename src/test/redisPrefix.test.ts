import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import handler from '../../api/site-config'
import { handleRecord } from '../../api/stats/_handlers'
import { PreviewWriteBlocked, redisKey, redisKeyPrefix } from '../../api/stats/_keys'
import {
  bumpNamedLimit,
  readClickHashes,
  readPageviewDays,
  recordClick,
  recordPageview,
} from '../../api/stats/_redis'
import { __resetSettingsCache } from '../../api/stats/_settings'
import { __resetSiteCache, compareAndSetManaged, seedSiteConfig } from '../../api/stats/_site-store'
import { __resetScriptCache } from '../../api/stats/scripts'
import { createToken } from '../../api/stats/_token'
import { installMemoryRedis } from './memoryRedis'

function keysOf(command: string[]): string[] {
  const op = command[0] ?? ''
  if (op === 'PING') return []
  if (op === 'EVAL' || op === 'EVALSHA') {
    const count = Number(command[2] ?? 0)
    return command.slice(3, 3 + count)
  }
  return command[1] ? [command[1]] : []
}

describe('redis key prefix', () => {
  afterEach(() => {
    delete process.env.REDIS_KEY_PREFIX
    delete process.env.VERCEL_ENV
    delete process.env.STATS_PASSWORD
    __resetSiteCache()
    __resetScriptCache()
    __resetSettingsCache()
  })

  it('rejects a prefix that is not empty or /^[a-z0-9-]+:$/', () => {
    process.env.REDIS_KEY_PREFIX = 'Preview'
    expect(() => redisKeyPrefix()).toThrow(/REDIS_KEY_PREFIX/)
    process.env.REDIS_KEY_PREFIX = 'preview'
    expect(() => redisKey('site:config')).toThrow(/REDIS_KEY_PREFIX/)
    process.env.REDIS_KEY_PREFIX = ''
    expect(redisKey('site:config')).toBe('site:config')
    process.env.REDIS_KEY_PREFIX = 'preview:'
    expect(redisKey('site:config')).toBe('preview:site:config')
    expect(redisKey('preview:site:config')).toBe('preview:site:config')
  })

  it('keeps Lua key names in KEYS[]', () => {
    const scripts = ['api/stats/_redis.ts', 'api/stats/_site-store.ts']
      .map((file) => readFileSync(file, 'utf8'))
      .flatMap((source) => [...source.matchAll(/const [A-Z_]+ = `\n([\s\S]*?)`/g)].map((match) => match[1] ?? ''))
    expect(scripts.length).toBe(3)
    for (const script of scripts) {
      expect(script).not.toMatch(/redis\.call\(\s*'[A-Z]+'\s*,\s*'/)
      expect(script).toMatch(/KEYS\[/)
    }
  })

  it('targets only preview:* keys, including EVAL KEYS', async () => {
    process.env.REDIS_KEY_PREFIX = 'preview:'
    process.env.VERCEL_ENV = 'preview'
    process.env.STATS_PASSWORD = 'persist-secret'
    const redis = installMemoryRedis()
    const seed = JSON.parse(readFileSync('public/siteConfig.json', 'utf8')) as { version?: number }
    const stored = JSON.stringify({ ...seed, version: 31 })
    redis.store.set('site:config', stored)
    redis.store.set(redisKey('site:config'), stored)

    const response = await handler(new Request('https://link.example/api/site-config'))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { version: number }
    expect(body.version).toBe(31)

    await readClickHashes()
    await readPageviewDays(['2026-11-15'])
    await bumpNamedLimit('pub', 'ip', 60)
    await recordClick({ ipHash: 'ip', linkId: 'github', today: '2026-11-15', oldest: '2026-08-19' })
    await recordPageview({ ipHash: 'ip', today: '2026-11-15', fields: ['views', 'ref:example.com'] })
    await compareAndSetManaged(stored, seedSiteConfig(), null)

    const keys = redis.commands.flatMap(keysOf)
    expect(keys.length).toBeGreaterThan(5)
    for (const key of keys) expect(key.startsWith('preview:')).toBe(true)
    expect(keys).toContain('preview:site:config')
    expect(keys).toContain('preview:stats:settings')
    expect(keys).toContain('preview:clicks:total')
    expect(keys).toContain('preview:clicks:day')
    expect(keys).toContain('preview:clicks:prune')
    expect(keys).toContain('preview:pv:2026-11-15')
    expect(keys.some((key) => key.startsWith('preview:rl:'))).toBe(true)
    expect(redis.store.has('site:config')).toBe(true)
    expect(redis.writes.every((key) => key.startsWith('preview:'))).toBe(true)
    redis.restore()
  })

  it('returns 503 and writes nothing when preview has no prefix', async () => {
    process.env.VERCEL_ENV = 'preview'
    process.env.STATS_PASSWORD = 'persist-secret'
    const redis = installMemoryRedis()
    redis.store.set('site:config', '{"version":31}')
    const token = await createToken()

    const saved = await handler(
      new Request('https://link.example/api/site-config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', baseVersion: 31 }),
      }),
    )
    expect(saved.status).toBe(503)
    expect(saved.headers.get('Cache-Control')).toContain('no-store')

    const recorded = await handleRecord(
      new Request('https://link.example/api/stats/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId: 'github' }),
      }),
    )
    expect(recorded.status).toBe(503)
    await expect(
      recordClick({ ipHash: 'ip', linkId: 'github', today: '2026-11-15', oldest: '2026-08-19' }),
    ).rejects.toBeInstanceOf(PreviewWriteBlocked)
    expect(redis.commands).toEqual([])
    expect(redis.store.get('site:config')).toBe('{"version":31}')
    redis.restore()
  })
})
