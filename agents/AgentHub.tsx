import React from 'react';
import {
    Sprout,
    Calendar,
    TrendingDown,
    ArrowRight,
    BrainCircuit,
    ShieldCheck,
    Coins
} from 'lucide-react';

interface AgentCardProps {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    onSelect: (id: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ id, name, description, icon, color, onSelect }) => (
    <button
        onClick={() => onSelect(id)}
        className="group relative flex flex-col p-6 rounded-2xl border border-ai-border bg-ai-surface hover:bg-ai-surface2 hover:border-ai-accent/30 transition-all duration-300 text-left overflow-hidden"
    >
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300`}>
            {icon}
        </div>
        <h3 className="text-lg font-bold text-ai-text mb-2">{name}</h3>
        <p className="text-sm text-ai-subtext leading-relaxed">
            {description}
        </p>
        <div className="mt-6 flex items-center text-xs font-semibold text-ai-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            INICIAR AGENTE <ArrowRight size={14} className="ml-1" />
        </div>

        {/* Subtle Background Pattern */}
        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300">
            {icon}
        </div>
    </button>
);

interface AgentHubProps {
    onSelectAgent: (id: string) => void;
}

const AgentHub: React.FC<AgentHubProps> = ({ onSelectAgent }) => {
    const specializedAgents = [
        {
            id: 'agent-soil',
            name: 'Interpretação de Solo',
            description: 'Análise técnica de laudos para recomendações de calagem e adubação.',
            icon: <Sprout size={24} className="text-emerald-500" />,
            color: 'bg-emerald-500/10',
        },
        {
            id: 'agent-sanitary',
            name: 'Calendário Sanitário',
            description: 'Geração de cronogramas inteligentes de vacinação e manejo de rebanhos.',
            icon: <ShieldCheck size={24} className="text-blue-500" />,
            color: 'bg-blue-500/10',
        },
        {
            id: 'agent-debt',
            name: 'Análise de Endividamento',
            description: 'Diagnóstico de saúde financeira e sustentabilidade do capital da fazenda.',
            icon: <Coins size={24} className="text-amber-500" />,
            color: 'bg-amber-500/10',
        }
    ];

    return (
        <div className="h-full flex flex-col p-8 md:p-12 max-w-7xl mx-auto space-y-12">
            <header className="space-y-4">
                <div className="flex items-center gap-2 text-ai-accent font-bold tracking-widest uppercase text-xs">
                    <BrainCircuit size={16} />
                    Hub de Agentes Especialistas
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-ai-text tracking-tight">
                    Como o <span className="text-ai-accent">Antonio</span> pode te ajudar hoje?
                </h1>
                <p className="text-lg text-ai-subtext max-w-2xl leading-relaxed">
                    Selecione um assistente especializado para analisar dados complexos e gerar planos de ação automatizados para seus clientes.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {specializedAgents.map(agent => (
                    <AgentCard
                        key={agent.id}
                        {...agent}
                        onSelect={onSelectAgent}
                    />
                ))}
            </div>

            {/* Placeholder for Quick Stats or Recent Activity */}
            <div className="mt-auto pt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 rounded-3xl bg-slate-900 text-white overflow-hidden relative border border-slate-800">
                    <div className="relative z-10">
                        <h4 className="text-emerald-400 font-bold text-sm tracking-widest uppercase mb-4">Dica de Consultoria</h4>
                        <p className="text-xl text-slate-200 leading-relaxed font-medium">
                            "Agentes de IA reduzem o tempo de escritório em até 40%, permitindo que você foque mais na visita técnica de campo."
                        </p>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                </div>

                <div className="p-8 rounded-3xl border border-ai-border bg-ai-surface2/50 flex flex-col justify-center">
                    <h4 className="text-ai-subtext font-bold text-sm tracking-widest uppercase mb-2">Próximas Evoluções</h4>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-ai-text">
                            <div className="w-1.5 h-1.5 rounded-full bg-ai-accent" />
                            <span className="text-sm font-medium">Agente de Bem-Estar Animal</span>
                        </li>
                        <li className="flex items-center gap-3 text-ai-text">
                            <div className="w-1.5 h-1.5 rounded-full bg-ai-accent opacity-50" />
                            <span className="text-sm font-medium">Agente de Cerca Inteligente</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AgentHub;
