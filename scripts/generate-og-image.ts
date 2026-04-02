/**
 * Build-time script — generates a personalised Open Graph image
 * using satori (JSX → SVG) and @resvg/resvg-js (SVG → PNG).
 *
 * Usage:  npx tsx scripts/generate-og-image.ts
 * Output: public/og-image.png  (1200 × 630)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'

// ─── Config (read from siteConfig.json at build time) ────
const ROOT = join(import.meta.dirname, '..')
const configRaw = readFileSync(join(ROOT, 'public/siteConfig.json'), 'utf-8')
const config = JSON.parse(configRaw) as { site?: { name: string; tagline: string; domain: string }; socials: { label: string }[] }
const NAME = config.site?.name ?? 'Han-che Wang'
const TAGLINE = config.site?.tagline ?? 'Links & Socials'
const DOMAIN = config.site?.domain ?? 'link.w1999.me'
const SOCIALS = config.socials.map((s) => s.label)

// ─── Fonts (Google Fonts API returns TTF when asked) ─────

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch font: ${res.statusText}`)
  return res.arrayBuffer()
}

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2'

/**
 * Google Fonts serves different formats based on User-Agent.
 * A simple UA string makes it return .ttf links.
 */
async function getGoogleFontUrl(family: string, weight: number): Promise<string> {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
  })
  const cssRes = await fetch(`${GOOGLE_FONTS_BASE}?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
  })
  const css = await cssRes.text()
  const match = css.match(/src:\s*url\(([^)]+)\)/)
  if (!match) throw new Error(`Could not extract font URL for ${family}@${weight}`)
  return match[1]
}

// ─── Layout (satori uses a subset of CSS flexbox) ────────
const WIDTH = 1200
const HEIGHT = 630

const markup = {
  type: 'div',
  props: {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: 'Manrope',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    },
    children: [
      // Decorative blobs
      {
        type: 'div',
        props: {
          style: {
            position: 'absolute',
            top: '-80px',
            left: '-60px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,191,36,0.35), transparent 70%)',
          },
        },
      },
      {
        type: 'div',
        props: {
          style: {
            position: 'absolute',
            bottom: '-100px',
            right: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)',
          },
        },
      },
      {
        type: 'div',
        props: {
          style: {
            position: 'absolute',
            top: '180px',
            right: '200px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,114,182,0.2), transparent 70%)',
          },
        },
      },
      // Content
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 80px',
            width: '100%',
            height: '100%',
            position: 'relative',
          },
          children: [
            // Status badge
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '24px',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#6ee7b7',
                        boxShadow: '0 0 0 4px rgba(110,231,183,0.2)',
                      },
                    },
                  },
                  {
                    type: 'span',
                    props: {
                      style: {
                        fontSize: '18px',
                        fontWeight: 600,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase' as const,
                        color: 'rgba(255,255,255,0.6)',
                      },
                      children: 'Link Page',
                    },
                  },
                ],
              },
            },
            // Name
            {
              type: 'h1',
              props: {
                style: {
                  fontSize: '72px',
                  fontWeight: 700,
                  fontFamily: 'Space Grotesk',
                  lineHeight: 1.1,
                  margin: '0 0 12px 0',
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(90deg, #fff 0%, #e2e8f0 100%)',
                  backgroundClip: 'text',
                  color: 'transparent',
                },
                children: NAME,
              },
            },
            // Tagline
            {
              type: 'p',
              props: {
                style: {
                  fontSize: '28px',
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.55)',
                  margin: '0 0 40px 0',
                },
                children: TAGLINE,
              },
            },
            // Social pills
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexWrap: 'wrap' as const,
                  gap: '12px',
                },
                children: SOCIALS.map((name) => ({
                  type: 'div',
                  props: {
                    style: {
                      padding: '10px 22px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.08)',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.75)',
                    },
                    children: name,
                  },
                })),
              },
            },
            // Domain at bottom
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  bottom: '50px',
                  right: '80px',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.05em',
                },
                children: DOMAIN,
              },
            },
          ],
        },
      },
    ],
  },
} as const

// ─── Generate ────────────────────────────────────────────
async function main() {
  console.log('Fetching fonts from Google Fonts...')

  const [manropeTtfUrl, spaceGroteskTtfUrl] = await Promise.all([
    getGoogleFontUrl('Manrope', 700),
    getGoogleFontUrl('Space Grotesk', 700),
  ])

  const [manrope, spaceGrotesk] = await Promise.all([
    fetchFont(manropeTtfUrl),
    fetchFont(spaceGroteskTtfUrl),
  ])

  const svg = await satori(markup as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Manrope', data: manrope, weight: 400, style: 'normal' as const },
      { name: 'Manrope', data: manrope, weight: 600, style: 'normal' as const },
      { name: 'Manrope', data: manrope, weight: 700, style: 'normal' as const },
      { name: 'Space Grotesk', data: spaceGrotesk, weight: 700, style: 'normal' as const },
    ],
  })

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
  })
  const png = resvg.render().asPng()

  const outPath = join(ROOT, 'public/og-image.png')
  writeFileSync(outPath, png)
  console.log(`✓ Generated ${outPath} (${WIDTH}×${HEIGHT})`)
}

main().catch((err: unknown) => {
  console.error('Failed to generate OG image:', err)
  process.exit(1)
})
