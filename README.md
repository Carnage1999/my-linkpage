# my-linkpage

**English** | [Русский](README.ru.md) | [正體中文](README.zh-TW.md)

A multilingual link-in-bio page built with React, Vite, TypeScript, and Tailwind CSS.

**Live demo → <https://link.w1999.me>**

## Features

- **Zero-deploy updates** — edit `public/siteConfig.json` to add/remove/reorder social links, change profile, or update analytics — no rebuild needed
- **Auto icon detection** — icons resolved automatically from link URLs via [simple-icons](https://simpleicons.org) (48 platforms); override with `iconSlug` when needed
- **Dynamic OG image** — serverless endpoint (`/api/og`) generates a 1200×630 social preview at request time using Web Standard APIs, always reflecting the latest config
- **Multilingual** — EN / RU / ZH-TW with automatic browser language detection (Simplified Chinese → Traditional Chinese)
- **Dark / light mode** — follows system preference; user toggle persists via `localStorage`
- **Animations** — Motion entrance transitions with `prefers-reduced-motion` support
- **Self-hosted fonts** — Manrope & Space Grotesk variable fonts via `@fontsource-variable`
- **Analytics** — Plausible or Umami on the public page. Click recording for the admin dashboard uses Upstash Redis and does not depend on the analytics script.
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
| i18n | i18next 27, react-i18next 18 |
| Charts | Recharts 3 |
| Icons | simple-icons 16 (48 platforms) |
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
  siteConfig.json          ★ Edit this file to update links, profile, and analytics
src/
  siteConfig.ts            Type definitions and build-time fallback defaults
  App.tsx                  Main page UI
  main.tsx                 Entry point (wrapped in ErrorBoundary)
  router.tsx               Client-side routing (/, /manage)
  SocialIcon.tsx           Brand icon component (simple-icons + auto-detection)
  iconRegistry.ts          48-platform icon registry with URL → icon auto-matching
  i18n.ts                  Language detection and i18n setup
  index.css                Global styles and Tailwind entry
  components/
    ErrorBoundary.tsx      Crash fallback UI
    SEO.tsx                Meta tags, OG image, JSON-LD
    LinkHeatmap.tsx        Redis and Umami click comparison
  hooks/
    useSiteConfig.ts       Runtime JSON config loader (fetches siteConfig.json)
    useAnalytics.ts        Analytics script loader and event tracking
    useStats.ts            Dashboard auth, Redis stats, and Umami report
  lib/
    recordClick.ts         sendBeacon click recording
    clickCsv.ts            Dashboard CSV export
  pages/
    ManagePage.tsx         Password-protected admin dashboard at /manage
  locales/                 Translation files (en / ru / zh-TW)
  test/                    Vitest unit and component tests
api/
  og.ts                    Serverless function — dynamic OG image (Web Standard API)
  stats/
    _handlers.ts           Request handlers (auth, record, data, Umami)
    _redis.ts              Upstash Redis REST helpers
    _umami.ts              Server-side Umami client
    _dates.ts              Timezone day boundaries
    _token.ts              HMAC token auth (Web Crypto API)
    auth.ts                Login endpoint
    check.ts               Feature-detection endpoint
    data.ts                Redis click report
    umami.ts               Umami report
    record.ts              Click recording endpoint
e2e/
  app.spec.ts              Playwright E2E tests
  a11y.spec.ts             axe-core accessibility audit
scripts/
  generate-og-image.ts     Build-time OG image generator (static fallback)
  update-sitemap-lastmod.ts  Auto-update sitemap.xml lastmod date
```

## Customization

### Social links, profile, and site metadata

Edit `public/siteConfig.json` — the **only file** you need to change. No rebuild required.

```jsonc
{
  "site": {
    "name": "Your Name",
    "tagline": "Links & Socials",
    "domain": "your-domain.com",
    "twitterHandle": "@your_handle"    // optional
  },
  "profile": {
    "avatar": "/avatar.jpg"
  },
  "analytics": {                        // optional — omit to disable
    "provider": "umami",                // "umami" or "plausible"
    "umamiWebsiteId": "xxxxxxxx-..."
  },
  "socials": [
    { "id": "github", "label": "GitHub", "url": "https://github.com/you" },
    { "id": "x", "label": "X", "url": "https://x.com/you" }
    // Icons are auto-detected from URLs — no iconSlug needed
    // Add iconSlug manually to override: "iconSlug": "siGithub"
  ]
}
```

### Translations

Edit or add JSON files in `src/locales/`.

### Analytics

Configure in `public/siteConfig.json`:

```jsonc
// Plausible
"analytics": { "provider": "plausible", "plausibleDomain": "link.example.com" }

// Umami
"analytics": { "provider": "umami", "umamiWebsiteId": "xxxxxxxx-…" }

// Disable (omit the "analytics" key)
```

### OG image

Generated **dynamically** at `/api/og` by reading `siteConfig.json` at request time — no manual regeneration needed. A static fallback is also generated on `pnpm build`.

### Admin dashboard (optional)

The dashboard lives at `/manage` and is not linked from the public page. It sends `noindex` and is disallowed in `robots.txt`. Set these environment variables (see `.env.example`):

| Variable | Description |
|---|---|
| `STATS_PASSWORD` | Password for `/manage` |
| `STATS_TIMEZONE` | IANA day boundary. Defaults to `Asia/Taipei`. |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL ([console](https://console.upstash.com) → database → REST API) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `UMAMI_WEBSITE_ID` | Website id. Falls back to `umamiWebsiteId` in `siteConfig.json`. |
| `UMAMI_API_URL` | Umami origin. Empty uses Umami Cloud (`https://api.umami.is`). |
| `UMAMI_API_KEY` | Cloud or self-hosted API key. Cloud: Settings → API keys. |
| `UMAMI_USERNAME` / `UMAMI_PASSWORD` | Self-hosted login, used only when no API key is set. The session token stays on the server. |

`STATS_PASSWORD` plus both Upstash variables turn on click recording. The homepage sends one `POST /api/stats/record` per click with `navigator.sendBeacon` (or `fetch` keepalive). Umami sections appear only when a website id and either an API key or a username and password are set. Redis click counts and Umami Link Click counts are shown side by side: Redis includes visitors who block the Umami script.

The API uses Web `Request` / `Response` and Web Crypto, including on Vercel Edge. The free Upstash database (256 MB, 500,000 commands/month) is the intended size: an accepted click is one script of about 5 commands, and a dashboard load reads two hashes. See the pull request for the monthly estimate.

## Deployment

Pre-configured for multiple platforms:

- **Vercel** — `vercel.json` with security headers, asset caching, `/api/og` OG image endpoint, and `/api/stats/*` edge endpoints
- **Firebase Hosting** — `firebase.json` with SPA rewrites and security headers
- **Nginx** — `nginx.conf` and `customHttp.yml` provided
- **CI** — GitHub Actions runs lint, typecheck, unit tests, build, then E2E + accessibility tests on every push/PR

## License

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — see `LICENSE` for details.
