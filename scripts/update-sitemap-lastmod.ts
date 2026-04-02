/**
 * Build-time script — updates <lastmod> dates in public/sitemap.xml
 * to the current date (YYYY-MM-DD).
 *
 * Usage:  npx tsx scripts/update-sitemap-lastmod.ts
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const sitemapPath = join(ROOT, 'public/sitemap.xml')

const today = new Date().toISOString().slice(0, 10)

const xml = readFileSync(sitemapPath, 'utf-8')
const updated = xml.replace(
  /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g,
  `<lastmod>${today}</lastmod>`,
)

writeFileSync(sitemapPath, updated, 'utf-8')
console.log(`✔ sitemap.xml lastmod updated to ${today}`)
