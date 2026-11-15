/**
 * Writes iconSlug + iconPath from the installed simple-icons package.
 * LinkedIn uses the custom mark in src/icons/paths.ts.
 *
 *   tsx scripts/generate-site-icons.ts
 *       Refresh public/siteConfig.json. The link id is not an icon.
 *
 *   tsx scripts/generate-site-icons.ts --migrate < in.json > out.json
 *       One-off rewrite of a stored site:config document. Keeps every field
 *       except each link's icon, which becomes the current slug and path.
 *       A previous `siGithub` export name is accepted only here.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { iconBySlug, resolveIconSlug } from '../src/icons/catalog'

interface Social {
  id?: string
  url?: string
  iconSlug?: string
  iconPath?: string
  [key: string]: unknown
}

function legacySlug(value: string): string | null {
  if (!value.startsWith('si') || value.length < 3) return null
  const candidate = `${value[2]?.toLowerCase() ?? ''}${value.slice(3)}`
  return iconBySlug(candidate) ? candidate : null
}

export function iconForLink(link: Social): { iconSlug: string; iconPath: string } | null {
  const requested = typeof link.iconSlug === 'string' ? link.iconSlug.trim() : ''
  const known = requested ? iconBySlug(requested)?.slug ?? legacySlug(requested) : null
  const slug = known ?? (typeof link.url === 'string' ? resolveIconSlug(link.url) : null)
  const icon = slug ? iconBySlug(slug) : null
  return icon ? { iconSlug: icon.slug, iconPath: icon.path } : null
}

type Migrated<T> = Omit<T, 'iconSlug' | 'iconPath'> & { iconSlug?: string; iconPath?: string }

export function migrateSocials<T extends Social>(socials: T[]): Array<Migrated<T>> {
  return socials.map((link) => {
    const icon = iconForLink(link)
    const { iconSlug, iconPath, ...rest } = link
    void iconSlug
    void iconPath
    return { ...rest, ...(icon ?? {}) }
  })
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk))
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    process.stdin.on('error', reject)
  })
}

async function migrateStdin(): Promise<void> {
  const parsed = JSON.parse(await readStdin()) as { socials?: Social[] }
  if (!Array.isArray(parsed.socials)) throw new Error('site config has no socials array')
  parsed.socials = migrateSocials(parsed.socials)
  process.stdout.write(`${JSON.stringify(parsed)}\n`)
}

function refreshSeed(): void {
  const file = join(import.meta.dirname, '../public/siteConfig.json')
  const config = JSON.parse(readFileSync(file, 'utf8')) as { socials?: Social[] }
  if (!Array.isArray(config.socials)) throw new Error('public/siteConfig.json has no socials array')
  config.socials = migrateSocials(config.socials)
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
  const summary = config.socials.map((link) => `${link.id ?? '?'}:${link.iconSlug ?? 'none'}`).join(', ')
  console.log(`site icons: ${summary}`)
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  if (process.argv.includes('--migrate')) await migrateStdin()
  else refreshSeed()
}
