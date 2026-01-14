import React, { useEffect } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useClient } from '../contexts/ClientContext';
import { useAnalyst } from '../contexts/AnalystContext';
import ClientSelector from './ClientSelector';
import FarmSelector from './FarmSelector';
import AnalystSelector from './AnalystSelector';
import { Farm } from '../types';

interface AnalystHeaderProps {
  selectedFarm: Farm | null;
  onSelectFarm: (farm: Farm | null) => void;
}

const AnalystHeader: React.FC<AnalystHeaderProps> = ({ selectedFarm, onSelectFarm }) => {
  const { user } = useAuth();
  const { selectedClient, setSelectedClient } = useClient();
  const { selectedAnalyst } = useAnalyst();

  // Limpar cliente quando mudar de analista (apenas para admin)
  useEffect(() => {
    if (user?.role === 'admin' && selectedAnalyst && selectedClient) {
      if (selectedClient.analystId !== selectedAnalyst.id) {
        setSelectedClient(null);
        onSelectFarm(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnalyst, user?.role]);

  // Não mostrar se não for analista ou admin
  if (!user || (user.qualification !== 'analista' && user.role !== 'admin')) {
    return null;
  }

  return (
    <header className="h-12 bg-ai-surface border-b border-ai-border flex items-center justify-between px-4 shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {/* Seletor de Analista (apenas para admin) ou Nome do Analista */}
        {user.role === 'admin' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ai-subtext font-medium">Analista:</span>
            <AnalystSelector />
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
              <ClientSelector />
            </div>

            {/* Seletor de Fazenda (apenas se houver cliente selecionado) */}
            {selectedClient && (
              <>
                <div className="h-6 w-px bg-ai-border" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ai-subtext font-medium">Fazenda:</span>
                  <FarmSelector selectedFarm={selectedFarm} onSelectFarm={onSelectFarm} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </header>
  );
};

export default AnalystHeader;
