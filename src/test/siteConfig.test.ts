import { describe, expect, it } from 'vitest'
import { PROFILE, SOCIALS } from '../siteConfig'

describe('siteConfig', () => {
  it('PROFILE has an avatar path', () => {
    expect(PROFILE.avatar).toBe('/avatar.jpg')
  })

  it('SOCIALS has entries with required fields', () => {
    expect(SOCIALS.length).toBeGreaterThan(0)

    for (const social of SOCIALS) {
      expect(social.id).toBeTruthy()
      expect(social.label).toBeTruthy()
      expect(social.url).toMatch(/^https?:\/\//)
      expect(social.iconSlug).toMatch(/^si[A-Z]/)
    }
  })

  it('SOCIALS has unique ids', () => {
    const ids = SOCIALS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('SOCIALS has unique URLs', () => {
    const urls = SOCIALS.map((s) => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})
