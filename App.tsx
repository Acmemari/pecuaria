import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import SubscriptionPage from './components/SubscriptionPage';
import SettingsPage from './components/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Agent } from './types';
import { Menu, Construction, Loader2 } from 'lucide-react';
import { ToastContainer, Toast } from './components/Toast';

// Lazy load auth pages
const ForgotPasswordPage = lazy(() => import('./components/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'));

// Lazy load agents for code splitting
const CattleProfitCalculator = lazy(() => import('./agents/CattleProfitCalculator'));
const ChatAgent = lazy(() => import('./agents/ChatAgent'));
const AdminDashboard = lazy(() => import('./agents/AdminDashboard'));
const MarketTrends = lazy(() => import('./agents/MarketTrends'));
const SavedScenarios = lazy(() => import('./agents/SavedScenarios'));

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <Loader2 size={24} className="animate-spin text-ai-subtext" />
  </div>
);

const AppContent: React.FC = () => {
  const { user, isLoading, logout, checkPermission, upgradePlan, isPasswordRecovery, clearPasswordRecovery } = useAuth() as any;
  const [activeAgentId, setActiveAgentId] = useState<string>('cattle-profit');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [calculatorInputs, setCalculatorInputs] = useState<any>(null);
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
          name: 'Lucro do Boi',
          description: 'Análise econômica completa.',
          icon: 'calculator',
          category: 'financeiro',
          status: checkPermission('Calculadora') ? 'active' : 'locked'
        },
        {
          id: 'saved-scenarios',
          name: 'Meus Salvos',
          description: 'Cenários e simulações salvos.',
          icon: 'save',
          category: 'financeiro',
          status: checkPermission('Calculadora') ? 'active' : 'locked'
        },
        {
          id: 'ask-antonio',
          name: 'Pergunte p/ Antonio',
          description: 'Consultor virtual especialista.',
          icon: 'nutrition',
          category: 'consultoria',
          status: 'locked'
        },
        {
          id: 'market-trends',
          name: 'Tendências',
          description: 'Ciclo pecuário e reposição.',
          icon: 'chart',
          category: 'mercado',
          status: checkPermission('Tendências') ? 'active' : 'locked'
        }
      ];

      // Dynamically add Admin tools if user is admin
      return user?.role === 'admin'
        ? [
            ...baseAgents,
            {
              id: 'admin-dashboard',
              name: 'Gestão de Clientes',
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
          name: 'Lucro do Boi',
          description: 'Análise econômica completa.',
          icon: 'calculator',
          category: 'financeiro',
          status: 'active'
        },
        {
          id: 'ask-antonio',
          name: 'Pergunte p/ Antonio',
          description: 'Consultor virtual especialista.',
          icon: 'nutrition',
          category: 'consultoria',
          status: 'active'
        }
      ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

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
        name: 'Lucro do Boi',
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
                setActiveAgentId('cattle-profit');
              }}
              onNavigateToCalculator={() => setActiveAgentId('cattle-profit')}
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
      case 'admin-dashboard':
        return user.role === 'admin' ? (
          <Suspense fallback={<LoadingFallback />}>
            <AdminDashboard />
          </Suspense>
        ) : (
          <div>Acesso negado.</div>
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
    <div className="flex h-screen w-screen bg-ai-bg overflow-hidden font-sans text-ai-text">

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
          <div className="flex items-center">
            {/* Hamburger button - always visible */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-ai-subtext hover:text-ai-text rounded hover:bg-ai-surface mr-3 focus:outline-none transition-colors"
              aria-label={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
              title={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-semibold text-ai-text flex items-center gap-2">
              {isSettingsPage ? 'Configurações' : isSubscriptionPage ? 'Assinatura e Planos' : activeAgent?.name}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-ai-surface2 text-ai-subtext border border-ai-border">
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;