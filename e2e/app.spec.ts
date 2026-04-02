import { test, expect, type Page } from '@playwright/test'

// ─── Fixtures ────────────────────────────────────────────

const SOCIAL_LINKS = [
  { id: 'github', label: 'GitHub', url: 'https://github.com/Carnage1999' },
  { id: 'bluesky', label: 'Bluesky', url: 'https://bsky.app/profile/w1999.me' },
  { id: 'x', label: 'X', url: 'https://x.com/wang_hanzhe' },
  { id: 'line', label: 'Line', url: 'https://line.me/ti/p/Oc10OLyIM0' },
  { id: 'telegram', label: 'Telegram', url: 'https://t.me/WHZ1999' },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/hanzhe-wang/' },
] as const

const LANGUAGES = [
  {
    code: 'en',
    button: /EN/i,
    option: 'English',
    title: "Hi, I'm Wang",
    subtitle: 'Links & socials',
    pageTitle: 'Wang — Link Page',
  },
  {
    code: 'zh-TW',
    button: /EN|國/i,
    option: '正體中文',
    title: '嗨，我是 Wang',
    subtitle: '社群與連結',
    pageTitle: 'Wang — 連結頁面',
  },
  {
    code: 'ru',
    button: /EN|РУ|國/i,
    option: 'Русский',
    title: 'Привет, я Wang',
    subtitle: 'Ссылки и соцсети',
    pageTitle: 'Wang — Страница ссылок',
  },
] as const

// ─── Helpers ─────────────────────────────────────────────

/** Clear localStorage so each test starts with a clean slate. */
async function resetStorage(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
}

// ─── Core rendering ──────────────────────────────────────

test.describe('Core rendering', () => {
  test.beforeEach(async ({ page }) => { await resetStorage(page) })

  test('displays profile heading, subtitle, and avatar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: "Hi, I'm Wang" })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Links & socials' })).toBeVisible()
    await expect(page.getByRole('img', { name: /photo of/i })).toBeVisible()
  })

  test('renders all social link cards with correct hrefs', async ({ page }) => {
    for (const { label, url } of SOCIAL_LINKS) {
      const link = page.getByRole('link', { name: new RegExp(`^${label}`) })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', url)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noreferrer')
    }
  })

  test('shows "About me" intro section', async ({ page }) => {
    await expect(page.getByText('About me')).toBeVisible()
    await expect(page.getByText('I am Han-che Wang.')).toBeVisible()
  })

  test('shows footer', async ({ page }) => {
    await expect(page.getByLabel('Built with love')).toBeVisible()
  })
})

// ─── Dark mode ───────────────────────────────────────────

test.describe('Dark mode', () => {
  test.beforeEach(async ({ page }) => { await resetStorage(page) })

  test('defaults to light mode without system preference', async ({ page }) => {
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('toggle switches to dark and persists across reload', async ({ page }) => {
    await page.getByRole('switch').click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('toggle back to light also persists', async ({ page }) => {
    // dark
    await page.getByRole('switch').click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // light again
    await page.getByRole('switch').click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('respects prefers-color-scheme: dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})

// ─── Language switcher ───────────────────────────────────

test.describe('Language switcher', () => {
  test.beforeEach(async ({ page }) => { await resetStorage(page) })

  for (const lang of LANGUAGES) {
    test(`switches to ${lang.code} and updates title + subtitle`, async ({ page }) => {
      await page.getByRole('button', { name: lang.button }).click()
      await page.getByRole('option', { name: lang.option }).click()

      await expect(page.getByText(lang.title)).toBeVisible()
      await expect(page.getByText(lang.subtitle)).toBeVisible()
    })
  }

  test('language persists across reload', async ({ page }) => {
    // Switch to Chinese
    await page.getByRole('button', { name: /EN/i }).click()
    await page.getByRole('option', { name: '正體中文' }).click()
    await expect(page.getByText('嗨，我是 Wang')).toBeVisible()

    await page.reload()
    await expect(page.getByText('嗨，我是 Wang')).toBeVisible()
  })

  test('page <title> updates on language change', async ({ page }) => {
    await expect(page).toHaveTitle('Wang — Link Page')

    await page.getByRole('button', { name: /EN/i }).click()
    await page.getByRole('option', { name: '正體中文' }).click()

    await expect(page).toHaveTitle('Wang — 連結頁面')
  })

  test('html lang attribute updates on language change', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await page.getByRole('button', { name: /EN/i }).click()
    await page.getByRole('option', { name: '正體中文' }).click()

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW')
  })
})

// ─── Copy to clipboard ──────────────────────────────────

test.describe('Copy to clipboard', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await resetStorage(page)
  })

  test('copy button shows "Copied" feedback and writes correct URL', async ({ page }) => {
    const copyBtn = page.getByRole('button', { name: /Copy GitHub/i })
    await copyBtn.click()

    // The animated (non-invisible) text should now read "Copied"
    await expect(copyBtn.locator('span.col-start-1:not(.invisible)', { hasText: 'Copied' })).toBeVisible()
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toBe('https://github.com/Carnage1999')
  })

  test('"Copied" feedback disappears after timeout', async ({ page }) => {
    const copyBtn = page.getByRole('button', { name: /Copy GitHub/i })
    await copyBtn.click()
    await expect(copyBtn.locator('span.col-start-1:not(.invisible)', { hasText: 'Copied' })).toBeVisible()

    // Feedback clears after ~1.5 s — the text reverts back to "Copy"
    await expect(copyBtn.locator('span.col-start-1:not(.invisible)', { hasText: 'Copy' })).toBeVisible({ timeout: 3000 })
  })

  test('copying a different link replaces the previous feedback', async ({ page }) => {
    const githubBtn = page.getByRole('button', { name: /Copy GitHub/i })
    await githubBtn.click()
    await expect(githubBtn.locator('span.col-start-1:not(.invisible)', { hasText: 'Copied' })).toBeVisible()

    const blueskyBtn = page.getByRole('button', { name: /Copy Bluesky/i })
    await blueskyBtn.click()
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toBe('https://bsky.app/profile/w1999.me')
    // Bluesky button should now show Copied
    await expect(blueskyBtn.locator('span.col-start-1:not(.invisible)', { hasText: 'Copied' })).toBeVisible()
  })
})

// ─── Accessibility ───────────────────────────────────────

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => { await resetStorage(page) })

  test('"Skip to content" link is focusable and points to #social-links', async ({ page }) => {
    const skipLink = page.getByRole('link', { name: /skip to content/i })
    await skipLink.focus()
    await expect(skipLink).toBeVisible()
    await expect(skipLink).toHaveAttribute('href', '#social-links')
  })

  test('social link list has an accessible label', async ({ page }) => {
    const list = page.getByRole('list', { name: 'Links & socials' })
    await expect(list).toBeVisible()
  })

  test('theme switch has an accessible name', async ({ page }) => {
    const themeSwitch = page.getByRole('switch')
    await expect(themeSwitch).toBeVisible()
    // The sr-only text inside the switch is the label
    await expect(themeSwitch.locator('.sr-only')).toHaveText(/theme/i)
  })
})

// ─── SEO / meta tags ────────────────────────────────────

test.describe('SEO meta tags', () => {
  test.beforeEach(async ({ page }) => { await resetStorage(page) })

  test('has correct default page title and meta description', async ({ page }) => {
    await expect(page).toHaveTitle('Wang — Link Page')
    const desc = page.locator('meta[name="description"]').last()
    await expect(desc).toHaveAttribute('content', /Han-che Wang/i)
  })

  test('has canonical link', async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]').last()
    await expect(canonical).toHaveAttribute('href', /\/$/)
  })

  test('has Open Graph tags', async ({ page }) => {
    await expect(page.locator('meta[property="og:title"]').last()).toHaveAttribute('content', /.+/)
    await expect(page.locator('meta[property="og:description"]').last()).toHaveAttribute('content', /.+/)
    await expect(page.locator('meta[property="og:type"]').last()).toHaveAttribute('content', 'profile')
  })
})
