import { useMemo } from 'react'
import { useSiteConfig } from '../hooks/useSiteConfig'
import { homepageText } from '../i18n/homepage'
import { useUiLanguage } from '../i18n/language'
import { safeLinkUrl } from '../lib/safeUrl'
import type { SiteMetadata, SocialLinkEntry } from '../siteConfig'

const LOCALE_MAP: Record<string, string> = {
  en: 'en_US',
  ru: 'ru_RU',
  'zh-TW': 'zh_TW',
}

function openGraphLocale(code: string): string {
  return LOCALE_MAP[code] ?? code.replaceAll('-', '_')
}

export function SEO({
  site,
  socials,
  ogImagePath,
  languages,
}: {
  site: SiteMetadata
  socials: readonly SocialLinkEntry[]
  ogImagePath: string
  languages: readonly string[]
}) {
  const config = useSiteConfig()
  const [uiLanguage] = useUiLanguage()
  const enabled = languages.length > 0 ? languages : ['en']
  const currentLang = enabled.includes(uiLanguage) ? uiLanguage : config.i18n.fallback || enabled[0] || 'en'
  const pageTitle = homepageText(config.i18n, currentLang, 'pageTitle') || 'Wang — Link Page'
  const description = homepageText(config.i18n, currentLang, 'intro') || 'Personal link page — find all my social profiles in one place.'
  
  // Use a fallback domain if window is not available (e.g. during SSR)
  const currentUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://link.w1999.me'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://link.w1999.me'
  
  // Dynamic OG image: absolute URL from ogImagePath
  const ogImageUrl = ogImagePath.startsWith('http') ? ogImagePath : `${origin}${ogImagePath}`

  // Define structured data (JSON-LD Person schema)
  const schema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Person",
    "name": site.name,
    "description": description,
    "image": ogImageUrl,
    "url": origin,
    "sameAs": socials.flatMap((social) => {
      const href = safeLinkUrl(social.url)
      return href ? [href] : []
    })
  }), [site.name, description, ogImageUrl, origin, socials])

  const ogLocale = openGraphLocale(currentLang)
  const alternateLocales = enabled.filter((language) => language !== currentLang).map(openGraphLocale)

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content={site.name} />
      <link rel="canonical" href={`${origin}/`} />
      
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="profile" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={pageTitle} />
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map(locale => (
        <meta key={locale} property="og:locale:alternate" content={locale} />
      ))}
      
      <meta name="twitter:card" content="summary_large_image" />
      {site.twitterHandle && <meta name="twitter:site" content={site.twitterHandle} />}
      {site.twitterHandle && <meta name="twitter:creator" content={site.twitterHandle} />}
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {enabled.map((lang) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={`${origin}/?lng=${lang}`} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${origin}/`} />

      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </>
  )
}
