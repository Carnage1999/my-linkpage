/**
 * Re-exports the site helpers /api/og imports.
 *
 * `pnpm build` bundles this file to gitignored `api/_ogdeps.js`. Vercel's
 * Node file tracer only follows a `.js` specifier when that file exists; it
 * does not map the specifier back to this `.ts` source. The Edge functions
 * keep importing the TypeScript modules directly.
 */
export { canonicalLocale, shareSubtitle } from '../src/i18n/homepage'
export { canonicalOgUrl } from './_canonical'
export { SITE_BROWSER_CACHE, SITE_CDN_CACHE, siteCacheTag } from './stats/_cache'
export { hashClientIp } from './stats/_redis'
export { readPublicDocument } from './stats/_site-store'
