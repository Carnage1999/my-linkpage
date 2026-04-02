# my-linkpage

[English](README.md) | **Русский** | [正體中文](README.zh-TW.md)

Мультиязычная страница ссылок (link-in-bio), построенная на React, Vite, TypeScript и Tailwind CSS.

**Демо → <https://link.w1999.me>**

## Возможности

- **Обновление без деплоя** — отредактируйте `public/siteConfig.json`, чтобы добавить, удалить или изменить ссылки, профиль или аналитику — пересборка не требуется
- **Автоопределение иконок** — иконки автоматически подбираются по URL (47+ платформ); при необходимости можно указать `iconSlug` вручную
- **Динамическое OG-изображение** — серверная функция Vercel генерирует превью 1200×630 по запросу, всегда актуальное
- **Мультиязычность** — EN / RU / ZH-TW с автоопределением языка браузера (упрощённый китайский → традиционный китайский)
- **Тёмная / светлая тема** — следует системным настройкам; пользовательский выбор сохраняется в `localStorage`
- **Анимации** — входные переходы Framer Motion с поддержкой `prefers-reduced-motion`
- **Самостоятельно размещённые шрифты** — переменные шрифты Manrope и Space Grotesk через `@fontsource-variable`
- **Аналитика и тепловая карта кликов** — Plausible / Umami (настраивается); локальная тепловая карта кликов с графиками трендов за день/неделю, индикаторами интенсивности и сбросом — всё в `localStorage`, без cookies
- **SEO** — динамические мета-теги, Open Graph / Twitter Cards, JSON-LD Person schema, hreflang
- **Обработка ошибок** — аварийный fallback верхнего уровня с кнопкой перезагрузки
- **Копирование в буфер** — `navigator.clipboard` с fallback на `execCommand` для старых браузеров
- **Доступность** — skip-ссылка, семантический HTML, ARIA-метки, `aria-live` обратная связь, WCAG контраст
- **Производительность** — tree-shaking LazyMotion, ручное разделение чанков Vite
- **Тестирование** — юнит-тесты Vitest + Testing Library; E2E-тесты Playwright (Chromium, Firefox, WebKit)
- **Качество кода** — TypeScript strict mode, ESLint 9, Prettier, пайплайн `pnpm check`

## Технологический стек

| Категория | Инструменты |
|---|---|
| Фреймворк | React 19, TypeScript 6 |
| Сборка | Vite 8 |
| Стилизация | Tailwind CSS 3, Headless UI |
| Анимации | Framer Motion |
| i18n | i18next, react-i18next |
| Графики | Recharts |
| Иконки | simple-icons |
| OG-изображение | satori, @resvg/resvg-js |
| Шрифты | @fontsource-variable (Manrope, Space Grotesk) |
| Тестирование | Vitest, Testing Library, Playwright |
| Линтинг | ESLint 9, Prettier |

## Начало работы

```bash
pnpm install
pnpm dev        # сервер разработки
pnpm build      # генерация OG-изображения + production-сборка
pnpm preview    # предварительный просмотр production-сборки
```

## Скрипты

| Скрипт | Описание |
|---|---|
| `pnpm dev` | Запуск Vite dev-сервера |
| `pnpm build` | Генерация OG-изображения + production-сборка |
| `pnpm generate-og` | Перегенерация OG-превью |
| `pnpm preview` | Предварительный просмотр production-сборки |
| `pnpm typecheck` | Проверка типов TypeScript |
| `pnpm lint` | ESLint |
| `pnpm format` | Форматирование Prettier |
| `pnpm test` | Юнит- / компонентные тесты (Vitest) |
| `pnpm test:e2e` | E2E-тесты (Playwright) |
| `pnpm check` | Полный пайплайн: typecheck → lint → test → build |

## Структура проекта

```text
public/
  siteConfig.json        ★ Единый источник истины — редактируйте этот файл для обновления всего
src/
  siteConfig.ts          Определения типов и значения по умолчанию для сборки
  App.tsx                Главный UI страницы
  main.tsx               Точка входа (обёрнута в ErrorBoundary)
  SocialIcon.tsx         Компонент иконок (simple-icons + автоопределение)
  iconRegistry.ts        47+ иконок платформ с автоматическим сопоставлением URL → иконка
  i18n.ts                Определение языка и настройка i18n
  index.css              Глобальные стили и точка входа Tailwind
  components/
    ErrorBoundary.tsx    Аварийный UI при сбое
    SEO.tsx              Мета-теги, OG-изображение, JSON-LD
    LinkHeatmap.tsx      Тепловая карта кликов и график трендов
  hooks/
    useSiteConfig.ts         Загрузчик JSON-конфигурации (загружает siteConfig.json)
    useAnalytics.ts          Загрузчик аналитических скриптов и отслеживание событий
    useLinkClickStats.ts     Счётчик кликов и хронология в localStorage
  locales/               Файлы переводов (en / ru / zh-TW)
  test/                  Юнит- и компонентные тесты Vitest
api/
  og.ts                  Серверная функция Vercel — динамическая генерация OG-изображения
e2e/                     E2E-тесты Playwright
scripts/
  generate-og-image.ts   Генератор OG-изображения при сборке (статический fallback)
```

## Настройка

### Социальные ссылки, профиль и метаданные сайта

Отредактируйте `public/siteConfig.json` — это **единственный файл**, который нужно изменить. Пересборка или повторный деплой не требуются.

```jsonc
{
  "site": {
    "name": "Ваше имя",
    "tagline": "Ссылки и соцсети",
    "domain": "ваш-домен.com",
    "twitterHandle": "@ваш_никнейм"    // необязательно
  },
  "profile": {
    "avatar": "/avatar.jpg"
  },
  "analytics": {                        // необязательно — уберите для отключения
    "provider": "umami",                // "umami" или "plausible"
    "umamiWebsiteId": "xxxxxxxx-..."
  },
  "socials": [
    { "id": "github", "label": "GitHub", "url": "https://github.com/you" },
    { "id": "x", "label": "X", "url": "https://x.com/you" }
    // Иконки определяются автоматически по URL — iconSlug не нужен
    // Для ручного указания: "iconSlug": "siGithub"
  ]
}
```

### Переводы

Редактируйте или добавляйте JSON-файлы в `src/locales/`.

### Аналитика

Настройте в `public/siteConfig.json`:

```jsonc
// Plausible
"analytics": { "provider": "plausible", "plausibleDomain": "link.example.com" }

// Umami
"analytics": { "provider": "umami", "umamiWebsiteId": "xxxxxxxx-…" }

// Отключить (уберите ключ "analytics" — локальная тепловая карта продолжит работать)
```

### OG-изображение

OG-изображение генерируется **динамически** по адресу `/api/og`, считывая `siteConfig.json` при каждом запросе — ручная перегенерация не нужна. Статический fallback также создаётся при `pnpm build` через `scripts/generate-og-image.ts`.

## Развёртывание

Предварительная настройка для нескольких платформ:

- **Vercel** — `vercel.json` с заголовками безопасности и кешированием ассетов
- **Firebase Hosting** — `firebase.json` с SPA-перенаправлениями и заголовками безопасности
- **Nginx** — `nginx.conf` и `customHttp.yml` в комплекте

## Лицензия

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — подробности в файле `LICENSE`.
