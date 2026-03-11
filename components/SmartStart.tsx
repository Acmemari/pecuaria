import React from 'react';
import { Package, Smartphone, CreditCard, ArrowRight } from 'lucide-react';
import ProdutoCadastroModal from './ProdutoCadastroModal';
import ContaCadastroModal from './ContaCadastroModal';

interface SmartStartCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick?: () => void;
  color: string;
  children?: React.ReactNode;
}

const SmartStartCard: React.FC<SmartStartCardProps> = ({ title, description, icon: Icon, onClick, color, children }) => (
  <div
    className="group relative flex flex-col p-8 rounded-2xl bg-[#37404E] border border-[#5E6D82]/30 hover:border-emerald-500/50 transition-all duration-300 text-left w-full shadow-lg overflow-hidden"
  >
    {/* Decorative background element */}
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${color}`} />
    
    <div className="flex items-center justify-between mb-6">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-ai-text group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={28} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
    
    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{title}</h3>
    <p className="text-sm text-gray-400 leading-relaxed mb-6">{description}</p>
    
    {children}

    {!children && onClick && (
      <button
        onClick={onClick}
        className="mt-auto flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-[0.2em] hover:text-emerald-400 transition-colors group/btn"
      >
        <span>Começar Agora</span>
        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
      </button>
    )}
  </div>
);

const SmartStart: React.FC = () => {
  const [isProdutoModalOpen, setIsProdutoModalOpen] = React.useState(false);
  const [isContaModalOpen, setIsContaModalOpen] = React.useState(false);

  const productOptions = [
    { id: 'smart-list', title: 'Lista Inteligente de Produtos', color: 'hover:text-emerald-400' },
    { id: 'suppliers', title: 'Seleção por Fornecedores', color: 'hover:text-blue-400' },
    { id: 'history', title: 'Inclusão do Meu Histórico', color: 'hover:text-purple-400' },
    { id: 'recommended', title: 'Recomendado para Você', color: 'hover:text-orange-400' },
  ];

  return (
    <div className="h-full flex flex-col p-8 md:p-12 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Smartphone size={18} className="text-white" />
          </div>
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-[0.2em]">Configuração Rápida</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">Smart Start</h1>
        <p className="text-lg text-gray-400 max-w-2xl font-medium leading-relaxed">
          Bem-vindo ao Inttegra. Vamos configurar os pilares fundamentais para a gestão financeira da sua operação. Queremos que o sistema Inttegra trabalhe para você e não você para ele.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <SmartStartCard
          title="Cadastro Inicial de Produtos"
          description="Registre os insumos, suplementos, grãos e volumosos que compõem sua operação."
          icon={Package}
          color="bg-emerald-500"
        >
          <div className="space-y-2 mt-2">
            {productOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setIsProdutoModalOpen(true)}
                className={`w-full flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 text-sm font-semibold text-gray-300 ${opt.color} hover:bg-white/5 transition-all group/opt`}
              >
                <span>{opt.title}</span>
                <ArrowRight size={14} className="opacity-0 group-hover/opt:opacity-100 group-hover/opt:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </SmartStartCard>

        <SmartStartCard
          title="Cadastro Inicial de Contas"
          description="Configure suas contas bancárias, caixas e contas correntes para iniciar o acompanhamento de fluxo de caixa."
          icon={CreditCard}
          color="bg-blue-500"
          onClick={() => setIsContaModalOpen(true)}
        />
      </div>

      <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-[#2A3441] to-[#1A212E] border border-white/5 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-bold mb-1">Próximos Passos</h4>
          <p className="text-sm text-gray-400">Após os cadastros iniciais, você poderá realizar movimentações financeiras e visualizar relatórios detalhados.</p>
        </div>
      </div>

      <ProdutoCadastroModal
        open={isProdutoModalOpen}
        onClose={() => setIsProdutoModalOpen(false)}
      />
      
      <ContaCadastroModal
        open={isContaModalOpen}
        onClose={() => setIsContaModalOpen(false)}
      />
    </div>
  );
};

export default SmartStart;
