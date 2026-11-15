/**
 * Test-only HTTP server. Playwright cannot import the API modules, because
 * Node requires an import attribute on JSON. tsx can, so the real handlers
 * run here against an in-memory Redis.
 */

import { createServer, type IncomingHttpHeaders, type IncomingMessage } from 'node:http'
import handler from '../api/site-config'
import authHandler from '../api/stats/auth'
import settingsHandler from '../api/stats/settings'
import { __resetSettingsCache } from '../api/stats/_settings'
import { validateSiteConfig, type PublicSiteConfig } from '../api/stats/_site-schema'
import { __resetSiteCache } from '../api/stats/_site-store'
import { __resetScriptCache } from '../api/stats/scripts'
import { installMemoryRedis } from '../src/test/memoryRedis'
import seedFile from '../public/siteConfig.json'

const seed = seedFile as {
  site: PublicSiteConfig['site']
  profile: PublicSiteConfig['profile']
  socials: PublicSiteConfig['socials']
  i18n: PublicSiteConfig['i18n']
}

const STORED_ORDER = ['x', 'github', 'telegram', 'bluesky', 'line', 'linkedin']

function storedDocument(): PublicSiteConfig {
  const byId = new Map(seed.socials.map((link) => [link.id, link]))
  return validateSiteConfig(
    {
      site: seed.site,
      profile: seed.profile,
      socials: STORED_ORDER.map((id) => byId.get(id)),
      i18n: {
        ...seed.i18n,
        texts: {
          ...seed.i18n.texts,
          en: { ...seed.i18n.texts.en, intro: 'I am Han-che Wang. Hi' },
        },
      },
    },
    25,
  )
}

const settingsDocument = JSON.stringify({
  v: 1,
  inject: { umami: true, goatcounter: true, cloudflare: true },
  umami: { websiteId: 'umamisite' },
  goatcounter: { site: 'hanche' },
  cloudflare: { siteTag: 'cftag' },
})

process.env.STATS_PASSWORD = 'persist-secret'
const redis = installMemoryRedis()

function resetStore() {
  redis.writes.length = 0
  redis.store.clear()
  redis.store.set('site:config', JSON.stringify(storedDocument()))
  redis.store.set('stats:settings', settingsDocument)
  __resetSiteCache()
  __resetScriptCache()
  __resetSettingsCache()
}

resetStore()

const DATA = {
  timezone: 'Asia/Taipei',
  days: 30,
  totals: { github: 1 },
  periodTotals: { github: 1 },
  previousPeriodTotals: {},
  daily: [],
  configuredIds: ['github'],
  removed: [],
}

function headersFrom(raw: IncomingHttpHeaders): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(raw)) {
    if (value == null || key === 'host' || key === 'content-length') continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  return headers
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks)
}

const server = createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url ?? '/', 'http://127.0.0.1')
  if (url.pathname === '/__test/reset' && incoming.method === 'POST') {
    resetStore()
    outgoing.writeHead(204)
    outgoing.end()
    return
  }
  if (url.pathname === '/__test/state') {
    const body = JSON.stringify({
      settings: redis.store.get('stats:settings'),
      writes: redis.writes,
    })
    outgoing.writeHead(200, { 'content-type': 'application/json' })
    outgoing.end(body)
    return
  }

  const body = await readBody(incoming)
  const method = incoming.method ?? 'GET'
  let response: Response
  if (url.pathname === '/api/site-config') {
    response = await handler(
      new Request(url, {
        method,
        headers: headersFrom(incoming.headers),
        body: method === 'GET' || method === 'HEAD' ? undefined : body,
      }),
    )
  } else if (url.pathname === '/api/stats/auth') {
    response = await authHandler(
      new Request(url, { method, headers: headersFrom(incoming.headers), body }),
    )
  } else if (url.pathname === '/api/stats/data') {
    response = Response.json(DATA)
  } else if (url.pathname === '/api/stats/visitors') {
    response = Response.json({ provider: 'umami', configured: false })
  } else if (url.pathname === '/api/stats/settings') {
    response = await settingsHandler(
      new Request(url, {
        method,
        headers: headersFrom(incoming.headers),
        body: method === 'GET' || method === 'HEAD' ? undefined : body,
      }),
    )
  } else {
    response = Response.json({ ok: true })
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    if (key === 'content-length' || key === 'transfer-encoding') return
    headers[key] = value
  })
  outgoing.writeHead(response.status, headers)
  outgoing.end(bytes)
})

server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  console.log(`PORT ${port}`)
})
