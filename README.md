# my-linkpage

A multilingual link-in-bio page built with React, Vite, TypeScript, and Tailwind CSS.

**Live demo → <https://link.w1999.me>**

## Features

- **Multilingual** — EN / RU / ZH-TW with automatic browser language detection (Simplified Chinese → Traditional Chinese)
- **Dark / light mode** — follows system preference; user toggle persists via `localStorage`
- **Animations** — Framer Motion entrance transitions with `prefers-reduced-motion` support
- **Self-hosted fonts** — Manrope & Space Grotesk variable fonts via `@fontsource-variable`
- **Centralized config** — profile, social links, and analytics all in `siteConfig.ts`
- **Analytics & click heatmap** — Plausible / Umami analytics (configurable); local per-link click heatmap with daily/weekly trend chart, intensity bars, and reset — all `localStorage`, no cookies
- **Dynamic OG image** — 1200×630 social preview card generated at build time via satori + resvg
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
src/
  siteConfig.ts          Profile, social links, and analytics config
  App.tsx                Main page UI
  main.tsx               Entry point (wrapped in ErrorBoundary)
  SocialIcon.tsx         Brand icon component (simple-icons)
  i18n.ts                Language detection and i18n setup
  index.css              Global styles and Tailwind entry
  components/
    ErrorBoundary.tsx    Crash fallback UI
    SEO.tsx              Meta tags, OG image, JSON-LD
    LinkHeatmap.tsx      Click heatmap and trend chart
  hooks/
    useAnalytics.ts          Analytics script loader and event tracking
    useLinkClickStats.ts     localStorage click counter and timeline
  locales/               Translation files (en / ru / zh-TW)
  test/                  Vitest unit and component tests
e2e/                     Playwright E2E tests
scripts/
  generate-og-image.ts   Build-time OG image generator
```

## Customization

### Social links and profile

Edit `src/siteConfig.ts` — each link has `id`, `label`, `url`, and `iconSlug` (matching a [simple-icons](https://simpleicons.org) export like `siGithub`).

### Translations

Edit or add JSON files in `src/locales/`.

### Analytics

Set the `ANALYTICS` export in `src/siteConfig.ts`:

```ts
// Plausible
export const ANALYTICS = { provider: 'plausible', plausibleDomain: 'link.example.com' }

// Umami
export const ANALYTICS = { provider: 'umami', umamiWebsiteId: 'xxxxxxxx-…' }

// Disable (local heatmap still works)
export const ANALYTICS = null
```

### OG image

Edit constants in `scripts/generate-og-image.ts`, then run `pnpm generate-og`. The image is also regenerated on every `pnpm build`.

## Deployment

Pre-configured for multiple platforms:

- **Vercel** — `vercel.json` with security headers and asset caching
- **Firebase Hosting** — `firebase.json` with SPA rewrites and security headers
- **Nginx** — `nginx.conf` and `customHttp.yml` provided

## License

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — see `LICENSE` for details.
