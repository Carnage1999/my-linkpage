/**
 * Site-wide configuration types and build-time fallbacks.
 *
 * The homepage renders this file immediately, then hydrates from /api/site-config.
 * Edit the live site at /manage. This file remains the seed when Redis is empty.
 */

// ─── Analytics (privacy-friendly) ────────────────────────

export interface AnalyticsConfig {
  /** Seed-file fallback only. Live scripts are chosen on /manage. */
  readonly provider: 'umami'
  /** Umami: the website-id shown in Umami dashboard */
  readonly umamiWebsiteId?: string
  /** Umami: self-hosted URL (omit for cloud.umami.is) */
  readonly umamiHost?: string
}

// ─── Social links ────────────────────────────────────────

export interface SocialLinkEntry {
  /** Stable id for click stats. Renaming it starts a new series. */
  readonly id: string
  /** Display label shown in the UI */
  readonly label: string
  /** Full URL to your profile */
  readonly url: string
  /**
   * Manual icon override: a simple-icons slug such as "github", or a legacy
   * export name such as "siGithub". Omit it and the hostname picks the icon.
   * This is not the link id.
   */
  readonly iconSlug?: string
  /** SVG path filled in by /api/site-config so the homepage does not load simple-icons. */
  readonly iconPath?: string
}

// ─── Site metadata ───────────────────────────────────────

export interface SiteMetadata {
  readonly name: string
  readonly tagline: string
  readonly domain: string
  readonly twitterHandle?: string
}

// ─── Top-level config shape (matches public/siteConfig.json) ─

export interface SiteConfig {
  readonly site?: SiteMetadata
  readonly profile: { readonly avatar: string }
  readonly analytics?: AnalyticsConfig | null
  readonly socials: readonly SocialLinkEntry[]
  /** Path or URL for the Open Graph image. Defaults to "/api/og". */
  readonly ogImagePath?: string
}

// ─── Fallback defaults (used while JSON is loading or on error) ─

export const DEFAULT_SITE: SiteMetadata = {
  name: 'Han-che Wang',
  tagline: 'Links & Socials',
  domain: 'link.w1999.me',
} as const

export const DEFAULT_PROFILE = { avatar: '/avatar.jpg' } as const

export const DEFAULT_SOCIALS: readonly SocialLinkEntry[] = []
