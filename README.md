# my-linkpage

An example multilingual link page built with React, Vite, TypeScript, Tailwind CSS, and Headless UI.

This repository is intended as a sample project for building a lightweight social link landing page with automatic language detection, automatic theme detection on first visit, and a simple data file for maintaining profile links.

## Features

- Example implementation for a personal or portfolio-style link page
- Multilingual UI with English, Russian, and Traditional Chinese
- First-visit language detection based on the browser language
- Simplified Chinese browser locales automatically mapped to Traditional Chinese
- First-visit theme detection based on the user's system color scheme
- Saved language and theme preferences using `localStorage`
- Social links maintained in a single dedicated file
- Responsive layout for desktop and mobile
- TypeScript-first project setup with linting, formatting, and type checking

## Tech Stack

- React 19
- Vite 8
- TypeScript 5
- Tailwind CSS 3
- Headless UI
- i18next and react-i18next
- ESLint 10
- Prettier
- eslint-config-prettier

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Start development server

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
```

### Preview production build

```bash
pnpm preview
```

## Quality Checks

### Type check

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
```

### Format

```bash
pnpm format
```

### Run all checks

```bash
pnpm check
```

This runs:

```bash
pnpm typecheck && pnpm lint && pnpm build
```

## Project Structure

```text
src/
	App.tsx             Main page UI
	main.tsx            App entry
	i18n.ts             i18n setup and language detection
	i18next.d.ts        i18next type augmentation
	socialLinks.tsx     Social link data and icons
	index.css           Global styles and Tailwind entry
	locales/
		en.json
		ru.json
		zh-TW.json
```

## Customization

### Edit social links

Update:

- `src/socialLinks.tsx`

This file contains the example social list and icon definitions. Add, remove, or reorder items there.

### Edit translations

Update:

- `src/locales/en.json`
- `src/locales/ru.json`
- `src/locales/zh-TW.json`

### Edit profile content and layout

Update:

- `src/App.tsx`

### Edit theme or language detection logic

Update:

- `src/i18n.ts`
- `src/App.tsx`

## Behavior Notes

- Language selection is saved in `localStorage` after the user changes it manually.
- Theme selection is also saved in `localStorage` after the user toggles it manually.
- If there is no saved theme, the page follows the user's system preference.
- If there is no saved language, the page follows the user's browser language.
- Browser locales for Simplified Chinese are normalized to Traditional Chinese.

## Assets

- Avatar image: `public/avatar.jpg`
- Favicon: `public/favicon.ico`

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International license.

- License file: `LICENSE`
- License summary: https://creativecommons.org/licenses/by-nc/4.0/
