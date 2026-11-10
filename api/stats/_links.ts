const LINK_ID = /^[a-zA-Z0-9_-]{1,64}$/

/** Accept only an exact id that is present in the deployed site config. */
export function acceptLinkId(raw: unknown, allowed: ReadonlySet<string>): string | null {
  if (typeof raw !== 'string' || !LINK_ID.test(raw)) return null
  if (!allowed.has(raw)) return null
  return raw
}
