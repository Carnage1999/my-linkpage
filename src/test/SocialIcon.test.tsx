import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SocialIcon } from '../SocialIcon'

describe('SocialIcon', () => {
  it('renders an SVG for a known slug', () => {
    const { container } = render(<SocialIcon slug="siGithub" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg?.querySelector('path')).toHaveAttribute('d')
  })

  it('renders a fallback link icon for an unknown slug', () => {
    const { container } = render(<SocialIcon slug="siUnknown" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    // Fallback icon uses stroke instead of fill
    expect(svg).toHaveAttribute('stroke', 'currentColor')
  })

  it('renders a fallback link icon when slug is omitted', () => {
    const { container } = render(<SocialIcon />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('stroke', 'currentColor')
  })

  it('applies custom className', () => {
    const { container } = render(<SocialIcon slug="siGithub" className="size-8" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('size-8')
  })

  it('renders the custom LinkedIn icon', () => {
    const { container } = render(<SocialIcon slug="siLinkedin" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    const path = svg?.querySelector('path')
    expect(path?.getAttribute('d')).toBeTruthy()
  })

  it('has aria-hidden on the svg', () => {
    const { container } = render(<SocialIcon slug="siX" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
