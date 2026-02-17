import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import SubscriptionPage from './components/SubscriptionPage';
import SettingsPage from './components/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LocationProvider, useLocation } from './contexts/LocationContext';
import { ClientProvider } from './contexts/ClientContext';
import { AnalystProvider } from './contexts/AnalystContext';
import { FarmProvider, useFarm } from './contexts/FarmContext';
import AnalystHeader from './components/AnalystHeader';
import { Agent } from './types';
import { Menu, Construction, Loader2, ArrowLeft, Plus } from 'lucide-react';
import { ToastContainer, Toast } from './components/Toast';

// Lazy load AgentHub
const AgentHub = lazy(() => import('./agents/AgentHub'));

// Lazy load auth pages
const ForgotPasswordPage = lazy(() => import('./components/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'));

// Lazy load agents for code splitting
const CattleProfitCalculator = lazy(() => import('./agents/CattleProfitCalculator'));
const Comparator = lazy(() => import('./agents/Comparator'));
const CalculadorasDesktop = lazy(() => import('./agents/CalculadorasDesktop'));
const CadastrosDesktop = lazy(() => import('./agents/CadastrosDesktop'));
const ChatAgent = lazy(() => import('./agents/ChatAgent'));
const AdminDashboard = lazy(() => import('./agents/AdminDashboard'));
const MarketTrends = lazy(() => import('./agents/MarketTrends'));
const SavedScenarios = lazy(() => import('./agents/SavedScenarios'));
const AgentTrainingAdmin = lazy(() => import('./agents/AgentTrainingAdmin'));
const FarmManagement = lazy(() => import('./agents/FarmManagement'));
const QuestionnaireFiller = lazy(() => import('./agents/QuestionnaireFiller'));
const ClientManagement = lazy(() => import('./agents/ClientManagement'));
const AgilePlanning = lazy(() => import('./agents/AgilePlanning'));
const AnalystManagement = lazy(() => import('./agents/AnalystManagement'));
const ClientDocuments = lazy(() => import('./agents/ClientDocuments'));
const InitiativesOverview = lazy(() => import('./agents/InitiativesOverview'));
const InitiativesActivities = lazy(() => import('./agents/InitiativesActivities'));
const InitiativesKanban = lazy(() => import('./agents/InitiativesKanban'));
const PeopleManagement = lazy(() => import('./agents/PeopleManagement'));
const DeliveryManagement = lazy(() => import('./agents/DeliveryManagement'));
const CalendarAgent = lazy(() => import('./agents/CalendarAgent'));
const SupportTicketsDashboard = lazy(() => import('./agents/SupportTicketsDashboard'));
const ProjectStructureReport = lazy(() => import('./agents/ProjectStructureReport'));

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <Loader2 size={24} className="animate-spin text-ai-subtext" />
  </div>
);

const AppContent: React.FC = () => {
  const { user, isLoading, logout, checkPermission, upgradePlan, isPasswordRecovery, clearPasswordRecovery } = useAuth() as any;
  const { country } = useLocation();
  const { selectedFarm, setSelectedFarm } = useFarm();
  const [activeAgentId, setActiveAgentId] = useState<string>('cattle-profit');
  const [viewMode, setViewMode] = useState<'desktop' | 'simulator' | 'comparator' | 'agile-planning'>('desktop');
  const [cadastroView, setCadastroView] = useState<'desktop' | 'farm' | 'client' | 'people' | 'delivery'>('desktop');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [calculatorInputs, setCalculatorInputs] = useState<any>(null);
  const [comparatorScenarios, setComparatorScenarios] = useState<any>(null);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<any>(null);
  const [authPage, setAuthPage] = useState<'login' | 'forgot-password'>('login');
  // Sidebar starts closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Check if we're on desktop (window width >= 768px)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true; // Default to open for SSR
  });
  // Timeout de segurança para evitar loading infinito quando agents não carregam
  const [agentsLoadTimeout, setAgentsLoadTimeout] = useState(false);
  // Estado para controlar se está no formulário de fazendas
  const [isFarmFormView, setIsFarmFormView] = useState(false);
  // Estado para controlar se está no formulário de clientes
  const [isClientFormView, setIsClientFormView] = useState(false);
  // Estado para controlar se está no formulário de pessoas
  const [isPeopleFormView, setIsPeopleFormView] = useState(false);

  // Handle window resize to adjust sidebar state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      } else if (window.innerWidth < 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Escutar mudanças de view do FarmManagement
  useEffect(() => {
    const handleFarmViewChange = (e: CustomEvent) => {
      setIsFarmFormView(e.detail === 'form');
    };

    window.addEventListener('farmViewChange', handleFarmViewChange as EventListener);
    return () => {
      window.removeEventListener('farmViewChange', handleFarmViewChange as EventListener);
    };
  }, []);

  // Escutar mudanças de view do ClientManagement
  useEffect(() => {
    const handleClientViewChange = (e: CustomEvent) => {
      setIsClientFormView(e.detail === 'form');
    };

    window.addEventListener('clientViewChange', handleClientViewChange as EventListener);
    return () => {
      window.removeEventListener('clientViewChange', handleClientViewChange as EventListener);
    };
  }, []);

  // Escutar mudanças de view do PeopleManagement
  useEffect(() => {
    const handlePeopleViewChange = (e: CustomEvent) => {
      setIsPeopleFormView(e.detail === 'form');
    };

    window.addEventListener('peopleViewChange', handlePeopleViewChange as EventListener);
    return () => {
      window.removeEventListener('peopleViewChange', handlePeopleViewChange as EventListener);
    };
  }, []);

  const addToast = (toast: Toast) => {
    setToasts(prev => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Define available agents with SaaS permissions (memoized)
  const agents = useMemo(() => {
    if (isLoading || !user) {
      return [];
    }

    try {
      // Define all potential agents
      const cadastrosAgent: Agent = {
        id: 'cadastros',
        name: 'Cadastros',
        description: 'Fazendas, clientes e pessoas.',
        icon: 'folder-plus',
        category: 'zootecnico',
        status: 'active'
      };

      const cattleProfit: Agent = {
        id: 'cattle-profit',
        name: 'Calculadoras',
        description: 'Análise econômica completa.',
        icon: 'calculator',
        category: 'financeiro',
        status: checkPermission('Calculadora') ? 'active' : 'locked'
      };

      const questionnairesAgent: Agent = {
        id: 'questionnaires',
        name: 'Questionários',
        description: 'Questionários de avaliação',
        icon: 'file-check',
        category: 'zootecnico',
        status: 'active'
      };

      const clientDocuments: Agent = {
        id: 'client-documents',
        name: 'Documentos',
        description: 'Gerenciar documentos da mentoria',
        icon: 'folder',
        category: 'admin',
        status: 'active'
      };

      const clientManagement: Agent = {
        id: 'client-management',
        name: 'Gestão de Clientes',
        description: 'Cadastrar e gerenciar clientes',
        icon: 'users',
        category: 'admin',
        status: (user?.role === 'admin' || user?.qualification === 'analista') ? 'active' : 'locked'
      };

      const peopleManagement: Agent = {
        id: 'people-management',
        name: 'Cadastro de Pessoas',
        description: 'Colaboradores, consultores, fornecedores e clientes familiares',
        icon: 'users',
        category: 'admin',
        status: 'active'
      };

      const savedScenarios: Agent = {
        id: 'saved-scenarios',
        name: country === 'PY' ? 'Mis Guardados' : 'Meus Salvos',
        description: 'Cenários e simulações salvos.',
        icon: 'save',
        category: 'financeiro',
        status: checkPermission('Calculadora') ? 'active' : 'locked'
      };

      const askAntonio: Agent = {
        id: 'ask-antonio',
        name: country === 'PY' ? 'PREGUNTE /Antonio' : 'Pergunte p/ Antonio',
        description: 'Consultor virtual especialista.',
        icon: 'nutrition',
        category: 'consultoria',
        status: 'active'
      };

      const analystManagement: Agent = {
        id: 'analyst-management',
        name: 'Gerenciamento de Analistas',
        description: 'Visualize analistas, clientes e fazendas de forma hierárquica',
        icon: 'users',
        category: 'admin',
        status: 'active'
      };

      const agentTraining: Agent = {
        id: 'agent-training',
        name: 'Treinar Antonio',
        description: 'Configurar e treinar o agente',
        icon: 'brain',
        category: 'admin',
        status: 'active'
      };

      const agentHub: Agent = {
        id: 'agent-hub',
        name: 'Hub de Agentes',
        description: 'Assistentes especialistas por domínio.',
        icon: 'brain-circuit',
        category: 'consultoria',
        status: 'active'
      };

      const adminDashboard: Agent = {
        id: 'admin-dashboard',
        name: 'Gestão de Usuários',
        description: 'Painel mestre administrativo',
        icon: 'users',
        category: 'admin',
        status: 'active'
      };

      const supportTickets: Agent = {
        id: 'support-tickets',
        name: 'Suporte Interno',
        description: 'Gestão de tickets e mensagens de suporte',
        icon: 'help-circle',
        category: 'admin',
        status: 'active'
      };

      // Build the ordered list
      const orderedList: Agent[] = [];

      // 1. Cadastros (área de trabalho com cards: Fazendas, Clientes, Pessoas)
      orderedList.push(cadastrosAgent);

      // 2. Calculadoras (inclui Rentabilidade na Engorda, Comparador e Planejamento Ágil)
      orderedList.push(cattleProfit);

      // 3. Questionários
      orderedList.push(questionnairesAgent);

      // 4. Documentos
      orderedList.push(clientDocuments);

      // Calendário fica apenas em Gestão do Projeto (Sidebar)

      // Others (at the end)
      orderedList.push(savedScenarios);
      orderedList.push(agentHub);
      orderedList.push(askAntonio);

      // Admin exclusives
      if (user?.role === 'admin') {
        orderedList.push(analystManagement);
        orderedList.push(agentTraining);
        orderedList.push(adminDashboard);
        orderedList.push(supportTickets);
      }

      return orderedList;

    } catch (error) {
      console.error('Erro ao calcular agents:', error);
      // Fallback
      return [
        {
          id: 'cattle-profit',
          name: 'Calculadoras',
          description: 'Análise econômica completa.',
          icon: 'calculator',
          category: 'financeiro',
          status: 'active'
        },
        {
          id: 'ask-antonio',
          name: country === 'PY' ? 'PREGUNTE /Antonio' : 'Pergunte p/ Antonio',
          description: 'Consultor virtual especialista.',
          icon: 'nutrition',
          category: 'consultoria',
          status: 'active'
        }
      ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, country]);

  // Reset active agent if access is lost or on role change
  useEffect(() => {
    // Only run if user is loaded (not loading)
    if (isLoading || !user) return;

    if (activeAgentId === 'admin-dashboard' && user?.role !== 'admin') {
      setActiveAgentId('cattle-profit');
      return;
    }
    if (activeAgentId === 'support-tickets' && user?.role !== 'admin') {
      setActiveAgentId('cattle-profit');
      return;
    }

    // Redirect if trying to access locked agents (market-trends)
    const lockedAgents = ['market-trends'];
    if (lockedAgents.includes(activeAgentId)) {
      setActiveAgentId('cattle-profit');
      return;
    }
  }, [user, activeAgentId, isLoading]);

  // Timeout de segurança para agents não carregarem
  useEffect(() => {
    if (agents.length === 0 && !isLoading && user) {
      // Se após 5 segundos ainda não tiver agents, forçar renderização
      const timeout = setTimeout(() => {
        console.warn('Agents não carregaram após 5 segundos, forçando renderização');
        setAgentsLoadTimeout(true);
      }, 5000);
      return () => clearTimeout(timeout);
    } else {
      setAgentsLoadTimeout(false);
    }
  }, [agents.length, isLoading, user]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  // Se estiver em modo de recovery (detectado pelo evento PASSWORD_RECOVERY do Supabase)
  // SEMPRE mostrar a página de reset, mesmo se houver user
  if (isPasswordRecovery) {
    return (
      <Suspense fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
          <Loader2 size={32} className="animate-spin" />
        </div>
      }>
        <ResetPasswordPage
          onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
          onSuccess={() => clearPasswordRecovery()}
        />
      </Suspense>
    );
  }

  if (!user) {
    // Render appropriate auth page
    if (authPage === 'forgot-password') {
      return (
        <Suspense fallback={
          <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
            <Loader2 size={32} className="animate-spin" />
          </div>
        }>
          <ForgotPasswordPage
            onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
            onBack={() => setAuthPage('login')}
          />
        </Suspense>
      );
    }


    return (
      <LoginPage
        onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
        onForgotPassword={() => setAuthPage('forgot-password')}
      />
    );
  }

  // If agents are not loaded yet, show loading
  if (agents.length === 0 && !agentsLoadTimeout) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  // Se timeout ocorreu, tentar renderizar mesmo sem agents (fallback)
  if (agents.length === 0 && agentsLoadTimeout) {
    console.error('Erro: agents não carregaram. Renderizando fallback.');
    // Retornar pelo menos um agente básico para evitar tela branca
    const fallbackAgents: Agent[] = [
      {
        id: 'cattle-profit',
        name: 'Calculadoras',
        description: 'Análise econômica completa.',
        icon: 'calculator',
        category: 'financeiro',
        status: 'active'
      }
    ];
    // Usar fallback temporariamente
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" />
          <p className="text-sm text-ai-subtext">Carregando aplicação...</p>
        </div>
      </div>
    );
  }

  const activeAgent = agents.find(a => a.id === activeAgentId);
  const isSubscriptionPage = activeAgentId === 'subscription';
  const isSettingsPage = activeAgentId === 'settings';
  const isIniciativasOverview = activeAgentId === 'iniciativas-overview';
  const isIniciativasAtividades = activeAgentId === 'iniciativas-atividades';
  const isIniciativasKanban = activeAgentId === 'iniciativas-kanban';
  const isIniciativasEntregas = activeAgentId === 'iniciativas-entregas';
  const isCalendar = activeAgentId === 'calendar';
  const isProjectStructure = activeAgentId === 'project-structure';
  const headerTitle = isIniciativasOverview
    ? 'Visão Geral'
    : isIniciativasAtividades
      ? 'Atividades'
      : isIniciativasKanban
        ? 'Kanban'
        : isIniciativasEntregas
          ? 'Projeto e Entregas'
          : isCalendar
            ? 'Calendário'
            : isProjectStructure
              ? 'Estrutura do Projeto'
              : activeAgent?.name;

  const renderContent = () => {
    if (activeAgentId === 'settings') {
      return (
        <SettingsPage
          user={user}
          onBack={() => setActiveAgentId('cattle-profit')}
          onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
          onLogout={logout}
        />
      );
    }

    if (activeAgentId === 'subscription') {
      return (
        <SubscriptionPage
          user={user}
          onUpgrade={(planId) => {
            upgradePlan(planId as any);
            setActiveAgentId('cattle-profit');
          }}
          onBack={() => setActiveAgentId('cattle-profit')}
        />
      );
    }

    switch (activeAgentId) {
      case 'cattle-profit':
        if (viewMode === 'desktop') {
          return (
            <Suspense fallback={<LoadingFallback />}>
              <CalculadorasDesktop
                onSelectSimulator={() => setViewMode('simulator')}
                onSelectComparador={() => setViewMode('comparator')}
                onSelectPlanejamentoAgil={() => setViewMode('agile-planning')}
                showPlanejamentoAgil={user?.role === 'admin' || user?.qualification === 'analista'}
              />
            </Suspense>
          );
        }
        if (viewMode === 'agile-planning') {
          return (user?.role === 'admin' || user?.qualification === 'analista') ? (
            <Suspense fallback={<LoadingFallback />}>
              <AgilePlanning
                onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
              />
            </Suspense>
          ) : (
            <div className="p-8 text-ai-subtext">Acesso negado.</div>
          );
        }
        if (viewMode === 'comparator') {
          return (
            <Suspense fallback={<LoadingFallback />}>
              <Comparator
                onToast={addToast}
                initialScenarios={comparatorScenarios}
              />
            </Suspense>
          );
        }
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CattleProfitCalculator
              initialInputs={calculatorInputs}
              onToast={addToast}
              onNavigateToSaved={() => setActiveAgentId('saved-scenarios')}
            />
          </Suspense>
        );
      case 'saved-scenarios':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SavedScenarios
              key="saved-scenarios"
              onLoadScenario={(inputs) => {
                setCalculatorInputs(inputs);
                setViewMode('simulator');
                setActiveAgentId('cattle-profit');
              }}
              onNavigateToCalculator={() => {
                setViewMode('simulator');
                setActiveAgentId('cattle-profit');
              }}
              onLoadComparator={(scenarios) => {
                setComparatorScenarios(scenarios);
                setViewMode('comparator');
                setActiveAgentId('cattle-profit');
              }}
              onNavigateToComparator={() => {
                setViewMode('comparator');
                setActiveAgentId('cattle-profit');
              }}
              onEditQuestionnaire={(q) => {
                setEditingQuestionnaire(q);
                setActiveAgentId('questionnaire-gente-gestao-producao');
              }}
              onToast={addToast}
            />
          </Suspense>
        );
      case 'ask-antonio':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ChatAgent />
          </Suspense>
        );
      case 'market-trends':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <MarketTrends />
          </Suspense>
        );
      case 'cadastros':
        if (cadastroView === 'desktop') {
          return (
            <Suspense fallback={<LoadingFallback />}>
              <CadastrosDesktop
                onSelectFazendas={() => setCadastroView('farm')}
                onSelectClientes={() => setCadastroView('client')}
                onSelectPessoas={() => setCadastroView('people')}

                showClientes={user?.role === 'admin' || user?.qualification === 'analista'}
              />
            </Suspense>
          );
        }
        if (cadastroView === 'farm') {
          return (
            <Suspense fallback={<LoadingFallback />}>
              <FarmManagement
                onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
              />
            </Suspense>
          );
        }
        if (cadastroView === 'client') {
          return (user?.role === 'admin' || user?.qualification === 'analista') ? (
            <Suspense fallback={<LoadingFallback />}>
              <ClientManagement
                onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
              />
            </Suspense>
          ) : (
            <div className="p-8 text-ai-subtext">Acesso negado.</div>
          );
        }
        if (cadastroView === 'delivery') {
          return (
            <Suspense fallback={<LoadingFallback />}>
              <DeliveryManagement
                onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
              />
            </Suspense>
          );
        }
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PeopleManagement
              onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
            />
          </Suspense>
        );
      case 'agent-training':
        return user.role === 'admin' ? (
          <Suspense fallback={<LoadingFallback />}>
            <AgentTrainingAdmin />
          </Suspense>
        ) : (
          <div>Acesso negado.</div>
        );
      case 'admin-dashboard':
        return user.role === 'admin' ? (
          <Suspense fallback={<LoadingFallback />}>
            <AdminDashboard />
          </Suspense>
        ) : (
          <div>Acesso negado.</div>
        );
      case 'support-tickets':
        return user.role === 'admin' ? (
          <Suspense fallback={<LoadingFallback />}>
            <SupportTicketsDashboard />
          </Suspense>
        ) : (
          <div>Acesso negado.</div>
        );
      case 'analyst-management':
        return user.role === 'admin' ? (
          <Suspense fallback={<LoadingFallback />}>
            <AnalystManagement
              onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
            />
          </Suspense>
        ) : (
          <div className="flex items-center justify-center h-full text-red-500">
            Acesso negado. Apenas administradores podem acessar esta página.
          </div>
        );
      case 'agile-planning':
        return (user.role === 'admin' || user.qualification === 'analista') ? (
          <Suspense fallback={<LoadingFallback />}>
            <AgilePlanning
              onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
            />
          </Suspense>
        ) : (
          <div>Acesso negado.</div>
        );
      case 'agent-hub':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AgentHub
              onSelectAgent={(id) => setActiveAgentId(id)}
            />
          </Suspense>
        );
      case 'questionnaire-gente-gestao-producao':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <QuestionnaireFiller
              questionnaireId="gente-gestao-producao"
              onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
              initialData={editingQuestionnaire}
              onClearInitialData={() => setEditingQuestionnaire(null)}
            />
          </Suspense>
        );
      case 'client-documents':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ClientDocuments
              onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })}
            />
          </Suspense>
        );
      case 'iniciativas-overview':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <InitiativesOverview />
          </Suspense>
        );
      case 'iniciativas-atividades':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <InitiativesActivities onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })} />
          </Suspense>
        );
      case 'iniciativas-kanban':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <InitiativesKanban onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })} />
          </Suspense>
        );
      case 'iniciativas-entregas':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DeliveryManagement onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })} />
          </Suspense>
        );
      case 'calendar':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CalendarAgent />
          </Suspense>
        );
      case 'project-structure':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ProjectStructureReport onToast={(message, type) => addToast({ id: Date.now().toString(), message, type })} />
          </Suspense>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-ai-subtext">
            <Construction size={32} className="mb-3 opacity-30" />
            <h2 className="text-lg font-medium mb-1 text-ai-text">Em Desenvolvimento</h2>
            <p className="text-sm">O agente estará disponível em breve.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-ai-bg overflow-hidden font-sans text-ai-text">

      {/* Sidebar Navigation */}
      <Sidebar
        agents={agents}
        activeAgentId={activeAgentId}
        onSelectAgent={(id) => {
          if (id === 'cattle-profit') setViewMode('desktop');
          if (id === 'cadastros') setCadastroView('desktop');
          setActiveAgentId(id);
        }}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user}
        onLogout={logout}
        onSettingsClick={() => setActiveAgentId('settings')}
      />

      {/* Main Content Area */}
      <div className={`flex-1 min-w-0 flex flex-col h-full transition-all duration-300 relative ${isSidebarOpen ? 'md:ml-56' : 'ml-0'}`}>

        {/* Analyst Header - Above main header */}
        <AnalystHeader />

        {/* Header - Minimalist with hamburger button */}
        <header className="h-12 bg-ai-bg border-b border-ai-border flex items-center justify-between px-4 shrink-0 sticky top-12 z-40">
          <div className="flex items-center gap-2 md:gap-0">
            {/* Hamburger button - always visible */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-ai-subtext hover:text-ai-text rounded hover:bg-ai-surface mr-1 md:mr-3 focus:outline-none transition-colors"
              aria-label={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
              title={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-semibold text-ai-text flex items-center gap-2 truncate max-w-[120px] md:max-w-none">
              {isSettingsPage ? 'Configurações' : isSubscriptionPage ? 'Assinatura e Planos' : headerTitle}
            </h1>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Botão Voltar para lista quando estiver no formulário de fazendas */}
            {((activeAgentId === 'cadastros' && cadastroView === 'farm') || activeAgentId === 'farm-management') && isFarmFormView && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('farmCancelForm'));
                }}
                className="flex items-center gap-1.5 text-ai-subtext hover:text-ai-text transition-colors cursor-pointer text-sm px-2 py-1"
              >
                <ArrowLeft size={16} />
                Voltar para lista
              </button>
            )}
            {/* Botão Voltar para lista quando estiver no formulário de clientes */}
            {((activeAgentId === 'cadastros' && cadastroView === 'client') || activeAgentId === 'client-management') && isClientFormView && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('clientCancelForm'));
                }}
                className="flex items-center gap-1.5 text-ai-subtext hover:text-ai-text transition-colors cursor-pointer text-sm px-2 py-1"
              >
                <ArrowLeft size={16} />
                Voltar para lista
              </button>
            )}
            {/* Botão Voltar para lista quando estiver no formulário de pessoas */}
            {((activeAgentId === 'cadastros' && cadastroView === 'people') || activeAgentId === 'people-management') && isPeopleFormView && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('peopleCancelForm'));
                }}
                className="flex items-center gap-1.5 text-ai-subtext hover:text-ai-text transition-colors cursor-pointer text-sm px-2 py-1"
              >
                <ArrowLeft size={16} />
                Voltar para lista
              </button>
            )}
            {/* Botão Novo Cliente quando estiver na lista de clientes */}
            {((activeAgentId === 'cadastros' && cadastroView === 'client') || activeAgentId === 'client-management') && !isClientFormView && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('clientNewClient'));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ai-accent text-white rounded-md hover:bg-ai-accent/90 transition-colors text-sm"
              >
                <Plus size={16} />
                Novo Cliente
              </button>
            )}
            {activeAgentId === 'cattle-profit' && viewMode !== 'desktop' && (
              <button
                onClick={() => setViewMode('desktop')}
                className="flex items-center gap-1.5 text-ai-subtext hover:text-ai-text transition-colors cursor-pointer text-sm px-2 py-1"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
            )}
            {activeAgentId === 'cadastros' && cadastroView !== 'desktop' && (
              <button
                onClick={() => setCadastroView('desktop')}
                className="flex items-center gap-1.5 text-ai-subtext hover:text-ai-text transition-colors cursor-pointer text-sm px-2 py-1"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
            )}
          </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 min-h-0 bg-ai-bg overflow-hidden">
          <div className="h-full w-full max-w-[1600px] mx-auto flex flex-col min-h-0">
            <ErrorBoundary>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {renderContent()}
              </div>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LocationProvider>
        <ClientProvider>
          <FarmProvider>
            <AnalystProvider>
              <AppContent />
            </AnalystProvider>
          </FarmProvider>
        </ClientProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;