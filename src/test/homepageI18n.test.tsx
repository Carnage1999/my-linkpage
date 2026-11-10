import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import seedFile from '../../public/siteConfig.json'
import { validateSiteConfig } from '../../api/stats/_site-schema'
import { SEO } from '../components/SEO'
import App from '../App'
import { setUiLanguage } from '../i18n/language'
import { canonicalLocale, DEFAULT_HOMEPAGE_I18N, homepageText, mapDetected, shareSubtitle } from '../i18n/homepage'
import { sitemapAlternates } from '../../scripts/update-sitemap-lastmod'
import { readFileSync } from 'node:fs'

const baseSite = {
  site: { name: 'Han-che Wang', tagline: 'Links & Socials', domain: 'link.w1999.me' },
  profile: { avatar: '/avatar.jpg' },
  socials: [] as const,
}

const languages = DEFAULT_HOMEPAGE_I18N.languages

describe('homepage languages', () => {
  it('accepts BCP 47 codes and rejects everything else', () => {
    expect(canonicalLocale('zh-tw')).toBe('zh-TW')
    expect(canonicalLocale('pt-BR')).toBe('pt-BR')
    expect(canonicalLocale('en_US')).toBe('en-US')
    expect(canonicalLocale('english')).toBeNull()
    expect(canonicalLocale('en-US-x-private')).toBeNull()
    expect(canonicalLocale('<script>')).toBeNull()
  })

  it('keeps the old Chinese detection when only zh-TW is enabled', () => {
    const enabled = ['en', 'ru', 'zh-TW']
    expect(mapDetected('zh-CN', enabled, 'en')).toBe('zh-TW')
    expect(mapDetected('ru-RU', enabled, 'en')).toBe('ru')
    expect(mapDetected('fr', enabled, 'en')).toBe('en')
    expect(mapDetected('zh-CN', ['en', 'zh-CN', 'zh-TW'], 'en')).toBe('zh-CN')
  })

  it('drops old overrides and fills every language from the seed', () => {
    const saved = validateSiteConfig(
      {
        ...baseSite,
        i18n: {
          languages,
          fallback: 'en',
          detect: true,
          overrides: { en: { title: 'Han', pageTitle: 'lp' } },
        },
      },
      8,
    )
    expect(saved.i18n).not.toHaveProperty('overrides')
    expect(saved.i18n.texts.en?.title).toBe("Hi, I'm Wang")
    expect(saved.i18n.texts.en?.pageTitle).toBe('Wang — Link Page')
    expect(saved.i18n.texts['zh-TW']?.title).toBe('嗨，我是 Wang')
    expect(saved.i18n.texts.ru?.title).toBe('Привет, я Wang')
  })

  it('keeps an edited line and fills the rest from the seed', () => {
    const saved = validateSiteConfig(
      {
        ...baseSite,
        i18n: {
          languages,
          fallback: 'en',
          detect: true,
          texts: { en: { title: 'Hello there' } },
          overrides: { en: { title: 'Han', pageTitle: 'lp' } },
        },
      },
      9,
    )
    expect(saved.i18n.texts.en?.title).toBe('Hello there')
    expect(saved.i18n.texts.en?.pageTitle).toBe('Wang — Link Page')
    expect(saved.i18n.texts.en?.intro).toBe('I am Han-che Wang.')
    expect(saved.i18n).not.toHaveProperty('overrides')
  })

  it('fills the default languages when a saved document has none', () => {
    const saved = validateSiteConfig(baseSite, 3)
    expect(saved.i18n.languages.map((language) => language.code)).toEqual(['en', 'ru', 'zh-TW'])
    expect(saved.i18n.texts.en?.title).toBe("Hi, I'm Wang")
    expect(saved.i18n.detect).toBe(true)
  })

  it('rejects a bad locale, an unknown key, and a line that is too long', () => {
    expect(() =>
      validateSiteConfig(
        {
          ...baseSite,
          i18n: { ...DEFAULT_HOMEPAGE_I18N, languages: [{ code: 'not a language', label: 'Nope', shortLabel: 'NO' }] },
        },
        1,
      ),
    ).toThrow(/BCP 47/)
    expect(() =>
      validateSiteConfig(
        {
          ...baseSite,
          i18n: { languages, fallback: 'en', detect: true, texts: { en: { manageTitle: 'Nope' } } },
        },
        1,
      ),
    ).toThrow(/Unknown text/)
    expect(() =>
      validateSiteConfig(
        {
          ...baseSite,
          i18n: { languages, fallback: 'en', detect: true, texts: { en: { intro: 'x'.repeat(501) } } },
        },
        1,
      ),
    ).toThrow(/500/)
  })

  it('copies the default language onto a new locale', () => {
    const saved = validateSiteConfig(
      {
        ...baseSite,
        i18n: {
          languages: [...languages, { code: 'fr', label: 'Français', shortLabel: 'FR' }],
          fallback: 'en',
          detect: true,
          texts: { fr: { title: 'Bonjour' } },
        },
      },
      4,
    )
    expect(saved.i18n.texts.fr?.title).toBe('Bonjour')
    expect(saved.i18n.texts.fr?.intro).toBe('I am Han-che Wang.')
    expect(homepageText(saved.i18n, 'fr', 'pageTitle')).toBe('Wang — Link Page')
  })

  it('uses an edited subtitle on the share image and the saved tagline until then', () => {
    expect(shareSubtitle({ requested: null, i18n: DEFAULT_HOMEPAGE_I18N, legacyTagline: 'Links & Socials 123456' })).toBe(
      'Links & Socials 123456',
    )
    expect(
      shareSubtitle({
        requested: 'zh-TW',
        i18n: DEFAULT_HOMEPAGE_I18N,
        legacyTagline: 'Links & Socials 123456',
      }),
    ).toBe('社群與連結')
    const edited = structuredClone(DEFAULT_HOMEPAGE_I18N)
    edited.texts.en = { ...edited.texts.en, subtitle: 'Edited line' }
    expect(shareSubtitle({ requested: 'en', i18n: edited, legacyTagline: 'Links & Socials 123456' })).toBe('Edited line')
  })

  it('shows fetched texts in the heading, title, and description', async () => {
    const config = structuredClone(seedFile)
    config.i18n.texts.en = { ...config.i18n.texts.en, title: 'Hello there', pageTitle: 'Hello — Page', intro: 'Edited intro' }
    config.i18n.texts['zh-TW'] = { ...config.i18n.texts['zh-TW'], title: '漢哲', pageTitle: '連結', intro: '編輯的介紹' }
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => '"site-test"' },
          json: () => Promise.resolve(config),
        }),
      ),
    )
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Hello there' })).toBeInTheDocument()
    expect(document.title).toBe('Hello — Page')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Edited intro')

    setUiLanguage('zh-TW')
    expect(await screen.findByRole('heading', { level: 1, name: '漢哲' })).toBeInTheDocument()
    expect(document.title).toBe('連結')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('編輯的介紹')
  })

  it('uses the display name for the author and lists only enabled languages', () => {
    const view = render(
      <SEO
        site={{ name: 'Han-che Wang', tagline: 'Links & Socials', domain: 'link.w1999.me' }}
        socials={[]}
        ogImagePath="/api/og"
        languages={['en', 'ru']}
      />,
    )
    expect(document.querySelector('meta[name="author"]')?.getAttribute('content')).toBe('Han-che Wang')
    const jsonLd = document.querySelector('script[type="application/ld+json"]')?.textContent ?? ''
    expect(jsonLd).toContain('"name":"Han-che Wang"')
    expect(jsonLd).not.toContain("Hi, I'm Wang")
    expect(view.container.ownerDocument.querySelectorAll('link[rel="alternate"]')).toHaveLength(3)
    const langs = [...document.querySelectorAll('link[hreflang]')].map((node) => node.getAttribute('hreflang'))
    expect(langs).toEqual(['en', 'ru', 'x-default'])
  })

  it('keeps the sitemap alternates aligned with the seed languages', () => {
    const xml = readFileSync('public/sitemap.xml', 'utf8')
    expect(xml).toContain(sitemapAlternates('link.w1999.me', ['en', 'ru', 'zh-TW']))
  })
})
