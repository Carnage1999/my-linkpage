import js from '@eslint/js'
import { defineConfig, globalIgnores, type Config } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tailwindcss from 'eslint-plugin-tailwindcss'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'api/og.js']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // The plugin's published config type is built against an older ESLint config type.
  tailwindcss.configs.recommended as Config,
  {
    settings: {
      tailwindcss: {
        cssConfigPath: 'src/index.css',
      },
    },
  },
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]' },
      ],
      'tailwindcss/no-custom-classname': 'off',
    },
  },
  eslintConfigPrettier,
])
