import { test, expect } from '@playwright/test'

test.describe('Link page', () => {
  test('renders profile title and social links', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText("Hi, I'm Wang")).toBeVisible()
    await expect(page.getByText('Links & socials')).toBeVisible()

    await expect(page.getByLabel(/^GitHub/)).toBeVisible()
    await expect(page.getByLabel(/^Bluesky/)).toBeVisible()
    await expect(page.getByLabel(/^X /)).toBeVisible()
    await expect(page.getByLabel(/^LinkedIn/)).toBeVisible()
  })

  test('social links open in new tab', async ({ page }) => {
    await page.goto('/')

    const github = page.getByLabel(/^GitHub/)
    await expect(github).toHaveAttribute('target', '_blank')
    await expect(github).toHaveAttribute('rel', 'noreferrer')
    await expect(github).toHaveAttribute('href', 'https://github.com/Carnage1999')
  })

  test('dark mode toggle persists across reload', async ({ page }) => {
    await page.goto('/')

    // Should start in light mode
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // Click the theme switch
    await page.getByRole('switch').click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Reload and verify persistence
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('language switcher changes text', async ({ page }) => {
    await page.goto('/')

    // Default English
    await expect(page.getByText("Hi, I'm Wang")).toBeVisible()

    // Open language selector and pick Chinese
    await page.getByRole('button', { name: /EN/i }).click()
    await page.getByRole('option', { name: '正體中文' }).click()

    // Text should switch to Chinese
    await expect(page.getByText('嗨，我是 Wang')).toBeVisible()
    await expect(page.getByText('社群與連結')).toBeVisible()
  })

  test('copy button shows copied feedback', async ({ page, context }) => {
    // Grant clipboard permission
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')

    const copyBtn = page.getByRole('button', { name: /Copy GitHub/i })
    await copyBtn.click()

    await expect(page.getByText('Copied')).toBeVisible()

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toBe('https://github.com/Carnage1999')
  })
})
