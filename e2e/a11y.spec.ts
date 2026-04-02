import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function resetStorage(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
}

test.describe('Accessibility (axe-core)', () => {
  test.beforeEach(async ({ page }) => {
    await resetStorage(page)
  })

  test('light mode has no a11y violations', async ({ page }) => {
    // Ensure content is fully rendered
    await expect(page.getByRole('heading', { name: /Hi, I'm Wang/i })).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('dark mode has no a11y violations', async ({ page }) => {
    await page.getByRole('switch').click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('Chinese locale has no a11y violations', async ({ page }) => {
    await page.getByRole('button', { name: /EN/i }).click()
    await page.getByRole('option', { name: '正體中文' }).click()
    await expect(page.getByText('嗨，我是 Wang')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
