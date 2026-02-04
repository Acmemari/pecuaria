import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Target,
  Save,
  Download,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { SavedQuestionnaire } from '../types';
import {
  computeQuestionnaireResults,
  QuestionnaireResultsData,
} from '../lib/questionnaireResults';
import { generatePerformancePdf } from '../lib/generatePerformancePdf';
import './QuestionnaireResultsDashboard.css';
import { QuestionnaireResultsPrintView } from '../components/questionnaire/QuestionnaireResultsPrintView';
import { useAuth } from '../contexts/AuthContext';
import { useQuestions } from '../hooks/useQuestions';
import { useRateLimiter } from '../hooks/useRateLimiter';
import { GROUP_COLORS, STATUS_STYLES, QUESTIONNAIRE_CONSTANTS, VALIDATION_RULES } from '../constants/questionnaireConstants';
import { formatShortDate } from '../lib/dateUtils';

interface QuestionnaireResultsDashboardProps {
  questionnaire: SavedQuestionnaire;
  onClose: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  autoPrint?: boolean;
  autoDownloadPdf?: boolean;
  autoGenerateInsights?: boolean;
  onSave?: () => void;
}

const QuestionnaireResultsDashboard: React.FC<QuestionnaireResultsDashboardProps> = ({
  questionnaire,
  onClose,
  onToast,
  autoPrint = false,
  autoDownloadPdf = false,
  autoGenerateInsights = false,
  onSave,
}) => {
  const { questionsMap, loading: loadingQuestions } = useQuestions();
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsText, setInsightsText] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const insightsRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { canCall: canGenerateInsights, getRemainingTime } = useRateLimiter(VALIDATION_RULES.RATE_LIMIT_MS);

  const results: QuestionnaireResultsData | null = useMemo(() => {
    const answers = questionnaire.answers ?? [];
    if (!Array.isArray(answers) || answers.length === 0) return null;
    return computeQuestionnaireResults(answers, questionsMap);
  }, [questionnaire.answers, questionsMap]);

  // Auto-print effect (Only if NOT downloading PDF directly)
  useEffect(() => {
    if (autoPrint && !autoDownloadPdf && !loadingQuestions && questionsMap.size > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, QUESTIONNAIRE_CONSTANTS.CHART_RENDER_DELAY);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, autoDownloadPdf, loadingQuestions, questionsMap]);

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf || !results || !questionsMap.size) return;

    setIsGeneratingPdf(true);

    try {
      await new Promise(resolve => setTimeout(resolve, QUESTIONNAIRE_CONSTANTS.PDF_GENERATION_DELAY));

      const operationalChart = document.getElementById('radar-operational');
      const categoricalChart = document.getElementById('radar-categorical');

      let opImg: string | null = null;
      let catImg: string | null = null;

      if (operationalChart) {
        opImg = await toPng(operationalChart, { pixelRatio: 4, backgroundColor: '#ffffff' });
      }
      if (categoricalChart) {
        catImg = await toPng(categoricalChart, { pixelRatio: 4, backgroundColor: '#ffffff' });
      }

      await generatePerformancePdf(
        results,
        questionnaire,
        insightsText || null,
        { operational: opImg, categorical: catImg },
        user?.name || 'Usuário'
      );

      onToast?.('PDF salvo com sucesso!', 'success');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      onToast?.('Erro ao gerar PDF: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Auto-download PDF effect
  useEffect(() => {
    const insightsReady = !autoGenerateInsights || !!insightsText;
    if (autoDownloadPdf && !loadingQuestions && questionsMap.size > 0 && !isGeneratingPdf && results && insightsReady) {
      handleDownloadPdf();
      if (autoDownloadPdf) {
        setTimeout(() => onClose(), QUESTIONNAIRE_CONSTANTS.AUTO_CLOSE_DELAY);
      }
    }
  }, [autoDownloadPdf, loadingQuestions, questionsMap, isGeneratingPdf, results, autoGenerateInsights, insightsText]);

  // Auto-generate insights effect
  useEffect(() => {
    if (autoGenerateInsights && !loadingQuestions && questionsMap.size > 0 && !insightsText && !insightsLoading) {
      handleGenerateInsights();
    }
  }, [autoGenerateInsights, loadingQuestions, questionsMap]);

  const diagnosisDate = questionnaire.created_at
    ? formatShortDate(questionnaire.created_at)
    : '—';

  const requestInsights = async (): Promise<string> => {
    if (!results) return '';
    const summary = JSON.stringify({
      notaFinal: results.finalScore,
      totalPerguntas: results.totalQuestions,
      porGrupo: Object.entries(results.byGroup).map(([nome, g]) => ({
        grupo: nome,
        media: g.score,
        categorias: g.categories.map((c) => ({ categoria: c.category, score: c.score, status: c.status })),
      })),
      categorias: results.byCategory.map((c) => ({
        grupo: c.group,
        categoria: c.category,
        score: c.score,
        status: c.status,
      })),
    });

    const res = await fetch('/api/questionnaire-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, farmName: questionnaire.farm_name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${res.status}`);
    }
    const data = await res.json();
    return data.answer || '';
  };

  const handleGenerateInsights = async () => {
    if (!results) return;

    if (!canGenerateInsights()) {
      const remaining = Math.ceil(getRemainingTime() / 1000);
      onToast?.(`Aguarde ${remaining} segundos antes de gerar novos insights.`, 'info');
      return;
    }

    setInsightsLoading(true);
    setInsightsText(null);
    try {
      const answer = await requestInsights();
      setInsightsText(answer);
      onToast?.('Insights gerados com sucesso.', 'success');

      setTimeout(() => {
        insightsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, QUESTIONNAIRE_CONSTANTS.INSIGHTS_SCROLL_DELAY);

    } catch (e: any) {
      onToast?.(e.message || 'Erro ao gerar insights com IA.', 'error');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handlePrint = async () => {
    window.print();
  };

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-ai-accent" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="p-6 text-center text-ai-subtext">
        <p>Não foi possível calcular os resultados (sem respostas ou perguntas).</p>
        <button onClick={onClose} className="mt-4 text-ai-accent hover:underline">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <>
      <QuestionnaireResultsPrintView
        questionnaire={questionnaire}
        results={results}
        insightsText={insightsText}
      />

      {/* Loading Overlay for PDF Generation */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 z-[60] bg-white/90 flex flex-col items-center justify-center">
          <Loader2 size={48} className="animate-spin text-ai-accent mb-4" />
          <h2 className="text-xl font-bold text-ai-text mb-2">Gerando Relatório PDF...</h2>
          <p className="text-ai-subtext">Isso pode levar alguns segundos.</p>
        </div>
      )}

      <div className="questionnaire-results-dashboard h-full overflow-y-auto p-4 md:p-6 print:hidden">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft size={20} className="text-ai-subtext" />
              </button>
              <h1 className="text-xl font-bold text-ai-text">Diagnóstico de Performance</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 border border-blue-200"
                title="Baixar relatório PDF"
              >
                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download
              </button>

              {onSave && (
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium text-sm transition-colors border border-green-700"
                >
                  <Save size={16} />
                  Salvar
                </button>
              )}
            </div>
          </div>

          <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ai-text">Diagnóstico de Performance</h2>
              <p className="text-sm text-ai-subtext mt-1">
                Relatório consolidado de eficiência operacional e gestão estratégica.
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-ai-subtext">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {diagnosisDate}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  {results.totalQuestions} Pontos de Controle
                </span>
                <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                  <CheckCircle2 size={12} />
                  Salvo em Meus Salvos
                </span>
              </div>
              {questionnaire.farm_name && (
                <p className="text-sm text-ai-text mt-1 font-medium">Fazenda: {questionnaire.farm_name}</p>
              )}
            </div>
            <div className="shrink-0">
              <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 text-center min-w-[140px]">
                <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Nota Final</div>
                <div className="text-4xl font-bold text-green-700 mt-1">{results.finalScore}%</div>
              </div>
            </div>
          </header>

          <section id="section-kpi-cards" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['Gente', 'Gestão', 'Produção'] as const).map((groupName) => {
              const g = results.byGroup[groupName];
              if (!g) return null;
              const colors = GROUP_COLORS[groupName];
              return (
                <div
                  key={groupName}
                  className={`bg-white rounded-xl border ${colors.border} p-4 ${colors.bg}`}
                >
                  <h3 className="font-semibold text-ai-text uppercase text-sm">{groupName}</h3>
                  <div className={`text-2xl font-bold mt-1 ${colors.text}`}>{g.score}%</div>
                  <div className="mt-2 h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${g.score}%`, backgroundColor: colors.bar }}
                    />
                  </div>
                  <p className="text-xs text-ai-subtext mt-2">
                    Performance por Grupo · {g.categories.length} Categorias
                  </p>
                </div>
              );
            })}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div
              id="radar-operational"
              className="bg-white rounded-xl border border-ai-border p-4"
            >
              <h3 className="font-semibold text-ai-text mb-3 flex items-center gap-2">
                <Target size={18} className="text-green-600" />
                Equilíbrio Operacional
              </h3>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={results.radarData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Score']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              id="radar-categorical"
              className="bg-white rounded-xl border border-ai-border p-4"
            >
              <h3 className="font-semibold text-ai-text mb-3 flex items-center gap-2">
                <Target size={18} className="text-ai-accent" />
                Desempenho por Categoria
              </h3>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={[...results.byCategory]
                      .sort((a, b) => {
                        const groupOrder = { Gente: 0, Gestão: 1, Produção: 2 };
                        const ia = groupOrder[a.group as keyof typeof groupOrder] ?? 3;
                        const ib = groupOrder[b.group as keyof typeof groupOrder] ?? 3;
                        if (ia !== ib) return ia - ib;
                        return a.category.localeCompare(b.category);
                      })
                      .map((c) => ({
                        subject: c.category.length > 18 ? `${c.category.slice(0, 16)}…` : c.category,
                        fullSubject: `${c.group}: ${c.category}`,
                        score: c.score,
                        fullMark: 100,
                      }))}
                    margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
                  >
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#0ea5e9"
                      fill="#0ea5e9"
                      fillOpacity={0.35}
                      strokeWidth={1.5}
                    />
                    <Tooltip
                      formatter={(v: number, _name: string, props: { payload?: Array<{ payload?: { fullSubject?: string } }> }) => {
                        const label = props.payload?.[0]?.payload?.fullSubject ?? 'Score';
                        return [`${v}%`, label];
                      }}
                      contentStyle={{ fontSize: 12 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-4 text-xs text-ai-subtext">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              Excelente (&gt;90%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Bom (70–90%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              Regular (60–70%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              Ruim (40–60%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Crítico (0–40%)
            </span>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(['Gente', 'Gestão', 'Produção'] as const).map((groupName) => {
              const g = results.byGroup[groupName];
              if (!g) return null;
              const statusToBarColor: Record<string, string> = {
                Excelente: '#22c55e',
                Bom: '#f59e0b',
                Regular: '#eab308',
                Ruim: '#f97316',
                Crítico: '#ef4444',
              };
              const barData = [...g.categories]
                .sort((a, b) => b.score - a.score)
                .map((c) => ({
                  name: c.category,
                  score: c.score,
                  fill: statusToBarColor[c.status] ?? '#94a3b8',
                }));
              const colors = GROUP_COLORS[groupName];
              return (
                <div
                  key={groupName}
                  className="bg-white rounded-xl border border-ai-border p-4"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-semibold text-ai-text">Distribuição: {groupName}</h3>
                      <p className="text-xs text-ai-subtext">Visão comparativa entre as subcategorias do grupo.</p>
                    </div>
                    <span className={`text-sm font-bold ${colors.text}`}>Média {g.score}%</span>
                  </div>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${v}%`, 'Score']} />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                          {barData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="bg-white rounded-xl border border-ai-border overflow-hidden">
            <div className="px-4 py-3 border-b border-ai-border flex justify-between items-center">
              <h3 className="font-semibold text-ai-text">Tabela de Desempenho por Categoria</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ai-surface border-b border-ai-border">
                    <th className="px-4 py-3 text-left font-semibold text-ai-text uppercase">Grupo</th>
                    <th className="px-4 py-3 text-left font-semibold text-ai-text uppercase">Categoria</th>
                    <th className="px-4 py-3 text-left font-semibold text-ai-text uppercase">Score</th>
                    <th className="px-4 py-3 text-left font-semibold text-ai-text uppercase">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-ai-text uppercase">Progresso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ai-border">
                  {results.byCategory.map((row) => {
                    const style = STATUS_STYLES[row.status] ?? STATUS_STYLES.Crítico;
                    return (
                      <tr key={`${row.group}-${row.category}`} className="hover:bg-ai-surface/50">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 rounded text-xs font-medium ${GROUP_COLORS[row.group as keyof typeof GROUP_COLORS]?.bg || 'bg-gray-100'} ${GROUP_COLORS[row.group as keyof typeof GROUP_COLORS]?.text || 'text-gray-700'}`}
                          >
                            {row.group}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ai-text">{row.category}</td>
                        <td className="px-4 py-3 font-medium text-ai-text">{row.score}%</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 w-32">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${style.bar}`}
                              style={{ width: `${row.score}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            {/* Button Removed */}
            <button
              onClick={handleGenerateInsights}
              disabled={insightsLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover disabled:opacity-50 transition-colors"
            >
              {insightsLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} />
              )}
              Gerar Insights com IA
            </button>
          </div>

          {insightsText && (
            <section
              ref={insightsRef}
              className="bg-white rounded-xl border border-ai-border p-4"
            >
              <h3 className="font-semibold text-ai-text mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-ai-accent" />
                Análise e Recomendações (IA)
              </h3>
              <div className="prose prose-sm max-w-none text-ai-text whitespace-pre-wrap">{insightsText}</div>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default QuestionnaireResultsDashboard;
