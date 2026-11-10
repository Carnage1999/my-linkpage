# my-linkpage

[English](README.md) | [Русский](README.ru.md) | **正體中文**

以 React、Vite、TypeScript 和 Tailwind CSS 打造的多語系連結頁面（link-in-bio）。

**線上展示 → <https://link.w1999.me>**

## 功能特色

- **零部署更新** — 編輯 `public/siteConfig.json` 即可新增、移除或調整社群連結、個人資料或分析工具，無需重新建置
- **自動偵測圖示** — 透過 [simple-icons](https://simpleicons.org) 根據連結網址自動匹配圖示（支援 48 平台）；需要時可用 `iconSlug` 手動覆寫
- **動態 OG 圖片** — Serverless 端點（`/api/og`）使用 Web Standard API 依請求即時產生 1200×630 社群預覽圖，始終反映最新設定
- **多語系** — EN / RU / ZH-TW，自動偵測瀏覽器語言（簡體中文 → 正體中文）
- **深色 / 淺色模式** — 跟隨系統偏好；使用者的切換選擇透過 `localStorage` 保存
- **動畫效果** — Motion 進場過渡動畫，支援 `prefers-reduced-motion`
- **自託管字型** — 透過 `@fontsource-variable` 提供 Manrope 與 Space Grotesk 可變字型
- **分析** — 公開頁面可使用 Plausible 或 Umami。管理後台的點擊紀錄寫入 Upstash Redis，不依賴分析腳本。
- **SEO** — 動態 meta/OG/Twitter 標籤、JSON-LD Person schema、hreflang、canonical 連結
- **無障礙** — skip link、語意化 HTML、ARIA 標籤、`aria-live` 回饋、WCAG 對比度；E2E 中包含 axe-core 無障礙稽核
- **錯誤邊界** — 頂層崩潰備援 UI，附重新載入按鈕
- **剪貼簿備援** — `navigator.clipboard` 搭配 `execCommand` 備援
- **效能** — LazyMotion tree-shaking、Vite 手動 chunk 分割
- **測試** — Vitest + Testing Library 單元測試；Playwright E2E 測試（Chromium、Firefox、WebKit）+ axe-core 無障礙稽核
- **CI/CD** — GitHub Actions 兩階段流水線：lint → typecheck → test → build，接著 E2E 與無障礙測試
- **程式碼品質** — TypeScript 6 strict mode、ESLint 10、Prettier、`pnpm check` 流水線

## 技術堆疊

| 類別 | 工具 |
|---|---|
| 框架 | React 19、TypeScript 6 |
| 路由 | react-router-dom 7 |
| 建置 | Vite 8 |
| 樣式 | Tailwind CSS 4（`@tailwindcss/vite`）、Headless UI |
| 動畫 | Motion |
| 國際化 | i18next 27、react-i18next 18 |
| 圖表 | Recharts |
| 圖示 | simple-icons（48 平台） |
| OG 圖片 | satori、@resvg/resvg-js（建置時期 + serverless） |
| 統計後端 | Upstash Redis（REST API，無需 SDK） |
| 字型 | @fontsource-variable（Manrope、Space Grotesk） |
| 測試 | Vitest 5、Testing Library、Playwright、axe-core |
| 程式碼檢查 | ESLint 10、Prettier |
| 套件管理器 | pnpm 12（在 `packageManager` 釘選為 `pnpm@12.18.0`） |
| CI | GitHub Actions（Node 24） |

## 快速開始

需要 Node.js 24（CI 使用的版本）。Node.js 22.22 以上也符合目前工具鏈的需求。pnpm 版本釘選在 `package.json` 的 `packageManager`。這些 Node 版本內建的 Corepack 會安裝這個確切版本：

```bash
corepack enable
corepack install   # 依 packageManager 啟用 pnpm 12.18.0
pnpm install
pnpm dev        # 開發伺服器
pnpm build      # 更新 sitemap + 產生 OG 圖片 + 正式環境建置
pnpm preview    # 預覽正式建置結果
```

## 指令

| 指令 | 說明 |
|---|---|
| `pnpm dev` | 啟動 Vite 開發伺服器 |
| `pnpm build` | 更新 sitemap lastmod + 產生 OG 圖片 + 正式環境建置 |
| `pnpm generate-og` | 重新產生 OG 社群預覽圖 |
| `pnpm preview` | 預覽正式建置結果 |
| `pnpm typecheck` | TypeScript 型別檢查 |
| `pnpm lint` | ESLint 程式碼檢查 |
| `pnpm format` | Prettier 格式化 |
| `pnpm test` | 單元 / 元件測試（Vitest） |
| `pnpm test:e2e` | E2E 測試（Playwright） |
| `pnpm test:e2e:a11y` | 無障礙稽核（axe-core） |
| `pnpm check` | 完整流水線：typecheck → lint → test → build |

## 專案結構

```text
public/
  siteConfig.json          ★ 編輯此檔即可更新連結、個人資料與分析工具
src/
  siteConfig.ts            型別定義與建置時期預設值
  App.tsx                  主頁面 UI
  main.tsx                 進入點（包裹於 ErrorBoundary）
  router.tsx               客戶端路由（/、/manage）
  SocialIcon.tsx           品牌圖示元件（simple-icons + 自動偵測）
  iconRegistry.ts          48 平台圖示註冊表，URL → 圖示自動匹配
  i18n.ts                  語言偵測與 i18n 設定
  index.css                全域樣式與 Tailwind 進入點
  components/
    ErrorBoundary.tsx      崩潰備援 UI
    SEO.tsx                Meta 標籤、OG 圖片、JSON-LD
    LinkHeatmap.tsx        Redis 與 Umami 點擊對照
  hooks/
    useSiteConfig.ts       執行階段 JSON 設定載入器（擷取 siteConfig.json）
    useAnalytics.ts        分析腳本載入器與事件追蹤
    useStats.ts            後台登入、Redis 統計與 Umami 報表
  lib/
    recordClick.ts         以 sendBeacon 紀錄點擊
    clickCsv.ts            匯出 CSV
  pages/
    ManagePage.tsx         /manage 密碼保護的管理後台
  locales/                 翻譯檔案（en / ru / zh-TW）
  test/                    Vitest 單元與元件測試
api/
  og.ts                    Serverless Function — 動態產生 OG 圖片（Web Standard API）
  stats/
    _handlers.ts           auth、record、data 與 Umami 處理器
    _redis.ts              Upstash Redis REST 輔助函式
    _umami.ts              伺服器端 Umami 用戶端
    _dates.ts              時區日界
    _token.ts              HMAC 權杖認證（Web Crypto API）
    auth.ts                登入端點
    check.ts               功能偵測端點
    data.ts                Redis 點擊報表
    umami.ts               Umami 報表
    record.ts              點擊紀錄端點
e2e/
  app.spec.ts              Playwright E2E 測試
  a11y.spec.ts             axe-core 無障礙稽核
scripts/
  generate-og-image.ts     建置時期 OG 圖片產生器（靜態備援）
  update-sitemap-lastmod.ts  自動更新 sitemap.xml lastmod 日期
```

## 自訂設定

### 社群連結、個人資料與網站中繼資料

編輯 `public/siteConfig.json` — 這是**唯一需要修改的檔案**。無需重新建置或部署。

```jsonc
{
  "site": {
    "name": "你的名字",
    "tagline": "社群與連結",
    "domain": "your-domain.com",
    "twitterHandle": "@your_handle"    // 選填
  },
  "profile": {
    "avatar": "/avatar.jpg"
  },
  "analytics": {                        // 選填 — 移除以停用
    "provider": "umami",                // "umami" 或 "plausible"
    "umamiWebsiteId": "xxxxxxxx-..."
  },
  "socials": [
    { "id": "github", "label": "GitHub", "url": "https://github.com/you" },
    { "id": "x", "label": "X", "url": "https://x.com/you" }
    // 圖示會自動依 URL 偵測 — 不需要 iconSlug
    // 手動覆寫請加入："iconSlug": "siGithub"
  ]
}
```

### 翻譯

編輯或新增 `src/locales/` 中的 JSON 檔案。

### 分析工具

在 `public/siteConfig.json` 中設定：

```jsonc
// Plausible
"analytics": { "provider": "plausible", "plausibleDomain": "link.example.com" }

// Umami
"analytics": { "provider": "umami", "umamiWebsiteId": "xxxxxxxx-…" }

// 停用（移除 "analytics" 鍵）
```

### OG 圖片

OG 圖片透過 `/api/og` **動態產生**，每次請求時讀取 `siteConfig.json`，無需手動重新產生。靜態備援圖片也會在 `pnpm build` 時產生。

### 管理後台（選擇性啟用）

後台位於 `/manage`，公開頁面沒有連到它。頁面送出 `noindex`，並在 `robots.txt` 禁止索引。環境變數見 `.env.example`：

| 變數 | 說明 |
|---|---|
| `STATS_PASSWORD` | `/manage` 的密碼 |
| `STATS_TIMEZONE` | 日界使用的 IANA 時區，預設 `Asia/Taipei`。 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL（[主控台](https://console.upstash.com) → 資料庫 → REST API） |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST 權杖 |
| `UMAMI_WEBSITE_ID` | 網站 id。未設定時改用 `siteConfig.json` 的 `umamiWebsiteId`。 |
| `UMAMI_API_URL` | Umami 來源位址。留空則使用雲端 `https://api.umami.is`。 |
| `UMAMI_API_KEY` | 雲端或自架的 API 金鑰。雲端：Settings → API keys。 |
| `UMAMI_USERNAME` / `UMAMI_PASSWORD` | 沒有 API 金鑰時的自架登入。工作階段權杖只留在伺服器。 |

同時設定 `STATS_PASSWORD` 與兩個 Upstash 變數後才會紀錄點擊。首頁以 `navigator.sendBeacon`（或 `keepalive` 的 `fetch`）送出 `POST /api/stats/record`。只有在有網站 id，且有 API 金鑰或帳號密碼時，才會顯示 Umami 區塊。Redis 點擊與 Umami 的 Link Click 並排：Redis 含被廣告阻擋程式擋下 Umami 的訪客。

API 使用 Web `Request` / `Response` 與 Web Crypto，可在 Vercel Edge 執行。Upstash 免費方案（256 MB、每月 500,000 個指令）足夠：一次成功的點擊約 5 個指令，載入後台讀取兩個 hash。

## 部署

已預先設定多個平台：

- **Vercel** — `vercel.json` 含安全標頭、資源快取、`/api/og` OG 圖片端點與 `/api/stats/*` edge 端點
- **Firebase Hosting** — `firebase.json` 含 SPA 重寫與安全標頭
- **Nginx** — 附 `nginx.conf` 與 `customHttp.yml`
- **CI** — GitHub Actions 執行 lint、typecheck、單元測試、建置，接著 E2E + 無障礙測試（每次 push/PR）

## 授權條款

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — 詳見 `LICENSE` 檔案。
