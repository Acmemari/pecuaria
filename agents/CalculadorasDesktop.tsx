import React, { useState, useCallback } from 'react';
import { ArrowLeftRight, Target, Star, CircleDollarSign, ClipboardCheck, MessageSquareText } from 'lucide-react';

type TabId = 'todos' | 'favoritos' | 'recentes';

interface CalculatorCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: () => void;
}

const CalculatorCard: React.FC<CalculatorCardProps> = ({
  id,
  title,
  description,
  icon,
  isFavorite,
  onToggleFavorite,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative flex flex-col p-6 rounded-2xl border border-gray-200 bg-white hover:border-gray-800 hover:shadow-sm transition-all duration-200 text-left w-full"
  >
    {/* Top row: icon left, star right */}
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center justify-center text-gray-500">
        {icon}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(id);
        }}
        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-amber-500 transition-colors shrink-0"
        aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      >
        <Star
          size={20}
          className={isFavorite ? 'fill-amber-400 text-amber-400' : ''}
        />
      </button>
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-xs text-gray-500 leading-relaxed line-clamp-5">
      {description}
    </p>
  </button>
);

interface CalculadorasDesktopProps {
  onSelectSimulator: () => void;
  onSelectComparador: () => void;
  onSelectPlanejamentoAgil?: () => void;
  onSelectAvaliacaoProtocolo?: () => void;
  onSelectFeedbackAgent?: () => void;
  showPlanejamentoAgil?: boolean;
}

const CalculadorasDesktop: React.FC<CalculadorasDesktopProps> = ({
  onSelectSimulator,
  onSelectComparador,
  onSelectPlanejamentoAgil,
  onSelectAvaliacaoProtocolo,
  onSelectFeedbackAgent,
  showPlanejamentoAgil = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('todos');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const baseCards = [
    {
      id: 'simulator',
      title: 'Rentabilidade na Engorda',
      description:
        'Descubra o resultado por cabeça, a Taxa Interna de Retorno (TIR), a produção por hectare e mais de uma dezena de indicadores estratégicos, ajustados automaticamente para cada cenário.',
      icon: (
        <div className="w-9 h-9 text-gray-500 flex items-center justify-center">
          <CircleDollarSign size={34} strokeWidth={2.2} />
        </div>
      ),
      onClick: onSelectSimulator,
    },
    {
      id: 'comparador',
      title: 'Comparador',
      description:
        'Compare cenários lado a lado com diferentes premissas. Visualize resultados e escolha a melhor estratégia para seu rebanho.',
      icon: <ArrowLeftRight size={24} />,
      onClick: onSelectComparador,
    },
  ];

  const planejamentoCard = showPlanejamentoAgil && onSelectPlanejamentoAgil
    ? {
        id: 'agile-planning',
        title: 'Planejamento Ágil',
        description:
          'Planejamento estratégico vinculado a cliente e fazenda. Defina metas, iniciativas e acompanhe o progresso.',
        icon: <Target size={24} />,
        onClick: onSelectPlanejamentoAgil,
      }
    : null;

  const avaliacaoCard = onSelectAvaliacaoProtocolo
    ? {
        id: 'avaliacao-protocolo',
        title: 'Avaliação Protocolo 5-3-9',
        description:
          'Avaliação completa nas dimensões Gente, Gestão e Produção. Diagnóstico estruturado para identificar pontos fortes e oportunidades de melhoria na operação pecuária.',
        icon: <ClipboardCheck size={24} />,
        onClick: onSelectAvaliacaoProtocolo,
      }
    : null;

  const feedbackCard = onSelectFeedbackAgent
    ? {
        id: 'feedback-agent',
        title: 'Assistente de Feedback',
        description:
          'Crie feedbacks construtivos com tom adequado e estruturas profissionais como SBI, Sanduíche e Feedforward.',
        icon: <MessageSquareText size={24} />,
        onClick: onSelectFeedbackAgent,
      }
    : null;

  const cards = [
    ...baseCards,
    ...(planejamentoCard ? [planejamentoCard] : []),
    ...(avaliacaoCard ? [avaliacaoCard] : []),
    ...(feedbackCard ? [feedbackCard] : []),
  ];

  const filteredCards =
    activeTab === 'favoritos'
      ? cards.filter((c) => favoriteIds.has(c.id))
      : cards;

  return (
    <div className="h-full flex flex-col p-8 md:p-12 max-w-7xl mx-auto">
      {/* Tabs: Todos, Favoritos, Recentes */}
      <div className="flex gap-1 mb-8">
        {(
          [
            { id: 'todos' as TabId, label: 'Todos' },
            { id: 'favoritos' as TabId, label: 'Favoritos' },
            { id: 'recentes' as TabId, label: 'Recentes' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-gray-100 text-gray-900 border-b-2 border-gray-900'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid de cards - 3 colunas como na imagem */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCards.length === 0 ? (
          <p className="text-sm text-gray-500 col-span-full py-8">
            {activeTab === 'favoritos'
              ? 'Nenhuma calculadora nos favoritos. Clique na estrela de um card para adicionar.'
              : 'Nenhum item recente.'}
          </p>
        ) : (
          filteredCards.map((card) => (
            <CalculatorCard
              key={card.id}
              id={card.id}
              title={card.title}
              description={card.description}
              icon={card.icon}
              isFavorite={favoriteIds.has(card.id)}
              onToggleFavorite={toggleFavorite}
              onClick={card.onClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CalculadorasDesktop;
