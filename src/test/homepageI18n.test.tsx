import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import seedFile from '../../public/siteConfig.json'
import enLocale from '../locales/en.json'
import zhTWLocale from '../locales/zh-TW.json'
import App from '../App'
import { validateSiteConfig } from '../../api/stats/_site-schema'
import { SEO } from '../components/SEO'
import i18n from '../i18n'
import { applyHomepageI18n, resetHomepageI18nForTests } from '../i18n/applyHomepage'
import { canonicalLocale, DEFAULT_HOMEPAGE_I18N, mapDetected, shareSubtitle } from '../i18n/publicCopy'
import { sitemapAlternates } from '../../scripts/update-sitemap-lastmod'

const baseSite = {
  site: { name: 'Han-che Wang', tagline: 'Links & Socials', domain: 'link.w1999.me' },
  profile: { avatar: '/avatar.jpg' },
  socials: [] as const,
}

afterEach(async () => {
  resetHomepageI18nForTests()
  applyHomepageI18n(DEFAULT_HOMEPAGE_I18N)
  await i18n.changeLanguage('en')
})

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

  it('stores only overrides and keeps an empty line on the bundled text', () => {
    const saved = validateSiteConfig(
      {
        ...baseSite,
        i18n: {
          ...DEFAULT_HOMEPAGE_I18N,
          overrides: {
            en: { title: '  Hello  ', subtitle: 'Links & socials', intro: '' },
            fr: { title: 'Bonjour' },
          },
          languages: [...DEFAULT_HOMEPAGE_I18N.languages, { code: 'fr', label: 'Français', shortLabel: 'FR' }],
        },
      },
      2,
    )
    expect(saved.i18n.overrides.en).toEqual({ title: 'Hello' })
    expect(saved.i18n.overrides.fr).toEqual({ title: 'Bonjour' })
    expect(saved.i18n.detect).toBe(true)
  })

  it('fills the default languages when a saved document has none', () => {
    const saved = validateSiteConfig(baseSite, 3)
    expect(saved.i18n.languages.map((language) => language.code)).toEqual(['en', 'ru', 'zh-TW'])
    expect(saved.i18n.overrides).toEqual({})
    expect(saved.i18n.detect).toBe(true)
  })

  it('rejects a legacy export name and a bad locale', () => {
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
          i18n: { ...DEFAULT_HOMEPAGE_I18N, overrides: { en: { manageTitle: 'Nope' } } },
        },
        1,
      ),
    ).toThrow(/Unknown text/)
    expect(() =>
      validateSiteConfig(
        {
          ...baseSite,
          i18n: { ...DEFAULT_HOMEPAGE_I18N, overrides: { en: { intro: 'x'.repeat(501) } } },
        },
        1,
      ),
    ).toThrow(/500/)
    expect(() =>
      validateSiteConfig(
        {
          ...baseSite,
          socials: [{ id: 'github', label: 'GitHub', url: 'https://github.com/example', iconSlug: 'siGithub', iconPath: 'M10 10' }],
        },
        1,
      ),
    ).toThrow(/Unknown icon/)
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
    const edited = {
      ...DEFAULT_HOMEPAGE_I18N,
      overrides: { en: { subtitle: 'Edited line' } },
    }
    expect(shareSubtitle({ requested: 'en', i18n: edited, legacyTagline: 'Links & Socials 123456' })).toBe('Edited line')
  })

  it('shows fetched overrides in the heading, title, and description', async () => {
    expect(i18n.options.react).toMatchObject({ bindI18n: 'languageChanged', bindI18nStore: 'added removed' })
    const config = structuredClone(seedFile) as typeof seedFile & {
      i18n: { overrides: Record<string, Record<string, string>> }
    }
    config.i18n.overrides = {
      en: { title: 'Han', pageTitle: 'lp', intro: 'Edited intro' },
      'zh-TW': { title: '漢哲', pageTitle: '連結', intro: '編輯的介紹' },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(config) })),
    )
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Han' })).toBeInTheDocument()
    expect(document.title).toBe('lp')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Edited intro')
    expect(i18n.getResource('en', 'translation', 'title')).toBe('Han')

    await i18n.changeLanguage('zh-TW')
    expect(await screen.findByRole('heading', { level: 1, name: '漢哲' })).toBeInTheDocument()
    expect(document.title).toBe('連結')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('編輯的介紹')
    expect(enLocale.title).toBe("Hi, I'm Wang")
    expect(zhTWLocale.title).toBe('嗨，我是 Wang')
  })

  it('overrides a homepage string without changing the dashboard', () => {
    applyHomepageI18n({
      ...DEFAULT_HOMEPAGE_I18N,
      overrides: { en: { title: 'Hello there', pageTitle: 'Hello — Page' } },
    })
    expect(i18n.t('title')).toBe('Hello there')
    expect(i18n.t('pageTitle')).toBe('Hello — Page')
    expect(i18n.t('manageTitle')).toBe('Admin')
    expect(i18n.t('intro')).toBe('I am Han-che Wang.')
  })

  it('falls back to the default language for a new locale', async () => {
    applyHomepageI18n({
      ...DEFAULT_HOMEPAGE_I18N,
      languages: [...DEFAULT_HOMEPAGE_I18N.languages, { code: 'fr', label: 'Français', shortLabel: 'FR' }],
      overrides: { fr: { title: 'Bonjour' } },
    })
    await i18n.changeLanguage('fr')
    expect(i18n.t('title')).toBe('Bonjour')
    expect(i18n.t('intro')).toBe('I am Han-che Wang.')
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
