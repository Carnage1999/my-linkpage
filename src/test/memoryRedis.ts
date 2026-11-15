/**
 * In-process Upstash REST stand-in. GET and SET share one map, so a site
 * save and the analytics settings key can be asserted separately.
 */

type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = Parameters<typeof fetch>[1]

export function installMemoryRedis() {
  const store = new Map<string, string>()
  const writes: string[] = []
  const commands: string[][] = []
  const original = globalThis.fetch
  const base = 'http://127.0.0.1:9'
  process.env.UPSTASH_REDIS_REST_URL = base
  process.env.UPSTASH_REDIS_REST_TOKEN = 'memory'

  function run(command: string[]) {
    commands.push(command)
    const [op, key = '', value = ''] = command
    if (op === 'GET') return { result: store.get(key) ?? null }
    if (op === 'SET') {
      writes.push(key)
      store.set(key, value)
      return { result: 'OK' }
    }
    if (op === 'INCR') {
      const next = Number(store.get(key) ?? 0) + 1
      store.set(key, String(next))
      return { result: next }
    }
    if (op === 'EXPIRE' || op === 'PEXPIRE') return { result: 1 }
    if (op === 'PING') return { result: 'PONG' }
    if (op === 'EVAL' && command[1]?.includes("redis.call('INCR', KEYS[1])") && command[1]?.includes('KEYS[2]')) {
      const rateKey = command[3] ?? ''
      const docKey = command[4] ?? ''
      const limit = Number(command[6] ?? 0)
      const next = Number(store.get(rateKey) ?? 0) + 1
      store.set(rateKey, String(next))
      writes.push(rateKey)
      if (next > limit) return { result: [0, ''] }
      return { result: [1, store.get(docKey) ?? ''] }
    }
    if (op === 'EVAL' && command[1]?.includes("redis.call('GET', KEYS[1])")) {
      const numkeys = Number(command[2] ?? 0)
      const key = command[3] ?? ''
      const expected = command[3 + numkeys] ?? ''
      const next = command[4 + numkeys] ?? ''
      const raw = store.get(key)
      const missing = raw == null || raw === ''
      if ((expected === '' && !missing) || (expected !== '' && raw !== expected)) return { result: 0 }
      writes.push(key)
      store.set(key, next)
      return { result: 1 }
    }
    return { result: null }
  }

  globalThis.fetch = (async (input: FetchInput, init?: FetchInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    if (!url.startsWith(base)) return original(input, init)
    const payload = JSON.parse(String(init?.body ?? 'null')) as
      string[] | string[][]
    if (url.endsWith('/pipeline'))
      return Response.json(
        (payload as string[][]).map((command) => run(command))
      )
    return Response.json(run(payload as string[]))
  }) as typeof fetch

  return {
    store,
    writes,
    commands,
    restore() {
      globalThis.fetch = original
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    },
  }
}
