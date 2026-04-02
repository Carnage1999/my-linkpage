import {
  siBandcamp,
  siBehance,
  siBitbucket,
  siBluesky,
  siBuymeacoffee,
  siDevdotto,
  siDiscord,
  siDribbble,
  siFacebook,
  siFigma,
  siFlickr,
  siGhost,
  siGithub,
  siGitlab,
  siHashnode,
  siInstagram,
  siKakaotalk,
  siKeybase,
  siKofi,
  siLine,
  siMastodon,
  siMatrix,
  siMedium,
  siNotion,
  siNpm,
  siPatreon,
  siPinterest,
  siReddit,
  siSignal,
  siSnapchat,
  siSoundcloud,
  siSpotify,
  siStackoverflow,
  siSubstack,
  siTelegram,
  siThreads,
  siTiktok,
  siTumblr,
  siTwitch,
  siViber,
  siVimeo,
  siWechat,
  siWhatsapp,
  siWordpress,
  siX,
  siYoutube,
  siZoom,
} from 'simple-icons'
import type { SimpleIcon } from 'simple-icons'

// ─── Custom icons (brands removed from or missing in simple-icons) ───

const CUSTOM_ICONS: Record<string, Pick<SimpleIcon, 'path'>> = {
  siLinkedin: {
    path: 'M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.03-1.84-3.03-1.84 0-2.12 1.44-2.12 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.84 3.36-1.84 3.6 0 4.26 2.37 4.26 5.45v6.28ZM5.35 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.57V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z',
  },
}

// ─── Full icon map (slug → SVG path data) ────────────────

export const ICON_MAP: Record<string, Pick<SimpleIcon, 'path'>> = {
  siGithub,
  siBluesky,
  siX,
  siLine,
  siTelegram,
  siInstagram,
  siFacebook,
  siYoutube,
  siTiktok,
  siDiscord,
  siReddit,
  siTwitch,
  siPinterest,
  siSnapchat,
  siMastodon,
  siThreads,
  siMedium,
  siDevdotto,
  siHashnode,
  siStackoverflow,
  siDribbble,
  siBehance,
  siFigma,
  siNotion,
  siSpotify,
  siSoundcloud,
  siBandcamp,
  siPatreon,
  siBuymeacoffee,
  siKofi,
  siWhatsapp,
  siSignal,
  siMatrix,
  siKeybase,
  siGitlab,
  siBitbucket,
  siNpm,
  siWechat,
  siKakaotalk,
  siViber,
  siZoom,
  siFlickr,
  siVimeo,
  siTumblr,
  siWordpress,
  siSubstack,
  siGhost,
  ...CUSTOM_ICONS,
}

// ─── Hostname → icon slug auto-detection ─────────────────

const HOST_TO_SLUG: [pattern: RegExp, slug: string][] = [
  [/github\.com/, 'siGithub'],
  [/gitlab\.com/, 'siGitlab'],
  [/bitbucket\.org/, 'siBitbucket'],
  [/x\.com|twitter\.com/, 'siX'],
  [/bsky\.app/, 'siBluesky'],
  [/instagram\.com/, 'siInstagram'],
  [/facebook\.com|fb\.com/, 'siFacebook'],
  [/linkedin\.com/, 'siLinkedin'],
  [/youtube\.com|youtu\.be/, 'siYoutube'],
  [/tiktok\.com/, 'siTiktok'],
  [/discord\.com|discord\.gg/, 'siDiscord'],
  [/reddit\.com/, 'siReddit'],
  [/twitch\.tv/, 'siTwitch'],
  [/pinterest\.com/, 'siPinterest'],
  [/snapchat\.com/, 'siSnapchat'],
  [/mastodon\.|mstdn\./, 'siMastodon'],
  [/threads\.net/, 'siThreads'],
  [/medium\.com/, 'siMedium'],
  [/dev\.to/, 'siDevdotto'],
  [/hashnode\.com|hashnode\.dev/, 'siHashnode'],
  [/stackoverflow\.com/, 'siStackoverflow'],
  [/dribbble\.com/, 'siDribbble'],
  [/behance\.net/, 'siBehance'],
  [/figma\.com/, 'siFigma'],
  [/notion\.so/, 'siNotion'],
  [/spotify\.com/, 'siSpotify'],
  [/soundcloud\.com/, 'siSoundcloud'],
  [/bandcamp\.com/, 'siBandcamp'],
  [/patreon\.com/, 'siPatreon'],
  [/buymeacoffee\.com/, 'siBuymeacoffee'],
  [/ko-fi\.com/, 'siKofi'],
  [/whatsapp\.com|wa\.me/, 'siWhatsapp'],
  [/signal\.org/, 'siSignal'],
  [/matrix\.org|matrix\.to/, 'siMatrix'],
  [/keybase\.io/, 'siKeybase'],
  [/npmjs\.com/, 'siNpm'],
  [/line\.me/, 'siLine'],
  [/t\.me|telegram\.org/, 'siTelegram'],
  [/wechat\.com|weixin\.qq\.com/, 'siWechat'],
  [/kakaotalk|kakao\.com/, 'siKakaotalk'],
  [/viber\.com/, 'siViber'],
  [/zoom\.us/, 'siZoom'],
  [/flickr\.com/, 'siFlickr'],
  [/vimeo\.com/, 'siVimeo'],
  [/tumblr\.com/, 'siTumblr'],
  [/wordpress\.com|wordpress\.org/, 'siWordpress'],
  [/substack\.com/, 'siSubstack'],
  [/ghost\.org/, 'siGhost'],
]

/**
 * Infer the simple-icons slug from a URL.
 * Returns the matched slug or `null` if the URL doesn't match any known pattern.
 */
export function resolveIconSlug(url: string): string | null {
  try {
    const hostname = new URL(url).hostname
    for (const [pattern, slug] of HOST_TO_SLUG) {
      if (pattern.test(hostname)) return slug
    }
  } catch {
    // invalid URL — skip
  }
  return null
}

/** Generic "link" icon path for unknown platforms (24×24 viewBox) */
export const FALLBACK_ICON_PATH =
  'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'
