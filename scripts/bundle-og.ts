import * as esbuild from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['api/_og/handler.ts'],
  outfile: 'api/og.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  legalComments: 'none',
  external: ['./resvgjs.linux-x64-gnu.node', '@resvg/resvg-js'],
})

console.log('og function: bundled api/og.js')
