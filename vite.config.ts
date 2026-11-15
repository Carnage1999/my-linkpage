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
        "default-src 'self'; script-src 'self' https://cloud.umami.is https://gc.zgo.at https://static.cloudflareinsights.com; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://cloud.umami.is https://api.umami.is https://gateway.umami.is https://*.goatcounter.com https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
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
        "default-src 'self'; script-src 'self' https://cloud.umami.is https://gc.zgo.at https://static.cloudflareinsights.com; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://cloud.umami.is https://api.umami.is https://gateway.umami.is https://*.goatcounter.com https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    },
  },
  build: {
    // Font subsets start at 2.5 KB. Keep them as files so font-src can stay 'self'.
    assetsInlineLimit: 2048,
    modulePreload: {
      resolveDependencies(_filename, deps, { hostType }) {
        if (hostType !== 'html') return deps
        // The chart and the manage route load when that route opens.
        return deps.filter((dep) => !dep.includes('recharts') && !dep.includes('ManagePage'))
      },
    },
    rolldownOptions: {
      preserveEntrySignatures: 'allow-extension',
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            {
              // Only the chart libraries move. Their React dependencies stay
              // behind, or the homepage statically imports this chunk.
              debugName: 'recharts',
              includeDependenciesRecursively: false,
              name(id) {
                const bundled = id.split('node_modules/').pop() ?? ''
                const pkg = bundled.startsWith('@') ? bundled.split('/').slice(0, 2).join('/') : bundled.split('/')[0]
                if (pkg === 'recharts' || pkg === 'd3' || pkg.startsWith('d3-')) return 'recharts'
                return null
              },
            },
          ],
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
