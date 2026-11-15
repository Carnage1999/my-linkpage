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
  site: { name: 'Han-che Wang', domain: 'link.w1999.me' },
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

  it.each([
    ['zh-CN', ['en', 'ru', 'zh-TW'], 'en', 'zh-TW'],
    ['zh-HK', ['en', 'ru', 'zh-TW'], 'en', 'zh-TW'],
    ['ru-RU', ['en', 'ru', 'zh-TW'], 'en', 'ru'],
    ['en-GB', ['en', 'ru', 'zh-TW'], 'en', 'en'],
    ['ja-JP', ['en', 'ru', 'zh-TW', 'ja'], 'en', 'ja'],
    ['fr', ['en', 'ru', 'zh-TW'], 'en', 'en'],
    ['zh-CN', ['en', 'zh-CN', 'zh-TW'], 'en', 'zh-CN'],
    ['zh-HK', ['zh-TW', 'zh-CN', 'en'], 'ru', 'zh-TW'],
    ['pt-BR', ['en', 'pt-BR'], 'en', 'pt-BR'],
  ])('maps %s the same way for every enabled code', (requested, enabled, fallback, expected) => {
    expect(mapDetected(requested, enabled, fallback)).toBe(expected)
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

  it.each([
    { code: 'en', title: 'Hello saved' },
    { code: 'ru', title: 'Привет saved' },
    { code: 'zh-TW', title: '標題 saved' },
    { code: 'ja', title: 'こんにちは', label: '日本語', shortLabel: 'JA' },
  ])('stores $code without copying another language', ({ code, title, label, shortLabel }) => {
    const enabled = label
      ? [...languages, { code, label, shortLabel: shortLabel ?? code }]
      : languages
    const saved = validateSiteConfig(
      {
        ...baseSite,
        i18n: {
          languages: enabled,
          fallback: 'en',
          detect: true,
          texts: { [code]: { title } },
        },
      },
      4,
    )
    expect(saved.i18n.texts[code]?.title).toBe(title)
    const seedVisit = (seedFile.i18n.texts as Record<string, { visit?: string } | undefined>)[code]?.visit
    if (seedVisit) {
      expect(saved.i18n.texts[code]?.visit).toBe(seedVisit)
      expect(homepageText(saved.i18n, code, 'visit')).toBe(seedVisit)
    } else {
      expect(saved.i18n.texts[code]?.visit).toBeUndefined()
      expect(homepageText(saved.i18n, code, 'visit')).toBe(homepageText(saved.i18n, 'en', 'visit'))
    }
    expect(homepageText(saved.i18n, code, 'title')).toBe(title)
  })

  it('resolves a missing line from the configured fallback language', () => {
    const japanese = {
      languages: [
        { code: 'ja', label: '日本語', shortLabel: 'JA' },
        { code: 'ru', label: 'Русский', shortLabel: 'РУ' },
      ],
      fallback: 'ru',
      detect: false,
      texts: { ja: { title: 'こんにちは' }, ru: { visit: 'Перейти', title: 'Привет' } },
    }
    expect(homepageText(japanese, 'ja', 'title')).toBe('こんにちは')
    expect(homepageText(japanese, 'ja', 'visit')).toBe('Перейти')
    expect(homepageText(japanese, 'ru', 'visit')).toBe('Перейти')
    const onlyJapanese = {
      languages: [{ code: 'ja', label: '日本語', shortLabel: 'JA' }],
      fallback: 'ja',
      detect: false,
      texts: { ja: { title: 'こんにちは' } },
    }
    expect(homepageText(onlyJapanese, 'ja', 'visit')).toBe('')
  })

  it('drops a stored tagline and keeps the seed subtitles', () => {
    const saved = validateSiteConfig(
      {
        ...baseSite,
        site: { ...baseSite.site, tagline: 'Links & Socials 123456' },
      },
      8,
    )
    expect(saved.site).not.toHaveProperty('tagline')
    expect(saved.i18n.texts.en?.subtitle).toBe('Links & socials')
    expect(saved.i18n.texts.ru?.subtitle).toBe('Ссылки и соцсети')
    expect(saved.i18n.texts['zh-TW']?.subtitle).toBe('社群與連結')
    expect(JSON.stringify(saved)).not.toContain('123456')
  })

  it('uses the requested language subtitle on the share image', () => {
    expect(shareSubtitle({ requested: null, i18n: DEFAULT_HOMEPAGE_I18N })).toBe('Links & socials')
    expect(shareSubtitle({ requested: 'zh-TW', i18n: DEFAULT_HOMEPAGE_I18N })).toBe('社群與連結')
    const edited = structuredClone(DEFAULT_HOMEPAGE_I18N)
    edited.texts.en = { ...edited.texts.en, subtitle: 'Edited line' }
    expect(shareSubtitle({ requested: 'en', i18n: edited })).toBe('Edited line')
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
        site={{ name: 'Han-che Wang', domain: 'link.w1999.me' }}
        socials={[]}
        ogImagePath="/api/og"
        languages={['en', 'ru']}
      />,
    )
    expect(document.querySelector('meta[name="author"]')?.getAttribute('content')).toBe('Han-che Wang')
    const jsonLd = document.querySelector('script[type="application/ld+json"]')?.textContent ?? ''
    expect(jsonLd).toContain('"name":"Han-che Wang"')
    expect(jsonLd).not.toContain("Hi, I'm Wang")
    expect(document.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('en')
    expect(view.container.ownerDocument.querySelectorAll('link[rel="alternate"]')).toHaveLength(3)
    const langs = [...document.querySelectorAll('link[hreflang]')].map((node) => node.getAttribute('hreflang'))
    expect(langs).toEqual(['en', 'ru', 'x-default'])
  })

  it('keeps the sitemap alternates aligned with the seed languages', () => {
    const xml = readFileSync('public/sitemap.xml', 'utf8')
    expect(xml).toContain(sitemapAlternates('link.w1999.me', ['en', 'ru', 'zh-TW']))
  })
})
