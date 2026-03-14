/**
 * Site-wide configuration — edit this file to update your profile,
 * social links, and avatar without touching any component code.
 */

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
