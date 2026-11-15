import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const seed = JSON.parse(readFileSync('public/siteConfig.json', 'utf8')) as Record<string, unknown>

test('Umami, GoatCounter, and Cloudflare scripts are allowed by CSP', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))
  await page.addInitScript(() => {
    const record = window as Window & { __csp?: string[] }
    record.__csp = []
    document.addEventListener('securitypolicyviolation', (event) => {
      record.__csp?.push(`${event.violatedDirective} ${event.blockedURI}`)
    })
  })
  await page.route('**/api/site-config**', async (route) => {
    await route.fulfill({
      json: {
        ...seed,
        version: 31,
        scripts: {
          umami: { websiteId: 'site', src: 'https://cloud.umami.is/script.js' },
          goatcounter: { endpoint: 'https://hanche.goatcounter.com/count' },
          cloudflare: { token: 'cftag' },
        },
      },
      headers: { etag: '"site-31"' },
    })
  })
  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain('https://cloud.umami.is')
  expect(response?.headers()['content-security-policy']).toContain('https://gc.zgo.at')
  expect(response?.headers()['content-security-policy']).toContain('https://static.cloudflareinsights.com')
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  await expect(page.locator('script[src="https://cloud.umami.is/script.js"]')).toHaveCount(1)
  await expect(page.locator('script[src="https://gc.zgo.at/count.js"]')).toHaveCount(1)
  await expect(page.locator('script[src="https://static.cloudflareinsights.com/beacon.min.js"]')).toHaveCount(1)
  await expect(page.locator('script[src="/theme-init.js"]')).toHaveCount(1)
  expect(await page.evaluate(() => (window as Window & { __csp?: string[] }).__csp ?? [])).toEqual([])
  expect(requested.filter((url) => url.includes('recharts'))).toEqual([])
})
