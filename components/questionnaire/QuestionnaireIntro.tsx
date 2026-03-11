import React, { useState } from 'react';
import { FileCheck, MapPin, ArrowLeft, Eye, Pencil, Trash2, Save, X, Edit } from 'lucide-react';
import { Farm, SavedQuestionnaire } from '../../types';
import { formatQuestionnaireDate } from '../../lib/dateUtils';

interface QuestionnaireIntroProps {
  selectedFarm: Farm | null;
  farms: Farm[]; // Only used if no selectedFarm, for fallback selection
  isLoading: boolean;
  savedQuestionnaires: SavedQuestionnaire[];
  onSelectFarm: (farm: Farm) => void;
  onStart: () => void;
  onBack: () => void; // Used if we are in fallback selection list
  onView: (q: SavedQuestionnaire) => void;
  onEdit: (q: SavedQuestionnaire) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUpdating: boolean;
  deletingId: string | null;
}

export const QuestionnaireIntro: React.FC<QuestionnaireIntroProps> = ({
  selectedFarm,
  farms,
  isLoading,
  savedQuestionnaires,
  onSelectFarm,
  onStart,
  onBack,
  onView,
  onEdit,
  onRename,
  onDelete,
  isUpdating,
  deletingId,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartEdit = (q: SavedQuestionnaire) => {
    setEditingId(q.id);
    setEditingName(q.name);
  };

  const handleSaveEdit = async () => {
    if (editingId && editingName.trim()) {
      await onRename(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  // If we have a selected farm (either from prop or internal state), show the specific intro
  if (selectedFarm) {
    return (
      <div className="h-full flex flex-col p-3 md:p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-lg border border-ai-border p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              {/* If we were doing local navigation, we might show a back button here */}
              <button
                type="button"
                onClick={onBack}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors" // Show on mobile only? Or if controlled...
                // Actually, if it is not controlled (internal nav), onBack resets selectedFarm.
              >
                <ArrowLeft size={20} className="text-ai-subtext" />
              </button>
              <FileCheck size={24} className="text-ai-accent" />
              <div>
                <h1 className="text-xl font-bold text-ai-text">Questionário: Gente/Gestão/Produção</h1>
                <p className="text-sm text-ai-subtext">Fazenda selecionada</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-ai-text mb-2">{selectedFarm.name}</h3>
                <div className="flex items-center gap-4 text-sm text-ai-subtext mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {selectedFarm.city}, {selectedFarm.state}
                  </span>
                  <span className="px-2 py-1 bg-ai-accent/10 text-ai-accent rounded text-xs font-medium">
                    {selectedFarm.productionSystem}
                  </span>
                </div>
              </div>
              <p className="text-sm text-ai-text mb-4">
                Clique no botão abaixo para iniciar o questionário para esta fazenda.
              </p>

              {/* List of saved questionnaires */}
              {savedQuestionnaires.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-ai-text mb-3">Questionários Salvos</h4>
                  <div className="space-y-3">
                    {savedQuestionnaires.map(q => (
                      <div key={q.id} className="bg-white p-4 rounded-lg border border-ai-border shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                          {editingId === q.id ? (
                            <div className="flex-1 flex gap-2 flex-wrap">
                              <input
                                type="text"
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                className="flex-1 min-w-[180px] px-3 py-2 border border-ai-border rounded-lg text-sm"
                                placeholder="Nome do questionário"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={isUpdating || !editingName.trim()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                              >
                                <Save size={16} />
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName('');
                                }}
                                className="p-2 text-ai-subtext hover:bg-gray-200 rounded-lg"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-ai-text truncate">{q.name}</p>
                                <p className="text-xs text-ai-subtext mt-1">{formatQuestionnaireDate(q.created_at)}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <button
                                  type="button"
                                  onClick={() => onView(q)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 whitespace-nowrap"
                                  title="Visualizar Relatório"
                                >
                                  <Eye size={16} />
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEdit(q)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 whitespace-nowrap"
                                  title="Editar Respostas"
                                >
                                  <Pencil size={16} />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(q)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 whitespace-nowrap"
                                  title="Renomear"
                                >
                                  <Edit size={16} />
                                  Renomear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDelete(q.id)}
                                  disabled={deletingId === q.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 whitespace-nowrap"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                  Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={onStart}
                className="px-6 py-3 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors flex items-center gap-2"
              >
                <FileCheck size={18} />
                Responder Questionário
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: List of farms (only if not controlled by global context or global context is null)
  return (
    <div className="h-full flex flex-col p-3 md:p-4 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-lg border border-ai-border p-4 md:p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <FileCheck size={24} className="text-ai-accent" />
            <div>
              <h1 className="text-xl font-bold text-ai-text">Questionário: Gente/Gestão/Produção</h1>
              <p className="text-sm text-ai-subtext">Selecione uma fazenda para responder o questionário</p>
            </div>
          </div>

          {farms.length === 0 ? (
            <div className="bg-white rounded-lg border border-ai-border p-6 text-center">
              <MapPin size={48} className="mx-auto text-ai-subtext/30 mb-3" />
              <p className="text-base text-ai-text mb-2">Nenhuma fazenda cadastrada</p>
              <p className="text-sm text-ai-subtext">Cadastre uma fazenda primeiro para responder o questionário.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {farms.map(farm => (
                <button
                  key={farm.id}
                  onClick={() => onSelectFarm(farm)}
                  className="w-full bg-white rounded-lg border border-ai-border p-4 hover:border-ai-accent hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-ai-text mb-1">{farm.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-ai-subtext">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {farm.city}, {farm.state}
                        </span>
                        <span className="px-2 py-1 bg-ai-accent/10 text-ai-accent rounded text-xs font-medium">
                          {farm.productionSystem}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 text-ai-accent">
                      <ArrowLeft size={20} className="transform rotate-180" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
