/**
 * Secure document download endpoint.
 * For confidential/restricted documents, the signed URL never reaches the browser.
 * Captures real IP and user-agent for audit logging.
 *
 * POST /api/document-download
 * Body: { documentId: string, accessToken: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

const BUCKET_NAME = 'client-documents';

const SIGNED_URL_EXPIRY: Record<string, number> = {
  publico: 3600,
  interno: 1800,
  confidencial: 300,
  restrito: 120,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentId, accessToken } = req.body || {};

    if (!documentId || !accessToken) {
      return res.status(400).json({ error: 'documentId and accessToken are required' });
    }

    const admin = getSupabaseAdmin();

    // Validate user session
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(accessToken);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch document metadata
    const { data: doc, error: docError } = await admin
      .from('client_documents')
      .select('id, storage_path, confidentiality, original_name, file_type')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Capture audit metadata
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    // Log the download in audit trail (server-side, reliable)
    await admin.from('document_audit_log').insert({
      document_id: doc.id,
      user_id: user.id,
      action: 'download',
      metadata: {
        file_name: doc.original_name,
        confidentiality: doc.confidentiality,
        source: 'api',
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Generate signed URL
    const confidentiality = doc.confidentiality || 'interno';
    const expirySeconds = SIGNED_URL_EXPIRY[confidentiality] || 1800;

    const { data: urlData, error: urlError } = await admin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(doc.storage_path, expirySeconds);

    if (urlError || !urlData) {
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }

    return res.status(200).json({
      url: urlData.signedUrl,
      fileName: doc.original_name,
      confidentiality: doc.confidentiality,
      expiresIn: expirySeconds,
    });
  } catch (error: any) {
    console.error('[document-download] Error:', error?.message || error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
