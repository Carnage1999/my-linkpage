# my-linkpage

[English](README.md) | [Русский](README.ru.md) | **正體中文**

以 React、Vite、TypeScript 和 Tailwind CSS 打造的多語系連結頁面（link-in-bio）。

**線上展示 → <https://link.w1999.me>**

## 功能特色

- **零部署更新** — 編輯 `public/siteConfig.json` 即可新增、移除或調整社群連結、個人資料或分析工具，無需重新建置
- **自動偵測圖示** — 透過 [simple-icons](https://simpleicons.org) 根據連結網址自動匹配圖示（支援 48 平台）；需要時可用 `iconSlug` 手動覆寫
- **動態 OG 圖片** — Vercel Serverless Function (`/api/og`) 依請求即時產生 1200×630 社群預覽圖，始終反映最新設定
- **多語系** — EN / RU / ZH-TW，自動偵測瀏覽器語言（簡體中文 → 正體中文）
- **深色 / 淺色模式** — 跟隨系統偏好；使用者的切換選擇透過 `localStorage` 保存
- **動畫效果** — Framer Motion 進場過渡動畫，支援 `prefers-reduced-motion`
- **自託管字型** — 透過 `@fontsource-variable` 提供 Manrope 與 Space Grotesk 可變字型
- **分析與點擊熱力圖** — 可設定 Plausible / Umami 分析工具；本機端逐連結點擊熱力圖含每日/每週趨勢圖 — 全部使用 `localStorage`，無 Cookie
- **SEO** — 動態 meta/OG/Twitter 標籤、JSON-LD Person schema、hreflang、canonical 連結
- **無障礙** — skip link、語意化 HTML、ARIA 標籤、`aria-live` 回饋、WCAG 對比度；E2E 中包含 axe-core 無障礙稽核
- **錯誤邊界** — 頂層崩潰備援 UI，附重新載入按鈕
- **剪貼簿備援** — `navigator.clipboard` 搭配 `execCommand` 備援
- **效能** — LazyMotion tree-shaking、Vite 手動 chunk 分割
- **測試** — Vitest + Testing Library 單元測試；Playwright E2E 測試（Chromium、Firefox、WebKit）+ axe-core 無障礙稽核
- **CI/CD** — GitHub Actions 兩階段流水線：lint → typecheck → test → build，接著 E2E 與無障礙測試
- **程式碼品質** — TypeScript strict mode、ESLint 9、Prettier、`pnpm check` 流水線

## 技術堆疊

| 類別 | 工具 |
|---|---|
| 框架 | React 19、TypeScript 6 |
| 建置 | Vite 8 |
| 樣式 | Tailwind CSS 3、Headless UI |
| 動畫 | Framer Motion |
| 國際化 | i18next、react-i18next |
| 圖表 | Recharts |
| 圖示 | simple-icons（48 平台） |
| OG 圖片 | satori、@resvg/resvg-js（建置時期 + Vercel serverless） |
| 字型 | @fontsource-variable（Manrope、Space Grotesk） |
| 測試 | Vitest、Testing Library、Playwright、axe-core |
| 程式碼檢查 | ESLint 9、Prettier |
| CI | GitHub Actions |

## 快速開始

```bash
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
  SocialIcon.tsx           品牌圖示元件（simple-icons + 自動偵測）
  iconRegistry.ts          48 平台圖示註冊表，URL → 圖示自動匹配
  i18n.ts                  語言偵測與 i18n 設定
  index.css                全域樣式與 Tailwind 進入點
  components/
    ErrorBoundary.tsx      崩潰備援 UI
    SEO.tsx                Meta 標籤、OG 圖片、JSON-LD
    LinkHeatmap.tsx        點擊熱力圖與趨勢圖表
  hooks/
    useSiteConfig.ts       執行階段 JSON 設定載入器（擷取 siteConfig.json）
    useAnalytics.ts        分析腳本載入器與事件追蹤
    useLinkClickStats.ts   localStorage 點擊計數器與時間軸
  locales/                 翻譯檔案（en / ru / zh-TW）
  test/                    Vitest 單元與元件測試
api/
  og.ts                    Vercel Serverless Function — 動態產生 OG 圖片
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

// 停用（移除 "analytics" 鍵 — 本機熱力圖仍可運作）
```

### OG 圖片

OG 圖片透過 `/api/og` **動態產生**，每次請求時讀取 `siteConfig.json`，無需手動重新產生。靜態備援圖片也會在 `pnpm build` 時產生。

## 部署

已預先設定多個平台：

- **Vercel** — `vercel.json` 含安全標頭、資源快取與 `/api/og` serverless OG 圖片端點
- **Firebase Hosting** — `firebase.json` 含 SPA 重寫與安全標頭
- **Nginx** — 附 `nginx.conf` 與 `customHttp.yml`
- **CI** — GitHub Actions 執行 lint、typecheck、單元測試、建置，接著 E2E + 無障礙測試（每次 push/PR）

## 授權條款

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — 詳見 `LICENSE` 檔案。
