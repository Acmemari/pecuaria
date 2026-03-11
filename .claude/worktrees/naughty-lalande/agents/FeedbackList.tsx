import React, { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { getSavedFeedbacks, type SavedFeedback } from '../lib/feedbacks';

interface FeedbackListProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const FeedbackList: React.FC<FeedbackListProps> = ({ onToast }) => {
  const [items, setItems] = useState<SavedFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await getSavedFeedbacks();
        setItems(list);
      } catch (e: any) {
        const message = e?.message || 'Erro ao carregar feedbacks salvos.';
        onToast?.(message, 'error');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [onToast]);

  if (loading) {
    return <div className="h-full flex items-center justify-center text-ai-subtext">Carregando feedbacks...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-ai-bg">
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-ai-subtext mb-1">RH &gt; Feedback</div>
          <h1 className="text-2xl font-bold text-ai-text">Feedbacks Salvos</h1>
          <p className="text-sm text-ai-subtext mt-2">
            Aqui ficam disponíveis os feedbacks que você ofereceu e os feedbacks recebidos por você.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-ai-border bg-ai-surface p-6 text-sm text-ai-subtext">
            Nenhum feedback salvo até o momento.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const isOpen = selectedId === item.id;
              return (
                <article key={item.id} className="rounded-xl border border-ai-border bg-ai-surface p-4">
                  <button
                    type="button"
                    onClick={() => setSelectedId(prev => (prev === item.id ? null : item.id))}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-ai-text">
                          <MessageSquareText size={16} className="text-ai-accent" />
                          <span className="font-semibold truncate">{item.recipient_name}</span>
                        </div>
                        <p className="text-xs text-ai-subtext">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')} • {item.context} •{' '}
                          {item.feedback_type} • {item.generated_structure}
                        </p>
                        <p className="text-sm text-ai-subtext line-clamp-2">{item.generated_feedback}</p>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-ai-border space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <p className="text-ai-subtext">
                          <span className="text-ai-text font-semibold">Objetivo:</span> {item.objective}
                        </p>
                        <p className="text-ai-subtext">
                          <span className="text-ai-text font-semibold">Estrutura:</span> {item.generated_structure}
                        </p>
                      </div>
                      <div className="rounded-lg border border-ai-border bg-white px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                        {item.generated_feedback}
                      </div>
                      {item.tips?.length > 0 && (
                        <ul className="list-disc pl-5 space-y-1 text-sm text-ai-subtext">
                          {item.tips.map((tip, idx) => (
                            <li key={`${item.id}-${idx}`}>{tip}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackList;
