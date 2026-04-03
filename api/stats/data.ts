/**
 * GET /api/stats/data — Vercel Edge adapter.
 * @see _handlers.ts for the platform-agnostic implementation.
 */

import { handleData } from './_handlers'

export const config = { runtime: 'edge' }
export default handleData
