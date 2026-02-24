/**
 * @deprecated Use POST /api/agents-run with agentId: 'feedback' and Authorization: Bearer <token> instead.
 * This endpoint is kept for backwards compatibility but returns 410 Gone.
 * The FeedbackAgent component has been migrated to /api/agents-run for auth, rate limiting, and fallback support.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  return res.status(410).json({
    error:
      'Este endpoint foi descontinuado. Use POST /api/agents-run com agentId: "feedback" e header Authorization: Bearer <token>.',
    code: 'ENDPOINT_DEPRECATED',
    migration: '/api/agents-run',
  });
}
