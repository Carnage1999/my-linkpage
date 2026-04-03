# my-linkpage

[English](README.md) | **Русский** | [正體中文](README.zh-TW.md)

Мультиязычная страница ссылок (link-in-bio), построенная на React, Vite, TypeScript и Tailwind CSS.

**Демо → <https://link.w1999.me>**

## Возможности

- **Обновление без деплоя** — отредактируйте `public/siteConfig.json`, чтобы добавить, удалить или изменить ссылки, профиль или аналитику — пересборка не требуется
- **Автоопределение иконок** — иконки автоматически подбираются по URL через [simple-icons](https://simpleicons.org) (48 платформ); при необходимости можно указать `iconSlug` вручную
- **Динамическое OG-изображение** — серверный endpoint (`/api/og`) генерирует превью 1200×630 на базе Web Standard API, всегда актуальное
- **Мультиязычность** — EN / RU / ZH-TW с автоопределением языка браузера (упрощённый китайский → традиционный китайский)
- **Тёмная / светлая тема** — следует системным настройкам; пользовательский выбор сохраняется в `localStorage`
- **Анимации** — входные переходы Framer Motion с поддержкой `prefers-reduced-motion`
- **Самостоятельно размещённые шрифты** — переменные шрифты Manrope и Space Grotesk через `@fontsource-variable`
- **Аналитика и тепловая карта кликов** — Plausible / Umami (настраивается); локальная тепловая карта кликов с графиками трендов за день/неделю — всё в `localStorage`, без cookies
- **Панель статистики** — опциональная защищённая паролем страница `/stats` с серверным отслеживанием кликов через Upstash Redis; 30-дневный график трендов, статистика по ссылкам, встроенный Umami/Plausible — полностью опционально через переменные окружения
- **SEO** — динамические мета-теги/OG/Twitter, JSON-LD Person schema, hreflang, канонический URL
- **Доступность** — skip-ссылка, семантический HTML, ARIA-метки, `aria-live` обратная связь, WCAG контраст; аудит axe-core в E2E
- **Обработка ошибок** — аварийный fallback верхнего уровня с кнопкой перезагрузки
- **Копирование в буфер** — `navigator.clipboard` с fallback на `execCommand`
- **Производительность** — tree-shaking LazyMotion, ручное разделение чанков Vite
- **Тестирование** — юнит-тесты Vitest + Testing Library; E2E-тесты Playwright (Chromium, Firefox, WebKit) + аудит доступности axe-core
- **CI/CD** — двухэтапный пайплайн GitHub Actions: lint → typecheck → test → build, затем E2E и аудит доступности
- **Качество кода** — TypeScript strict mode, ESLint 9, Prettier, пайплайн `pnpm check`

## Технологический стек

| Категория | Инструменты |
|---|---|
| Фреймворк | React 19, TypeScript 6 |
| Маршрутизация | react-router-dom 7 |
| Сборка | Vite 8 |
| Стилизация | Tailwind CSS 3, Headless UI |
| Анимации | Framer Motion |
| i18n | i18next, react-i18next |
| Графики | Recharts |
| Иконки | simple-icons (48 платформ) |
| OG-изображение | satori, @resvg/resvg-js (сборка + serverless) |
| Бэкенд статистики | Upstash Redis (REST API, без SDK) |
| Шрифты | @fontsource-variable (Manrope, Space Grotesk) |
| Тестирование | Vitest, Testing Library, Playwright, axe-core |
| Линтинг | ESLint 9, Prettier |
| CI | GitHub Actions |

## Начало работы

```bash
pnpm install
pnpm dev        # сервер разработки
pnpm build      # обновление sitemap + OG-изображение + production-сборка
pnpm preview    # предварительный просмотр production-сборки
```

## Скрипты

| Скрипт | Описание |
|---|---|
| `pnpm dev` | Запуск Vite dev-сервера |
| `pnpm build` | Обновление sitemap lastmod + генерация OG-изображения + production-сборка |
| `pnpm generate-og` | Перегенерация OG-превью |
| `pnpm preview` | Предварительный просмотр production-сборки |
| `pnpm typecheck` | Проверка типов TypeScript |
| `pnpm lint` | ESLint |
| `pnpm format` | Форматирование Prettier |
| `pnpm test` | Юнит- / компонентные тесты (Vitest) |
| `pnpm test:e2e` | E2E-тесты (Playwright) |
| `pnpm test:e2e:a11y` | Аудит доступности (axe-core) |
| `pnpm check` | Полный пайплайн: typecheck → lint → test → build |

## Структура проекта

```text
public/
  siteConfig.json          ★ Редактируйте этот файл для обновления ссылок, профиля и аналитики
src/
  siteConfig.ts            Определения типов и значения по умолчанию для сборки
  App.tsx                  Главный UI страницы
  main.tsx                 Точка входа (обёрнута в ErrorBoundary)
  router.tsx               Клиентская маршрутизация (/, /stats)
  SocialIcon.tsx           Компонент иконок (simple-icons + автоопределение)
  iconRegistry.ts          Реестр иконок 48 платформ с автоматическим сопоставлением URL → иконка
  i18n.ts                  Определение языка и настройка i18n
  index.css                Глобальные стили и точка входа Tailwind
  components/
    ErrorBoundary.tsx      Аварийный UI при сбое
    SEO.tsx                Мета-теги, OG-изображение, JSON-LD
    LinkHeatmap.tsx        Тепловая карта кликов и график трендов
  hooks/
    useSiteConfig.ts       Загрузчик JSON-конфигурации (загружает siteConfig.json)
    useAnalytics.ts        Загрузчик аналитических скриптов и отслеживание событий
    useLinkClickStats.ts   Счётчик кликов и хронология в localStorage
    useStats.ts            Хуки аутентификации и данных статистики
  pages/
    StatsPage.tsx          Панель статистики с защитой паролем
  locales/                 Файлы переводов (en / ru / zh-TW)
  test/                    Юнит- и компонентные тесты Vitest
api/
  og.ts                    Серверная функция — динамическая генерация OG-изображения (Web Standard API)
  stats/
    _handlers.ts           Кросс-платформенные обработчики запросов
    _redis.ts              Upstash Redis REST-хелперы
    _token.ts              HMAC-аутентификация токенов (Web Crypto API)
    auth.ts                Endpoint аутентификации
    check.ts               Endpoint обнаружения функции
    data.ts                Endpoint данных статистики
    record.ts              Endpoint записи кликов
e2e/
  app.spec.ts              E2E-тесты Playwright
  a11y.spec.ts             Аудит доступности axe-core
scripts/
  generate-og-image.ts     Генератор OG-изображения при сборке (статический fallback)
  update-sitemap-lastmod.ts  Автообновление даты lastmod в sitemap.xml
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

OG-изображение генерируется **динамически** по адресу `/api/og`, считывая `siteConfig.json` при каждом запросе — ручная перегенерация не нужна. Статический fallback также создаётся при `pnpm build`.

### Панель статистики (опционально)

Панель статистики по адресу `/stats` — **полностью опциональная**. Для включения установите следующие переменные окружения:

| Переменная | Описание |
|---|---|
| `STATS_PASSWORD` | Пароль для доступа к панели статистики |
| `UPSTASH_REDIS_REST_URL` | URL REST-endpoint Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Токен аутентификации Upstash Redis REST |

Когда все три переменные установлены, отслеживание кликов автоматически включается для всех ссылок, а в подвале появляется ссылка «Статистика». Если любая переменная отсутствует, функция полностью скрыта — никаких дополнительных запросов или изменений UI.

API статистики использует Web Standard `Request`/`Response` и Web Crypto API, поэтому работает на **Vercel Edge, Cloudflare Workers, Netlify Edge Functions** и других платформах с поддержкой Web Platform API.

## Развёртывание

Предварительная настройка для нескольких платформ:

- **Vercel** — `vercel.json` с заголовками безопасности, кешированием ассетов, endpoint `/api/og` для OG-изображений и edge-endpointами `/api/stats/*`
- **Firebase Hosting** — `firebase.json` с SPA-перенаправлениями и заголовками безопасности
- **Nginx** — `nginx.conf` и `customHttp.yml` в комплекте
- **CI** — GitHub Actions: lint, typecheck, юнит-тесты, сборка, затем E2E + аудит доступности при каждом push/PR

## Лицензия

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — подробности в файле `LICENSE`.
