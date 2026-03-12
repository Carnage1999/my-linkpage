import type { ReactNode } from 'react'

export type SocialId =
  | 'github'
  | 'bluesky'
  | 'x'
  | 'line'
  | 'telegram'
  | 'linkedin'

export interface SocialLink {
  readonly id: SocialId
  readonly label: string
  readonly url: string
  readonly icon: ReactNode
}

const githubIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 .5C5.73.5.84 5.39.84 11.66c0 4.83 3.13 8.92 7.47 10.37.55.1.75-.24.75-.53 0-.26-.01-1.12-.02-2.02-3.04.66-3.68-1.47-3.68-1.47-.5-1.28-1.23-1.62-1.23-1.62-.99-.68.07-.67.07-.67 1.1.08 1.68 1.13 1.68 1.13.97 1.66 2.54 1.18 3.16.9.1-.7.38-1.18.69-1.45-2.43-.28-4.99-1.21-4.99-5.39 0-1.19.42-2.16 1.11-2.92-.11-.28-.48-1.4.11-2.92 0 0 .9-.29 2.95 1.11a10.2 10.2 0 012.69-.36c.91.01 1.83.12 2.68.36 2.05-1.4 2.95-1.11 2.95-1.11.59 1.52.22 2.64.11 2.92.69.76 1.11 1.74 1.11 2.92 0 4.18-2.57 5.11-5.01 5.38.39.34.74 1.02.74 2.06 0 1.49-.01 2.69-.01 3.06 0 .29.2.64.76.53 4.34-1.46 7.46-5.54 7.46-10.37C23.16 5.39 18.27.5 12 .5z"
      fill="currentColor"
    />
  </svg>
)

const blueskyIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M5.66 4.92c2.14 1.6 4.44 4.84 5.34 6.72.9-1.88 3.2-5.12 5.34-6.72 1.54-1.15 4.03-2.05 4.03.79 0 .57-.33 4.8-.52 5.48-.67 2.38-3.12 2.98-5.3 2.61 3.8.64 4.77 2.78 2.69 4.92-3.94 4.05-5.66-1.02-6.1-2.32-.08-.24-.12-.35-.14-.25-.02-.1-.06.01-.14.25-.44 1.3-2.16 6.37-6.1 2.32-2.08-2.14-1.11-4.28 2.69-4.92-2.18.37-4.63-.23-5.3-2.61-.19-.68-.52-4.91-.52-5.48 0-2.84 2.49-1.94 4.03-.79Z"
      fill="currentColor"
    />
  </svg>
)

const xIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M18.9 2H22l-6.77 7.74L23.2 22h-6.26l-4.9-7.4L5.56 22H2.45l7.24-8.27L1.6 2h6.42l4.43 6.79L18.9 2Zm-1.09 18.1h1.72L7.08 3.8H5.23l12.58 16.3Z"
      fill="currentColor"
    />
  </svg>
)

const lineIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M20.16 10.09c0-4.34-4.35-7.87-9.7-7.87S.76 5.75.76 10.09c0 3.9 3.45 7.16 8.1 7.78.32.07.76.22.87.51.1.26.07.66.03.93l-.15.89c-.05.26-.23 1.01.89.55 1.12-.47 6.04-3.56 8.24-6.1 1.52-1.67 2.42-3.36 2.42-5.56ZM8.27 12.18a.3.3 0 0 1-.3.3H5.25a.3.3 0 0 1-.3-.3V7.89a.3.3 0 0 1 .3-.3h.74a.3.3 0 0 1 .3.3v3.68h1.68a.3.3 0 0 1 .3.3v.31Zm2.31 0a.3.3 0 0 1-.3.3h-.74a.3.3 0 0 1-.3-.3V7.89a.3.3 0 0 1 .3-.3h.74a.3.3 0 0 1 .3.3v4.29Zm4.9 0a.3.3 0 0 1-.3.3h-.7a.3.3 0 0 1-.25-.13l-2.03-2.77v2.6a.3.3 0 0 1-.3.3h-.74a.3.3 0 0 1-.3-.3V7.89a.3.3 0 0 1 .3-.3h.71c.1 0 .2.05.25.13l2.02 2.77V7.89a.3.3 0 0 1 .3-.3h.74a.3.3 0 0 1 .3.3v4.29Zm3.58-3.68h-1.68v.73h1.68a.3.3 0 0 1 .3.3v.31a.3.3 0 0 1-.3.3h-1.68v.73h1.68a.3.3 0 0 1 .3.3v.31a.3.3 0 0 1-.3.3h-2.72a.3.3 0 0 1-.3-.3V7.89a.3.3 0 0 1 .3-.3h2.72a.3.3 0 0 1 .3.3v.31a.3.3 0 0 1-.3.3Z"
      fill="currentColor"
    />
  </svg>
)

const telegramIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M9.78 15.58 9.4 20.9c.54 0 .77-.23 1.04-.5l2.48-2.37 5.15 3.77c.95.52 1.62.25 1.88-.88l3.41-16c.35-1.4-.5-1.95-1.42-1.6L1.86 11.07c-1.37.54-1.35 1.3-.23 1.64l5.14 1.6L18.7 6.8c.56-.37 1.07-.16.65.21"
      fill="currentColor"
    />
  </svg>
)

const linkedinIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.03-1.84-3.03-1.84 0-2.12 1.44-2.12 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.84 3.36-1.84 3.6 0 4.26 2.37 4.26 5.45v6.28ZM5.35 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.57V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z"
      fill="currentColor"
    />
  </svg>
)

export const SOCIALS = [
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com/Carnage1999',
    icon: githubIcon,
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    url: 'https://bsky.app/profile/w1999.me',
    icon: blueskyIcon,
  },
  {
    id: 'x',
    label: 'X',
    url: 'https://x.com/wang_hanzhe',
    icon: xIcon,
  },
  {
    id: 'line',
    label: 'Line',
    url: 'https://line.me/ti/p/Oc10OLyIM0',
    icon: lineIcon,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    url: 'https://t.me/WHZ1999',
    icon: telegramIcon,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/hanzhe-wang/',
    icon: linkedinIcon,
  },
] as const satisfies readonly SocialLink[]
