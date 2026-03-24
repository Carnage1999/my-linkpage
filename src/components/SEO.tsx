import { useTranslation } from 'react-i18next'
import { PROFILE, SOCIALS } from '../siteConfig'

export function SEO() {
  const { t } = useTranslation()
  const title = String(t('title')) || 'Link Page'
  const description = String(t('intro')) || 'Personal link page — find all my social profiles in one place.'
  
  // Use a fallback domain if window is not available (e.g. during SSR)
  const currentUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://link.w1999.me'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://link.w1999.me'
  
  // The avatar url should be absolute for OG images
  const ogImageUrl = PROFILE.avatar.startsWith('http') 
    ? PROFILE.avatar 
    : `${origin}${PROFILE.avatar.startsWith('/') ? '' : '/'}${PROFILE.avatar}`

  // Supported languages from App.tsx
  const languages = ['en', 'ru', 'zh-TW']
  
  // Define structured data (JSON-LD Person schema)
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": title,
    "description": description,
    "image": ogImageUrl,
    "url": origin,
    "sameAs": SOCIALS.map(social => social.url)
  }

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="profile" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:site_name" content={title} />
      
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {languages.map(lang => (
        <link key={lang} rel="alternate" hrefLang={lang} href={`${origin}/?lng=${lang}`} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${origin}/`} />

      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </>
  )
}
