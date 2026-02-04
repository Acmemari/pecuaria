/**
 * Cálculo dos resultados do questionário Gente/Gestão/Produção.
 * Compara respostas (Sim/Não) com o positiveAnswer de cada pergunta.
 */

export interface QuestionMeta {
  id: string;
  category: string;
  group: string;
  positiveAnswer: 'Sim' | 'Não';
}

export interface SavedAnswer {
  questionId: string;
  answer: 'Sim' | 'Não';
  isPositive: boolean;
}

export type StatusLabel = 'Excelente' | 'Bom' | 'Regular' | 'Ruim' | 'Crítico';

export interface CategoryScore {
  group: string;
  category: string;
  score: number;
  total: number;
  positive: number;
  status: StatusLabel;
}

export interface GroupScore {
  score: number;
  total: number;
  positive: number;
  categories: CategoryScore[];
}

export interface QuestionnaireResultsData {
  finalScore: number;
  totalQuestions: number;
  totalPositive: number;
  byGroup: Record<string, GroupScore>;
  byCategory: CategoryScore[];
  radarData: { subject: string; score: number; fullMark: number }[];
}

/** Faixas: >90% Excelente, 70–90% Bom, 60–70% Regular, 40–60% Ruim, 0–40% Crítico */
function getStatus(score: number): StatusLabel {
  if (score > 90) return 'Excelente';
  if (score >= 70) return 'Bom';
  if (score >= 60) return 'Regular';
  if (score >= 40) return 'Ruim';
  return 'Crítico';
}

/** Normaliza valor de resposta para "Sim" ou "Não". */
function normalizeAnswerValue(ans: unknown): 'Sim' | 'Não' | null {
  if (ans === 'Sim' || ans === 'Não') return ans;
  const s = typeof ans === 'string' ? ans.trim() : String(ans ?? '').trim();
  if (/^sim$/i.test(s)) return 'Sim';
  if (/^n[aã]o$/i.test(s) || /^nao$/i.test(s)) return 'Não';
  return null;
}

/** Normaliza resposta para garantir questionId e answer compatíveis com o mapa. */
function normalizeAnswer(a: SavedAnswer | Record<string, unknown>): SavedAnswer | null {
  const raw = a as Record<string, unknown>;
  const qId = raw.questionId ?? raw.question_id;
  const ansNorm = normalizeAnswerValue(raw.answer);
  if (qId == null || ansNorm == null) return null;
  const hasExplicit = raw.isPositive !== undefined || raw.is_positive !== undefined;
  const isPositive = hasExplicit
    ? Boolean(raw.isPositive ?? raw.is_positive)
    : (ansNorm === 'Sim'); // heurística quando não salvo (ex.: dados antigos)
  return {
    questionId: String(qId).trim().toLowerCase(),
    answer: ansNorm,
    isPositive,
  };
}

/**
 * Calcula os resultados a partir das respostas e do mapeamento de perguntas.
 * Resposta "correta" = resposta igual ao positiveAnswer da pergunta.
 */
export function computeQuestionnaireResults(
  answers: SavedAnswer[] | Record<string, unknown>[],
  questionsMap: Map<string, QuestionMeta>
): QuestionnaireResultsData {
  const normalized = answers.map(normalizeAnswer).filter((a): a is SavedAnswer => a != null);
  const answerByQuestion = new Map(normalized.map((a) => [a.questionId, a]));

  const byGroup = new Map<string, { total: number; positive: number; categories: Map<string, { total: number; positive: number }> }>();

  // Agregação por categoria (Gente, Gestão, Produção) e subgrupo (group)
  for (const [questionId, meta] of questionsMap) {
    const keyNorm = String(questionId).trim().toLowerCase();
    const answer = answerByQuestion.get(keyNorm);
    if (answer === undefined) continue;

    const isPositive = answer.answer === meta.positiveAnswer;
    const categoryName = meta.category; // Gente | Gestão | Produção (os 3 pilares)
    const groupName = meta.group;       // subgrupo dentro da categoria

    if (!byGroup.has(categoryName)) {
      byGroup.set(categoryName, {
        total: 0,
        positive: 0,
        categories: new Map(),
      });
    }
    const g = byGroup.get(categoryName)!;
    g.total += 1;
    if (isPositive) g.positive += 1;

    if (!g.categories.has(groupName)) {
      g.categories.set(groupName, { total: 0, positive: 0 });
    }
    const c = g.categories.get(groupName)!;
    c.total += 1;
    if (isPositive) c.positive += 1;
  }

  let totalQuestions = 0;
  let totalPositive = 0;
  const byGroupResult: Record<string, GroupScore> = {};
  const byCategory: CategoryScore[] = [];
  const radarData: { subject: string; score: number; fullMark: number }[] = [];

  const groupOrder = ['Gente', 'Gestão', 'Produção'];
  for (const groupName of groupOrder) {
    const g = byGroup.get(groupName);
    if (!g) continue;

    const groupScore = (g.total > 0 ? (g.positive / g.total) * 100 : 0);
    totalQuestions += g.total;
    totalPositive += g.positive;

    const categories: CategoryScore[] = [];
    const catEntries = Array.from(g.categories.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [catName, cat] of catEntries) {
      const score = cat.total > 0 ? (cat.positive / cat.total) * 100 : 0;
      const status = getStatus(score);
      categories.push({
        group: groupName,
        category: catName,
        score: Math.round(score),
        total: cat.total,
        positive: cat.positive,
        status,
      });
      byCategory.push(categories[categories.length - 1]);
    }

    byGroupResult[groupName] = {
      score: Math.round(groupScore),
      total: g.total,
      positive: g.positive,
      categories,
    };
    radarData.push({ subject: groupName, score: Math.round(groupScore), fullMark: 100 });
  }

  let finalScore = totalQuestions > 0 ? Math.round((totalPositive / totalQuestions) * 100) : 0;

  // Fallback: se temos respostas mas nenhum pareamento (IDs diferentes ou questionsMap vazio), usar nota geral nas três categorias (Gente, Gestão, Produção)
  if (normalized.length > 0 && totalQuestions === 0) {
    const positiveCount = normalized.filter((a) => a.isPositive).length;
    totalQuestions = normalized.length;
    totalPositive = positiveCount;
    finalScore = Math.round((totalPositive / totalQuestions) * 100);
    const score = finalScore;
    const status = getStatus(score);
    for (const groupName of groupOrder) {
      const cat: CategoryScore = {
        group: groupName,
        category: 'Resumo',
        score: finalScore,
        total: totalQuestions,
        positive: totalPositive,
        status,
      };
      byCategory.push(cat);
      byGroupResult[groupName] = {
        score: finalScore,
        total: totalQuestions,
        positive: totalPositive,
        categories: [cat],
      };
      radarData.push({ subject: groupName, score: finalScore, fullMark: 100 });
    }
  }

  return {
    finalScore,
    totalQuestions,
    totalPositive,
    byGroup: byGroupResult,
    byCategory: byCategory.sort((a, b) => b.score - a.score),
    radarData,
  };
}
