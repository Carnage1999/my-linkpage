import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import '../i18n'

describe('App', () => {
  it('renders profile title', () => {
    render(<App />)
    expect(screen.getByText("Hi, I'm Wang")).toBeInTheDocument()
  })

  it('renders all social links', () => {
    render(<App />)
    expect(screen.getByLabelText(/^GitHub/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Bluesky/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^X /)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Line/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Telegram/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^LinkedIn/)).toBeInTheDocument()
  })

  it('renders social link URLs', () => {
    render(<App />)
    const githubLink = screen.getByLabelText(/^GitHub/)
    expect(githubLink).toHaveAttribute('href', 'https://github.com/Carnage1999')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noreferrer')
  })

  it('renders copy buttons for each social', () => {
    render(<App />)
    const copyButtons = screen.getAllByRole('button', { name: /^Copy /i })
    expect(copyButtons).toHaveLength(6)
  })

  it('copies link to clipboard on click', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    render(<App />)

    const copyGithub = screen.getByRole('button', { name: /Copy GitHub/i })
    await user.click(copyGithub)

    expect(writeText).toHaveBeenCalledWith('https://github.com/Carnage1999')
    const visibleSpans = within(copyGithub).getAllByText('Copied')
    expect(visibleSpans.length).toBeGreaterThan(0)
  })

  it('renders avatar image with correct attributes', () => {
    render(<App />)
    const avatar = screen.getByAltText('Photo of Han-che Wang')
    expect(avatar).toHaveAttribute('src', '/avatar.jpg')
    expect(avatar).toHaveAttribute('width', '96')
    expect(avatar).toHaveAttribute('height', '96')
  })
})
