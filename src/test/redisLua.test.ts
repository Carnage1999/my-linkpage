import { createConnection, type Socket } from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMPARE_AND_SET, PUBLIC_READ } from '../../api/stats/_site-store'
import { PAGEVIEW_SCRIPT } from '../../api/stats/_redis'

const PORT = 6399

function resp(command: string[]): string {
  return `*${command.length}\r\n${command.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join('')}`
}

function readReply(socket: Socket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      try {
        const [value, rest] = parse(buffer)
        if (rest === null) return
        socket.off('data', onData)
        resolve(value)
      } catch (error) {
        socket.off('data', onData)
        reject(error)
      }
    }
    socket.on('data', onData)
  })
}

function parse(input: string): [unknown, string | null] {
  if (!input) return [undefined, null]
  const type = input[0]
  const lineEnd = input.indexOf('\r\n')
  if (lineEnd === -1) return [undefined, null]
  const head = input.slice(1, lineEnd)
  const rest = input.slice(lineEnd + 2)
  if (type === '+') return [head, rest]
  if (type === ':') return [Number(head), rest]
  if (type === '-') throw new Error(head)
  if (type === '$') {
    const length = Number(head)
    if (length === -1) return [null, rest]
    if (rest.length < length + 2) return [undefined, null]
    return [rest.slice(0, length), rest.slice(length + 2)]
  }
  if (type === '*') {
    const count = Number(head)
    if (count === -1) return [null, rest]
    const values: unknown[] = []
    let remaining = rest
    for (let index = 0; index < count; index += 1) {
      const [value, next] = parse(remaining)
      if (next === null) return [undefined, null]
      values.push(value)
      remaining = next
    }
    return [values, remaining]
  }
  throw new Error(`Unknown Redis reply ${type}`)
}

describe('redis Lua scripts', () => {
  let server: ChildProcess
  let socket: Socket

  beforeAll(async () => {
    server = spawn(
      'redis-server',
      ['--port', String(PORT), '--save', '', '--appendonly', 'no', '--bind', '127.0.0.1', '--protected-mode', 'no'],
      { stdio: 'ignore' },
    )
    let lastError: unknown
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        socket = await new Promise<Socket>((resolve, reject) => {
          const next = createConnection({ host: '127.0.0.1', port: PORT })
          next.once('connect', () => resolve(next))
          next.once('error', (error) => {
            next.destroy()
            reject(error)
          })
        })
        return
      } catch (error) {
        lastError = error
        await new Promise((resolve) => setTimeout(resolve, 40))
      }
    }
    throw lastError instanceof Error ? lastError : new Error('redis did not start')
  })

  afterAll(async () => {
    socket.end()
    server.kill('SIGTERM')
  })

  async function call(...command: string[]): Promise<unknown> {
    const pending = readReply(socket)
    socket.write(resp(command))
    return pending
  }

  it('compare-and-set writes only when the raw bytes match', async () => {
    expect(await call('SET', 'site:config', 'before')).toBe('OK')
    expect(await call('EVAL', COMPARE_AND_SET, '1', 'site:config', 'before', 'after')).toBe(1)
    expect(await call('GET', 'site:config')).toBe('after')
    expect(await call('EVAL', COMPARE_AND_SET, '1', 'site:config', 'before', 'nope')).toBe(0)
    expect(await call('GET', 'site:config')).toBe('after')
    expect(await call('EVAL', COMPARE_AND_SET, '1', 'site:config', '{', '{"version":1}')).toBe(0)
    await call('SET', 'site:config', '{')
    expect(await call('EVAL', COMPARE_AND_SET, '1', 'site:config', '{', '{"version":1}')).toBe(1)
    expect(await call('GET', 'site:config')).toBe('{"version":1}')
  })

  it('reads the document once and stops when the public limit is passed', async () => {
    await call('SET', 'preview:site:config', '{"ok":true}')
    const first = (await call('EVAL', PUBLIC_READ, '2', 'preview:rl:pub:ip', 'preview:site:config', '60', '1')) as number[]
    expect(first).toEqual([1, '{"ok":true}'])
    const second = (await call('EVAL', PUBLIC_READ, '2', 'preview:rl:pub:ip', 'preview:site:config', '60', '1')) as number[]
    expect(second[0]).toBe(0)
    expect(await call('GET', 'preview:rl:pub:ip')).toBe('2')
  })

  it('does not add referrer fields once the pageview hash reaches the cap', async () => {
    const fields = ['views', 'dev:desktop']
    for (let index = 0; index < 198; index += 1) fields.push(`ref:known-${index}.example`)
    fields.push('ref:one-more.example')
    const args = ['EVAL', PAGEVIEW_SCRIPT, '2', 'rl:pv:ip', 'pv:2026-11-15', '30', '15552000', '200', ...fields]
    expect(await call(...args)).toBe(1)
    expect(await call('HLEN', 'pv:2026-11-15')).toBe(200)
    expect(await call('HGET', 'pv:2026-11-15', 'views')).toBe('1')
    expect(await call('EVAL', PAGEVIEW_SCRIPT, '2', 'rl:pv:other', 'pv:2026-11-15', '30', '15552000', '200', 'views', 'ref:known-0.example', 'ref:new.example')).toBe(1)
    expect(await call('HGET', 'pv:2026-11-15', 'views')).toBe('2')
    expect(await call('HGET', 'pv:2026-11-15', 'ref:known-0.example')).toBe('2')
    expect(await call('HGET', 'pv:2026-11-15', 'ref:new.example')).toBeNull()
    expect(await call('HLEN', 'pv:2026-11-15')).toBe(200)
  })
})
