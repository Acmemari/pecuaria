import React, { useCallback, useEffect, useState } from 'react';
import { HelpCircle, Loader2, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHierarchy } from '../contexts/HierarchyContext';
import ClientSelector from './ClientSelector';
import FarmSelector from './FarmSelector';
import AnalystSelector from './AnalystSelector';
import SupportTicketModal from './SupportTicketModal';
import { getAdminUnreadCount, subscribeAdminUnread } from '../lib/supportTickets';
import SelectorErrorBoundary from './hierarchy/SelectorErrorBoundary';

interface AnalystHeaderProps {
  // Props mantidas para retrocompatibilidade, mas agora usamos o contexto
  selectedFarm?: any;
  onSelectFarm?: (farm: any) => void;
}

const AnalystHeader: React.FC<AnalystHeaderProps> = () => {
  const { user } = useAuth();
  const { selectedClient, selectedAnalyst } = useHierarchy();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isLoadingUnread, setIsLoadingUnread] = useState(false);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      const count = await getAdminUnreadCount();
      setAdminUnreadCount(count);
    } catch (error) {
      console.error('[AnalystHeader] unread count error:', error);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    let active = true;
    setIsLoadingUnread(true);

    (async () => {
      await refreshUnread();
      if (active) setIsLoadingUnread(false);
    })();

    const unsubscribe = subscribeAdminUnread(() => {
      void refreshUnread();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.role, refreshUnread]);

  const handleCloseSupport = useCallback(() => {
    setIsSupportOpen(false);
    // Atualizar badge ao fechar para refletir leituras do admin
    void refreshUnread();
  }, [refreshUnread]);

  // Não mostrar se não for analista ou admin
  if (!user || (user.qualification !== 'analista' && user.role !== 'admin')) {
    return null;
  }

  return (
    <>
      <header className="h-12 bg-ai-surface border-b border-ai-border flex items-center justify-between px-4 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {/* Seletor de Analista (apenas para admin) ou Nome do Analista */}
          {user.role === 'admin' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ai-subtext font-medium">Analista:</span>
              <SelectorErrorBoundary fallbackLabel="Analista">
                <AnalystSelector />
              </SelectorErrorBoundary>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-ai-accent/20 flex items-center justify-center">
                <User className="w-4 h-4 text-ai-accent" />
              </div>
              <div>
                <p className="text-xs text-ai-subtext font-medium">Analista</p>
                <p className="text-sm font-semibold text-ai-text">{user.name}</p>
              </div>
            </div>
          )}

          {/* Separador */}
          <div className="h-6 w-px bg-ai-border" />

          {/* Seletor de Cliente (apenas se houver analista selecionado para admin, ou se for analista) */}
          {(user.role === 'admin' ? selectedAnalyst : true) && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ai-subtext font-medium">Cliente:</span>
                <SelectorErrorBoundary fallbackLabel="Cliente">
                  <ClientSelector />
                </SelectorErrorBoundary>
              </div>

              {/* Seletor de Fazenda (apenas se houver cliente selecionado) */}
              {selectedClient && (
                <>
                  <div className="h-6 w-px bg-ai-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ai-subtext font-medium">Fazenda:</span>
                    <SelectorErrorBoundary fallbackLabel="Fazenda">
                      <FarmSelector />
                    </SelectorErrorBoundary>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            className="relative inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-ai-border text-ai-text hover:bg-ai-surface2"
            title="Suporte interno"
            aria-label={`Suporte${adminUnreadCount > 0 ? ` (${adminUnreadCount} não lidas)` : ''}`}
          >
            <HelpCircle className="w-4 h-4" />
            Suporte
            {user.role === 'admin' && (
              <>
                {isLoadingUnread ? (
                  <Loader2 className="w-3 h-3 animate-spin text-ai-subtext" />
                ) : adminUnreadCount > 0 ? (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold flex items-center justify-center">
                    {adminUnreadCount > 99 ? '99+' : adminUnreadCount}
                  </span>
                ) : null}
              </>
            )}
          </button>
        </div>
      </header>

      <SupportTicketModal isOpen={isSupportOpen} onClose={handleCloseSupport} />
    </>
  );
};

export default AnalystHeader;
