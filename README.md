# my-linkpage

**English** | [Русский](README.ru.md) | [正體中文](README.zh-TW.md)

A multilingual link-in-bio page built with React, Vite, TypeScript, and Tailwind CSS.

**Live demo → <https://link.w1999.me>**

## Features

- **Updates from /manage** — profile, links, and analytics are saved in Redis. `public/siteConfig.json` is the seed when Redis is empty. `index.html` and the built OG image change on the next deploy
- **Auto icon detection** — icons resolved from the link hostname against the full [simple-icons](https://simpleicons.org) set. `/manage` can override the icon. The homepage stores the SVG path and does not bundle the icon package. LinkedIn is a custom mark because simple-icons no longer ships it.
- **Dynamic OG image** — serverless endpoint (`/api/og`) generates a 1200×630 social preview at request time using Web Standard APIs, always reflecting the latest config
- **Multilingual** — EN / RU / ZH-TW with automatic browser language detection (Simplified Chinese → Traditional Chinese)
- **Dark / light mode** — follows system preference; user toggle persists via `localStorage`
- **Animations** — Motion entrance transitions with `prefers-reduced-motion` support
- **Self-hosted fonts** — Manrope & Space Grotesk variable fonts via `@fontsource-variable`
- **Analytics** — Upstash, GoatCounter, Cloudflare Web Analytics, or Umami on `/manage`. Click recording uses Upstash Redis and does not depend on the analytics script.
- **SEO** — dynamic meta/OG/Twitter tags, JSON-LD Person schema, hreflang, canonical link
- **Accessibility** — skip link, semantic HTML, ARIA labels, `aria-live` feedback, WCAG contrast; dedicated axe-core audit in E2E
- **Error boundary** — top-level crash fallback with reload button
- **Clipboard fallback** — `navigator.clipboard` with `execCommand` fallback
- **Performance** — LazyMotion tree-shaking, Vite manual chunk splitting
- **Testing** — Vitest + Testing Library unit tests; Playwright E2E (Chromium, Firefox, WebKit) + axe-core accessibility audit
- **CI/CD** — GitHub Actions two-stage pipeline: lint → typecheck → test → build, then E2E & accessibility tests
- **Code quality** — TypeScript 6 strict mode, ESLint 10, Prettier, `pnpm check` pipeline

## Tech Stack

| Category | Tools |
|---|---|
| Framework | React 19, TypeScript 6 |
| Routing | react-router 7 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`), Headless UI |
| Animation | Motion |
| i18n | Homepage texts in the site config; dashboard labels in `src/manage/copy.ts` |
| Charts | Recharts 3 |
| Icons | simple-icons 16 (full set, path stored at save) |
| OG image | satori, @resvg/resvg-js (build-time + serverless) |
| Stats backend | Upstash Redis (REST API, no SDK) |
| Fonts | @fontsource-variable (Manrope, Space Grotesk) |
| Testing | Vitest 5, Testing Library, Playwright, axe-core |
| Linting | ESLint 10, Prettier |
| Package manager | pnpm 12 (pinned as `pnpm@12.18.0` in `packageManager`) |
| CI | GitHub Actions (Node 24) |

## Getting Started

Node.js 24 (the version CI uses). Node.js 22.22 or newer also satisfies the installed toolchain. pnpm is pinned in `package.json` via the `packageManager` field. [Corepack](https://nodejs.org/api/corepack.html), which ships with these Node versions, installs that exact pnpm:

```bash
corepack enable
corepack install   # activates pnpm 12.18.0 from packageManager
pnpm install
pnpm dev        # development server
pnpm build      # sitemap update + OG image + production build
pnpm preview    # preview production build
```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Update sitemap lastmod + generate OG image + production build |
| `pnpm generate-og` | Regenerate OG social preview image only |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier format |
| `pnpm test` | Unit / component tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Playwright) |
| `pnpm test:e2e:a11y` | Accessibility audit (axe-core) |
| `pnpm check` | Full pipeline: typecheck → lint → test → build |

## Project Structure

```text
public/
  siteConfig.json          Seed used when Redis has no saved site
  avatar.jpg               Default avatar, served from this site
src/
  generated/
    public-images.json     Build-time list of avatar images in public/
  siteConfig.ts            Type definitions and build-time fallback defaults
  App.tsx                  Main page UI
  main.tsx                 Entry point (wrapped in ErrorBoundary)
  router.tsx               Client-side routing (/, /manage)
  SocialIcon.tsx           Draws a stored SVG path, or a generic link icon
  icons/                   simple-icons catalog (manage + API only) and the LinkedIn fallback
  i18n.ts                  Language detection and i18n setup
  index.css                Global styles and Tailwind entry
  components/
    ErrorBoundary.tsx      Crash fallback UI
    SEO.tsx                Meta tags, OG image, JSON-LD
  hooks/
    useSiteConfig.ts       Seed first, then hydrate from /api/site-config
    useAnalytics.ts        Injects every enabled tracker and sends link events
    useStats.ts            Dashboard auth, click beacon, pageview beacon
  pages/
    manage/                Password-protected dashboard at /manage
      ManagePage.tsx       Login gate
      Dashboard.tsx        Tab shell (overview, site, links, analytics, data)
      tabs/                One panel per tab, including the icon picker
      ProviderSettings.tsx Provider credentials and script toggles
      LinkHeatmap.tsx      Per-link click comparison
      clickCsv.ts          CSV export
  manage/copy.ts           Dashboard labels (en / ru / zh-TW)
  test/                    Vitest unit and component tests
api/
  og.ts                    Serverless function — dynamic OG image (Web Standard API)
  stats/
    _handlers.ts           Auth, click record, click report
    _redis.ts              Upstash Redis REST helpers
    _settings.ts           Provider settings; secrets encrypted at rest
    _site-store.ts         Runtime site JSON, seed fallback
    _site-schema.ts        Validation, including the avatar allow-list
    _providers/            Upstash, GoatCounter, Cloudflare, Umami
    _dates.ts              Timezone day boundaries
    _aggregate.ts          Click totals for the selected range
    _links.ts              Link id check
    _token.ts              HMAC token auth (Web Crypto API)
    auth.ts                Login endpoint
    check.ts               Feature-detection endpoint
    data.ts                Redis click report
    visitors.ts            Visitor report for the selected provider
    pageview.ts            Homepage pageview aggregates
    settings.ts            Read and save provider settings
    provider-test.ts       Test a provider without storing the draft
    scripts.ts             Public non-secret tracker ids
    record.ts              Click recording endpoint
  site-config.ts           Public site config and authenticated saves
e2e/
  app.spec.ts              Playwright E2E tests
  manage.spec.ts           Admin login and dashboard
  a11y.spec.ts             axe-core accessibility audit
scripts/
  generate-og-image.ts     Build-time OG image generator (static fallback)
  generate-public-images.ts  Avatar manifest from public/
  generate-site-icons.ts   Seed icon slugs and paths from simple-icons
  update-sitemap-lastmod.ts  Auto-update sitemap.xml lastmod date
```

## Customization

### Social links, profile, and site metadata

Change the live site at `/manage`. `public/siteConfig.json` is the seed when Redis is empty or unreachable, and the source for `index.html` plus the built `public/og-image.png`. Those two stay as they were at build time until the next deploy. The React page, its meta tags, and `/api/og` follow the save immediately.

The Site tab’s display name is the share-image name and the author metadata. Homepage sentences, including the heading and subtitle, are edited per language on the Languages tab and stored with the site config. A missing line uses the default language. The dashboard keeps its own labels in `src/manage/copy.ts`. Right-to-left languages are shown left to right.

```jsonc
{
  "site": {
    "name": "Your Name",
    "tagline": "Links & Socials",
    "domain": "your-domain.com",
    "twitterHandle": "@your_handle"    // optional
  },
  "profile": {
    "avatar": "/avatar.jpg"             // a public/ image, or an https URL
  },
  "socials": [
    { "id": "github", "label": "GitHub", "url": "https://github.com/you", "iconSlug": "github", "iconPath": "M12 ..." },
    { "id": "x", "label": "X", "url": "https://x.com/you", "iconSlug": "x", "iconPath": "M14 ..." }
    // iconSlug is a simple-icons slug plus iconPath from that package.
    // LinkedIn uses the custom "linkedin" mark. The link id is not the icon.
  ]
}
```

The avatar picker lists images shipped in `public/` (jpg, png, webp, svg), skipping the OG image and the Vite placeholder. `scripts/generate-public-images.ts` writes that list at build time. The default is `/avatar.jpg`. An optional https URL is allowed. There is no upload, and the URL is never a `raw.githubusercontent.com` link.

### Translations

Homepage copy is edited on the Languages tab. Dashboard labels live in `src/manage/copy.ts`.

### Analytics

Configure visitor sources on `/manage`, or with the environment variables below. Environment variables override the saved values. Enabled scripts (Umami, GoatCounter, Cloudflare Web Analytics) load on the homepage from the public site config.

### OG image

`/api/og` reads the runtime site config and falls back to the seed. The file written at `pnpm build` is the static fallback baked into `index.html`.

### Admin dashboard (optional)

The dashboard lives at `/manage` and is not linked from the public page. It sends `noindex` and is disallowed in `robots.txt`. Set these environment variables (see `.env.example`):

| Variable | Description |
|---|---|
| `STATS_PASSWORD` | Password for `/manage` |
| `STATS_TIMEZONE` | IANA day boundary. Defaults to `Asia/Taipei`. |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL ([console](https://console.upstash.com) → database → REST API) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `STATS_SECRET` | Optional key for secrets saved on `/manage`. Falls back to `STATS_PASSWORD`. Changing it makes saved secrets unreadable. |
| `UMAMI_WEBSITE_ID` | Umami website id. Overrides the value saved on `/manage`. |
| `UMAMI_API_URL` | Umami API origin. Empty uses Umami Cloud (`https://api.umami.is/v1`). The tracker script stays `https://cloud.umami.is/script.js`. |
| `UMAMI_API_KEY` | Cloud or self-hosted API key (`x-umami-api-key`). |
| `UMAMI_USERNAME` / `UMAMI_PASSWORD` | Self-hosted login when no API key is set. The session token stays on the server. |
| `GOATCOUNTER_SITE` | Site code or `https://code.goatcounter.com` URL. |
| `GOATCOUNTER_API_KEY` | Bearer token from GoatCounter. |
| `CLOUDFLARE_ACCOUNT_ID` | Account id for the Analytics GraphQL API. |
| `CLOUDFLARE_API_TOKEN` | Token with Account Analytics Read. |
| `CLOUDFLARE_WA_SITE_TAG` | Public beacon token for the site. |

`STATS_PASSWORD` plus both Upstash variables turn on click recording and the DIY pageview counter. The homepage sends one `POST /api/stats/record` per click and one `POST /api/stats/pageview` per load, with `navigator.sendBeacon` (or `fetch` keepalive). Pageviews store counts only: referrer host, country, and a parsed browser, OS, and device. The raw User-Agent and IP are not stored.

`/manage` lists Upstash, GoatCounter, Cloudflare Web Analytics, and Umami. A provider is selectable when its settings or env vars are complete. Redis link clicks stay beside that provider's link events when the provider has them. Docs: [Umami](https://docs.umami.is/docs/api), [GoatCounter](https://www.goatcounter.com/help/api), [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/), [Cloudflare GraphQL](https://developers.cloudflare.com/analytics/graphql-api/), [Upstash Redis](https://upstash.com/docs/redis/features/restapi).

The API uses Web `Request` / `Response` and Web Crypto, including on Vercel Edge. The free Upstash database (256 MB, 500,000 commands/month) is the intended size. An accepted click is one script of about 5 commands. An accepted pageview is one script of about 8 commands, and a duplicate inside 30 seconds is 1 command. The public site config and script ids are cached, so a homepage visit is normally 0 commands. See the pull request for the monthly estimate.

## Deployment

Pre-configured for multiple platforms:

- **Vercel** — `vercel.json` with security headers, asset caching, `/api/og` OG image endpoint, and `/api/stats/*` edge endpoints
- **Firebase Hosting** — `firebase.json` with SPA rewrites and security headers
- **Nginx** — `nginx.conf` and `customHttp.yml` provided
- **CI** — GitHub Actions runs lint, typecheck, unit tests, build, then E2E + accessibility tests on every push/PR

## License

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — see `LICENSE` for details.
