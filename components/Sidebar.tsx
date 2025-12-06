import React from 'react';
import { Agent, User } from '../types';
import {
  Calculator,
  TrendingUp,
  Sprout,
  Settings,
  BrainCircuit,
  Lock,
  LogOut,
  Users,
  X,
  Save
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
            <div className="p-1 rounded bg-ai-text text-white">
              <BrainCircuit size={16} />
            </div>
            <span className="font-bold tracking-tight text-base">PecuarIA</span>
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
            {agents.map((agent) => {
              const isActive = activeAgentId === agent.id;
              const isLocked = agent.status !== 'active';

              return (
                <button
                  key={agent.id}
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
                  </div>

                  <span className="ml-3 text-sm font-medium block text-left truncate">{agent.name}</span>

                  {isLocked && (
                    <Lock size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-ai-subtext/50" />
                  )}
                </button>
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
                <p className="text-[10px] text-ai-subtext truncate capitalize">{user.role === 'admin' ? 'Administrador' : (user.plan ? `Plano ${user.plan}` : 'Plano Gratuito')}</p>
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