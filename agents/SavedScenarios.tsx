import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Eye, Edit, Calendar, AlertCircle, Save } from 'lucide-react';
import { CattleScenario } from '../types';
import { getSavedScenarios, deleteScenario, getScenario } from '../lib/scenarios';
import { useAuth } from '../contexts/AuthContext';
import EditScenarioNameModal from '../components/EditScenarioNameModal';
import { updateScenario } from '../lib/scenarios';
import { CattleCalculatorInputs, CalculationResults } from '../types';

interface SavedScenariosProps {
  onLoadScenario: (inputs: CattleCalculatorInputs) => void;
  onNavigateToCalculator: () => void;
}

const SavedScenarios: React.FC<SavedScenariosProps> = ({ onLoadScenario, onNavigateToCalculator }) => {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<CattleScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingScenario, setEditingScenario] = useState<CattleScenario | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      loadScenarios();
    }
  }, [user]);

  const loadScenarios = async () => {
    if (!user) {
      setError('Usuário não autenticado');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getSavedScenarios(user.id);
      setScenarios(data);
    } catch (err: any) {
      console.error('Error loading scenarios:', err);
      const errorMessage = err.message || 'Erro ao carregar cenários salvos';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (scenarioId: string) => {
    if (!user) return;

    if (!confirm('Tem certeza que deseja excluir este cenário?')) {
      return;
    }

    setDeletingId(scenarioId);
    try {
      await deleteScenario(scenarioId, user.id);
      setScenarios(scenarios.filter(s => s.id !== scenarioId));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cenário');
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = async (scenarioId: string) => {
    if (!user) return;

    try {
      const scenario = await getScenario(scenarioId, user.id);
      if (scenario) {
        onLoadScenario(scenario.inputs);
        onNavigateToCalculator();
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar cenário');
    }
  };

  const handleEdit = (scenario: CattleScenario) => {
    setEditingScenario(scenario);
  };

  const handleSaveEdit = async (name: string) => {
    if (!editingScenario || !user) return;

    setIsUpdating(true);
    try {
      await updateScenario(editingScenario.id, user.id, { name });
      await loadScenarios();
      setEditingScenario(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar cenário');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-ai-subtext" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900 mb-1">Erro ao carregar cenários</h3>
              <p className="text-xs text-red-700 mb-4">{error}</p>
              <button
                onClick={loadScenarios}
                className="text-xs px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Save size={20} className="text-ai-accent" />
          <h1 className="text-xl font-bold text-ai-text">Meus Salvos</h1>
        </div>
        <p className="text-sm text-ai-subtext">
          {scenarios.length === 0
            ? 'Você ainda não salvou nenhum cenário.'
            : `${scenarios.length} cenário${scenarios.length !== 1 ? 's' : ''} salvo${scenarios.length !== 1 ? 's' : ''}`
          }
        </p>
      </div>

      {/* Scenarios List */}
      {scenarios.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Save size={48} className="mx-auto mb-4 text-ai-subtext opacity-30" />
            <h3 className="text-lg font-medium text-ai-text mb-2">Nenhum cenário salvo</h3>
            <p className="text-sm text-ai-subtext mb-4">
              Salve cenários da calculadora para acessá-los aqui depois.
            </p>
            <button
              onClick={onNavigateToCalculator}
              className="px-4 py-2 bg-ai-accent text-white rounded-lg hover:bg-ai-accent/90 transition-colors text-sm font-medium"
            >
              Ir para Calculadora
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white rounded-lg border border-ai-border p-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-ai-text flex-1 pr-2 truncate" title={scenario.name}>
                    {scenario.name}
                  </h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleView(scenario.id)}
                      className="p-1.5 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface rounded transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(scenario)}
                      className="p-1.5 text-ai-subtext hover:text-blue-600 hover:bg-ai-surface rounded transition-colors"
                      title="Editar nome"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(scenario.id)}
                      disabled={deletingId === scenario.id}
                      className="p-1.5 text-ai-subtext hover:text-red-600 hover:bg-ai-surface rounded transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      {deletingId === scenario.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1.5 text-xs text-ai-subtext mb-3">
                  <Calendar size={12} />
                  <span>{formatDate(scenario.created_at)}</span>
                </div>

                {/* Summary */}
                {scenario.results && (
                  <div className="pt-3 border-t border-ai-border">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-ai-subtext">Resultado:</span>
                        <span className={`ml-1 font-medium ${
                          scenario.results.resultadoPorBoi >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          R$ {scenario.results.resultadoPorBoi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-ai-subtext">Margem:</span>
                        <span className={`ml-1 font-medium ${
                          scenario.results.margemVenda >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {scenario.results.margemVenda.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-ai-subtext">Permanência:</span>
                        <span className="ml-1 font-medium text-ai-text">
                          {scenario.results.diasPermanencia.toFixed(0)} dias
                        </span>
                      </div>
                      <div>
                        <span className="text-ai-subtext">Arrobas:</span>
                        <span className="ml-1 font-medium text-ai-text">
                          {scenario.results.arrobasProduzidas.toFixed(2)} @
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inputs Summary (if no results) */}
                {!scenario.results && (
                  <div className="pt-3 border-t border-ai-border">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-ai-subtext">Peso Compra:</span>
                        <span className="ml-1 font-medium text-ai-text">{scenario.inputs.pesoCompra} kg</span>
                      </div>
                      <div>
                        <span className="text-ai-subtext">Valor Compra:</span>
                        <span className="ml-1 font-medium text-ai-text">
                          R$ {scenario.inputs.valorCompra.toFixed(2)}/kg
                        </span>
                      </div>
                      <div>
                        <span className="text-ai-subtext">Peso Abate:</span>
                        <span className="ml-1 font-medium text-ai-text">{scenario.inputs.pesoAbate} kg</span>
                      </div>
                      <div>
                        <span className="text-ai-subtext">Valor Venda:</span>
                        <span className="ml-1 font-medium text-ai-text">R$ {scenario.inputs.valorVenda}/@</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingScenario && (
        <EditScenarioNameModal
          isOpen={true}
          onClose={() => setEditingScenario(null)}
          onSave={handleSaveEdit}
          currentName={editingScenario.name}
          isLoading={isUpdating}
        />
      )}
    </div>
  );
};

export default SavedScenarios;

