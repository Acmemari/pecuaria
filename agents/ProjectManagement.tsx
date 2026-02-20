import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import { useFarm } from '../contexts/FarmContext';
import ProgramaWorkbench from '../components/ProgramaWorkbench';

interface ProjectManagementProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onToast }) => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const { selectedClient } = useClient();
  const { selectedFarm } = useFarm();

  const isAdmin = user?.role === 'admin';
  const effectiveUserId = useMemo(
    () => (isAdmin && selectedAnalyst ? selectedAnalyst.id : user?.id),
    [isAdmin, selectedAnalyst, user?.id]
  );

  if (isAdmin && !selectedAnalyst) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-xl w-full rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Selecione um <strong>Analista</strong> no cabeçalho para gerenciar programas.
          </p>
        </div>
      </div>
    );
  }

  if (!effectiveUserId) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <p className="text-sm text-ai-subtext">Selecione um usuário para continuar.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ai-text tracking-tight">Programa de Trabalho</h1>
          <p className="text-sm text-ai-subtext">
            Gestão visual da estrutura hierárquica em colunas: Programa, Entrega, Atividade e Tarefa.
          </p>
        </div>
      </header>
      <ProgramaWorkbench
        effectiveUserId={effectiveUserId}
        selectedClientId={selectedClient?.id || null}
        selectedFarmId={selectedFarm?.id || null}
        onToast={onToast}
      />
    </div>
  );
};

export default ProjectManagement;
