/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' https://cloud.umami.is https://gc.zgo.at https://static.cloudflareinsights.com; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://cloud.umami.is https://api.umami.is https://*.goatcounter.com https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    },
  },
  preview: {
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' https://cloud.umami.is https://gc.zgo.at https://static.cloudflareinsights.com; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://cloud.umami.is https://api.umami.is https://*.goatcounter.com https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    },
  },
  build: {
    modulePreload: {
      resolveDependencies(_filename, deps, { hostType }) {
        if (hostType !== 'html') return deps
        // The chart and the manage route load when that route opens.
        return deps.filter((dep) => !dep.includes('recharts') && !dep.includes('ManagePage'))
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor'
          }
          // recharts and the homepage both use this React shim. It has to live
          // with React, or the homepage statically imports the chart chunk.
          if (
            id.includes('/motion/') ||
            id.includes('framer-motion') ||
            id.includes('motion-dom') ||
            id.includes('motion-utils')
          ) {
            return 'motion'
          }
          const bundled = id.split('node_modules/').pop() ?? ''
          const pkg = bundled.startsWith('@') ? bundled.split('/').slice(0, 2).join('/') : bundled.split('/')[0]
          if (pkg === 'use-sync-external-store') return 'react-vendor'
          if (pkg === 'recharts' || pkg.startsWith('d3-')) return 'recharts'
          if (id.includes('node_modules/react-router')) {
            return 'router'
          }
          if (id.includes('node_modules/simple-icons')) {
            return 'simple-icons'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
