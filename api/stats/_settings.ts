/**
 * Provider settings stored in Upstash. Secret fields are AES-GCM ciphertext.
 * Environment variables override stored values and lock the field in /manage.
 *
 * Changing STATS_SECRET (or STATS_PASSWORD, when it is the key) makes stored
 * secrets unreadable. Re-enter them on /manage.
 */

import { safeScriptUrl, safeToken } from '../../src/lib/safeUrl'
import { decryptJson, encryptJson, secretKeyMaterial } from './_crypto'
import { DEFAULT_STATS_TIMEZONE } from './_dates'
import { redisKey } from './_keys'
import { isRedisConfigured, redisCommand } from './_redis'
import { compareAndSetManaged, readManaged, readManagedStrict, siteCacheGeneration } from './_site-store'
import { normalizeConfig, SiteConflictError, SiteValidationError, type PublicSiteConfig } from './_site-schema'
import { isVisitorProvider, VISITOR_PROVIDERS, type VisitorProviderId } from './_providers/types'

function legacyKey(): string {
  return redisKey('stats:settings')
}

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
}

export interface SettingsInput {
  timezone?: string
  defaultProvider?: VisitorProviderId | null
  inject: { umami: boolean; goatcounter: boolean; cloudflare: boolean }
  umami: { apiUrl: string; websiteId: string; username: string }
  goatcounter: { site: string }
  cloudflare: { accountId: string; siteTag: string }
}

export type SecretWrites = Partial<Record<keyof SecretBag, string | null>>

const SECRET_FIELDS: readonly { key: keyof SecretBag; env: string }[] = [
  { key: 'umamiApiKey', env: 'UMAMI_API_KEY' },
  { key: 'umamiPassword', env: 'UMAMI_PASSWORD' },
  { key: 'goatcounterApiKey', env: 'GOATCOUNTER_API_KEY' },
  { key: 'cloudflareApiToken', env: 'CLOUDFLARE_API_TOKEN' },
]

export class SettingsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SettingsError'
  }
}

let decoded: { generation: number; stored: StoredSettings; secrets: SecretBag } | null = null

export function __resetSettingsCache(): void {
  decoded = null
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

const UMAMI_CLOUD_SCRIPT = 'https://cloud.umami.is/script.js'

/** Cloud script host is not the API host. https://docs.umami.is/docs/api */
export function umamiScriptSrc(apiUrl: string): string {
  const fallback = safeScriptUrl(UMAMI_CLOUD_SCRIPT) ?? UMAMI_CLOUD_SCRIPT
  if (!apiUrl.trim()) return fallback
  let url: URL
  try {
    url = new URL(apiUrl)
  } catch {
    return fallback
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.hostname === '') return fallback
  if (url.hostname === 'api.umami.is' || url.hostname === 'cloud.umami.is') return fallback
  return safeScriptUrl(`${url.origin}/script.js`) ?? fallback
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

function flag(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new SettingsError(`${field} must be true or false`)
  return value
}

function section(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SettingsError(`${field} must be an object`)
  return value as Record<string, unknown>
}

/** Canonical public settings. The same function on the way in and, once stored, on the way out. */
export function normalizeSettings(input: unknown): StoredSettings {
  const body = section(input, 'Settings')
  const timezone = typeof body.timezone === 'string' && body.timezone.trim() ? assertTimezone(body.timezone) : undefined
  let defaultProvider: VisitorProviderId | null = null
  if (body.defaultProvider != null && body.defaultProvider !== '') {
    if (typeof body.defaultProvider !== 'string' || !isVisitorProvider(body.defaultProvider)) {
      throw new SettingsError('Unknown provider')
    }
    defaultProvider = body.defaultProvider
  }
  const inject = section(body.inject, 'Inject')
  const umami = section(body.umami, 'Umami')
  const goatcounter = section(body.goatcounter, 'GoatCounter')
  const cloudflare = section(body.cloudflare, 'Cloudflare')
  const site = normalizeGoatcounterSite(typeof goatcounter.site === 'string' ? goatcounter.site : '')
  if (site && !/^[a-z0-9_-]{1,80}$/.test(site)) throw new SettingsError('GoatCounter site is invalid')
  return {
    v: 1,
    ...(timezone ? { timezone } : {}),
    defaultProvider,
    inject: {
      umami: flag(inject.umami, 'Umami inject'),
      goatcounter: flag(inject.goatcounter, 'GoatCounter inject'),
      cloudflare: flag(inject.cloudflare, 'Cloudflare inject'),
    },
    umami: {
      apiUrl: assertHttpsOrigin(typeof umami.apiUrl === 'string' ? umami.apiUrl : '', 'Umami API URL'),
      websiteId: assertToken(typeof umami.websiteId === 'string' ? umami.websiteId : '', 'Umami website id', /^[A-Za-z0-9_-]{0,80}$/),
      username: (typeof umami.username === 'string' ? umami.username : '').trim().slice(0, 80),
    },
    goatcounter: { site },
    cloudflare: {
      accountId: assertToken(
        typeof cloudflare.accountId === 'string' ? cloudflare.accountId : '',
        'Cloudflare account id',
        /^[A-Za-z0-9]{0,64}$/,
      ),
      siteTag: assertToken(
        typeof cloudflare.siteTag === 'string' ? cloudflare.siteTag : '',
        'Cloudflare site tag',
        /^[A-Za-z0-9_-]{0,64}$/,
      ),
    },
  }
}

/** One loop for every secret. Omitted keeps the ciphertext, null clears it, a string replaces it. */
export function applySecretWrites(current: SecretBag, writes: unknown): SecretBag {
  const next: SecretBag = { ...current }
  if (writes == null) return next
  const body = section(writes, 'Secrets')
  for (const field of SECRET_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(body, field.key)) continue
    if (env(field.env)) continue
    const value = body[field.key]
    if (value === null) {
      delete next[field.key]
      continue
    }
    if (typeof value !== 'string' || !value.trim()) continue
    if (value.length > 500) throw new SettingsError('Secret is too long')
    next[field.key] = value.trim()
  }
  return next
}

export function publicScriptsFrom(effective: EffectiveSettings): PublicScripts {
  const websiteId = safeToken(effective.view.umami.websiteId.value)
  const site = safeToken(effective.view.goatcounter.site.value)
  const siteTag = safeToken(effective.view.cloudflare.siteTag.value)
  const umamiSrc = safeScriptUrl(umamiScriptSrc(effective.view.umami.apiUrl.value))
  const goatEndpoint = site ? safeScriptUrl(`https://${site}.goatcounter.com/count`) : null
  return {
    umami: effective.inject.umami && websiteId && umamiSrc ? { websiteId, src: umamiSrc } : null,
    goatcounter: effective.inject.goatcounter && goatEndpoint ? { endpoint: goatEndpoint } : null,
    cloudflare: effective.inject.cloudflare && siteTag ? { token: siteTag } : null,
  }
}

async function decodeSettings(raw: unknown): Promise<{ stored: StoredSettings; secrets: SecretBag }> {
  const record = raw as StoredSettings
  const material = secretKeyMaterial()
  const secrets = record.secrets && material ? ((await decryptJson<SecretBag>(material, record.secrets)) ?? {}) : {}
  const stored = { ...record, v: 1 as const }
  delete stored.secrets
  try {
    return { stored: normalizeSettings(stored), secrets }
  } catch {
    return { stored, secrets }
  }
}

async function readLegacy(): Promise<{ stored: StoredSettings; secrets: SecretBag }> {
  if (!isRedisConfigured()) return { stored: { v: 1 }, secrets: {} }
  try {
    const response = await redisCommand(['GET', legacyKey()])
    if (typeof response.result !== 'string' || !response.result) return { stored: { v: 1 }, secrets: {} }
    return decodeSettings(JSON.parse(response.result) as StoredSettings)
  } catch {
    return { stored: { v: 1 }, secrets: {} }
  }
}

async function readStored(options?: { fresh?: boolean }): Promise<{ stored: StoredSettings; secrets: SecretBag }> {
  if (options?.fresh) decoded = null
  if (decoded && decoded.generation === siteCacheGeneration()) return decoded
  const managed = await readManaged(options)
  const value = managed.settings != null ? await decodeSettings(managed.settings) : await readLegacy()
  decoded = { generation: siteCacheGeneration(), ...value }
  return value
}

export async function loadEffective(options?: { fresh?: boolean }): Promise<EffectiveSettings> {
  const { stored, secrets } = await readStored(options)
  return buildEffective(stored, secrets)
}

export async function resolveTimeZone(): Promise<string> {
  if (env('STATS_TIMEZONE')) return env('STATS_TIMEZONE')
  return (await loadEffective()).timezone
}

export interface ManagedSave {
  site: PublicSiteConfig
  effective: EffectiveSettings
}

/**
 * The only write. The body is the whole config the editor had, plus the version
 * it loaded. A mismatch is rejected. Nothing is merged field by field.
 */
export async function commitManagedConfig(input: unknown): Promise<ManagedSave> {
  if (!isRedisConfigured()) throw new SettingsError('Redis is not configured')
  const material = secretKeyMaterial()
  if (!material) throw new SettingsError('STATS_PASSWORD or STATS_SECRET is required')
  if (!input || typeof input !== 'object') throw new SiteValidationError('Config must be an object')
  const body = input as Record<string, unknown>
  if (typeof body.baseVersion !== 'number' || !Number.isInteger(body.baseVersion)) {
    throw new SiteValidationError('baseVersion is required')
  }
  const currentDoc = await readManagedStrict()
  if (body.baseVersion !== currentDoc.site.version) throw new SiteConflictError(currentDoc.site.version)
  const current = currentDoc.settings != null ? await decodeSettings(currentDoc.settings) : await readLegacy()
  const site = normalizeConfig(body, currentDoc.site.version + 1)
  const settings = normalizeSettings(body.settings)
  const secrets = applySecretWrites(current.secrets, body.secrets)
  const wrote = await compareAndSetManaged(currentDoc.raw, site, {
    ...settings,
    secrets: await encryptJson(material, secrets),
  })
  if (!wrote) {
    const latest = await readManagedStrict()
    throw new SiteConflictError(latest.site.version)
  }
  decoded = { generation: siteCacheGeneration(), stored: settings, secrets }
  return { site, effective: buildEffective(settings, secrets) }
}

export async function previewDraft(draft: { settings?: unknown; secrets?: unknown } | undefined): Promise<EffectiveSettings> {
  const current = await readStored({ fresh: true })
  if (!draft?.settings) return buildEffective(current.stored, current.secrets)
  return buildEffective(normalizeSettings(draft.settings), applySecretWrites(current.secrets, draft.secrets))
}

export { VISITOR_PROVIDERS }
