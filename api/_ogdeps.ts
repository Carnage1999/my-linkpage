/**
 * Re-exports the site helpers /api/og imports.
 *
 * `pnpm build` bundles this file to gitignored `api/_ogdeps.js`. Vercel's
 * Node file tracer only follows a `.js` specifier when that file exists; it
 * does not map the specifier back to this `.ts` source. The Edge functions
 * keep importing the TypeScript modules directly.
 */
export { shareSubtitle } from '../src/i18n/homepage'
export { SITE_BROWSER_CACHE, SITE_CACHE_TAG, SITE_CDN_CACHE } from './stats/_cache'
export { readRuntimeSite } from './stats/_site-store'
