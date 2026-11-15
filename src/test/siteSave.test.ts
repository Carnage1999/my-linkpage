import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import seedFile from '../../public/siteConfig.json'
import handler from '../../api/site-config'
import { decryptJson } from '../../api/stats/_crypto'
import { __resetSettingsCache, normalizeSettings } from '../../api/stats/_settings'
import {
  normalizeConfig,
  validateSiteConfig,
  type PublicSiteConfig,
} from '../../api/stats/_site-schema'
import { __resetSiteCache } from '../../api/stats/_site-store'
import { createToken } from '../../api/stats/_token'
import { __resetScriptCache } from '../../api/stats/scripts'
import { homepageText } from '../i18n/homepage'
import { installMemoryRedis } from './memoryRedis'

const SETTINGS_KEY = 'stats:settings'
const SAVED_ORDER = ['github', 'x', 'telegram', 'bluesky', 'line', 'linkedin']
const CUSTOM_INTRO = 'I am Han-che Wang. Hi'
const SETTINGS = {
  timezone: 'Asia/Taipei',
  defaultProvider: null,
  inject: { umami: true, goatcounter: true, cloudflare: true },
  umami: { apiUrl: '', websiteId: 'umamisite', username: '' },
  goatcounter: { site: 'hanche' },
  cloudflare: { accountId: '', siteTag: 'cftag' },
}

const seed = seedFile as {
  site: PublicSiteConfig['site']
  profile: PublicSiteConfig['profile']
  socials: PublicSiteConfig['socials']
  i18n: PublicSiteConfig['i18n']
}

const LANGUAGES = [
  { code: 'en', title: 'Hello persisted', storedTitle: "Hi, I'm Wang" },
  { code: 'ru', title: 'Привет persisted', storedTitle: 'Привет, я Wang' },
  { code: 'zh-TW', title: '王瀚哲的頁面', storedTitle: '嗨，我是 Wang' },
  {
    code: 'ja',
    title: 'こんにちは',
    storedTitle: '',
    extra: { label: '日本語', shortLabel: 'JA' },
  },
] as const

const settingsDocument = JSON.stringify({
  v: 1,
  inject: { umami: true, goatcounter: true, cloudflare: true },
  umami: { websiteId: 'umamisite' },
  goatcounter: { site: 'hanche' },
  cloudflare: { siteTag: 'cftag' },
})

function document(options: {
  ids: readonly string[]
  code: string
  title: string
  intro: string
  extra?: { label: string; shortLabel: string }
}): PublicSiteConfig {
  const byId = new Map(seed.socials.map((link) => [link.id, link]))
  const languages = options.extra
    ? [...seed.i18n.languages, { code: options.code, ...options.extra }]
    : seed.i18n.languages
  const texts: PublicSiteConfig['i18n']['texts'] = {
    ...seed.i18n.texts,
    en: { ...seed.i18n.texts.en, intro: options.intro },
  }
  if (options.title) {
    texts[options.code] = { ...(texts[options.code] ?? {}), title: options.title }
  }
  return validateSiteConfig(
    {
      site: seed.site,
      profile: seed.profile,
      socials: options.ids.map((id) => byId.get(id)),
      i18n: { ...seed.i18n, languages, texts },
    },
    25,
  )
}

describe('site config save', () => {
  let redis: ReturnType<typeof installMemoryRedis>
  let token = ''

  beforeEach(async () => {
    process.env.STATS_PASSWORD = 'persist-secret'
    redis = installMemoryRedis()
    __resetSiteCache()
    __resetScriptCache()
    __resetSettingsCache()
    token = await createToken()
  })

  afterEach(() => {
    redis.restore()
    delete process.env.STATS_PASSWORD
    __resetSiteCache()
    __resetScriptCache()
    __resetSettingsCache()
  })

  async function put(body: unknown) {
    return handler(
      new Request('https://link.example/api/site-config', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    )
  }

  async function get() {
    const response = await handler(
      new Request('https://link.example/api/site-config')
    )
    return (await response.json()) as PublicSiteConfig & {
      scripts: {
        umami: { websiteId: string } | null
        goatcounter: { endpoint: string } | null
        cloudflare: { token: string } | null
      }
    }
  }

  function stage() {
    redis.store.set('site:config', JSON.stringify(validateSiteConfig(seedFile, 25)))
    redis.store.set(SETTINGS_KEY, settingsDocument)
    redis.writes.length = 0
  }

  describe.each(LANGUAGES)('$code', (language) => {
    const extra = 'extra' in language ? language.extra : undefined

    it('round-trips the full document', async () => {
      stage()
      const proposed = document({
        ids: SAVED_ORDER,
        code: language.code,
        title: language.title,
        intro: CUSTOM_INTRO,
        extra,
      })
      const expected = normalizeConfig(proposed, 26)
      expect(normalizeConfig(expected, 26)).toEqual(expected)

      const response = await put({
        ...proposed,
        settings: SETTINGS,
        secrets: { goatcounterApiKey: `key-${language.code}` },
        baseVersion: 25,
      })
      expect(response.status).toBe(200)

      const body = await get()
      const { scripts, ...publicConfig } = body
      expect(publicConfig).toEqual(expected)
      expect(scripts).toEqual({
        umami: { websiteId: 'umamisite', src: 'https://cloud.umami.is/script.js' },
        goatcounter: { endpoint: 'https://hanche.goatcounter.com/count' },
        cloudflare: { token: 'cftag' },
      })
      const seedVisit = (seed.i18n.texts as Record<string, { visit?: string } | undefined>)[language.code]?.visit
      if (seedVisit) expect(body.i18n.texts[language.code]?.visit).toBe(seedVisit)
      else expect(body.i18n.texts[language.code]?.visit).toBeUndefined()
      expect(homepageText(body.i18n, language.code, 'visit')).toBe(
        seedVisit ?? homepageText(body.i18n, body.i18n.fallback, 'visit'),
      )

      const raw = JSON.parse(String(redis.store.get('site:config'))) as {
        settings: { secrets?: string }
      }
      const { secrets: cipher, ...publicSettings } = raw.settings
      expect(normalizeSettings(publicSettings)).toEqual(normalizeSettings(SETTINGS))
      expect(normalizeSettings(normalizeSettings(publicSettings))).toEqual(normalizeSettings(publicSettings))
      expect(await decryptJson('persist-secret', String(cipher))).toEqual({
        goatcounterApiKey: `key-${language.code}`,
      })
      expect(redis.store.get(SETTINGS_KEY)).toBe(settingsDocument)
      expect(redis.writes.filter((key) => key === SETTINGS_KEY)).toEqual([])

      const again = await put({ ...expected, settings: SETTINGS, baseVersion: 26 })
      expect(again.status).toBe(200)
      const reread = await get()
      const { scripts: scriptsAgain, ...publicAgain } = reread
      expect(publicAgain).toEqual(normalizeConfig(expected, 27))
      expect(scriptsAgain).toEqual(scripts)
      const storedAgain = JSON.parse(String(redis.store.get('site:config'))) as { settings: { secrets?: string } }
      expect(await decryptJson('persist-secret', String(storedAgain.settings.secrets))).toEqual({
        goatcounterApiKey: `key-${language.code}`,
      })
    })
  })

  it('rejects a stale version without writing', async () => {
    stage()
    const before = redis.store.get('site:config')
    const proposed = document({
      ids: SAVED_ORDER,
      code: 'zh-TW',
      title: '王瀚哲的頁面',
      intro: CUSTOM_INTRO,
    })
    const response = await put({ ...proposed, settings: SETTINGS, baseVersion: 24 })
    expect(response.status).toBe(409)
    expect(redis.store.get('site:config')).toBe(before)
    expect(redis.writes.filter((key) => key === 'site:config')).toEqual([])
  })

  it('keeps social and language array order through normalize and a save', async () => {
    stage()
    const socials = [...seed.socials].reverse()
    const languages = [...seed.i18n.languages].reverse()
    const proposed = {
      site: seed.site,
      profile: seed.profile,
      socials,
      i18n: { ...seed.i18n, languages, fallback: 'en' },
    }
    const normalized = normalizeConfig(proposed, 26)
    expect(normalized.socials.map((link) => link.id)).toEqual(socials.map((link) => link.id))
    expect(normalized.i18n.languages.map((language) => language.code)).toEqual(languages.map((language) => language.code))
    expect(normalizeConfig(normalized, 26)).toEqual(normalized)

    const response = await put({ ...proposed, settings: SETTINGS, baseVersion: 25 })
    expect(response.status).toBe(200)
    const body = await get()
    expect(body.socials.map((link) => link.id)).toEqual(socials.map((link) => link.id))
    expect(body.i18n.languages.map((language) => language.code)).toEqual(['zh-TW', 'ru', 'en'])
  })

  it('round-trips the site name, handle, and avatar with the same pipeline', async () => {
    stage()
    const proposed = normalizeConfig(
      {
        ...seed,
        site: { name: 'Persisted Name', domain: seed.site.domain, twitterHandle: '@hanche' },
        profile: { avatar: 'https://cdn.example/a.jpg' },
        socials: seed.socials,
        i18n: seed.i18n,
      },
      25,
    )
    const response = await put({ ...proposed, settings: { ...SETTINGS, timezone: 'Europe/Paris' }, baseVersion: 25 })
    expect(response.status).toBe(200)
    const body = await get()
    const { scripts: _scripts, ...publicConfig } = body
    expect(publicConfig).toEqual(normalizeConfig(proposed, 26))
    expect(publicConfig.site.name).toBe('Persisted Name')
    expect(publicConfig.site.twitterHandle).toBe('@hanche')
    expect(publicConfig.profile.avatar).toBe('https://cdn.example/a.jpg')
    const raw = JSON.parse(String(redis.store.get('site:config'))) as { settings: { timezone?: string } }
    expect(raw.settings.timezone).toBe('Europe/Paris')
  })
})
