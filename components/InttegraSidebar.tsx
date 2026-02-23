import React from 'react';
import { User } from '../types';
import { APP_VERSION } from '../src/version';
import {
  Settings,
  LogOut,
  X,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';

interface InttegraSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  user: User | null;
  onLogout: () => void;
  onSettingsClick?: () => void;
  onSwitchToPecuaria: () => void;
}

const InttegraSidebar: React.FC<InttegraSidebarProps> = ({
  isOpen,
  toggleSidebar,
  user,
  onLogout,
  onSettingsClick,
  onSwitchToPecuaria,
}) => {
  return (
    <>
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
            <Layers size={16} className="text-emerald-500" />
            <span className="font-bold tracking-tight text-base">Inttegra</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1.5 text-ai-subtext hover:text-ai-text hover:bg-ai-surface rounded transition-colors"
            aria-label="Fechar menu"
            title="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Area - Empty for MVP */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <span className="text-[10px] font-bold text-ai-subtext uppercase tracking-widest">
              Módulos
            </span>
          </div>
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-ai-subtext">
              Navegação em construção
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-ai-border bg-ai-bg shrink-0">
          {/* Switch back to Pecuária */}
          <button
            type="button"
            onClick={onSwitchToPecuaria}
            className="w-full flex items-center gap-2 px-3 py-2 mb-3 rounded-md text-sm font-medium text-ai-subtext hover:text-ai-text hover:bg-ai-surface2 transition-colors"
            title="Voltar para pecuarIA"
          >
            <ArrowLeftRight size={14} />
            <span>pecuarIA</span>
          </button>

          {user && (
            <div className="mb-3 px-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
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

export default InttegraSidebar;
