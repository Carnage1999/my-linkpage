# my-linkpage

**English** | [Русский](README.ru.md) | [正體中文](README.zh-TW.md)

A multilingual link-in-bio page built with React, Vite, TypeScript, and Tailwind CSS.

**Live demo → <https://link.w1999.me>**

## Features

- **Zero-deploy updates** — edit `public/siteConfig.json` to add/remove/reorder social links, change profile, or update analytics — no rebuild needed
- **Auto icon detection** — icons are resolved automatically from link URLs (47+ platforms); override with `iconSlug` when needed
- **Dynamic OG image** — Vercel serverless function generates a 1200×630 social preview card at request time, always reflecting the latest config
- **Multilingual** — EN / RU / ZH-TW with automatic browser language detection (Simplified Chinese → Traditional Chinese)
- **Dark / light mode** — follows system preference; user toggle persists via `localStorage`
- **Animations** — Framer Motion entrance transitions with `prefers-reduced-motion` support
- **Self-hosted fonts** — Manrope & Space Grotesk variable fonts via `@fontsource-variable`
- **Analytics & click heatmap** — Plausible / Umami analytics (configurable); local per-link click heatmap with daily/weekly trend chart, intensity bars, and reset — all `localStorage`, no cookies
- **SEO** — dynamic meta tags, Open Graph / Twitter cards, JSON-LD Person schema, hreflang
- **Error boundary** — top-level crash fallback with reload button
- **Clipboard fallback** — `navigator.clipboard` with `execCommand` fallback for older browsers
- **Accessibility** — skip link, semantic HTML, ARIA labels, `aria-live` feedback, WCAG contrast
- **Performance** — LazyMotion tree-shaking, Vite manual chunk splitting
- **Testing** — Vitest + Testing Library unit tests; Playwright E2E (Chromium, Firefox, WebKit)
- **Code quality** — TypeScript strict mode, ESLint 9, Prettier, `pnpm check` pipeline

## Tech Stack

| Category | Tools |
|---|---|
| Framework | React 19, TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS 3, Headless UI |
| Animation | Framer Motion |
| i18n | i18next, react-i18next |
| Charts | Recharts |
| Icons | simple-icons |
| OG image | satori, @resvg/resvg-js |
| Fonts | @fontsource-variable (Manrope, Space Grotesk) |
| Testing | Vitest, Testing Library, Playwright |
| Linting | ESLint 9, Prettier |

## Getting Started

```bash
pnpm install
pnpm dev        # development server
pnpm build      # OG image generation + production build
pnpm preview    # preview production build
```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Generate OG image + production build |
| `pnpm generate-og` | Regenerate OG social preview image |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier format |
| `pnpm test` | Unit / component tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Playwright) |
| `pnpm check` | Full pipeline: typecheck → lint → test → build |

## Project Structure

```text
public/
  siteConfig.json        ★ Single source of truth — edit this file to update everything
src/
  siteConfig.ts          Type definitions and build-time fallback defaults
  App.tsx                Main page UI
  main.tsx               Entry point (wrapped in ErrorBoundary)
  SocialIcon.tsx         Brand icon component (simple-icons + auto-detection)
  iconRegistry.ts        47+ platform icons with URL → icon auto-matching
  i18n.ts                Language detection and i18n setup
  index.css              Global styles and Tailwind entry
  components/
    ErrorBoundary.tsx    Crash fallback UI
    SEO.tsx              Meta tags, OG image, JSON-LD
    LinkHeatmap.tsx      Click heatmap and trend chart
  hooks/
    useSiteConfig.ts         Runtime JSON config loader (fetches siteConfig.json)
    useAnalytics.ts          Analytics script loader and event tracking
    useLinkClickStats.ts     localStorage click counter and timeline
  locales/               Translation files (en / ru / zh-TW)
  test/                  Vitest unit and component tests
api/
  og.ts                  Vercel serverless function — dynamic OG image generation
e2e/                     Playwright E2E tests
scripts/
  generate-og-image.ts   Build-time OG image generator (static fallback)
```

## Customization

### Social links, profile, and site metadata

Edit `public/siteConfig.json` — this is the **only file** you need to change. No rebuild or redeploy required.

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

The OG image is generated **dynamically** at `/api/og` by reading `siteConfig.json` at request time — no manual regeneration needed. A static fallback is also generated on `pnpm build` via `scripts/generate-og-image.ts`.

## Deployment

Pre-configured for multiple platforms:

- **Vercel** — `vercel.json` with security headers and asset caching
- **Firebase Hosting** — `firebase.json` with SPA rewrites and security headers
- **Nginx** — `nginx.conf` and `customHttp.yml` provided

## License

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — see `LICENSE` for details.
