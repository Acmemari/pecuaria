import React from 'react';
import { CalendarDays, CalendarRange, Calendar } from 'lucide-react';

const cards = [
  {
    id: 'rotina-semanal',
    title: 'Rotina Semanal',
    description: 'Rotinas e tarefas de acompanhamento semanal.',
    icon: <CalendarDays size={24} />,
  },
  {
    id: 'rotina-mensal',
    title: 'Rotina Mensal',
    description: 'Rotinas e tarefas de acompanhamento mensal.',
    icon: <CalendarRange size={24} />,
  },
  {
    id: 'rotina-trimestral',
    title: 'Rotina Trimestral',
    description: 'Rotinas e tarefas de acompanhamento trimestral.',
    icon: <Calendar size={24} />,
  },
];

const RotinasFazendaDesktop: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-8 md:p-12 max-w-7xl mx-auto">
      <header className="space-y-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Rotinas Fazenda</h1>
        <p className="text-sm text-gray-500 max-w-2xl">Rotinas de acompanhamento da fazenda</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => (
          <div
            key={card.id}
            className="group relative flex flex-col p-6 rounded-2xl border border-gray-200 bg-white text-left w-full opacity-90 pointer-events-none"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center justify-center text-gray-500">{card.icon}</div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-5">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RotinasFazendaDesktop;
