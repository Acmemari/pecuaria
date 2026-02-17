import React from 'react';
import { Building2, Users, UserCircle, Package } from 'lucide-react';

interface CadastroCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const CadastroCard: React.FC<CadastroCardProps> = ({
  title,
  description,
  icon,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative flex flex-col p-6 rounded-2xl border border-gray-200 bg-white hover:border-gray-800 hover:shadow-sm transition-all duration-200 text-left w-full"
  >
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center justify-center text-gray-500">
        {icon}
      </div>
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-xs text-gray-500 leading-relaxed line-clamp-5">
      {description}
    </p>
  </button>
);

interface CadastrosDesktopProps {
  onSelectFazendas: () => void;
  onSelectClientes?: () => void;
  onSelectPessoas: () => void;
  onSelectEntregas: () => void;
  showClientes?: boolean;
}

const CadastrosDesktop: React.FC<CadastrosDesktopProps> = ({
  onSelectFazendas,
  onSelectClientes,
  onSelectPessoas,
  onSelectEntregas,
  showClientes = false,
}) => {
  const cards = [
    {
      id: 'fazendas',
      title: 'Cadastro de Fazendas',
      description:
        'Gerencie propriedades rurais, dados da fazenda e configurações por cliente.',
      icon: <Building2 size={24} />,
      onClick: onSelectFazendas,
    },
    {
      id: 'pessoas',
      title: 'Cadastro de Pessoas',
      description:
        'Colaboradores, consultores, fornecedores e clientes familiares.',
      icon: <UserCircle size={24} />,
      onClick: onSelectPessoas,
    },
    {
      id: 'entregas',
      title: 'Cadastro de Entregas',
      description:
        'Cadastre entregas para vincular nas iniciativas de gestão do projeto.',
      icon: <Package size={24} />,
      onClick: onSelectEntregas,
    },
    ...(showClientes && onSelectClientes
      ? [
          {
            id: 'clientes',
            title: 'Gestão de Clientes',
            description:
              'Cadastre e gerencie clientes, vinculando fazendas e acompanhando o relacionamento.',
            icon: <Users size={24} />,
            onClick: onSelectClientes,
          },
        ]
      : []),
  ];

  return (
    <div className="h-full flex flex-col p-8 md:p-12 max-w-7xl mx-auto">
      <header className="space-y-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
          Cadastros
        </h1>
        <p className="text-sm text-gray-500 max-w-2xl">
          Escolha um bloco para gerenciar fazendas, clientes e pessoas.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <CadastroCard
            key={card.id}
            title={card.title}
            description={card.description}
            icon={card.icon}
            onClick={card.onClick}
          />
        ))}
      </div>
    </div>
  );
};

export default CadastrosDesktop;
