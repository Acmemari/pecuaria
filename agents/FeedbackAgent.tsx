import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, RefreshCcw, Wand2, MessageSquareText } from 'lucide-react';
import type { FeedbackInput, FeedbackOutput } from '../api/_lib/agents/feedback/manifest';

interface FeedbackAgentProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const INITIAL_FORM: FeedbackInput = {
  context: 'trabalho',
  feedbackType: 'construtivo',
  objective: '',
  recipient: '',
  tone: 'motivador',
  format: 'escrito',
  model: 'auto',
  existingText: '',
  lengthPreference: 'medio',
};

const fieldClass =
  'w-full rounded-lg border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text outline-none focus:ring-2 focus:ring-ai-accent/30';

const FeedbackAgent: React.FC<FeedbackAgentProps> = ({ onToast }) => {
  const [form, setForm] = useState<FeedbackInput>(INITIAL_FORM);
  const [result, setResult] = useState<FeedbackOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const canSubmit = useMemo(() => {
    return form.objective.trim().length >= 5 && form.recipient.trim().length >= 2 && !loading;
  }, [form.objective, form.recipient, loading]);

  const handleGenerate = async () => {
    if (!canSubmit) {
      onToast?.('Preencha objetivo e destinatário para gerar o feedback.', 'warning');
      return;
    }
    setLoading(true);
    setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/feedback-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      // Some dev/proxy failures can return empty or non-JSON bodies.
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao gerar feedback.');
      }
      if (!data?.data) {
        throw new Error('Resposta inválida da API de feedback.');
      }
      setResult(data.data as FeedbackOutput);
      onToast?.('Feedback gerado com sucesso.', 'success');
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return;
      }
      const parseMessage =
        e instanceof SyntaxError
          ? 'A API retornou uma resposta inválida. Verifique se o servidor de API está ativo.'
          : null;
      const message = parseMessage || e?.message || 'Erro inesperado ao gerar feedback.';
      setError(message);
      onToast?.(message, 'error');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.feedback) return;
    try {
      await navigator.clipboard.writeText(result.feedback);
      onToast?.('Feedback copiado para a área de transferência.', 'success');
    } catch {
      onToast?.('Não foi possível copiar automaticamente.', 'warning');
    }
  };

  const resetForm = () => {
    setResult(null);
    setError(null);
    setForm(INITIAL_FORM);
  };

  return (
    <div className="h-full overflow-y-auto bg-ai-bg">
      <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-ai-subtext mb-1">Assistentes &gt; Feedback</div>
          <h1 className="text-2xl font-bold text-ai-text">Assistente de Feedback</h1>
          <p className="text-sm text-ai-subtext mt-2 max-w-3xl">
            Estruture feedbacks construtivos com tom adequado, linguagem respeitosa e modelos profissionais
            (SBI, Sanduíche e Feedforward).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="block text-sm text-ai-text">Contexto</label>
            <select
              className={fieldClass}
              value={form.context}
              onChange={(e) => setForm((p) => ({ ...p, context: e.target.value as FeedbackInput['context'] }))}
            >
              <option value="trabalho">Trabalho</option>
              <option value="escola">Escola</option>
              <option value="lideranca">Liderança</option>
              <option value="cliente">Cliente</option>
              <option value="pessoal">Pessoal</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="block text-sm text-ai-text">Tipo de feedback</label>
            <select
              className={fieldClass}
              value={form.feedbackType}
              onChange={(e) => setForm((p) => ({ ...p, feedbackType: e.target.value as FeedbackInput['feedbackType'] }))}
            >
              <option value="positivo">Positivo</option>
              <option value="construtivo">Construtivo</option>
              <option value="misto">Misto</option>
            </select>
          </div>

          <div className="space-y-3 lg:col-span-2">
            <label className="block text-sm text-ai-text">Objetivo do feedback</label>
            <textarea
              className={fieldClass}
              rows={3}
              value={form.objective}
              onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))}
              placeholder="Ex: reforçar pontos fortes e alinhar melhoria na comunicação com o time."
            />
          </div>

          <div className="space-y-3 lg:col-span-2">
            <label className="block text-sm text-ai-text">Quem receberá o feedback?</label>
            <input
              className={fieldClass}
              value={form.recipient}
              onChange={(e) => setForm((p) => ({ ...p, recipient: e.target.value }))}
              placeholder="Ex: Coordenador júnior, analista pleno, estagiário, cliente..."
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-ai-text">Tom</label>
            <select
              className={fieldClass}
              value={form.tone}
              onChange={(e) => setForm((p) => ({ ...p, tone: e.target.value as FeedbackInput['tone'] }))}
            >
              <option value="formal">Formal</option>
              <option value="direto">Direto</option>
              <option value="motivador">Motivador</option>
              <option value="tecnico">Técnico</option>
              <option value="informal">Informal</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-ai-text">Formato</label>
            <select
              className={fieldClass}
              value={form.format}
              onChange={(e) => setForm((p) => ({ ...p, format: e.target.value as FeedbackInput['format'] }))}
            >
              <option value="escrito">Escrito</option>
              <option value="falado">Falado</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-ai-text">Estrutura</label>
            <select
              className={fieldClass}
              value={form.model}
              onChange={(e) => setForm((p) => ({ ...p, model: e.target.value as FeedbackInput['model'] }))}
            >
              <option value="auto">Automático</option>
              <option value="sbi">SBI</option>
              <option value="sanduiche">Sanduíche</option>
              <option value="feedforward">Feedforward</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-ai-text">Tamanho</label>
            <select
              className={fieldClass}
              value={form.lengthPreference}
              onChange={(e) => setForm((p) => ({ ...p, lengthPreference: e.target.value as FeedbackInput['lengthPreference'] }))}
            >
              <option value="curto">Curto</option>
              <option value="medio">Médio</option>
              <option value="longo">Longo</option>
            </select>
          </div>

          <div className="space-y-3 lg:col-span-2">
            <label className="block text-sm text-ai-text">Feedback existente (opcional)</label>
            <textarea
              className={fieldClass}
              rows={4}
              value={form.existingText}
              onChange={(e) => setForm((p) => ({ ...p, existingText: e.target.value }))}
              placeholder="Cole aqui um feedback já escrito para melhorar o tom, estrutura e clareza."
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-ai-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Wand2 size={16} />
            {loading ? 'Gerando...' : 'Gerar feedback'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-2 rounded-lg border border-ai-border bg-ai-surface px-4 py-2 text-sm text-ai-text hover:bg-ai-surface2"
          >
            Limpar
          </button>
        </div>

        {result && (
          <section className="rounded-xl border border-ai-border bg-ai-surface p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquareText size={18} className="text-ai-accent" />
                <h2 className="text-lg font-semibold text-ai-text">Feedback gerado</h2>
              </div>
              <span className="rounded-full bg-ai-accent/10 px-3 py-1 text-xs font-semibold text-ai-accent">
                {result.structure}
              </span>
            </div>

            <div className="rounded-lg border border-ai-border bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              {result.feedback}
            </div>

            {result.tips?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-ai-text">Dicas práticas</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-ai-subtext">
                  {result.tips.map((tip, idx) => (
                    <li key={`${tip}-${idx}`}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-lg border border-ai-border bg-ai-bg px-3 py-2 text-sm text-ai-text hover:bg-ai-surface2"
              >
                <Copy size={15} />
                Copiar
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-ai-border bg-ai-bg px-3 py-2 text-sm text-ai-text hover:bg-ai-surface2 disabled:opacity-50"
              >
                <RefreshCcw size={15} />
                Gerar novamente
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default FeedbackAgent;

