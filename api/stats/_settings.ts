/**
 * Provider settings stored in Upstash. Secret fields are AES-GCM ciphertext.
 * Environment variables override stored values and lock the field in /manage.
 *
 * Changing STATS_SECRET (or STATS_PASSWORD, when it is the key) makes stored
 * secrets unreadable. Re-enter them on /manage.
 */

import seedFile from '../../public/siteConfig.json'
import type { AnalyticsConfig } from '../../src/siteConfig'
import { decryptJson, encryptJson, secretKeyMaterial } from './_crypto'
import { DEFAULT_STATS_TIMEZONE } from './_dates'
import { isRedisConfigured, redisCommand } from './_redis'
import { isVisitorProvider, VISITOR_PROVIDERS, type VisitorProviderId } from './_providers/types'

const KEY = 'stats:settings'
const CACHE_MS = 60_000

export interface SecretBag {
  goatcounterApiKey?: string
  cloudflareApiToken?: string
  umamiApiKey?: string
  umamiPassword?: string
}

export interface StoredSettings {
  v: 1
  timezone?: string
  defaultProvider?: VisitorProviderId | null
  inject?: { umami?: boolean; goatcounter?: boolean; cloudflare?: boolean }
  umami?: { apiUrl?: string; websiteId?: string; username?: string }
  goatcounter?: { site?: string }
  cloudflare?: { accountId?: string; siteTag?: string }
  secrets?: string
}

export interface TextField {
  value: string
  locked: boolean
}

export interface SecretField {
  state: 'unset' | 'set' | 'env'
  hint: string | null
  locked: boolean
}

export interface ProviderStatus {
  id: VisitorProviderId
  configured: boolean
  missing: string[]
}

export interface SettingsView {
  timezone: TextField
  defaultProvider: VisitorProviderId | null
  inject: { umami: boolean; goatcounter: boolean; cloudflare: boolean }
  umami: {
    apiUrl: TextField
    websiteId: TextField
    username: TextField
    apiKey: SecretField
    password: SecretField
  }
  goatcounter: { site: TextField; apiKey: SecretField }
  cloudflare: { accountId: TextField; siteTag: TextField; apiToken: SecretField }
  providers: ProviderStatus[]
}

export interface UmamiCredentials {
  base: string
  websiteId: string
  scriptSrc: string
  mode: 'key' | 'login'
  apiKey?: string
  username?: string
  password?: string
}

export interface EffectiveSettings {
  timezone: string
  defaultProvider: VisitorProviderId | null
  inject: { umami: boolean; goatcounter: boolean; cloudflare: boolean }
  upstash: boolean
  goatcounter: { site: string; apiKey: string } | null
  cloudflare: { accountId: string; apiToken: string; siteTag: string } | null
  umami: UmamiCredentials | null
  providers: ProviderStatus[]
  view: SettingsView
}

export interface PublicScripts {
  umami: { websiteId: string; src: string } | null
  goatcounter: { endpoint: string } | null
  cloudflare: { token: string } | null
  plausible: { domain: string; src: string } | null
}

export interface SettingsPatch {
  timezone?: string
  defaultProvider?: VisitorProviderId | null
  inject?: { umami?: boolean; goatcounter?: boolean; cloudflare?: boolean }
  umami?: {
    apiUrl?: string
    websiteId?: string
    username?: string
    apiKey?: string | null
    password?: string | null
  }
  goatcounter?: { site?: string; apiKey?: string | null }
  cloudflare?: { accountId?: string; siteTag?: string; apiToken?: string | null }
}

export class SettingsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SettingsError'
  }
}

let cache: { at: number; stored: StoredSettings; secrets: SecretBag } | null = null

export function __resetSettingsCache(): void {
  cache = null
}

function env(name: string): string {
  return process.env[name]?.trim() ?? ''
}

function textField(value: string, locked: boolean): TextField {
  return { value, locked }
}

function secretField(fromEnv: string, stored: string | undefined): SecretField {
  if (fromEnv) return { state: 'env', hint: null, locked: true }
  if (stored) {
    return { state: 'set', hint: stored.length >= 4 ? stored.slice(-4) : null, locked: false }
  }
  return { state: 'unset', hint: null, locked: false }
}

export function normalizeGoatcounterSite(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed)
    const host = url.hostname.toLowerCase()
    if (host.endsWith('.goatcounter.com')) return host.slice(0, -'.goatcounter.com'.length)
    return host
  }
  return trimmed.toLowerCase()
}

/** Cloud script host is not the API host. https://docs.umami.is/docs/api */
export function umamiScriptSrc(apiUrl: string): string {
  if (!apiUrl || apiUrl.includes('api.umami.is') || apiUrl.includes('cloud.umami.is')) {
    return 'https://cloud.umami.is/script.js'
  }
  const origin = apiUrl.replace(/\/$/, '').replace(/\/(api|v1)$/, '')
  return `${origin}/script.js`
}

function umamiApiBase(apiUrl: string, mode: 'key' | 'login'): string {
  if (mode === 'login') {
    if (!apiUrl) throw new SettingsError('Umami API URL is required for username login')
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`
  }
  const origin = apiUrl || 'https://api.umami.is'
  if (origin.endsWith('/v1') || origin.endsWith('/api')) return origin
  if (origin.includes('api.umami.is')) return `${origin}/v1`
  return `${origin}/api`
}

function assertTimezone(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 64) throw new SettingsError('Timezone is invalid')
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date())
  } catch {
    throw new SettingsError('Timezone is invalid')
  }
  return trimmed
}

function assertHttpsOrigin(value: string, label: string): string {
  const trimmed = value.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new SettingsError(`${label} must be an https URL`)
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new SettingsError(`${label} must be an https URL`)
  }
  return url.origin
}

function assertToken(value: string, label: string, pattern: RegExp): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!pattern.test(trimmed)) throw new SettingsError(`${label} is invalid`)
  return trimmed
}

export function buildEffective(stored: StoredSettings, secrets: SecretBag): EffectiveSettings {
  const timezoneEnv = env('STATS_TIMEZONE')
  const timezone = timezoneEnv || stored.timezone || DEFAULT_STATS_TIMEZONE

  const umamiApiUrl = env('UMAMI_API_URL') || stored.umami?.apiUrl || ''
  const umamiWebsiteId = env('UMAMI_WEBSITE_ID') || stored.umami?.websiteId || ''
  const umamiUsername = env('UMAMI_USERNAME') || stored.umami?.username || ''
  const umamiApiKey = env('UMAMI_API_KEY') || secrets.umamiApiKey || ''
  const umamiPassword = env('UMAMI_PASSWORD') || secrets.umamiPassword || ''

  const goatSite = normalizeGoatcounterSite(env('GOATCOUNTER_SITE') || stored.goatcounter?.site || '')
  const goatKey = env('GOATCOUNTER_API_KEY') || secrets.goatcounterApiKey || ''

  const cfAccount = env('CLOUDFLARE_ACCOUNT_ID') || stored.cloudflare?.accountId || ''
  const cfToken = env('CLOUDFLARE_API_TOKEN') || secrets.cloudflareApiToken || ''
  const cfTag = env('CLOUDFLARE_WA_SITE_TAG') || stored.cloudflare?.siteTag || ''

  const umamiReady = Boolean(umamiWebsiteId && (umamiApiKey || (umamiUsername && umamiPassword)))
  const goatReady = Boolean(goatSite && goatKey)
  const cfReady = Boolean(cfAccount && cfToken && cfTag)
  const upstash = isRedisConfigured()

  const inject = {
    umami: umamiWebsiteId ? stored.inject?.umami !== false : false,
    goatcounter: goatSite ? stored.inject?.goatcounter !== false : false,
    cloudflare: cfTag ? stored.inject?.cloudflare !== false : false,
  }

  const providers: ProviderStatus[] = [
    { id: 'upstash', configured: upstash, missing: upstash ? [] : ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
    {
      id: 'goatcounter',
      configured: goatReady,
      missing: [!goatSite ? 'GOATCOUNTER_SITE' : '', !goatKey ? 'GOATCOUNTER_API_KEY' : ''].filter(Boolean),
    },
    {
      id: 'cloudflare',
      configured: cfReady,
      missing: [
        !cfAccount ? 'CLOUDFLARE_ACCOUNT_ID' : '',
        !cfToken ? 'CLOUDFLARE_API_TOKEN' : '',
        !cfTag ? 'CLOUDFLARE_WA_SITE_TAG' : '',
      ].filter(Boolean),
    },
    {
      id: 'umami',
      configured: umamiReady,
      missing: [
        !umamiWebsiteId ? 'UMAMI_WEBSITE_ID' : '',
        !(umamiApiKey || (umamiUsername && umamiPassword)) ? 'UMAMI_API_KEY' : '',
      ].filter(Boolean),
    },
  ]

  const requested = stored.defaultProvider ?? null
  const defaultProvider =
    requested && providers.some((provider) => provider.id === requested && provider.configured) ? requested : null

  let umami: UmamiCredentials | null = null
  if (umamiReady) {
    const mode = umamiApiKey ? 'key' : 'login'
    const base = umamiApiBase(umamiApiUrl, mode)
    umami = {
      base,
      websiteId: umamiWebsiteId,
      scriptSrc: umamiScriptSrc(umamiApiUrl),
      mode,
      ...(umamiApiKey ? { apiKey: umamiApiKey } : { username: umamiUsername, password: umamiPassword }),
    }
  }

  const view: SettingsView = {
    timezone: textField(timezone, Boolean(timezoneEnv)),
    defaultProvider: requested,
    inject,
    umami: {
      apiUrl: textField(umamiApiUrl, Boolean(env('UMAMI_API_URL'))),
      websiteId: textField(umamiWebsiteId, Boolean(env('UMAMI_WEBSITE_ID'))),
      username: textField(umamiUsername, Boolean(env('UMAMI_USERNAME'))),
      apiKey: secretField(env('UMAMI_API_KEY'), secrets.umamiApiKey),
      password: secretField(env('UMAMI_PASSWORD'), secrets.umamiPassword),
    },
    goatcounter: {
      site: textField(goatSite, Boolean(env('GOATCOUNTER_SITE'))),
      apiKey: secretField(env('GOATCOUNTER_API_KEY'), secrets.goatcounterApiKey),
    },
    cloudflare: {
      accountId: textField(cfAccount, Boolean(env('CLOUDFLARE_ACCOUNT_ID'))),
      siteTag: textField(cfTag, Boolean(env('CLOUDFLARE_WA_SITE_TAG'))),
      apiToken: secretField(env('CLOUDFLARE_API_TOKEN'), secrets.cloudflareApiToken),
    },
    providers,
  }

  return {
    timezone,
    defaultProvider,
    inject,
    upstash,
    goatcounter: goatReady ? { site: goatSite, apiKey: goatKey } : null,
    cloudflare: cfReady ? { accountId: cfAccount, apiToken: cfToken, siteTag: cfTag } : null,
    umami,
    providers,
    view,
  }
}

export function applyPatch(
  stored: StoredSettings,
  secrets: SecretBag,
  patch: SettingsPatch,
): { stored: StoredSettings; secrets: SecretBag } {
  const nextStored: StoredSettings = {
    v: 1,
    timezone: stored.timezone,
    defaultProvider: stored.defaultProvider,
    inject: { ...stored.inject },
    umami: { ...stored.umami },
    goatcounter: { ...stored.goatcounter },
    cloudflare: { ...stored.cloudflare },
  }
  const nextSecrets: SecretBag = { ...secrets }

  if (patch.timezone !== undefined && !env('STATS_TIMEZONE')) {
    nextStored.timezone = patch.timezone.trim() ? assertTimezone(patch.timezone) : undefined
  }
  if (patch.defaultProvider !== undefined) {
    if (patch.defaultProvider === null) nextStored.defaultProvider = null
    else if (!isVisitorProvider(patch.defaultProvider)) throw new SettingsError('Unknown provider')
    else nextStored.defaultProvider = patch.defaultProvider
  }
  if (patch.inject) {
    nextStored.inject = {
      umami: patch.inject.umami ?? nextStored.inject?.umami,
      goatcounter: patch.inject.goatcounter ?? nextStored.inject?.goatcounter,
      cloudflare: patch.inject.cloudflare ?? nextStored.inject?.cloudflare,
    }
  }

  if (patch.umami) {
    if (patch.umami.apiUrl !== undefined && !env('UMAMI_API_URL')) {
      nextStored.umami = { ...nextStored.umami, apiUrl: assertHttpsOrigin(patch.umami.apiUrl, 'Umami API URL') }
    }
    if (patch.umami.websiteId !== undefined && !env('UMAMI_WEBSITE_ID')) {
      nextStored.umami = {
        ...nextStored.umami,
        websiteId: assertToken(patch.umami.websiteId, 'Umami website id', /^[A-Za-z0-9_-]{0,80}$/),
      }
    }
    if (patch.umami.username !== undefined && !env('UMAMI_USERNAME')) {
      nextStored.umami = {
        ...nextStored.umami,
        username: patch.umami.username.trim().slice(0, 80),
      }
    }
    if (!env('UMAMI_API_KEY')) assignSecret(nextSecrets, 'umamiApiKey', patch.umami.apiKey)
    if (!env('UMAMI_PASSWORD')) assignSecret(nextSecrets, 'umamiPassword', patch.umami.password)
  }
  if (patch.goatcounter) {
    if (patch.goatcounter.site !== undefined && !env('GOATCOUNTER_SITE')) {
      const site = normalizeGoatcounterSite(patch.goatcounter.site)
      if (site && !/^[a-z0-9_-]{1,80}$/.test(site)) throw new SettingsError('GoatCounter site is invalid')
      nextStored.goatcounter = { site }
    }
    if (!env('GOATCOUNTER_API_KEY')) assignSecret(nextSecrets, 'goatcounterApiKey', patch.goatcounter.apiKey)
  }
  if (patch.cloudflare) {
    if (patch.cloudflare.accountId !== undefined && !env('CLOUDFLARE_ACCOUNT_ID')) {
      nextStored.cloudflare = {
        ...nextStored.cloudflare,
        accountId: assertToken(patch.cloudflare.accountId, 'Cloudflare account id', /^[A-Za-z0-9]{0,64}$/),
      }
    }
    if (patch.cloudflare.siteTag !== undefined && !env('CLOUDFLARE_WA_SITE_TAG')) {
      nextStored.cloudflare = {
        ...nextStored.cloudflare,
        siteTag: assertToken(patch.cloudflare.siteTag, 'Cloudflare site tag', /^[A-Za-z0-9_-]{0,64}$/),
      }
    }
    if (!env('CLOUDFLARE_API_TOKEN')) assignSecret(nextSecrets, 'cloudflareApiToken', patch.cloudflare.apiToken)
  }

  return { stored: nextStored, secrets: nextSecrets }
}

function assignSecret(bag: SecretBag, key: keyof SecretBag, value: string | null | undefined) {
  if (value === undefined) return
  if (value === null) {
    delete bag[key]
    return
  }
  if (value.trim() === '') return
  if (value.length > 500) throw new SettingsError('Secret is too long')
  bag[key] = value.trim()
}

export function publicScriptsFrom(effective: EffectiveSettings): PublicScripts {
  const analytics = (seedFile as { analytics?: AnalyticsConfig | null }).analytics ?? null
  let plausible: PublicScripts['plausible'] = null
  if (analytics?.provider === 'plausible' && analytics.plausibleDomain) {
    const src = analytics.plausibleHost
      ? `${analytics.plausibleHost.replace(/\/$/, '')}/js/script.js`
      : 'https://plausible.io/js/script.js'
    plausible = { domain: analytics.plausibleDomain, src }
  }

  const websiteId = effective.view.umami.websiteId.value
  const site = effective.view.goatcounter.site.value
  const siteTag = effective.view.cloudflare.siteTag.value
  return {
    umami:
      effective.inject.umami && websiteId
        ? { websiteId, src: umamiScriptSrc(effective.view.umami.apiUrl.value) }
        : null,
    goatcounter:
      effective.inject.goatcounter && site
        ? { endpoint: `https://${site}.goatcounter.com/count` }
        : null,
    cloudflare: effective.inject.cloudflare && siteTag ? { token: siteTag } : null,
    plausible,
  }
}

async function readStored(): Promise<{ stored: StoredSettings; secrets: SecretBag }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache
  if (!isRedisConfigured()) return { stored: { v: 1 }, secrets: {} }
  try {
    const response = await redisCommand(['GET', KEY])
    if (typeof response.result !== 'string' || !response.result) return { stored: { v: 1 }, secrets: {} }
    const parsed = JSON.parse(response.result) as StoredSettings
    const material = secretKeyMaterial()
    const secrets =
      parsed.secrets && material ? ((await decryptJson<SecretBag>(material, parsed.secrets)) ?? {}) : {}
    const value = { stored: { ...parsed, v: 1 as const }, secrets }
    cache = { at: Date.now(), ...value }
    return value
  } catch {
    return { stored: { v: 1 }, secrets: {} }
  }
}

export async function loadEffective(): Promise<EffectiveSettings> {
  const { stored, secrets } = await readStored()
  return buildEffective(stored, secrets)
}

export async function resolveTimeZone(): Promise<string> {
  if (env('STATS_TIMEZONE')) return env('STATS_TIMEZONE')
  return (await loadEffective()).timezone
}

export async function saveSettings(patch: SettingsPatch): Promise<EffectiveSettings> {
  if (!isRedisConfigured()) throw new SettingsError('Redis is not configured')
  const material = secretKeyMaterial()
  if (!material) throw new SettingsError('STATS_PASSWORD or STATS_SECRET is required')
  const current = await readStored()
  const next = applyPatch(current.stored, current.secrets, patch)
  const payload: StoredSettings = {
    ...next.stored,
    secrets: await encryptJson(material, next.secrets),
  }
  await redisCommand(['SET', KEY, JSON.stringify(payload)])
  cache = { at: Date.now(), stored: next.stored, secrets: next.secrets }
  return buildEffective(next.stored, next.secrets)
}

export function draftCredentials(effective: EffectiveSettings, patch: SettingsPatch | undefined) {
  if (!patch) return effective
  const secrets: SecretBag = {}
  if (effective.umami?.apiKey) secrets.umamiApiKey = effective.umami.apiKey
  if (effective.umami?.password) secrets.umamiPassword = effective.umami.password
  if (effective.goatcounter?.apiKey) secrets.goatcounterApiKey = effective.goatcounter.apiKey
  if (effective.cloudflare?.apiToken) secrets.cloudflareApiToken = effective.cloudflare.apiToken
  const stored: StoredSettings = {
    v: 1,
    timezone: effective.timezone,
    defaultProvider: effective.defaultProvider,
    inject: effective.inject,
    umami: effective.umami
      ? { apiUrl: effective.view.umami.apiUrl.value, websiteId: effective.umami.websiteId, username: effective.umami.username }
      : { apiUrl: effective.view.umami.apiUrl.value, websiteId: effective.view.umami.websiteId.value, username: effective.view.umami.username.value },
    goatcounter: { site: effective.view.goatcounter.site.value },
    cloudflare: { accountId: effective.view.cloudflare.accountId.value, siteTag: effective.view.cloudflare.siteTag.value },
  }
  const next = applyPatch(stored, secrets, patch)
  return buildEffective(next.stored, next.secrets)
}

export { VISITOR_PROVIDERS }
