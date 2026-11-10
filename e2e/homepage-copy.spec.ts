import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const seed = JSON.parse(readFileSync(new URL('../public/siteConfig.json', import.meta.url), 'utf8')) as {
  site: { name: string; tagline: string; domain: string; twitterHandle?: string }
  profile: { avatar: string }
  socials: unknown[]
  i18n: {
    languages: { code: string; label: string; shortLabel: string }[]
    fallback: string
    detect: boolean
    overrides: Record<string, Record<string, string>>
  }
}

type SiteDocument = typeof seed & { version: number; ogImagePath: string }

function documentWith(overrides: Record<string, Record<string, string>>, version = 8): SiteDocument {
  return {
    ...seed,
    version,
    ogImagePath: '/api/og',
    i18n: { ...seed.i18n, overrides },
  }
}

const DATA = {
  timezone: 'Asia/Taipei',
  days: 30,
  totals: { github: 9 },
  periodTotals: { github: 5 },
  previousPeriodTotals: { github: 2 },
  daily: [{ date: '2026-11-10', clicks: { github: 5 } }],
  configuredIds: ['github'],
  removed: [],
}

const SETTINGS = {
  timezone: { value: 'Asia/Taipei', locked: true },
  defaultProvider: 'umami',
  inject: { umami: true, goatcounter: false, cloudflare: false },
  umami: {
    apiUrl: { value: '', locked: false },
    websiteId: { value: 'site', locked: false },
    username: { value: '', locked: false },
    apiKey: { state: 'env', hint: null, locked: true },
    password: { state: 'unset', hint: null, locked: false },
  },
  goatcounter: { site: { value: '', locked: false }, apiKey: { state: 'unset', hint: null, locked: false } },
  cloudflare: {
    accountId: { value: '', locked: false },
    siteTag: { value: '', locked: false },
    apiToken: { state: 'unset', hint: null, locked: false },
  },
  providers: [{ id: 'umami', configured: true, missing: [] }],
}

async function installDashboard(page: Page) {
  await page.route('**/api/stats/auth', async (route) => {
    const body = route.request().postDataJSON() as { password?: string }
    if (body.password === 'correct') {
      await route.fulfill({ json: { token: 'test-token' } })
      return
    }
    await route.fulfill({ status: 401, json: { error: 'Invalid password' } })
  })
  await page.route('**/api/stats/data**', async (route) => {
    await route.fulfill({ json: DATA })
  })
  await page.route('**/api/stats/visitors**', async (route) => {
    await route.fulfill({ json: { provider: 'umami', configured: false } })
  })
  await page.route('**/api/stats/settings**', async (route) => {
    await route.fulfill({ json: SETTINGS })
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('i18nextLng')
    localStorage.setItem('theme', 'light')
  })
})

test('applies mocked homepage overrides for English and Traditional Chinese', async ({ page }) => {
  await page.route('**/api/site-config', async (route) => {
    await route.fulfill({
      json: documentWith({
        en: { title: 'Han', pageTitle: 'lp', intro: 'Edited intro' },
        'zh-TW': { title: '漢哲', pageTitle: '連結', intro: '編輯的介紹' },
      }),
    })
  })

  await page.goto('/?lng=en')
  await expect(page.locator('#profile-title')).toHaveText('Han')
  await expect(page).toHaveTitle('lp')
  await expect(page.locator('meta[name="description"]')).toHaveCount(1)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Edited intro')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.goto('/?lng=zh-TW')
  await expect(page.locator('#profile-title')).toHaveText('漢哲')
  await expect(page).toHaveTitle('連結')
  await expect(page.locator('meta[name="description"]')).toHaveCount(1)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', '編輯的介紹')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW')
})

test('shows a Languages tab save on the homepage', async ({ page }) => {
  let config = documentWith({})
  await installDashboard(page)
  await page.route('**/api/site-config', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as SiteDocument
      config = { ...config, ...body, version: 9, ogImagePath: '/api/og' }
      await route.fulfill({ json: config })
      return
    }
    await route.fulfill({ json: config })
  })

  await page.goto('/manage?lng=en')
  await page.getByLabel('Password').fill('correct')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('tab', { name: 'Languages' }).click()
  await page.getByLabel('Heading').fill('Saved heading')
  await page.getByLabel('Page title').fill('Saved title')
  await page.getByLabel('Introduction').fill('Saved intro')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: '← Back' }).click()
  await expect(page.locator('#profile-title')).toHaveText('Saved heading')
  await expect(page).toHaveTitle('Saved title')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Saved intro')
})
