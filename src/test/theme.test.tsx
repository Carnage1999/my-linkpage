import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'
import '../i18n'

describe('Theme toggle', () => {
  it('defaults to light mode (no stored preference, no system dark)', () => {
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('applies dark mode from localStorage', () => {
    localStorage.setItem('theme', 'dark')
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('applies light mode from localStorage', () => {
    localStorage.setItem('theme', 'light')
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggles dark mode on switch click', async () => {
    const user = userEvent.setup()
    render(<App />)

    const toggle = screen.getByRole('switch')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    await user.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')

    await user.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
