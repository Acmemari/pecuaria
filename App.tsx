import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import SubscriptionPage from './components/SubscriptionPage';
import SettingsPage from './components/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LocationProvider, useLocation } from './contexts/LocationContext';
import { Agent } from './types';
import { Menu, Construction, Loader2, Grid3X3, ArrowLeftRight } from 'lucide-react';
import { ToastContainer, Toast } from './components/Toast';

// Lazy load auth pages
const ForgotPasswordPage = lazy(() => import('./components/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'));

// Lazy load agents for code splitting
const CattleProfitCalculator = lazy(() => import('./agents/CattleProfitCalculator'));
const Comparator = lazy(() => import('./agents/Comparator'));
const ChatAgent = lazy(() => import('./agents/ChatAgent'));
const AdminDashboard = lazy(() => import('./agents/AdminDashboard'));
const MarketTrends = lazy(() => import('./agents/MarketTrends'));
const SavedScenarios = lazy(() => import('./agents/SavedScenarios'));
const AgentTrainingAdmin = lazy(() => import('./agents/AgentTrainingAdmin'));
const FarmManagement = lazy(() => import('./agents/FarmManagement'));
const QuestionnaireFiller = lazy(() => import('./agents/QuestionnaireFiller'));

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <Loader2 size={24} className="animate-spin text-ai-subtext" />
  </div>
);

const AppContent: React.FC = () => {
  const { user, isLoading, logout, checkPermission, upgradePlan, isPasswordRecovery, clearPasswordRecovery } = useAuth() as any;
  const { country } = useLocation();
  const [activeAgentId, setActiveAgentId] = useState<string>('cattle-profit');
  const [viewMode, setViewMode] = useState<'simulator' | 'comparator'>('simulator');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [calculatorInputs, setCalculatorInputs] = useState<any>(null);
  const [comparatorScenarios, setComparatorScenarios] = useState<any>(null);
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
      const baseAgents: Agent[] = [
        {
          id: 'cattle-profit',
          name: 'Calculadoras',
          description: 'Análise econômica completa.',
          icon: 'calculator',
          category: 'financeiro',
          status: checkPermission('Calculadora') ? 'active' : 'locked'
        },
        {
          id: 'saved-scenarios',
          name: 'Mis Guardados',
          description: 'Cenários e simulações salvos.',
          icon: 'save',
          category: 'financeiro',
          status: checkPermission('Calculadora') ? 'active' : 'locked'
        },
        {
          id: 'ask-antonio',
          name: country === 'PY' ? 'PREGUNTE /Antonio' : 'Pergunte p/ Antonio',
          description: 'Consultor virtual especialista.',
          icon: 'nutrition',
          category: 'consultoria',
          status: 'active'
        },
        {
          id: 'market-trends',
          name: 'Tendências',
          description: 'Ciclo pecuário e reposição.',
          icon: 'chart',
          category: 'mercado',
          status: checkPermission('Tendências') ? 'active' : 'locked'
        },
        {
          id: 'farm-management',
          name: 'Cadastro de Fazendas',
          description: 'Gerenciar propriedades rurais.',
          icon: 'farm',
          category: 'zootecnico',
          status: 'active'
        }
      ];

      // Dynamically add Admin tools if user is admin
      return user?.role === 'admin'
        ? [
          ...baseAgents,
          {
            id: 'agent-training',
            name: 'Treinar Antonio',
            description: 'Configurar e treinar o agente',
            icon: 'brain',
            category: 'admin',
            status: 'active'
          } as Agent,
          {
            id: 'admin-dashboard',
            name: 'Gestão de Usuários',
            description: 'Painel mestre administrativo',
            icon: 'users',
            category: 'admin',
            status: 'active'
          } as Agent
        ]
        : baseAgents;
    } catch (error) {
      console.error('Erro ao calcular agents:', error);
      // Retornar pelo menos os agents básicos em caso de erro
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
      case 'farm-management':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <FarmManagement
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
      case 'questionnaire-gente-gestao-producao':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <QuestionnaireFiller questionnaireId="gente-gestao-producao" />
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
        onSelectAgent={setActiveAgentId}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user}
        onLogout={logout}
        onSettingsClick={() => setActiveAgentId('settings')}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 relative ${isSidebarOpen ? 'md:ml-56' : 'ml-0'}`}>

        {/* Header - Minimalist with hamburger button */}
        <header className="h-12 bg-ai-bg border-b border-ai-border flex items-center justify-between px-4 shrink-0 sticky top-0 z-40">
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
              {isSettingsPage ? 'Configurações' : isSubscriptionPage ? 'Assinatura e Planos' : activeAgent?.name}
            </h1>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {activeAgentId === 'cattle-profit' && (
              <div className="flex items-center gap-2 mr-2 md:mr-4">
                <button
                  onClick={() => setViewMode('simulator')}
                  className={`px-2 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'simulator'
                    ? 'bg-ai-surface text-ai-text'
                    : 'bg-white border border-ai-border text-ai-subtext hover:bg-ai-surface'
                    }`}
                  title="Simulador"
                >
                  <Grid3X3 size={14} />
                  <span className="hidden sm:inline">Simulador</span>
                </button>
                <button
                  onClick={() => setViewMode('comparator')}
                  className={`px-2 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'comparator'
                    ? 'bg-ai-accent text-white'
                    : 'bg-white border border-ai-border text-ai-subtext hover:bg-ai-surface'
                    }`}
                  title="Comparador"
                >
                  <ArrowLeftRight size={14} />
                  <span className="hidden sm:inline">Comparador</span>
                </button>
              </div>
            )}
            <div className="hidden sm:block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-ai-surface2 text-ai-subtext border border-ai-border whitespace-nowrap">
              v1.3 SaaS
            </div>
          </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 overflow-hidden p-2 md:p-3 bg-ai-bg">
          <div className="h-full w-full max-w-[1600px] mx-auto overflow-y-auto">
            <ErrorBoundary>
              {renderContent()}
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
        <AppContent />
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;