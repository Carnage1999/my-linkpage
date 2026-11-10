/**
 * Build-time list of images the avatar picker can use.
 * Only files shipped in public/ are included, so the site serves them
 * from its own domain. OG images and the Vite placeholder are skipped.
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const PUBLIC_DIR = join(ROOT, 'public')
const OUT = join(ROOT, 'src/generated/public-images.json')
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg'])
const SKIP = new Set(['og-image.png', 'vite.svg', 'favicon.ico', 'favicon.png', 'favicon.svg'])

const images = readdirSync(PUBLIC_DIR)
  .filter((name) => {
    const lower = name.toLowerCase()
    const dot = lower.lastIndexOf('.')
    if (dot === -1) return false
    if (SKIP.has(lower) || lower.startsWith('favicon') || lower.startsWith('apple-touch')) return false
    return EXTENSIONS.has(lower.slice(dot))
  })
  .sort()
  .map((name) => `/${name}`)

mkdirSync(join(ROOT, 'src/generated'), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(images, null, 2)}\n`)
console.log(`public images: ${images.join(', ') || '(none)'}`)
