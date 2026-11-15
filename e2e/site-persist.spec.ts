import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { cookieHeader } from './requestCookies'

const SAVED_IDS = ['github', 'x', 'telegram', 'bluesky', 'line', 'linkedin']
const putOrders: string[][] = []

async function expectIds(page: Page, ids: string[]) {
  const inputs = page.getByLabel('id')
  await expect(inputs).toHaveCount(ids.length)
  for (let index = 0; index < ids.length; index += 1) {
    await expect(inputs.nth(index)).toHaveValue(ids[index])
  }
}

let server: ChildProcess | null = null
let port = 0

function startServer(): Promise<number> {
  server = spawn('pnpm', ['exec', 'tsx', 'e2e/site-api-server.ts'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return new Promise((resolve, reject) => {
    let output = ''
    const fail = (error: Error) => reject(error)
    server?.once('exit', (code) => fail(new Error(`site api server exited ${code}: ${output}`)))
    server?.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    server?.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
      const match = output.match(/PORT (\d+)/)
      if (!match?.[1]) return
      server?.removeListener('exit', fail)
      resolve(Number(match[1]))
    })
  })
}

async function installApi(context: BrowserContext) {
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (method === 'PUT' && url.pathname === '/api/site-config') {
      const body = request.postDataJSON() as { socials?: { id: string }[] }
      putOrders.push((body.socials ?? []).map((link) => link.id))
    }
    const headers = request.headers()
    const cookie = await cookieHeader(context, request)
    if (cookie) headers.cookie = cookie
    delete headers['if-none-match']
    delete headers['if-modified-since']
    const response = await fetch(`http://127.0.0.1:${port}${url.pathname}${url.search}`, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : (request.postDataBuffer() ?? undefined),
    })
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: Buffer.from(await response.arrayBuffer()),
    })
  })
}

async function signIn(page: Page) {
  await page.goto('/manage?lng=en')
  await page.getByLabel('Password').fill('persist-secret')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('tab', { name: 'Overview', selected: true })).toBeVisible()
}

const LANGUAGES = [
  {
    code: 'en',
    tab: 'EN · English',
    title: 'Hello persisted',
    intro: 'I am Han-che Wang. Hi',
    visit: 'Visit',
  },
  {
    code: 'ru',
    tab: 'РУ · Русский',
    title: 'Привет persisted',
    intro: 'Я Ханьчжэ Ван.',
    visit: 'Перейти',
  },
  {
    code: 'zh-TW',
    tab: '國 · 正體中文',
    title: '王瀚哲的頁面',
    intro: '我是王瀚哲。',
    visit: '前往',
  },
]

test.describe('site persistence', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    port = await startServer()
  })

  test.afterAll(() => {
    server?.kill()
  })

  test.afterEach(async ({ page }) => {
    await page.context().unrouteAll({ behavior: 'ignoreErrors' })
  })

  test.beforeEach(async ({ page }) => {
    const reset = await fetch(`http://127.0.0.1:${port}/__test/reset`, { method: 'POST' })
    expect(reset.status).toBe(204)
    putOrders.length = 0
    await page.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'en')
      localStorage.setItem('theme', 'light')
    })
    await installApi(page.context())
  })

  for (const language of LANGUAGES) {
    test(`persists ${language.code} text and a link reorder through the site API`, async ({ page, browser }) => {
      test.setTimeout(90_000)
      await signIn(page)
      await page.getByRole('tab', { name: 'Languages' }).click()
      await page.getByRole('button', { name: language.tab }).click()
      await page.getByLabel('Heading').fill(language.title)
      page.once('dialog', (dialog) => dialog.accept())
      await page.getByRole('tab', { name: 'Links' }).click()
      await expect(page.getByLabel('id').first()).toHaveValue('x')
      await page.getByRole('button', { name: 'down' }).first().click()
      await expect(page.getByLabel('id').first()).toHaveValue('github')
      await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByText('Saved', { exact: true })).toBeVisible()
      expect(putOrders.at(-1)).toEqual(SAVED_IDS)
      await expectPersisted(browser, language)
    })
  }

  test('persists up and down moves and sends that order', async ({ page, browser }) => {
    test.setTimeout(90_000)
    await signIn(page)
    await page.getByRole('tab', { name: 'Links' }).click()
    await expect(page.getByLabel('id').first()).toHaveValue('x')
    await page.getByRole('button', { name: 'down' }).nth(0).click()
    await expect(page.getByLabel('id').nth(0)).toHaveValue('github')
    await expect(page.getByLabel('id').nth(1)).toHaveValue('x')
    await page.getByRole('button', { name: 'down' }).nth(1).click()
    await expect(page.getByLabel('id').nth(2)).toHaveValue('x')
    await page.getByRole('button', { name: 'up' }).last().click()
    const ids = ['github', 'telegram', 'x', 'bluesky', 'linkedin', 'line']
    await expectIds(page, ids)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(putOrders.at(-1)).toEqual(ids)

    const home = await browser.newContext()
    await home.addInitScript(() => localStorage.setItem('theme', 'light'))
    await installApi(home)
    const homePage = await home.newPage()
    await homePage.goto('/')
    await expect(homePage.locator('#social-links > li')).toHaveText([
      /GitHub/,
      /Telegram/,
      /X/,
      /Bluesky/,
      /LinkedIn/,
      /Line/,
    ])
    await home.close()

    const again = await browser.newContext()
    await again.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'en')
      localStorage.setItem('theme', 'light')
    })
    await installApi(again)
    const manage = await again.newPage()
    await signIn(manage)
    await manage.getByRole('tab', { name: 'Links' }).click()
    await expectIds(manage, ids)
    await again.close()
  })

  test('persists the site name and avatar', async ({ page, browser }) => {
    test.setTimeout(90_000)
    await signIn(page)
    await page.getByRole('tab', { name: 'Site' }).click()
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
    await page.getByLabel('Display name').fill('Persisted Name')
    await page.getByLabel('Custom https URL').fill('https://cdn.example/a.jpg')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()

    const home = await browser.newContext()
    await home.addInitScript(() => localStorage.setItem('theme', 'light'))
    await installApi(home)
    const homePage = await home.newPage()
    await homePage.goto('/')
    await expect(homePage.getByRole('img', { name: 'Photo of Han-che Wang' })).toHaveAttribute(
      'src',
      'https://cdn.example/a.jpg',
    )
    await home.close()

    const again = await browser.newContext()
    await again.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'en')
      localStorage.setItem('theme', 'light')
    })
    await installApi(again)
    const manage = await again.newPage()
    await signIn(manage)
    await manage.getByRole('tab', { name: 'Site' }).click()
    await expect(manage.getByLabel('Display name')).toHaveValue('Persisted Name')
    await expect(manage.getByLabel('Custom https URL')).toHaveValue('https://cdn.example/a.jpg')
    await again.close()
  })

  test('persists analytics settings through the same save as the rest of the config', async ({ page, browser }) => {
    test.setTimeout(90_000)
    await signIn(page)
    await page.getByRole('tab', { name: 'Analytics' }).click()
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
    await page.getByLabel('Timezone').fill('Europe/Paris')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Timezone')).toHaveValue('Europe/Paris')

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('tab', { name: 'Languages' }).click()
    await page.getByRole('button', { name: 'EN · English' }).click()
    await page.getByLabel('Heading').fill('Hello persisted')
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()

    const again = await browser.newContext()
    await again.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'en')
      localStorage.setItem('theme', 'light')
    })
    await installApi(again)
    const manage = await again.newPage()
    await signIn(manage)
    await manage.getByRole('tab', { name: 'Analytics' }).click()
    await expect(manage.getByLabel('Timezone')).toHaveValue('Europe/Paris')
    await manage.getByRole('tab', { name: 'Languages' }).click()
    await manage.getByRole('button', { name: 'EN · English' }).click()
    await expect(manage.getByLabel('Heading')).toHaveValue('Hello persisted')
    await again.close()

    const saved = (await fetch(`http://127.0.0.1:${port}/api/site-config`).then((response) => response.json())) as {
      scripts: { umami: { websiteId: string } | null }
    }
    expect(saved.scripts.umami?.websiteId).toBe('umamisite')
    const state = (await fetch(`http://127.0.0.1:${port}/__test/state`).then((response) => response.json())) as {
      settings: string
      writes: string[]
    }
    expect(state.writes.filter((key) => key === 'stats:settings')).toEqual([])
    expect(state.settings).toContain('"websiteId":"umamisite"')
  })

  test('persists a language added on the Languages tab', async ({ page, browser }) => {
    test.setTimeout(90_000)
    await signIn(page)
    await page.getByRole('tab', { name: 'Languages' }).click()
    await page.getByLabel('Locale code').fill('ja')
    await page.getByLabel('Language name').fill('日本語')
    await page.getByLabel('Switcher').fill('JA')
    await page.getByRole('button', { name: 'Add language' }).click()
    await expect(page.getByRole('button', { name: 'JA · 日本語' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByLabel('Heading').fill('こんにちは')
    await page.getByLabel('Introduction').fill('自己紹介です')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('tab', { name: 'Links' }).click()
    await expect(page.getByLabel('id').first()).toHaveValue('x')
    await page.getByRole('button', { name: 'down' }).first().click()
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(putOrders.at(-1)).toEqual(SAVED_IDS)
    await expectPersisted(browser, {
      code: 'ja',
      tab: 'JA · 日本語',
      title: 'こんにちは',
      intro: '自己紹介です',
      visit: 'Visit',
    })
  })
})

async function expectPersisted(
  browser: Browser,
  language: { code: string; tab: string; title: string; intro: string; visit: string },
) {
  const state = (await fetch(`http://127.0.0.1:${port}/__test/state`).then((response) => response.json())) as {
    settings: string
    writes: string[]
  }
  expect(state.writes.filter((key) => key === 'stats:settings')).toEqual([])
  expect(state.settings).toContain('"websiteId":"umamisite"')

  const home = await browser.newContext()
  await home.addInitScript(() => {
    localStorage.setItem('theme', 'light')
    localStorage.removeItem('i18nextLng')
  })
  await installApi(home)
  const homePage = await home.newPage()
  await homePage.goto(`/?lng=${language.code}`)
  await expect(homePage.locator('#profile-title')).toHaveText(language.title)
  await expect(homePage.locator('html')).toHaveAttribute('lang', language.code)
  await expect(homePage.locator('meta[name="description"]')).toHaveAttribute('content', language.intro)
  await expect(homePage.locator('meta[property="og:locale"]')).toHaveAttribute(
    'content',
    language.code.replaceAll('-', '_'),
  )
  await expect(homePage.getByText(language.visit, { exact: true }).first()).toBeVisible()
  await expect(homePage.locator('#social-links > li')).toHaveText([
    /GitHub/,
    /X/,
    /Telegram/,
    /Bluesky/,
    /Line/,
    /LinkedIn/,
  ])
  await home.close()

  const again = await browser.newContext()
  await again.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en')
    localStorage.setItem('theme', 'light')
  })
  await installApi(again)
  const manage = await again.newPage()
  await signIn(manage)
  await manage.getByRole('tab', { name: 'Languages' }).click()
  await manage.getByRole('button', { name: language.tab }).click()
  await expect(manage.getByLabel('Heading')).toHaveValue(language.title)
  if (language.code === 'ja') await expect(manage.getByLabel('Introduction')).toHaveValue(language.intro)
  manage.once('dialog', (dialog) => dialog.accept())
  await manage.getByRole('tab', { name: 'Links' }).click()
  await expect(manage.getByLabel('id').first()).toHaveValue('github')
  await again.close()
}
