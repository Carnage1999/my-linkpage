/**
 * Site-wide configuration — edit this file to update your profile,
 * social links, and avatar without touching any component code.
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

/**
 * Set to `null` to disable external analytics entirely.
 * The local click heatmap still works without this.
 *
 * Example — Plausible:
 *   { provider: 'plausible', plausibleDomain: 'link.w1999.me' }
 *
 * Example — Umami:
 *   { provider: 'umami', umamiWebsiteId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }
 */
export const ANALYTICS: AnalyticsConfig | null = {
  provider: 'umami',
  umamiWebsiteId: 'b6e3dfdc-afb4-4586-b39c-4a1e0826748a',
}

// ─── Profile ─────────────────────────────────────────────

export const PROFILE = {
  /** Path to avatar image (relative to /public) */
  avatar: '/avatar.jpg',
} as const

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
   * Must match the exported name: e.g. "siGithub", "siX", "siLinkedin".
   * Run `npx simple-icons --list` to browse all slugs.
   */
  readonly iconSlug: string
}

export const SOCIALS: readonly SocialLinkEntry[] = [
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com/Carnage1999',
    iconSlug: 'siGithub',
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    url: 'https://bsky.app/profile/w1999.me',
    iconSlug: 'siBluesky',
  },
  {
    id: 'x',
    label: 'X',
    url: 'https://x.com/wang_hanzhe',
    iconSlug: 'siX',
  },
  {
    id: 'line',
    label: 'Line',
    url: 'https://line.me/ti/p/Oc10OLyIM0',
    iconSlug: 'siLine',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    url: 'https://t.me/WHZ1999',
    iconSlug: 'siTelegram',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/hanzhe-wang/',
    iconSlug: 'siLinkedin',
  },
]
