/**
 * Serverless Function — generates an Open Graph image (1200×630 PNG)
 * dynamically by reading the current /siteConfig.json at request time.
 *
 * Endpoint:  GET /api/og
 *
 * Uses Web Standard Request/Response — works on Vercel Edge, Cloudflare,
 * Netlify, and any platform supporting @resvg/resvg-js.
 *
 * This means the OG image always reflects the latest config —
 * no redeploy needed when social links change.
 */

import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'

// ─── Types (mirroring siteConfig.ts) ─────────────────────

interface SocialLinkEntry {
  id: string
  label: string
  url: string
  iconSlug?: string
}

interface SiteMetadata {
  name: string
  tagline: string
  domain: string
  twitterHandle?: string
}

interface SiteConfig {
  site?: SiteMetadata
  profile: { avatar: string }
  socials: SocialLinkEntry[]
}

// ─── Constants ───────────────────────────────────────────

const WIDTH = 1200
const HEIGHT = 630

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2'

// ─── Font helpers (cached for warm starts) ───────────────

let fontCache: { manrope: ArrayBuffer; spaceGrotesk: ArrayBuffer } | null = null

async function getGoogleFontUrl(family: string, weight: number): Promise<string> {
  const params = new URLSearchParams({ family: `${family}:wght@${weight}` })
  const cssRes = await fetch(`${GOOGLE_FONTS_BASE}?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
  })
  const css = await cssRes.text()
  const match = css.match(/src:\s*url\(([^)]+)\)/)
  if (!match) throw new Error(`Could not extract font URL for ${family}@${weight}`)
  return match[1]
}

async function loadFonts() {
  if (fontCache) return fontCache

  const [manropeTtfUrl, spaceGroteskTtfUrl] = await Promise.all([
    getGoogleFontUrl('Manrope', 700),
    getGoogleFontUrl('Space Grotesk', 700),
  ])

  const [manrope, spaceGrotesk] = await Promise.all([
    fetch(manropeTtfUrl).then((r) => r.arrayBuffer()),
    fetch(spaceGroteskTtfUrl).then((r) => r.arrayBuffer()),
  ])

  fontCache = { manrope, spaceGrotesk }
  return fontCache
}

// ─── Config loader ───────────────────────────────────────

async function loadConfig(origin: string): Promise<SiteConfig> {
  const res = await fetch(`${origin}/siteConfig.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`)
  return res.json() as Promise<SiteConfig>
}

// ─── OG Layout (satori JSX-like object tree) ─────────────

function buildMarkup(socials: SocialLinkEntry[], name: string, tagline: string, domain: string) {
  return {
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
                  children: name,
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
                  children: tagline,
                },
              },
              // Social pills — dynamically built from config
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexWrap: 'wrap' as const,
                    gap: '12px',
                  },
                  children: socials.map((s) => ({
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
                      children: s.label,
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
                  children: domain,
                },
              },
            ],
          },
        },
      ],
    },
  } as const
}

// ─── Handler ─────────────────────────────────────────────

export default async function handler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const origin = url.origin

    const [config, fonts] = await Promise.all([loadConfig(origin), loadFonts()])

    const name = config.site?.name ?? 'Han-che Wang'
    const tagline = config.site?.tagline ?? 'Links & Socials'
    const domain = config.site?.domain ?? 'link.w1999.me'
    const markup = buildMarkup(config.socials, name, tagline, domain)

    const svg = await satori(markup as Parameters<typeof satori>[0], {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Manrope', data: fonts.manrope, weight: 400, style: 'normal' as const },
        { name: 'Manrope', data: fonts.manrope, weight: 600, style: 'normal' as const },
        { name: 'Manrope', data: fonts.manrope, weight: 700, style: 'normal' as const },
        { name: 'Space Grotesk', data: fonts.spaceGrotesk, weight: 700, style: 'normal' as const },
      ],
    })

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
    const png = resvg.render().asPng()

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (err) {
    console.error('OG generation failed:', err)
    // Fallback: redirect to static OG image
    return Response.redirect(new URL('/og-image.png', request.url).href, 302)
  }
}
