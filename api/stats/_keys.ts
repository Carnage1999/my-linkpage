/**
 * Every Redis key is built here. Preview sets REDIS_KEY_PREFIX=preview:
 * so it shares an Upstash database with production without touching
 * production keys. Production leaves the variable unset.
 *
 * Lua scripts receive these keys as KEYS[] and must not build key names
 * from string literals.
 */

const PREFIX_PATTERN = /^[a-z0-9-]+:$/

export class PreviewWriteBlocked extends Error {
  constructor() {
    super('Preview writes require REDIS_KEY_PREFIX')
    this.name = 'PreviewWriteBlocked'
  }
}

/** Empty, or a prefix such as `preview:`. Read at call time so tests can set the env. */
export function redisKeyPrefix(): string {
  const raw = process.env.REDIS_KEY_PREFIX ?? ''
  if (raw === '') return ''
  if (!PREFIX_PATTERN.test(raw)) {
    throw new Error('REDIS_KEY_PREFIX must be empty or match /^[a-z0-9-]+:$/')
  }
  return raw
}

/** Logical name such as `site:config`. The prefix is applied once. */
export function redisKey(name: string): string {
  const prefix = redisKeyPrefix()
  if (prefix && name.startsWith(prefix)) return name
  return `${prefix}${name}`
}

/**
 * A preview deployment with no prefix would read and write the production
 * keys in the shared database. Writes are refused until the prefix is set.
 */
export function previewWritesBlocked(): boolean {
  return process.env.VERCEL_ENV === 'preview' && redisKeyPrefix() === ''
}

const READ_OPS = new Set(['GET', 'HGET', 'HGETALL', 'TTL', 'PING', 'EXISTS', 'HLEN', 'HEXISTS', 'STRLEN'])

export function commandWrites(command: readonly string[]): boolean {
  const op = command[0]?.toUpperCase() ?? ''
  if (op === 'EVAL' || op === 'EVALSHA') return true
  return !READ_OPS.has(op)
}

export function assertWritesAllowed(commands: readonly (readonly string[])[]): void {
  if (!previewWritesBlocked()) return
  if (commands.some((command) => commandWrites(command))) throw new PreviewWriteBlocked()
}
