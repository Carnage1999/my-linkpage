/**
 * POST /api/stats/record — Vercel Edge adapter.
 * @see _handlers.ts for the platform-agnostic implementation.
 */

import { handleRecord } from './_handlers'

export const config = { runtime: 'edge' }
export default handleRecord
