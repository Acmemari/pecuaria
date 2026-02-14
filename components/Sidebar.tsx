import React, { useState, useEffect } from 'react';
import { Agent, User } from '../types';
import { useLocation } from '../contexts/LocationContext';
import { APP_VERSION } from '../src/version';
import {
  Calculator,
  TrendingUp,
  Sprout,
  Settings,
  Lock,
  LogOut,
  Users,
  UserCircle,
  X,
  Save,
  Brain,
  Building2,
  FileCheck,
  ChevronDown,
  Target,
  FolderOpen,
  FolderPlus,
  LayoutDashboard,
  ListTodo,
  Calendar
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

const INICIATIVAS_OVERVIEW_ID = 'iniciativas-overview';
const INICIATIVAS_ATIVIDADES_ID = 'iniciativas-atividades';
const isIniciativasView = (id: string) => id === INICIATIVAS_OVERVIEW_ID || id === INICIATIVAS_ATIVIDADES_ID;

const CADASTROS_FARM_ID = 'farm-management';
const CADASTROS_CLIENTS_ID = 'client-management';
const CADASTROS_PEOPLE_ID = 'people-management';
const isCadastrosView = (id: string) =>
  id === CADASTROS_FARM_ID || id === CADASTROS_CLIENTS_ID || id === CADASTROS_PEOPLE_ID;

interface Questionnaire {
  id: string;
  name: string;
  description?: string;
  title?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ agents, activeAgentId, onSelectAgent, isOpen, toggleSidebar, user, onLogout, onSettingsClick }) => {
  const { country, setCountry } = useLocation();
  const [isQuestionnairesOpen, setIsQuestionnairesOpen] = useState(false);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [isIniciativasOpen, setIsIniciativasOpen] = useState(() => isIniciativasView(activeAgentId));
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(() => isCadastrosView(activeAgentId));

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

  // Manter submenu Iniciativas aberto quando um filho estiver ativo
  useEffect(() => {
    if (isIniciativasView(activeAgentId)) setIsIniciativasOpen(true);
  }, [activeAgentId]);

  // Manter submenu Cadastros aberto quando um filho estiver ativo
  useEffect(() => {
    if (isCadastrosView(activeAgentId)) setIsCadastrosOpen(true);
  }, [activeAgentId]);



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
          {/* Bandeiras BR e PY */}
          <div className="px-4 mb-3 flex items-center justify-start gap-2">
            {/* Bandeira do Brasil */}
            <button
              onClick={() => setCountry('BR')}
              className={`flex items-center gap-1.5 flex-shrink-0 transition-all duration-200 ${country === 'BR' ? 'opacity-100 scale-[1.2]' : 'opacity-50 hover:opacity-75 scale-[0.72]'}`}
              title="Brasil"
            >
              <svg width="20" height="14" viewBox="0 0 20 14" className="flex-shrink-0 cursor-pointer" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="14" fill="#009739" />
                <path d="M10 0L20 7L10 14L0 7Z" fill="#FEDD00" />
                <circle cx="10" cy="7" r="4.5" fill="#012169" />
              </svg>
              <span className="text-[8px] font-semibold">BR</span>
            </button>
            {/* Bandeira do Paraguai */}
            <button
              onClick={() => setCountry('PY')}
              className={`flex items-center gap-1.5 flex-shrink-0 transition-all duration-200 ${country === 'PY' ? 'opacity-100 scale-[1.2]' : 'opacity-50 hover:opacity-75 scale-[0.72]'}`}
              title="Paraguai"
            >
              <svg width="20" height="14" viewBox="0 0 20 14" className="flex-shrink-0 cursor-pointer" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="4.67" y="0" fill="#CE1126" />
                <rect width="20" height="4.67" y="4.67" fill="#FFFFFF" />
                <rect width="20" height="4.66" y="9.34" fill="#0038A8" />
              </svg>
              <span className="text-[8px] font-semibold">PY</span>
            </button>
          </div>
          <div className="px-4 mb-2">
            <span className="text-[10px] font-bold text-ai-subtext uppercase tracking-widest">
              Ferramentas
            </span>
          </div>

          <nav className="space-y-0.5 px-2">
            {/* Cadastros (menu retrátil: Cadastro de Fazendas + Gestão de Clientes) – primeiro item */}
            <div className="space-y-0.5 mb-1">
              <button
                type="button"
                onClick={() => setIsCadastrosOpen(!isCadastrosOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 text-left cursor-pointer group ${isCadastrosView(activeAgentId)
                    ? 'bg-ai-accent/5 text-ai-accent'
                    : 'text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text'
                  }`}
                title="Cadastros"
              >
                <div className="flex items-center">
                  <FolderPlus size={16} className="flex-shrink-0 text-ai-subtext group-hover:text-ai-text" />
                  <span className="ml-3 text-sm font-medium block truncate">Cadastros</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`flex-shrink-0 transition-transform duration-200 ${isCadastrosOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isCadastrosOpen && (
                <div className="ml-4 space-y-0.5 border-l border-ai-border pl-2 overflow-hidden transition-all duration-200">
                  {(() => {
                    const farmAgent = agents.find((a) => a.id === CADASTROS_FARM_ID);
                    const clientAgent = agents.find((a) => a.id === CADASTROS_CLIENTS_ID);
                    const peopleAgent = agents.find((a) => a.id === CADASTROS_PEOPLE_ID);
                    const farmLocked = farmAgent?.status !== 'active';
                    const clientLocked = clientAgent?.status !== 'active';
                    const peopleLocked = peopleAgent?.status !== 'active';
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => !farmLocked && onSelectAgent(CADASTROS_FARM_ID)}
                          disabled={farmLocked}
                          className={`w-full flex items-center px-2 py-1.5 rounded-md transition-all text-xs ${activeAgentId === CADASTROS_FARM_ID
                              ? 'bg-ai-accent/10 text-ai-accent'
                              : 'text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text'
                            } ${farmLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <Building2 size={14} className="flex-shrink-0 mr-2" />
                          <span className="truncate">Cadastro de Fazendas</span>
                          {farmLocked && <Lock size={10} className="ml-auto flex-shrink-0 text-ai-subtext/50" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => !clientLocked && onSelectAgent(CADASTROS_CLIENTS_ID)}
                          disabled={clientLocked}
                          className={`w-full flex items-center px-2 py-1.5 rounded-md transition-all text-xs ${activeAgentId === CADASTROS_CLIENTS_ID
                              ? 'bg-ai-accent/10 text-ai-accent'
                              : 'text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text'
                            } ${clientLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <Users size={14} className="flex-shrink-0 mr-2" />
                          <span className="truncate">Gestão de Clientes</span>
                          {clientLocked && <Lock size={10} className="ml-auto flex-shrink-0 text-ai-subtext/50" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => !peopleLocked && onSelectAgent(CADASTROS_PEOPLE_ID)}
                          disabled={peopleLocked}
                          className={`w-full flex items-center px-2 py-1.5 rounded-md transition-all text-xs ${activeAgentId === CADASTROS_PEOPLE_ID
                              ? 'bg-ai-accent/10 text-ai-accent'
                              : 'text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text'
                            } ${peopleLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <UserCircle size={14} className="flex-shrink-0 mr-2" />
                          <span className="truncate">Cadastro de Pessoas</span>
                          {peopleLocked && <Lock size={10} className="ml-auto flex-shrink-0 text-ai-subtext/50" />}
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Iniciativas (menu retrátil: Visão Geral + Atividades) */}
            <div className="space-y-0.5 mb-1">
              <button
                type="button"
                onClick={() => setIsIniciativasOpen(!isIniciativasOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 text-left cursor-pointer group ${isIniciativasView(activeAgentId)
                    ? 'bg-ai-accent/5 text-ai-accent'
                    : 'text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text'
                  }`}
                title="Iniciativas"
              >
                <div className="flex items-center">
                  <FolderOpen size={16} className="flex-shrink-0 text-ai-subtext group-hover:text-ai-text" />
                  <span className="ml-3 text-sm font-medium block truncate">Iniciativas</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`flex-shrink-0 transition-transform duration-200 ${isIniciativasOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isIniciativasOpen && (
                <div className="ml-4 space-y-0.5 border-l border-ai-border pl-2 overflow-hidden transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => onSelectAgent(INICIATIVAS_OVERVIEW_ID)}
                    className={`w-full flex items-center px-2 py-1.5 rounded-md transition-all text-xs ${activeAgentId === INICIATIVAS_OVERVIEW_ID
                        ? 'bg-ai-accent/10 text-ai-accent'
                        : 'text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text'
                      }`}
                  >
                    <LayoutDashboard size={14} className="flex-shrink-0 mr-2" />
                    <span className="truncate">Visão Geral</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectAgent(INICIATIVAS_ATIVIDADES_ID)}
                    className={`w-full flex items-center px-2 py-1.5 rounded-md transition-all text-xs ${activeAgentId === INICIATIVAS_ATIVIDADES_ID
                        ? 'bg-ai-accent/10 text-ai-accent'
                        : 'text-ai-subtext hover:bg-ai-surface2 hover:text-ai-text'
                      }`}
                  >
                    <ListTodo size={14} className="flex-shrink-0 mr-2" />
                    <span className="truncate">Atividades</span>
                  </button>
                </div>
              )}
            </div>

            {agents.map((agent, index) => {
              const isActive = activeAgentId === agent.id;
              const isLocked = agent.status !== 'active';

              // Itens que estão dentro de Cadastros: não exibir na lista principal
              if (agent.id === CADASTROS_FARM_ID || agent.id === CADASTROS_CLIENTS_ID || agent.id === CADASTROS_PEOPLE_ID) {
                return null;
              }

              // Tratamento especial para o item Questionários (Menu Accordion)
              if (agent.id === 'questionnaires') {
                return (
                  <React.Fragment key={agent.id}>
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
                  </React.Fragment>
                );
              }

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
                      {agent.icon === 'target' && <Target size={16} />}
                      {agent.icon === 'folder' && <FolderOpen size={16} />}
                      {agent.icon === 'file-check' && <FileCheck size={16} />}
                      {agent.icon === 'calendar' && <Calendar size={16} />}
                    </div>

                    <span className="ml-3 text-sm font-medium block text-left truncate">{agent.name}</span>

                    {isLocked && (
                      <Lock size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-ai-subtext/50" />
                    )}
                  </button>
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
                <p className="text-[9px] text-ai-subtext font-bold uppercase tracking-wide mt-1">
                  v{APP_VERSION} SaaS
                </p>
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