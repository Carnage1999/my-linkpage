# my-linkpage

[English](README.md) | **Русский** | [正體中文](README.zh-TW.md)

Мультиязычная страница ссылок (link-in-bio), построенная на React, Vite, TypeScript и Tailwind CSS.

**Демо → <https://link.w1999.me>**

## Возможности

- **Правки на /manage** — профиль, ссылки и аналитика сохраняются в Redis. `public/siteConfig.json` — запасной файл, если Redis пуст. `index.html` и собранная OG-картинка меняются при следующем деплое
- **Автоопределение иконок** — иконки автоматически подбираются по URL через [simple-icons](https://simpleicons.org) (48 платформ); при необходимости можно указать `iconSlug` вручную
- **Динамическое OG-изображение** — серверный endpoint (`/api/og`) генерирует превью 1200×630 на базе Web Standard API, всегда актуальное
- **Мультиязычность** — EN / RU / ZH-TW с автоопределением языка браузера (упрощённый китайский → традиционный китайский)
- **Тёмная / светлая тема** — следует системным настройкам; пользовательский выбор сохраняется в `localStorage`
- **Анимации** — входные переходы Motion с поддержкой `prefers-reduced-motion`
- **Самостоятельно размещённые шрифты** — переменные шрифты Manrope и Space Grotesk через `@fontsource-variable`
- **Аналитика** — Upstash, GoatCounter, Cloudflare Web Analytics или Umami на `/manage`. Plausible по-прежнему можно подключить из файла-заготовки. Клики пишутся в Upstash Redis и не зависят от скрипта аналитики.
- **SEO** — динамические мета-теги/OG/Twitter, JSON-LD Person schema, hreflang, канонический URL
- **Доступность** — skip-ссылка, семантический HTML, ARIA-метки, `aria-live` обратная связь, WCAG контраст; аудит axe-core в E2E
- **Обработка ошибок** — аварийный fallback верхнего уровня с кнопкой перезагрузки
- **Копирование в буфер** — `navigator.clipboard` с fallback на `execCommand`
- **Производительность** — tree-shaking LazyMotion, ручное разделение чанков Vite
- **Тестирование** — юнит-тесты Vitest + Testing Library; E2E-тесты Playwright (Chromium, Firefox, WebKit) + аудит доступности axe-core
- **CI/CD** — двухэтапный пайплайн GitHub Actions: lint → typecheck → test → build, затем E2E и аудит доступности
- **Качество кода** — TypeScript 6 strict mode, ESLint 10, Prettier, пайплайн `pnpm check`

## Технологический стек

| Категория | Инструменты |
|---|---|
| Фреймворк | React 19, TypeScript 6 |
| Маршрутизация | react-router-dom 7 |
| Сборка | Vite 8 |
| Стилизация | Tailwind CSS 4 (`@tailwindcss/vite`), Headless UI |
| Анимации | Motion |
| i18n | i18next 27, react-i18next 18 |
| Графики | Recharts |
| Иконки | simple-icons (48 платформ) |
| OG-изображение | satori, @resvg/resvg-js (сборка + serverless) |
| Бэкенд статистики | Upstash Redis (REST API, без SDK) |
| Шрифты | @fontsource-variable (Manrope, Space Grotesk) |
| Тестирование | Vitest 5, Testing Library, Playwright, axe-core |
| Линтинг | ESLint 10, Prettier |
| Менеджер пакетов | pnpm 12 (закреплён как `pnpm@12.18.0` в `packageManager`) |
| CI | GitHub Actions (Node 24) |

## Начало работы

Нужен Node.js 24 (эту версию использует CI). Node.js 22.22 и новее тоже подходит для установленного набора инструментов. Версия pnpm закреплена в поле `packageManager`. Corepack, который поставляется с этими версиями Node, ставит именно её:

```bash
corepack enable
corepack install   # активирует pnpm 12.18.0 из packageManager
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
  router.tsx               Клиентская маршрутизация (/, /manage)
  SocialIcon.tsx           Компонент иконок (simple-icons + автоопределение)
  iconRegistry.ts          Реестр иконок 48 платформ с автоматическим сопоставлением URL → иконка
  i18n.ts                  Определение языка и настройка i18n
  index.css                Глобальные стили и точка входа Tailwind
  components/
    ErrorBoundary.tsx      Аварийный UI при сбое
    SEO.tsx                Мета-теги, OG-изображение, JSON-LD
  hooks/
    useSiteConfig.ts       Загрузчик JSON-конфигурации (загружает siteConfig.json)
    useAnalytics.ts        Загрузчик аналитических скриптов и отслеживание событий
    useStats.ts            Вход в панель, отчёты Redis и Umami, запись клика
  pages/
    manage/                Панель администратора на /manage
      ManagePage.tsx       Форма входа
      Dashboard.tsx        Графики Redis и Umami
      LinkHeatmap.tsx      Сравнение кликов по ссылкам
      clickCsv.ts          Экспорт CSV
  locales/                 Файлы переводов (en / ru / zh-TW)
  test/                    Юнит- и компонентные тесты Vitest
api/
  og.ts                    Серверная функция — динамическая генерация OG-изображения (Web Standard API)
  stats/
    _handlers.ts           Обработчики auth, record, data и Umami
    _redis.ts              Upstash Redis REST-хелперы
    _providers/            Upstash, GoatCounter, Cloudflare, Umami
    _dates.ts              Границы дней по часовому поясу
    _aggregate.ts          Итоги кликов за выбранный период
    _links.ts              Разрешённые id ссылок из siteConfig
    _token.ts              HMAC-аутентификация токенов (Web Crypto API)
    auth.ts                Endpoint аутентификации
    check.ts               Endpoint обнаружения функции
    data.ts                Отчёт кликов Redis
    umami.ts               Отчёт Umami
    record.ts              Endpoint записи кликов
e2e/
  app.spec.ts              E2E-тесты Playwright
  manage.spec.ts           Вход и панель администратора
  a11y.spec.ts             Аудит доступности axe-core
scripts/
  generate-og-image.ts     Генератор OG-изображения при сборке (статический fallback)
  update-sitemap-lastmod.ts  Автообновление даты lastmod в sitemap.xml
```

## Настройка

### Социальные ссылки, профиль и метаданные сайта

Живой сайт меняется на `/manage`. `public/siteConfig.json` используется, когда в Redis ничего нет, а также для `index.html` и собранного `og-image.png` — они обновляются при следующем деплое. Страница React, её мета-теги и `/api/og` следуют за сохранением сразу.

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

Источники посещений настраиваются на `/manage` или переменными окружения ниже. Переменные перекрывают сохранённые значения. Plausible по-прежнему можно включить блоком `analytics` в файле-заготовке; в переключателе его нет. Аватар выбирается из картинок в `public/` (по умолчанию `/avatar.jpg`) или указывается как https URL. Загрузки файла нет.

### OG-изображение

OG-изображение генерируется **динамически** по адресу `/api/og`, считывая `siteConfig.json` при каждом запросе — ручная перегенерация не нужна. Статический fallback также создаётся при `pnpm build`.

### Панель администратора (опционально)

Панель открывается по адресу `/manage`, не ссылается с публичной страницы, отдаёт `noindex` и закрыта в `robots.txt`. Переменные окружения перечислены в `.env.example`:

| Переменная | Описание |
|---|---|
| `STATS_PASSWORD` | Пароль для `/manage` |
| `STATS_TIMEZONE` | Часовой пояс границ дня. По умолчанию `Asia/Taipei`. |
| `UPSTASH_REDIS_REST_URL` | REST URL Upstash Redis ([консоль](https://console.upstash.com) → база → REST API) |
| `UPSTASH_REDIS_REST_TOKEN` | REST-токен Upstash Redis |
| `UMAMI_WEBSITE_ID` | Id сайта Umami. Перекрывает значение, сохранённое на `/manage`. |
| `UMAMI_API_URL` | Origin Umami. Пустое значение — облако (`https://api.umami.is`). |
| `UMAMI_API_KEY` | Ключ API облака или своего сервера. В облаке: Settings → API keys. |
| `UMAMI_USERNAME` / `UMAMI_PASSWORD` | Вход на свой сервер, если ключа нет. Токен сессии остаётся на сервере. |

`STATS_PASSWORD` и обе переменные Upstash включают запись кликов. Главная страница отправляет `POST /api/stats/record` через `navigator.sendBeacon` (или `fetch` с `keepalive`). Блоки Umami появляются, только когда заданы id сайта и ключ либо пара логин/пароль. Клики Redis и события Umami Link Click стоят рядом: Redis учитывает посетителей, у которых скрипт Umami заблокирован.

API использует Web `Request` / `Response` и Web Crypto, в том числе на Vercel Edge. Бесплатная база Upstash (256 МБ, 500 000 команд в месяц) достаточна: принятый клик — один скрипт примерно из 5 команд, загрузка панели читает два хеша.

## Развёртывание

Предварительная настройка для нескольких платформ:

- **Vercel** — `vercel.json` с заголовками безопасности, кешированием ассетов, endpoint `/api/og` для OG-изображений и edge-endpointами `/api/stats/*`
- **Firebase Hosting** — `firebase.json` с SPA-перенаправлениями и заголовками безопасности
- **Nginx** — `nginx.conf` и `customHttp.yml` в комплекте
- **CI** — GitHub Actions: lint, typecheck, юнит-тесты, сборка, затем E2E + аудит доступности при каждом push/PR

## Лицензия

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — подробности в файле `LICENSE`.
