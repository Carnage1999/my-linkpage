/**
 * Build-time script — updates <lastmod> dates in public/sitemap.xml
 * to the current date (YYYY-MM-DD).
 *
 * Usage:  npx tsx scripts/update-sitemap-lastmod.ts
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = join(import.meta.dirname, '..')
const sitemapPath = join(ROOT, 'public/sitemap.xml')

const today = new Date().toISOString().slice(0, 10)

interface SeedI18n {
  site?: { domain?: string }
  i18n?: { languages?: Array<{ code?: string }> }
}

/** hreflang entries for the languages enabled in the seed. */
export function sitemapAlternates(domain: string, codes: readonly string[]): string {
  const links = codes.map(
    (code) => `    <xhtml:link rel="alternate" hreflang="${code}" href="https://${domain}/?lng=${code}" />`,
  )
  links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}/" />`)
  return links.join('\n')
}

function writeSitemap(): void {
  const xml = readFileSync(sitemapPath, 'utf-8')
  const seed = JSON.parse(readFileSync(join(ROOT, 'public/siteConfig.json'), 'utf-8')) as SeedI18n
  const domain = seed.site?.domain || 'link.w1999.me'
  const codes = (seed.i18n?.languages ?? [])
    .map((language) => language.code)
    .filter((code): code is string => Boolean(code))
  const alternates = sitemapAlternates(domain, codes.length > 0 ? codes : ['en', 'ru', 'zh-TW'])
  const withLanguages = xml.replace(/(?:\s*<xhtml:link rel="alternate"[\s\S]*?\/>)+/, `\n${alternates}`)
  const updated = withLanguages.replace(
    /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g,
    `<lastmod>${today}</lastmod>`,
  )

  writeFileSync(sitemapPath, updated, 'utf-8')
  console.log(`✔ sitemap.xml lastmod updated to ${today}`)
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) writeSitemap()
