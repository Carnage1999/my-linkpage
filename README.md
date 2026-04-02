# my-linkpage

A multilingual link-in-bio page built with React, Vite, TypeScript, Tailwind CSS, and Headless UI.

Lightweight social link landing page with automatic language / theme detection, entrance animations, self-hosted fonts, and a centralized config file for managing profile links.

## Features

- **Multilingual** — English, Russian, and Traditional Chinese with automatic browser language detection (Simplified Chinese locales are normalized to Traditional Chinese)
- **Dark / light mode** — follows system preference on first visit; toggle persists via `localStorage`
- **Animations** — entrance transitions and micro-interactions powered by Framer Motion with `prefers-reduced-motion` support
- **Self-hosted fonts** — Manrope and Space Grotesk variable fonts via `@fontsource-variable` (no external CDN)
- **Centralized config** — social links and profile data defined in a single `siteConfig.ts`; brand icons rendered from `simple-icons`
- **Analytics & click tracking** — privacy-friendly analytics via Plausible or Umami (configurable in `siteConfig.ts`); local click heatmap powered by `localStorage` showing per-link click intensity with animated bars
- **Accessibility** — skip-to-content link, proper heading hierarchy (`<h1>`), semantic `<ul>` for link cards, `aria-label` on language selector and external links, descriptive avatar alt text, `aria-live` copy feedback, localized `document.title`, WCAG-friendly contrast
- **Performance** — `LazyMotion` tree-shaking, manual Vite chunk splitting (react-vendor / motion / i18n), optimized image attributes
- **Testing** — unit / component tests with Vitest + Testing Library; E2E tests with Playwright
- **Code quality** — TypeScript strict mode, ESLint, Prettier, automated `pnpm check` pipeline

## Tech Stack

| Category | Tools |
|---|---|
| Framework | React 19, TypeScript 5 |
| Build | Vite 8 |
| Styling | Tailwind CSS 3, Headless UI |
| Animation | Framer Motion (LazyMotion + domAnimation) |
| i18n | i18next, react-i18next |
| Icons | simple-icons |
| Fonts | @fontsource-variable/manrope, @fontsource-variable/space-grotesk |
| Unit tests | Vitest, Testing Library, jsdom |
| E2E tests | Playwright (Chromium) |
| Linting | ESLint 9, Prettier |

## Getting Started

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Production build & preview

```bash
pnpm build
pnpm preview
```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier format |
| `pnpm test` | Run unit / component tests (Vitest) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Run E2E tests (Playwright) |
| `pnpm check` | Full pipeline: typecheck → lint → test → build |

## Project Structure

```text
src/
  App.tsx              Main page UI
  main.tsx             App entry point
  siteConfig.ts        Profile data, social links, and analytics config
  SocialIcon.tsx       Brand icon component (simple-icons + custom fallbacks)
  i18n.ts              i18n setup and language detection
  i18next.d.ts         i18next type augmentation
  index.css            Global styles and Tailwind entry
  components/
    SEO.tsx            Dynamic meta tags and JSON-LD structured data
    LinkHeatmap.tsx    Per-link click intensity heatmap bars
  hooks/
    useAnalytics.ts    Plausible / Umami script injection and event tracking
    useLinkClickStats.ts  localStorage-backed click counter (powers heatmap)
  locales/
    en.json            English translations
    ru.json            Russian translations
    zh-TW.json         Traditional Chinese translations
  test/
    setup.ts           Vitest setup (jsdom polyfills)
    App.test.tsx       App component tests
    theme.test.tsx     Theme toggle tests
    SocialIcon.test.tsx  Icon component tests
    siteConfig.test.ts   Config validation tests
    useAnalytics.test.ts       Analytics hook tests
    useLinkClickStats.test.ts  Click stats hook tests
e2e/
  app.spec.ts          Playwright E2E tests
```

## Customization

### Edit social links and profile

Update `src/siteConfig.ts`. This file contains the avatar path and the social links array. Each entry has an `id`, `label`, `url`, and `iconSlug` (matching a `simple-icons` export name like `siGithub`).

### Edit translations

Update the JSON files in `src/locales/`.

### Configure analytics

Edit the `ANALYTICS` export in `src/siteConfig.ts`:

```ts
// Plausible
export const ANALYTICS = {
  provider: 'plausible',
  plausibleDomain: 'link.example.com',
  // plausibleHost: 'https://plausible.example.com',  // optional self-hosted
}

// Umami
export const ANALYTICS = {
  provider: 'umami',
  umamiWebsiteId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  // umamiHost: 'https://umami.example.com',  // optional self-hosted
}

// Disable external analytics (local heatmap still works)
export const ANALYTICS = null
```

Every social link click sends a `Link Click` event with `id`, `label`, and `url` properties. The local click heatmap is always active and stores counts in the visitor's own `localStorage` — no cookies or fingerprinting.

### Edit theme or language detection logic

See `src/i18n.ts` (language detection) and `src/App.tsx` (theme initialization).

## Behavior Notes

- Language selection is saved in `localStorage` after the user changes it manually.
- Theme selection is also saved in `localStorage` after the user toggles it manually.
- Link click counts are stored in `localStorage` under `link-click-stats` and visualized as a heatmap bar chart below the links.
- If there is no saved theme, the page follows the user's system preference.
- If there is no saved language, the page follows the user's browser language.
- Browser locales for Simplified Chinese are normalized to Traditional Chinese.
- `document.title` and `<html lang>` update dynamically on language change.

## Assets

- Avatar image: `public/avatar.jpg`
- Favicon: `public/favicon.ico`

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0.

- License file: `LICENSE`
- License summary: https://polyformproject.org/licenses/noncommercial/1.0.0
