/**
 * POST /api/stats/auth — Vercel Edge adapter.
 * @see _handlers.ts for the platform-agnostic implementation.
 */

import { handleAuth } from './_handlers'

export const config = { runtime: 'edge' }
export default handleAuth
