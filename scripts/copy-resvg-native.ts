import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const nativeRequire = createRequire(import.meta.url)
const destination = join(dirname(fileURLToPath(import.meta.url)), '../api/native/resvgjs.linux-x64-gnu.node')

if (process.platform !== 'linux' || process.arch !== 'x64') {
  console.log('resvg native: skipped (linux x64 only)')
} else {
  const source = nativeRequire.resolve('@resvg/resvg-js-linux-x64-gnu')
  mkdirSync(dirname(destination), { recursive: true })
  copyFileSync(source, destination)
  console.log('resvg native: copied linux x64 glibc binding')
}
