import React, { useState, useEffect, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import SubscriptionPage from './components/SubscriptionPage';
import SettingsPage from './components/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Agent } from './types';
import { Menu, Construction, Loader2 } from 'lucide-react';
import { ToastContainer, Toast } from './components/Toast';

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
  const { user, isLoading, logout, checkPermission, upgradePlan } = useAuth();
  const [activeAgentId, setActiveAgentId] = useState<string>('cattle-profit');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [calculatorInputs, setCalculatorInputs] = useState<any>(null);
  // Sidebar starts closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Check if we're on desktop (window width >= 768px)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true; // Default to open for SSR
  });

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

  // Define available agents with SaaS permissions
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
      status: checkPermission('Chat') ? 'active' : 'locked'
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
  const agents = user?.role === 'admin'
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

  // Reset active agent if access is lost or on role change
  useEffect(() => {
    if (activeAgentId === 'admin-dashboard' && user?.role !== 'admin') {
      setActiveAgentId('cattle-profit');
    }
  }, [user, activeAgentId]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
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
            />
          </Suspense>
        );
      case 'saved-scenarios':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SavedScenarios
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