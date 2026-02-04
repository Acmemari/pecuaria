/**
 * API: Gerar insights com IA a partir dos resultados do questionário.
 * POST /api/questionnaire-insights
 * Body: { summary: string, farmName?: string }
 * Usa Gemini para análise executiva e recomendações.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callAssistant } from './geminiClient';
import { EXPERT_RULES } from './expert-knowledge';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { summary, farmName } = req.body || {};
    if (!summary || typeof summary !== 'string') {
      return res.status(400).json({ error: "O campo 'summary' é obrigatório e deve ser uma string (JSON dos resultados)." });
    }



    const prompt = `Você é um consultor sênior de gestão pecuária (Método Instituto Inttegra). Analise os resultados do diagnóstico abaixo.

CONTEXTO E REGRAS DO ESPECIALISTA:
${EXPERT_RULES}

DADOS DO DIAGNÓSTICO DA FAZENDA:
${farmName ? `Fazenda: ${farmName}` : ''}
${summary}

Sua tarefa é cruzar os "DADOS DO DIAGNÓSTICO" com as "DIRETRIZES DE CONSULTORIA" acima e gerar um relatório.
Siga estritamente o "FORMATO DA RESPOSTA" definido nas regras.`;

    const { answer } = await callAssistant(prompt);
    return res.status(200).json({ answer });
  } catch (err: any) {
    console.error('[questionnaire-insights]', err);
    return res.status(500).json({
      error: err.message || 'Erro ao gerar insights com IA.',
    });
  }
}
