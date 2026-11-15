/**
 * Bundle the Open Graph function's local imports into one ESM file.
 *
 * Vercel traces `api/og.ts` after this script runs. The traced import is
 * `./_ogdeps.js`, which Node can load. Package imports stay external so the
 * function bundler still installs them from node_modules.
 */
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['api/_ogdeps.ts'],
  outfile: 'api/_ogdeps.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  packages: 'external',
  legalComments: 'none',
})

console.log('og function: emitted api/_ogdeps.js')
