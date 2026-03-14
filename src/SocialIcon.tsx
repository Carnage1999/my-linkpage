import {
  siBluesky,
  siGithub,
  siLine,
  siTelegram,
  siX,
} from 'simple-icons'
import type { SimpleIcon } from 'simple-icons'

/**
 * Custom icons for brands not in simple-icons (e.g. LinkedIn was removed).
 * Each entry only needs a `path` (SVG path data for a 24×24 viewBox).
 */
const CUSTOM_ICONS: Record<string, Pick<SimpleIcon, 'path'>> = {
  siLinkedin: {
    path: 'M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.03-1.84-3.03-1.84 0-2.12 1.44-2.12 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.84 3.36-1.84 3.6 0 4.26 2.37 4.26 5.45v6.28ZM5.35 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.57V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z',
  },
}

const ICON_MAP: Record<string, Pick<SimpleIcon, 'path'>> = {
  siGithub,
  siBluesky,
  siX,
  siLine,
  siTelegram,
  ...CUSTOM_ICONS,
}

export function SocialIcon({
  slug,
  className = 'size-5',
}: {
  slug: string
  className?: string
}) {
  const icon = ICON_MAP[slug]

  if (!icon) {
    return null
  }

  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d={icon.path} />
    </svg>
  )
}
