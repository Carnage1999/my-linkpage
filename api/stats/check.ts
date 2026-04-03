/**
 * GET /api/stats/check — Vercel Edge adapter.
 * @see _handlers.ts for the platform-agnostic implementation.
 */

import { handleCheck } from './_handlers'

export const config = { runtime: 'edge' }
export default handleCheck
