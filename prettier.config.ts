import type { Config } from 'prettier'

const config: Config = {
  plugins: ['prettier-plugin-tailwindcss'],
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
}

export default config
