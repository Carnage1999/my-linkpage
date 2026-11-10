import { describe, expect, it } from 'vitest'
import { canonicalSlug, matchHostname, resolveIconSlug, resolveStoredIcon, allIcons } from '../icons/catalog'
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

  it('migrates siGithub and does not treat the link id as an icon', () => {
    expect(canonicalSlug('siGithub')).toBe('github')
    expect(canonicalSlug('siLinkedin')).toBe('linkedin')
    const manual = resolveStoredIcon({ url: 'https://example.com/not-github', iconSlug: 'siGithub' })
    expect(manual.iconSlug).toBe('github')
    expect(manual.iconPath).toBeTruthy()
    const automatic = resolveStoredIcon({ url: 'https://example.com/not-github' })
    expect(automatic.iconSlug).toBeUndefined()
    expect(automatic.iconPath).toBeUndefined()
    expect(resolveStoredIcon({ url: 'https://github.com/Carnage1999' }).iconSlug).toBeUndefined()
    expect(() => resolveStoredIcon({ url: 'https://github.com/x', iconSlug: 'not-a-real-icon' })).toThrow(/Unknown icon/)
  })

  it('keeps every catalog path free of markup', () => {
    for (const icon of allIcons()) {
      expect(safeSvgPath(icon.path), icon.slug).toBe(icon.path)
    }
  })
})
