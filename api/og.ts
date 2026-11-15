/**
 * Node.js Function — GET /api/og, a 1200×630 PNG of the runtime site config.
 *
 * Local helpers are imported from `./_ogdeps.js`, which `pnpm build` emits
 * and gitignores. Vercel's file tracer follows that `.js` file. The resvg
 * addon is the real file under pnpm's store (`includeFiles` in vercel.json);
 * requiring the package name would follow a symlink, which Vercel rejects.
 *
 * https://vercel.com/docs/functions/runtimes/node-js
 * https://vercel.com/docs/project-configuration/vercel-json#functions
 */

import { createRequire } from 'node:module'
import satori from 'satori'
import {
  canonicalLocale,
  canonicalOgUrl,
  hashClientIp,
  readPublicDocument,
  shareSubtitle,
  SITE_BROWSER_CACHE,
  SITE_CDN_CACHE,
  siteCacheTag,
} from './_ogdeps.js'

const nativeRequire = createRequire(import.meta.url)

/** Matches the direct dependency @resvg/resvg-js-linux-x64-gnu@2.6.2. A real file, not a symlink. */
const LINUX_X64_GNU =
  '../node_modules/.pnpm/@resvg+resvg-js-linux-x64-gnu@2.6.2/node_modules/@resvg/resvg-js-linux-x64-gnu/resvgjs.linux-x64-gnu.node'

function loadResvg(): typeof import('@resvg/resvg-js') {
  if (process.platform !== 'linux' || process.arch !== 'x64') {
    return nativeRequire('@resvg/resvg-js') as typeof import('@resvg/resvg-js')
  }
  const binding = nativeRequire(LINUX_X64_GNU) as {
    Resvg: new (svg: string, options?: string) => InstanceType<typeof import('@resvg/resvg-js').Resvg>
  }
  class Resvg extends binding.Resvg {
    constructor(svg: string, options?: object) {
      super(svg, options ? JSON.stringify(options) : undefined)
    }
  }
  return { Resvg } as typeof import('@resvg/resvg-js')
}

const { Resvg } = loadResvg()

interface SocialLinkEntry {
  id: string
  label: string
  url: string
  iconSlug?: string
}

const WIDTH = 1200
const HEIGHT = 630
const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2'

let fontCache: { manrope: ArrayBuffer; spaceGrotesk: ArrayBuffer } | null = null

async function googleFontUrl(family: string, weight: number): Promise<string> {
  const params = new URLSearchParams({ family: `${family}:wght@${weight}` })
  const cssRes = await fetch(`${GOOGLE_FONTS_BASE}?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
  })
  if (!cssRes.ok) throw new Error(`Font CSS failed: ${cssRes.status}`)
  const css = await cssRes.text()
  const match = css.match(/src:\s*url\(([^)]+)\)/)
  if (!match) throw new Error(`Could not extract font URL for ${family}@${weight}`)
  return match[1]
}

async function loadFonts() {
  if (fontCache) return fontCache
  const [manropeTtfUrl, spaceGroteskTtfUrl] = await Promise.all([googleFontUrl('Manrope', 700), googleFontUrl('Space Grotesk', 700)])
  const [manrope, spaceGrotesk] = await Promise.all([
    fetch(manropeTtfUrl).then((response) => {
      if (!response.ok) throw new Error(`Font file failed: ${response.status}`)
      return response.arrayBuffer()
    }),
    fetch(spaceGroteskTtfUrl).then((response) => {
      if (!response.ok) throw new Error(`Font file failed: ${response.status}`)
      return response.arrayBuffer()
    }),
  ])
  fontCache = { manrope, spaceGrotesk }
  return fontCache
}

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
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' },
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
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexWrap: 'wrap' as const, gap: '12px' },
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

function fallbackLocation(request: Request): string {
  try {
    return new URL('/og-image.png', request.url).href
  } catch {
    return '/og-image.png'
  }
}

const NO_STORE = 'private, no-store'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const canonical = canonicalOgUrl(url)
  if (canonical.href !== url.href) {
    return new Response(null, { status: 308, headers: { Location: canonical.href, 'Cache-Control': NO_STORE } })
  }

  try {
    const read = await readPublicDocument(await hashClientIp(request))
    if (read.kind === 'limited') return new Response(null, { status: 429, headers: { 'Cache-Control': NO_STORE } })
    if (read.kind !== 'ready') {
      return new Response(null, { status: 302, headers: { Location: fallbackLocation(request), 'Cache-Control': NO_STORE } })
    }
    const config = read.site
    const requestedRaw = url.searchParams.get('lng')
    const requested = requestedRaw ? canonicalLocale(requestedRaw) : null
    const codes = config.i18n.languages.map((language) => language.code)
    if (requestedRaw && (!requested || !codes.includes(requested))) {
      const fallback = codes.includes(config.i18n.fallback) ? config.i18n.fallback : codes[0]
      const dest = new URL('/api/og', request.url)
      if (fallback) dest.searchParams.set('lng', fallback)
      return new Response(null, { status: 307, headers: { Location: dest.href, 'Cache-Control': NO_STORE } })
    }
    if (requested && requestedRaw !== requested) {
      const dest = new URL('/api/og', request.url)
      dest.searchParams.set('lng', requested)
      return new Response(null, { status: 307, headers: { Location: dest.href, 'Cache-Control': NO_STORE } })
    }
    const fonts = await loadFonts()
    const name = config.site?.name ?? 'Han-che Wang'
    const tagline = shareSubtitle({ requested, i18n: config.i18n })
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

    const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng()
    return new Response(new Uint8Array(png) as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': SITE_BROWSER_CACHE,
        'CDN-Cache-Control': SITE_CDN_CACHE,
        'Vercel-CDN-Cache-Control': SITE_CDN_CACHE,
        'Vercel-Cache-Tag': siteCacheTag(),
      },
    })
  } catch (err) {
    console.error('OG generation failed:', err)
    return new Response(null, { status: 302, headers: { Location: fallbackLocation(request), 'Cache-Control': NO_STORE } })
  }
}
