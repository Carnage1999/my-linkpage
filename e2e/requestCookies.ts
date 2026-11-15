import type { BrowserContext, Request } from '@playwright/test'

/**
 * Cookie header for a routed request.
 * WebKit keeps the jar, but Playwright's route does not expose Cookie on the request.
 */
export async function cookieHeader(context: BrowserContext, request: Request): Promise<string | undefined> {
  const header = request.headers().cookie
  if (header) return header
  try {
    const jar = await context.cookies(request.url())
    if (jar.length === 0) return undefined
    return jar.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
  } catch {
    // The context can close while a routed request is still in flight.
    return undefined
  }
}
