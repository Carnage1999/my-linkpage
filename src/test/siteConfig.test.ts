import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILE, DEFAULT_SOCIALS } from '../siteConfig'

describe('siteConfig', () => {
  it('DEFAULT_PROFILE has an avatar path', () => {
    expect(DEFAULT_PROFILE.avatar).toBe('/avatar.jpg')
  })

  it('DEFAULT_SOCIALS is an empty array (runtime data comes from JSON)', () => {
    expect(DEFAULT_SOCIALS).toEqual([])
  })
})
