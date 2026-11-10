import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import * as matchers from 'vitest-axe/matchers'
import { axe } from 'vitest-axe'
import App from '../App'
declare module 'vitest' {
  interface Matchers<R, T> {
    toHaveNoViolations: () => R
  }
}

expect.extend(matchers)

describe('Accessibility (axe-core)', () => {
  it('should have no critical a11y violations', async () => {
    const { container } = render(<App />)
    // Wait for async content to load
    await screen.findByText("Hi, I'm Wang")

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
