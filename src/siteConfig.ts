/**
 * Site-wide configuration types and build-time fallbacks.
 *
 * Runtime data is loaded from /siteConfig.json via the useSiteConfig hook.
 * Edit public/siteConfig.json to update links without redeploying.
 */

// ─── Analytics (privacy-friendly) ────────────────────────

export interface AnalyticsConfig {
  /** Which analytics provider to use */
  readonly provider: 'plausible' | 'umami'
  /** Plausible: your domain (e.g. "link.w1999.me") */
  readonly plausibleDomain?: string
  /** Plausible: self-hosted URL (omit for plausible.io cloud) */
  readonly plausibleHost?: string
  /** Umami: the website-id shown in Umami dashboard */
  readonly umamiWebsiteId?: string
  /** Umami: self-hosted URL (omit for cloud.umami.is) */
  readonly umamiHost?: string
}

// ─── Social links ────────────────────────────────────────

export interface SocialLinkEntry {
  /** Unique identifier — also used as the simple-icons slug */
  readonly id: string
  /** Display label shown in the UI */
  readonly label: string
  /** Full URL to your profile */
  readonly url: string
  /**
   * Icon slug from simple-icons (https://simpleicons.org).
   * Optional — auto-detected from URL when omitted.
   * Must match the exported name: e.g. "siGithub", "siX", "siLinkedin".
   */
  readonly iconSlug?: string
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
