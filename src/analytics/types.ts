/** Non-secret tracker snippets. Multiple can be enabled at once. */
export interface ScriptBundle {
  umami: { websiteId: string; src: string } | null
  goatcounter: { endpoint: string } | null
  cloudflare: { token: string } | null
}

export const EMPTY_SCRIPTS: ScriptBundle = {
  umami: null,
  goatcounter: null,
  cloudflare: null,
}
