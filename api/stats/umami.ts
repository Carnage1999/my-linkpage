/**
 * GET /api/stats/umami — Vercel Edge adapter.
 * @see _handlers.ts
 */

import { handleUmami } from './_handlers'

export const config = { runtime: 'edge' }
export default handleUmami
