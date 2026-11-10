import { expect, test, type Page } from '@playwright/test'

const DATA = {
  timezone: 'Asia/Taipei',
  days: 30,
  totals: { github: 9, retired: 4 },
  periodTotals: { github: 5, retired: 1 },
  previousPeriodTotals: { github: 2 },
  daily: [{ date: '2026-11-10', clicks: { github: 5 } }],
  configuredIds: ['github'],
  removed: [{ id: 'retired', total: 4, period: 1 }],
}

const VISITORS = {
  provider: 'umami',
  configured: true,
  totals: { pageviews: 20, visitors: 8, visits: 10, bounceRate: 0.3, avgDuration: 10 },
  previous: { pageviews: 10, visitors: 4, visits: 5, bounceRate: 0.4, avgDuration: 8 },
  timeseries: [{ date: '2026-11-10', pageviews: 20, visitors: 8 }],
  referrers: [{ name: 'github.com', count: 4 }],
  countries: [{ name: 'TW', count: 6 }],
  devices: [{ name: 'desktop', count: 7 }],
  browsers: [{ name: 'chrome', count: 5 }],
  os: [],
  linkClicks: { github: 2 },
}

const secret = { state: 'unset', hint: null, locked: false }
const text = (value = '') => ({ value, locked: false })
const SETTINGS = {
  timezone: { value: 'Asia/Taipei', locked: true },
  defaultProvider: 'umami',
  inject: { umami: true, goatcounter: false, cloudflare: false },
  umami: { apiUrl: text(), websiteId: text('site'), username: text(), apiKey: { state: 'env', hint: null, locked: true }, password: secret },
  goatcounter: { site: text(), apiKey: secret },
  cloudflare: { accountId: text(), siteTag: text(), apiToken: secret },
  providers: [
    { id: 'upstash', configured: false, missing: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
    { id: 'goatcounter', configured: false, missing: ['GOATCOUNTER_SITE', 'GOATCOUNTER_API_KEY'] },
    { id: 'cloudflare', configured: false, missing: ['CLOUDFLARE_ACCOUNT_ID'] },
    { id: 'umami', configured: true, missing: [] },
  ],
}

async function installApi(page: Page, dataStatus = 200) {
  await page.route('**/api/stats/auth', async (route) => {
    const body = route.request().postDataJSON() as { password?: string }
    if (body.password === 'correct') {
      await route.fulfill({ json: { token: 'test-token' } })
      return
    }
    await route.fulfill({ status: 401, json: { error: 'Invalid password' } })
  })
  await page.route('**/api/stats/data**', async (route) => {
    if (route.request().headers().authorization !== 'Bearer test-token') {
      await route.fulfill({ status: 401, json: { error: 'Invalid or expired token' } })
      return
    }
    await route.fulfill({ status: dataStatus, json: dataStatus === 200 ? DATA : { error: 'Invalid or expired token' } })
  })
  await page.route('**/api/stats/visitors**', async (route) => {
    if (route.request().headers().authorization !== 'Bearer test-token') {
      await route.fulfill({ status: 401, json: { error: 'Invalid or expired token' } })
      return
    }
    await route.fulfill({ json: VISITORS })
  })
  await page.route('**/api/stats/settings**', async (route) => {
    if (route.request().headers().authorization !== 'Bearer test-token') {
      await route.fulfill({ status: 401, json: { error: 'Invalid or expired token' } })
      return
    }
    await route.fulfill({ json: SETTINGS })
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en')
    localStorage.setItem('theme', 'light')
  })
})

test('shows the login form only at /manage', async ({ page }) => {
  await page.goto('/manage')
  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')

  await page.goto('/stats')
  await expect(page.getByLabel('Password')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Admin' })).toHaveCount(0)
})

test('logs in with the mocked API and shows Redis beside Umami', async ({ page }) => {
  await installApi(page)
  await page.goto('/manage')
  await page.getByLabel('Password').fill('wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('That password is incorrect.')).toBeVisible()

  await page.getByLabel('Password').fill('correct')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Clicks this period')).toBeVisible()
  await expect(page.getByText('Redis counts clicks that reach this server')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Redis' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Umami' })).toBeVisible()
  await expect(page.getByText('GitHub', { exact: true })).toBeVisible()
  await expect(page.getByText('retired')).toBeVisible()
  await expect(page.getByText('Referrers')).toBeVisible()
  await expect(page.getByText('github.com')).toBeVisible()
})

test('opens each section from the tab bar and keeps unsaved edits', async ({ page }) => {
  await installApi(page)
  await page.goto('/manage')
  await page.getByLabel('Password').fill('correct')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('tab', { name: 'Overview', selected: true })).toBeVisible()
  await expect(page.getByText('Clicks this period')).toBeVisible()

  await page.getByRole('tab', { name: 'Site' }).click()
  await expect(page).toHaveURL(/tab=site/)
  await expect(page.getByLabel('Name')).toBeVisible()
  await expect(page.getByText('Clicks this period')).toHaveCount(0)
  await page.getByLabel('Name').fill('Changed name')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('tab', { name: 'Links' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Changed name')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('tab', { name: 'Links' }).click()
  await expect(page).toHaveURL(/tab=links/)
  await expect(page.getByLabel('url').first()).toBeVisible()

  await page.goto('/manage?tab=analytics')
  await expect(page.getByRole('tab', { name: 'Analytics', selected: true })).toBeVisible()
  await expect(page.getByText('Providers')).toBeVisible()

  await page.goto('/manage?tab=data')
  await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import seed' })).toBeVisible()
})

test('returns to the login form when the session is rejected', async ({ page }) => {
  await installApi(page, 401)
  await page.goto('/manage')
  await page.getByLabel('Password').fill('correct')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByText('Clicks this period')).toHaveCount(0)
})
