/**
 * Full Simple Icons catalog. Import this only from /manage (lazy) and the
 * site-config API. The homepage renders stored SVG paths and must not import it.
 *
 * simple-icons v16: `import * as icons from 'simple-icons'` iterates every icon
 * (`title`, `slug`, `path`). Aliases live in `simple-icons/icons.json`.
 * `slugToVariableName` is the old `siGithub` export name.
 * https://github.com/simple-icons/simple-icons#node-usage
 */

import * as simpleIcons from 'simple-icons'
import type { SimpleIcon } from 'simple-icons'
import iconData from 'simple-icons/icons.json'
import type { Aliases } from 'simple-icons/sdk'
import { LINKEDIN_PATH } from './paths'

/**
 * Same rules as `titleToSlug` and `slugToVariableName` in simple-icons/sdk.
 * Inlined so this module does not import the SDK, which reads the filesystem
 * and cannot run in the browser.
 * https://github.com/simple-icons/simple-icons/blob/develop/sdk.mjs
 */
const TITLE_TO_SLUG_REPLACEMENTS: Record<string, string> = {
  '+': 'plus',
  '.': 'dot',
  '&': 'and',
  đ: 'd',
  ħ: 'h',
  ı: 'i',
  ĸ: 'k',
  ŀ: 'l',
  ł: 'l',
  ß: 'ss',
  ŧ: 't',
  ø: 'o',
}

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(/[+.]|&|đ|ħ|ı|ĸ|ŀ|ł|ß|ŧ|ø/gv, (char) => TITLE_TO_SLUG_REPLACEMENTS[char] ?? '')
    .normalize('NFD')
    .replaceAll(/[^a-z\d]/gv, '')
}

function slugToVariableName(slug: string): string {
  return `si${slug[0]?.toUpperCase() ?? ''}${slug.slice(1)}`
}

export interface IconRecord {
  slug: string
  title: string
  path: string
  aliases: string[]
}

/**
 * Hosts whose second-level label is not the brand slug or an official alias.
 * Everything else is matched from the hostname label against slug, title, and aliases.
 */
const HOST_ALIASES: Record<string, string> = {
  't.me': 'telegram',
  'youtu.be': 'youtube',
  'wa.me': 'whatsapp',
  'fb.com': 'facebook',
  'fb.me': 'facebook',
  'npmjs.com': 'npm',
  'dev.to': 'devdotto',
  'weixin.qq.com': 'wechat',
}

/** Extra search words, including Traditional Chinese, for brands people type by name. */
const EXTRA_ALIASES: Record<string, string[]> = {
  github: ['程式碼', '代码'],
  x: ['推特', 'twitter'],
  telegram: ['電報', '电报'],
  line: ['賴', '赖'],
  linkedin: ['領英', '领英'],
  instagram: ['照片牆', 'ig'],
  facebook: ['臉書', '脸书', 'fb'],
  youtube: ['油管'],
  wechat: ['微信'],
  reddit: ['紅迪'],
  tiktok: ['抖音'],
  discord: ['dc'],
}

interface IconMeta {
  slug: string
  aliases?: Aliases
}

let cache: {
  icons: IconRecord[]
  bySlug: Map<string, IconRecord>
  byToken: Map<string, string>
  byVariable: Map<string, string>
} | null = null

function aliasList(meta: Aliases | undefined): string[] {
  if (!meta) return []
  const values = [...(meta.aka ?? []), ...(meta.old ?? [])]
  for (const duplicate of meta.dup ?? []) values.push(duplicate.title)
  if (meta.loc) values.push(...Object.values(meta.loc))
  return values
}

function isIcon(value: unknown): value is SimpleIcon {
  return Boolean(value && typeof value === 'object' && 'slug' in value && 'path' in value && 'title' in value)
}

function load() {
  if (cache) return cache
  const metaBySlug = new Map<string, IconMeta>()
  for (const entry of iconData as IconMeta[]) metaBySlug.set(entry.slug, entry)

  const icons: IconRecord[] = []
  for (const value of Object.values(simpleIcons)) {
    if (!isIcon(value)) continue
    const meta = metaBySlug.get(value.slug)
    icons.push({
      slug: value.slug,
      title: value.title,
      path: value.path,
      aliases: aliasList(meta?.aliases),
    })
  }
  icons.push({
    slug: 'linkedin',
    title: 'LinkedIn',
    path: LINKEDIN_PATH,
    aliases: ['linked in', ...(EXTRA_ALIASES.linkedin ?? [])],
  })
  icons.sort((a, b) => a.title.localeCompare(b.title))

  const bySlug = new Map(icons.map((icon) => [icon.slug, icon]))
  const byToken = new Map<string, string>()
  const byVariable = new Map<string, string>()

  function claim(token: string, slug: string) {
    const key = token.trim().toLowerCase()
    if (!key || byToken.has(key)) return
    byToken.set(key, slug)
  }

  for (const icon of icons) {
    byToken.set(icon.slug, icon.slug)
    byVariable.set(slugToVariableName(icon.slug), icon.slug)
  }
  byVariable.set('siLinkedin', 'linkedin')

  for (const icon of icons) {
    claim(icon.title, icon.slug)
    claim(titleToSlug(icon.title), icon.slug)
    for (const alias of icon.aliases) {
      claim(alias, icon.slug)
      claim(titleToSlug(alias), icon.slug)
    }
    for (const extra of EXTRA_ALIASES[icon.slug] ?? []) claim(extra, icon.slug)
  }

  cache = { icons, bySlug, byToken, byVariable }
  return cache
}

export function allIcons(): readonly IconRecord[] {
  return load().icons
}

/** Accepts a current slug (`github`) or a legacy export name (`siGithub`). */
export function canonicalSlug(value: string | undefined | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const { bySlug, byVariable } = load()
  if (bySlug.has(trimmed)) return trimmed
  const fromVariable = byVariable.get(trimmed)
  if (fromVariable) return fromVariable
  const lower = trimmed.toLowerCase()
  if (bySlug.has(lower)) return lower
  return null
}

export function iconBySlug(value: string | undefined | null): IconRecord | null {
  const slug = canonicalSlug(value)
  return slug ? (load().bySlug.get(slug) ?? null) : null
}

function secondLevelLabel(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
  const labels = host.split('.').filter(Boolean)
  if (labels.length < 2) return labels[0] ?? ''
  return labels[labels.length - 2]
}

/** Match a hostname to an icon slug. Returns null when nothing fits. */
export function matchHostname(hostname: string): string | null {
  const { bySlug, byToken } = load()
  const bare = hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
  const aliased = HOST_ALIASES[bare] ?? HOST_ALIASES[hostname.toLowerCase().replace(/\.$/, '')]
  if (aliased && bySlug.has(aliased)) return aliased
  const label = secondLevelLabel(hostname)
  return byToken.get(label) ?? null
}

export function resolveIconSlug(url: string): string | null {
  try {
    return matchHostname(new URL(url).hostname)
  } catch {
    return null
  }
}

export function searchIcons(query: string, limit = 80): IconRecord[] {
  const needle = query.trim().toLowerCase()
  const icons = allIcons()
  if (!needle) return icons.slice(0, limit)
  const hits: IconRecord[] = []
  for (const icon of icons) {
    if (
      icon.slug.includes(needle) ||
      icon.title.toLowerCase().includes(needle) ||
      icon.aliases.some((alias) => alias.toLowerCase().includes(needle))
    ) {
      hits.push(icon)
      if (hits.length >= limit) break
    }
  }
  return hits
}

/**
 * Manual `iconSlug` wins. Otherwise the URL hostname is matched.
 * The link id is never used as an icon key.
 */
export function resolveStoredIcon(link: { url: string; iconSlug?: string }): {
  iconSlug?: string
  iconPath?: string
} {
  const manual = canonicalSlug(link.iconSlug)
  if (link.iconSlug?.trim() && !manual) {
    throw new Error(`Unknown icon: ${link.iconSlug}`)
  }
  if (manual) {
    const icon = iconBySlug(manual)
    return { iconSlug: manual, ...(icon ? { iconPath: icon.path } : {}) }
  }
  const slug = resolveIconSlug(link.url)
  const icon = slug ? iconBySlug(slug) : null
  return icon ? { iconPath: icon.path } : {}
}
