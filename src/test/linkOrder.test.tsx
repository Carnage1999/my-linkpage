import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { SettingsView } from '../../api/stats/_settings'
import { LinksTab } from '../pages/manage/tabs/LinksTab'
import { useSiteDraft } from '../pages/manage/useSiteDraft'

const catalogGate = vi.hoisted(() => {
  let release: () => void = () => undefined
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  return {
    pending,
    release: () => release(),
  }
})

vi.mock('../icons/catalog', async () => {
  await catalogGate.pending
  return {
    resolveStoredIcon: (link: { iconSlug?: string }) => ({
      iconSlug: link.iconSlug || 'x',
      iconPath: 'M0',
    }),
    canonicalSlug: (slug: string) => slug,
    resolveIconSlug: () => 'x',
    iconBySlug: () => ({ path: 'M0' }),
    searchIcons: () => [],
  }
})

const field = { value: '', locked: false }
const secret = { state: 'unset' as const, hint: null, locked: false }
const SETTINGS = {
  timezone: { value: 'Asia/Taipei', locked: false },
  defaultProvider: null,
  inject: { umami: true, goatcounter: true, cloudflare: true },
  umami: { apiUrl: field, websiteId: field, username: field, apiKey: secret, password: secret },
  goatcounter: { site: field, apiKey: secret },
  cloudflare: { accountId: field, siteTag: field, apiToken: secret },
  providers: [],
} as SettingsView

function Editor() {
  const [settings] = useState(SETTINGS)
  const draft = useSiteDraft('token', settings)
  return <LinksTab draft={draft} />
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/site-config') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as {
          socials: { id: string }[]
          i18n: { texts: { en?: { pageTitle?: string } } }
          version?: number
        }
        return {
          ok: true,
          headers: { get: () => 'ok' },
          json: async () => ({
            v: 1,
            version: 2,
            ogImagePath: '/api/og',
            site: body && 'site' in body ? (body as { site: unknown }).site : {},
            profile: { avatar: '/avatar.jpg' },
            socials: body.socials,
            i18n: (body as { i18n: unknown }).i18n,
          }),
        }
      }
      return { ok: false, status: 404, json: async () => ({}) }
    }),
  )
})

it('sends a reorder made while the icon catalog is still loading', async () => {
  const user = userEvent.setup()
  render(<Editor />)
  await user.click(screen.getAllByRole('button', { name: 'down' })[0])
  await expect(screen.getAllByLabelText('id')[0]).toHaveValue('bluesky')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.click(screen.getAllByRole('button', { name: 'down' })[1])
  catalogGate.release()
  await screen.findByText('Saved', { exact: true })

  const fetchMock = vi.mocked(fetch)
  const save = fetchMock.mock.calls.find((call) => {
    const init = call[1] as RequestInit | undefined
    return String(call[0]).includes('/api/site-config') && init?.method === 'PUT'
  })
  const body = JSON.parse(String((save?.[1] as RequestInit).body)) as { socials: { id: string }[] }
  expect(body.socials.map((link) => link.id)).toEqual(['bluesky', 'x', 'github', 'line', 'telegram', 'linkedin'])
})
