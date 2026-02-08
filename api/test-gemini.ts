/**
 * Endpoint de teste para diagnosticar a importação do @google/genai
 * GET /api/test-gemini
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const diagnostics: Record<string, unknown> = {
    step: 'start',
    apiKeyExists: !!process.env.GEMINI_API_KEY,
    apiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
    nodeVersion: process.version,
  };

  try {
    // Passo 1: Testar importação do SDK
    diagnostics.step = 'importing @google/genai';
    const { GoogleGenAI } = await import('@google/genai');
    diagnostics.sdkImported = true;

    // Passo 2: Testar criação do client
    diagnostics.step = 'creating client';
    const apiKey = process.env.GEMINI_API_KEY!;
    const ai = new GoogleGenAI({ apiKey });
    diagnostics.clientCreated = true;

    // Passo 3: Testar chamada simples
    diagnostics.step = 'calling generateContent';
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Responda apenas: "OK, funcionando!"',
    });
    diagnostics.responseReceived = true;
    diagnostics.responseText = response.text?.substring(0, 100) || '(vazio)';

    return res.status(200).json({ status: 'ok', diagnostics });
  } catch (err: any) {
    diagnostics.error = {
      message: err.message,
      name: err.name || err.constructor?.name,
      stack: err.stack?.split('\n').slice(0, 5),
    };
    return res.status(500).json({ status: 'error', diagnostics });
  }
}
