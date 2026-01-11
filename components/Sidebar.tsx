import React, { useState, useEffect } from 'react';
import { Agent, User } from '../types';
import { useLocation } from '../contexts/LocationContext';
import {
  Calculator,
  TrendingUp,
  Sprout,
  Settings,

  Lock,
  LogOut,
  Users,
  X,
  Save,
  Brain,
  Building2,
  FileCheck,
  ChevronDown
} from 'lucide-react';

interface SidebarProps {
  agents: Agent[];
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  user: User | null;
  onLogout: () => void;
  onSettingsClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ agents, activeAgentId, onSelectAgent, isOpen, toggleSidebar, user, onLogout, onSettingsClick }) => {
  const { country, setCountry } = useLocation();
  const [isQuestionnairesOpen, setIsQuestionnairesOpen] = useState(false);
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);

  // Função para carregar questionários (estrutura básica)
  useEffect(() => {
    // Questionário pré-cadastrado "Gente/Gestão/Produção"
    setQuestionnaires([
      {
        id: 'gente-gestao-producao',
        name: 'Gente/Gestão/Produção',
        description: 'Questionário completo de avaliação'
      }
    ]);
  }, []);

  // Encontrar o índice do "Cadastro de Fazendas" para inserir "Questionários" logo após
  const farmManagementIndex = agents.findIndex(agent => agent.id === 'farm-management');

  return (
    <>
      {/* Overlay - visible on mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <div className={`
        fixed top-0 left-0 h-full bg-ai-surface border-r border-ai-border z-30 transition-all duration-300 ease-in-out flex flex-col shadow-lg
        ${isOpen
          ? 'w-56 translate-x-0'
          : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'
        }
      `}>
        {/* Header */}
        <div className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-ai-border bg-ai-bg">
          <div className="flex items-center space-x-2 text-ai-text">
            <span className="font-bold tracking-tight text-base">pecuarIA</span>
            {/* Bandeira do Brasil */}
            <button
              onClick={() => setCountry('BR')}
              className={`flex-shrink-0 transition-opacity ${country === 'BR' ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
              title="Brasil"
            >
              <svg width="20" height="14" viewBox="0 0 20 14" className="flex-shrink-0 cursor-pointer" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="14" fill="#009739"/>
                <path d="M10 0L20 7L10 14L0 7Z" fill="#FEDD00"/>
                <circle cx="10" cy="7" r="4.5" fill="#012169"/>
              </svg>
            </button>
            {/* Bandeira do Paraguai */}
            <button
              onClick={() => setCountry('PY')}
              className={`flex-shrink-0 transition-opacity ${country === 'PY' ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
              title="Paraguai"
            >
              <svg width="20" height="14" viewBox="0 0 20 14" className="flex-shrink-0 cursor-pointer" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="4.67" y="0" fill="#CE1126"/>
                <rect width="20" height="4.67" y="4.67" fill="#FFFFFF"/>
                <rect width="20" height="4.66" y="9.34" fill="#0038A8"/>
              </svg>
            </button>
          </div>
          {/* Close button - visible on mobile, hidden on desktop when sidebar is always visible */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1.5 text-ai-subtext hover:text-ai-text hover:bg-ai-surface rounded transition-colors"
            aria-label="Fechar menu"
            title="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <span className="text-[10px] font-bold text-ai-subtext uppercase tracking-widest">
              Ferramentas
            </span>
          </div>

          <nav className="space-y-0.5 px-2">
            {agents.map((agent, index) => {
              const isActive = activeAgentId === agent.id;
              const isLocked = agent.status !== 'active';

              return (
                <React.Fragment key={agent.id}>
                  <button
                    onClick={() => !isLocked && onSelectAgent(agent.id)}
                    disabled={isLocked}
                    className={`
                      w-full flex items-center px-3 py-2 rounded-md transition-all relative group
                      ${isActive
                        ? 'bg-ai-accent/10 text-ai-accent'
                        : 'text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text'
                      }
                      ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    title={agent.name}
                  >
                    <div className={`flex-shrink-0 ${isActive ? 'text-ai-accent' : 'text-ai-subtext group-hover:text-ai-text'}`}>
                      {agent.icon === 'calculator' && <Calculator size={16} />}
                      {agent.icon === 'save' && <Save size={16} />}
                      {agent.icon === 'chart' && <TrendingUp size={16} />}
                      {agent.icon === 'nutrition' && <Sprout size={16} />}
                      {agent.icon === 'users' && <Users size={16} />}
                      {agent.icon === 'brain' && <Brain size={16} />}
                      {agent.icon === 'farm' && <Building2 size={16} />}
                    </div>

                    <span className="ml-3 text-sm font-medium block text-left truncate">{agent.name}</span>

                    {isLocked && (
                      <Lock size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-ai-subtext/50" />
                    )}
                  </button>

                  {/* Inserir Questionários logo após Cadastro de Fazendas */}
                  {agent.id === 'farm-management' && (
                    <div className="space-y-0.5">
                      <button
                        onClick={() => setIsQuestionnairesOpen(!isQuestionnairesOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md transition-all text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text cursor-pointer group"
                        title="Questionários"
                      >
                        <div className="flex items-center">
                          <FileCheck size={16} className="flex-shrink-0 text-ai-subtext group-hover:text-ai-text" />
                          <span className="ml-3 text-sm font-medium block text-left truncate">Questionários</span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${isQuestionnairesOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Submenu de Questionários */}
                      {isQuestionnairesOpen && (
                        <div className="ml-4 space-y-0.5 border-l border-ai-border pl-2">
                          {questionnaires.length > 0 ? (
                            questionnaires.map((questionnaire) => (
                              <button
                                key={questionnaire.id}
                                onClick={() => {
                                  onSelectAgent(`questionnaire-${questionnaire.id}`);
                                }}
                                className={`w-full flex items-center px-2 py-1.5 rounded-md transition-all text-xs ${activeAgentId === `questionnaire-${questionnaire.id}`
                                  ? 'bg-ai-accent/10 text-ai-accent'
                                  : 'text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text'
                                  }`}
                              >
                                <span className="truncate">{questionnaire.name || questionnaire.title}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-xs text-ai-subtext italic">
                              Nenhum questionário
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Footer */}
        <div className="p-3 border-t border-ai-border bg-ai-bg shrink-0">
          {user && (
            <div className="mb-3 px-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-ai-text text-white flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-ai-text truncate">{user.name}</p>
                {user.role === 'admin' && (
                  <p className="text-[10px] text-ai-subtext truncate capitalize">Administrador</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={onSettingsClick}
              className="flex items-center justify-center p-2 text-ai-subtext hover:text-ai-text hover:bg-ai-surface2 rounded-md transition-colors"
              title="Configurações"
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center justify-center p-2 text-ai-subtext hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;