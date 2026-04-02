import { useTranslation } from 'react-i18next'
import { PROFILE, SOCIALS } from '../siteConfig'

const LOCALE_MAP: Record<string, string> = {
  en: 'en_US',
  ru: 'ru_RU',
  'zh-TW': 'zh_TW',
}

const LANGUAGES = ['en', 'ru', 'zh-TW']

export function SEO() {
  const { t, i18n } = useTranslation()
  const pageTitle = String(t('pageTitle')) || 'Wang — Link Page'
  const description = String(t('intro')) || 'Personal link page — find all my social profiles in one place.'
  const currentLang = i18n.language || 'en'
  
  // Use a fallback domain if window is not available (e.g. during SSR)
  const currentUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://link.w1999.me'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://link.w1999.me'
  
  // The avatar url should be absolute for OG images
  const ogImageUrl = PROFILE.avatar.startsWith('http') 
    ? PROFILE.avatar 
    : `${origin}${PROFILE.avatar.startsWith('/') ? '' : '/'}${PROFILE.avatar}`

  // Define structured data (JSON-LD Person schema)
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": String(t('title')),
    "description": description,
    "image": ogImageUrl,
    "url": origin,
    "sameAs": SOCIALS.map(social => social.url)
  }

  const ogLocale = LOCALE_MAP[currentLang] ?? 'en_US'
  const alternateLocales = LANGUAGES.filter(l => l !== currentLang).map(l => LOCALE_MAP[l] ?? l)

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content={String(t('title')).replace(/^(Hi, I'm |Привет, я |嗨，我是 )/, '')} />
      <link rel="canonical" href={`${origin}/`} />
      
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="profile" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:site_name" content={pageTitle} />
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map(locale => (
        <meta key={locale} property="og:locale:alternate" content={locale} />
      ))}
      
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:site" content="@wang_hanzhe" />
      <meta name="twitter:creator" content="@wang_hanzhe" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {LANGUAGES.map(lang => (
        <link key={lang} rel="alternate" hrefLang={lang} href={`${origin}/?lng=${lang}`} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${origin}/`} />

      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </>
  )
}
