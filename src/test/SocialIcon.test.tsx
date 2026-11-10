import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SocialIcon } from '../SocialIcon'
import { LINKEDIN_PATH } from '../icons/paths'

describe('SocialIcon', () => {
  it('renders an SVG for a stored path', () => {
    const { container } = render(<SocialIcon path="M0 0h24v24H0z" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg).toHaveAttribute('fill', 'currentColor')
    expect(svg?.querySelector('path')).toHaveAttribute('d', 'M0 0h24v24H0z')
  })

  it('renders a fallback link icon for a path that is not an SVG command', () => {
    const { container } = render(<SocialIcon path="not-a-path" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('stroke', 'currentColor')
  })

  it('renders a fallback link icon when the path is omitted', () => {
    const { container } = render(<SocialIcon />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('stroke', 'currentColor')
  })

  it('applies custom className', () => {
    const { container } = render(<SocialIcon path="M0 0h1" className="size-8" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('size-8')
  })

  it('renders the custom LinkedIn icon', () => {
    const { container } = render(<SocialIcon path={LINKEDIN_PATH} />)
    const path = container.querySelector('path')
    expect(path).toHaveAttribute('d', LINKEDIN_PATH)
  })

  it('has aria-hidden on the svg', () => {
    const { container } = render(<SocialIcon path="M0 0h1" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
