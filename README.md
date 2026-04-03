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
- **Animations** — Framer Motion entrance transitions with `prefers-reduced-motion` support
- **Self-hosted fonts** — Manrope & Space Grotesk variable fonts via `@fontsource-variable`
- **Analytics & click heatmap** — Plausible / Umami (configurable); local per-link click heatmap with daily/weekly trend chart — all `localStorage`, no cookies
- **Stats dashboard** — optional password-protected `/stats` page with server-side click tracking via Upstash Redis; 30-day trend chart, per-link breakdown, Umami/Plausible embed — fully opt-in via environment variables
- **SEO** — dynamic meta/OG/Twitter tags, JSON-LD Person schema, hreflang, canonical link
- **Accessibility** — skip link, semantic HTML, ARIA labels, `aria-live` feedback, WCAG contrast; dedicated axe-core audit in E2E
- **Error boundary** — top-level crash fallback with reload button
- **Clipboard fallback** — `navigator.clipboard` with `execCommand` fallback
- **Performance** — LazyMotion tree-shaking, Vite manual chunk splitting
- **Testing** — Vitest + Testing Library unit tests; Playwright E2E (Chromium, Firefox, WebKit) + axe-core accessibility audit
- **CI/CD** — GitHub Actions two-stage pipeline: lint → typecheck → test → build, then E2E & accessibility tests
- **Code quality** — TypeScript strict mode, ESLint 9, Prettier, `pnpm check` pipeline

## Tech Stack

| Category | Tools |
|---|---|
| Framework | React 19, TypeScript 6 |
| Routing | react-router-dom 7 |
| Build | Vite 8 |
| Styling | Tailwind CSS 3, Headless UI |
| Animation | Framer Motion |
| i18n | i18next, react-i18next |
| Charts | Recharts |
| Icons | simple-icons (48 platforms) |
| OG image | satori, @resvg/resvg-js (build-time + serverless) |
| Stats backend | Upstash Redis (REST API, no SDK) |
| Fonts | @fontsource-variable (Manrope, Space Grotesk) |
| Testing | Vitest, Testing Library, Playwright, axe-core |
| Linting | ESLint 9, Prettier |
| CI | GitHub Actions |

## Getting Started

```bash
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
  router.tsx               Client-side routing (/, /stats)
  SocialIcon.tsx           Brand icon component (simple-icons + auto-detection)
  iconRegistry.ts          48-platform icon registry with URL → icon auto-matching
  i18n.ts                  Language detection and i18n setup
  index.css                Global styles and Tailwind entry
  components/
    ErrorBoundary.tsx      Crash fallback UI
    SEO.tsx                Meta tags, OG image, JSON-LD
    LinkHeatmap.tsx        Click heatmap and trend chart
  hooks/
    useSiteConfig.ts       Runtime JSON config loader (fetches siteConfig.json)
    useAnalytics.ts        Analytics script loader and event tracking
    useLinkClickStats.ts   localStorage click counter and timeline
    useStats.ts            Server-side stats auth and data hooks
  pages/
    StatsPage.tsx          Password-protected stats dashboard
  locales/                 Translation files (en / ru / zh-TW)
  test/                    Vitest unit and component tests
api/
  og.ts                    Serverless function — dynamic OG image (Web Standard API)
  stats/
    _handlers.ts           Platform-agnostic request handlers
    _redis.ts              Upstash Redis REST helpers
    _token.ts              HMAC token auth (Web Crypto API)
    auth.ts                Login endpoint
    check.ts               Feature-detection endpoint
    data.ts                Stats data endpoint
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

// Disable (omit the "analytics" key — local heatmap still works)
```

### OG image

Generated **dynamically** at `/api/og` by reading `siteConfig.json` at request time — no manual regeneration needed. A static fallback is also generated on `pnpm build`.

### Stats dashboard (optional)

The stats dashboard at `/stats` is **fully opt-in**. To enable it, set the following environment variables:

| Variable | Description |
|---|---|
| `STATS_PASSWORD` | Password to access the stats dashboard |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST auth token |

When all three variables are set, click tracking is automatically enabled for all links, and a "Stats" link appears in the page footer. When any variable is missing, the feature is completely hidden — no extra requests, no UI changes.

The stats API uses Web Standard `Request`/`Response` and Web Crypto API, so it works on **Vercel Edge, Cloudflare Workers, Netlify Edge Functions**, and other platforms supporting the Web Platform APIs.

## Deployment

Pre-configured for multiple platforms:

- **Vercel** — `vercel.json` with security headers, asset caching, `/api/og` OG image endpoint, and `/api/stats/*` edge endpoints
- **Firebase Hosting** — `firebase.json` with SPA rewrites and security headers
- **Nginx** — `nginx.conf` and `customHttp.yml` provided
- **CI** — GitHub Actions runs lint, typecheck, unit tests, build, then E2E + accessibility tests on every push/PR

## License

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — see `LICENSE` for details.
