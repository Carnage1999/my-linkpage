import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { migrateSocials } from '../../scripts/generate-site-icons'
import { canonicalSlug, iconBySlug, matchHostname, resolveIconSlug, resolveStoredIcon, allIcons } from '../icons/catalog'
import { LINKEDIN_PATH } from '../icons/paths'
import { safeSvgPath } from '../lib/safeUrl'

describe('icon host matching', () => {
  it('derives the brand from the registrable label', () => {
    expect(matchHostname('github.com')).toBe('github')
    expect(matchHostname('www.github.com')).toBe('github')
    expect(matchHostname('gist.github.com')).toBe('github')
    expect(matchHostname('m.facebook.com')).toBe('facebook')
    expect(matchHostname('twitter.com')).toBe('x')
    expect(matchHostname('mobile.twitter.com')).toBe('x')
    expect(matchHostname('x.com')).toBe('x')
    expect(matchHostname('bsky.app')).toBe('bluesky')
    expect(matchHostname('line.me')).toBe('line')
    expect(matchHostname('www.linkedin.com')).toBe('linkedin')
    expect(matchHostname('discord.gg')).toBe('discord')
  })

  it('aliases only the hosts whose label is not the brand', () => {
    expect(matchHostname('t.me')).toBe('telegram')
    expect(matchHostname('youtu.be')).toBe('youtube')
    expect(matchHostname('www.youtu.be')).toBe('youtube')
    expect(matchHostname('wa.me')).toBe('whatsapp')
    expect(matchHostname('fb.com')).toBe('facebook')
    expect(matchHostname('npmjs.com')).toBe('npm')
    expect(matchHostname('dev.to')).toBe('devdotto')
    expect(matchHostname('weixin.qq.com')).toBe('wechat')
  })

  it('does not match a lookalike host', () => {
    expect(matchHostname('notgithub.com')).toBeNull()
    expect(matchHostname('github.com.evil.example')).toBeNull()
    expect(resolveIconSlug('https://example.com')).toBeNull()
    expect(resolveIconSlug('javascript:alert(1)')).toBeNull()
  })

  it('stores a slug and path, and does not treat the link id as an icon', () => {
    expect(canonicalSlug('github')).toBe('github')
    expect(canonicalSlug('siGithub')).toBeNull()
    expect(canonicalSlug('siLinkedin')).toBeNull()
    const manual = resolveStoredIcon({ url: 'https://example.com/not-github', iconSlug: 'github' })
    expect(manual.iconSlug).toBe('github')
    expect(manual.iconPath).toBeTruthy()
    const automatic = resolveStoredIcon({ url: 'https://example.com/not-github' })
    expect(automatic).toEqual({})
    const matched = resolveStoredIcon({ url: 'https://github.com/Carnage1999' })
    expect(matched.iconSlug).toBe('github')
    expect(matched.iconPath).toBe(manual.iconPath)
    expect(() => resolveStoredIcon({ url: 'https://github.com/x', iconSlug: 'siGithub' })).toThrow(/Unknown icon/)
    expect(() => resolveStoredIcon({ url: 'https://github.com/x', iconSlug: 'not-a-real-icon' })).toThrow(/Unknown icon/)
  })

  it('keeps the seed file on the installed icon paths', () => {
    const seed = JSON.parse(readFileSync('public/siteConfig.json', 'utf8')) as {
      socials: Array<{ id: string; iconSlug: string; iconPath: string }>
    }
    expect(seed.socials.map((link) => link.id)).toEqual(['github', 'bluesky', 'x', 'line', 'telegram', 'linkedin'])
    for (const link of seed.socials) {
      const icon = iconBySlug(link.iconSlug)
      expect(icon?.slug).toBe(link.iconSlug)
      expect(link.iconPath).toBe(icon?.path)
    }
    expect(seed.socials.find((link) => link.id === 'linkedin')?.iconPath).toBe(LINKEDIN_PATH)
  })

  it('migrates a legacy export name once, outside the app', () => {
    const [link] = migrateSocials([{ url: 'https://example.com/not-github', iconSlug: 'siGithub' }])
    expect(link?.iconSlug).toBe('github')
    expect(link?.iconPath).toBe(iconBySlug('github')?.path)
    const [untouched] = migrateSocials([{ id: 'keep', url: 'https://example.com', label: 'Keep' }])
    expect(untouched).toEqual({ id: 'keep', url: 'https://example.com', label: 'Keep' })
  })

  it('keeps every catalog path free of markup', () => {
    for (const icon of allIcons()) {
      expect(safeSvgPath(icon.path), icon.slug).toBe(icon.path)
    }
  })
})
