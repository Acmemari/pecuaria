import React, { useMemo, useState } from 'react';
import { AlertTriangle, Columns3, Network, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import { useFarm } from '../contexts/FarmContext';
import ProgramaWorkbench from '../components/ProgramaWorkbench';
import EAPMindMap from '../components/EAPMindMap';
import ProgramaDocumento from '../components/ProgramaDocumento';

type ViewMode = 'columns' | 'mindmap' | 'document';

interface ProjectManagementProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onToast }) => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const { selectedClient } = useClient();
  const { selectedFarm } = useFarm();
  const [viewMode, setViewMode] = useState<ViewMode>('columns');

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
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ai-text tracking-tight">Programa de Trabalho</h1>
          <p className="text-sm text-ai-subtext">
            {viewMode === 'columns'
              ? 'Gestão visual da estrutura hierárquica em colunas: Programa, Entrega, Atividade e Tarefa.'
              : viewMode === 'mindmap'
                ? 'Mapa Mental EAP — visualize e edite a estrutura do projeto em formato de árvore.'
                : 'Documento — edite os dados diretamente no conteúdo, como em um documento de texto.'}
          </p>
        </div>
        <div className="flex rounded-lg border border-ai-border p-1 bg-ai-surface/50">
          <button
            type="button"
            onClick={() => setViewMode('columns')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'columns'
                ? 'bg-ai-accent text-white shadow-sm'
                : 'text-ai-subtext hover:text-ai-text'
            }`}
          >
            <Columns3 size={16} />
            Colunas
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mindmap')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'mindmap'
                ? 'bg-ai-accent text-white shadow-sm'
                : 'text-ai-subtext hover:text-ai-text'
            }`}
          >
            <Network size={16} />
            Mapa Mental
          </button>
          <button
            type="button"
            onClick={() => setViewMode('document')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'document'
                ? 'bg-ai-accent text-white shadow-sm'
                : 'text-ai-subtext hover:text-ai-text'
            }`}
          >
            <FileText size={16} />
            Documento
          </button>
        </div>
      </header>
      {viewMode === 'columns' && (
        <ProgramaWorkbench
          effectiveUserId={effectiveUserId}
          selectedClientId={selectedClient?.id || null}
          selectedFarmId={selectedFarm?.id || null}
          onToast={onToast}
        />
      )}
      {viewMode === 'mindmap' && (
        <EAPMindMap
          effectiveUserId={effectiveUserId}
          selectedClientId={selectedClient?.id || null}
          selectedFarmId={selectedFarm?.id || null}
          onToast={onToast}
        />
      )}
      {viewMode === 'document' && (
        <ProgramaDocumento
          effectiveUserId={effectiveUserId}
          selectedClientId={selectedClient?.id || null}
          selectedFarmId={selectedFarm?.id || null}
          onToast={onToast}
        />
      )}
    </div>
  );
};

export default ProjectManagement;
