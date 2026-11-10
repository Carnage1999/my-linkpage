import { describe, expect, it } from 'vitest'
import { validateAvatar, validateLinkUrl } from '../../api/stats/_site-schema'
import { FALLBACK_ICON_PATH, ICON_MAP } from '../iconRegistry'
import { DEFAULT_AVATAR, safeAvatarUrl } from '../lib/safeAvatarUrl'
import {
  safeHttpsUrl,
  safeLinkUrl,
  safeScriptUrl,
  safeSvgPath,
} from '../lib/safeUrl'

describe('safeAvatarUrl', () => {
  it('keeps an exact bundled image and the default', () => {
    expect(safeAvatarUrl('/avatar.jpg')).toBe('/avatar.jpg')
    expect(safeAvatarUrl('  /avatar.jpg  ')).toBe('/avatar.jpg')
    expect(safeAvatarUrl('')).toBe(DEFAULT_AVATAR)
    expect(safeAvatarUrl(null)).toBe(DEFAULT_AVATAR)
  })

  it('keeps an https URL and returns the parsed href', () => {
    expect(safeAvatarUrl('https://cdn.example/a.jpg')).toBe(
      'https://cdn.example/a.jpg'
    )
    expect(safeAvatarUrl('  HTTPS://cdn.example/a.jpg  ')).toBe(
      'https://cdn.example/a.jpg'
    )
  })

  it('rejects javascript, data, blob, protocol-relative, and credential URLs', () => {
    expect(safeAvatarUrl('javascript:alert(1)')).toBe(DEFAULT_AVATAR)
    expect(safeAvatarUrl('data:text/html,hi')).toBe(DEFAULT_AVATAR)
    expect(safeAvatarUrl('blob:https://cdn.example/uuid')).toBe(DEFAULT_AVATAR)
    expect(safeAvatarUrl('//cdn.example/a.jpg')).toBe(DEFAULT_AVATAR)
    expect(safeAvatarUrl('https://user:pass@cdn.example/a.jpg')).toBe(
      DEFAULT_AVATAR
    )
    expect(safeAvatarUrl('https://user@cdn.example/a.jpg')).toBe(DEFAULT_AVATAR)
    expect(safeAvatarUrl('https://evil.com\\@cdn.example/a.jpg')).toBe(
      DEFAULT_AVATAR
    )
    expect(safeAvatarUrl('http://cdn.example/a.jpg')).toBe(DEFAULT_AVATAR)
    expect(safeAvatarUrl('/secret.png')).toBe(DEFAULT_AVATAR)
  })

  it('matches the server validator', () => {
    expect(validateAvatar('/avatar.jpg')).toBe('/avatar.jpg')
    expect(validateAvatar('')).toBe('/avatar.jpg')
    expect(validateAvatar('https://cdn.example/a.jpg')).toBe(
      'https://cdn.example/a.jpg'
    )
    expect(() => validateAvatar('/og-image.png')).toThrow(/shipped/)
    expect(() => validateAvatar('http://cdn.example/a.jpg')).toThrow(/https/)
    expect(() => validateAvatar('javascript:alert(1)')).toThrow(/https/)
    expect(() => validateAvatar('https://user:pass@cdn.example/a.jpg')).toThrow(
      /https URL/
    )
    expect(validateLinkUrl('https://github.com/Carnage1999')).toBe(
      'https://github.com/Carnage1999'
    )
    expect(() => validateLinkUrl('javascript:alert(1)')).toThrow(/http, https/)
    expect(() => validateLinkUrl('https://user:pass@github.com/a')).toThrow(
      /invalid/
    )
  })
})

describe('safeLinkUrl and safeScriptUrl', () => {
  it('allows link schemes and rejects scriptable ones', () => {
    expect(safeLinkUrl('https://t.me/WHZ1999')).toBe('https://t.me/WHZ1999')
    expect(safeLinkUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(safeLinkUrl('tg://resolve?domain=name')).toBe(
      'tg://resolve?domain=name'
    )
    expect(safeLinkUrl('tel:+15551212')).toBe('tel:+15551212')
    expect(safeLinkUrl('javascript:alert(1)')).toBeNull()
    expect(safeLinkUrl('data:text/html,x')).toBeNull()
    expect(safeLinkUrl('//example.com')).toBeNull()
    expect(safeHttpsUrl('http://cdn.example/a.jpg')).toBeNull()
    expect(safeScriptUrl('https://cloud.umami.is/script.js')).toBe(
      'https://cloud.umami.is/script.js'
    )
    expect(safeScriptUrl('javascript:alert(1)')).toBeNull()
    expect(safeScriptUrl('http://evil.example/script.js')).toBeNull()
  })
})

describe('safeSvgPath', () => {
  it('keeps the bundled icon paths and rejects markup', () => {
    expect(safeSvgPath(FALLBACK_ICON_PATH)).toBe(FALLBACK_ICON_PATH)
    for (const [slug, icon] of Object.entries(ICON_MAP)) {
      expect(safeSvgPath(icon.path), slug).toBe(icon.path)
    }
    expect(safeSvgPath('M0 0"><script>alert(1)</script>')).toBeNull()
    expect(safeSvgPath('')).toBeNull()
  })
})
