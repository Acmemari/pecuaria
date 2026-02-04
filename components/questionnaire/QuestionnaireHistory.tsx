import React, { useState } from 'react';
import { FileCheck, ArrowLeft, Save, X, Eye, Pencil, Trash2, Edit } from 'lucide-react';
import { SavedQuestionnaire } from '../../types';
import { formatQuestionnaireDate } from '../../lib/dateUtils';

interface QuestionnaireHistoryProps {
    savedForFarm: SavedQuestionnaire[];
    selectedFarmName: string;
    onBack: () => void;
    onView: (q: SavedQuestionnaire) => void;
    onUpdateName: (id: string, newName: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    isUpdating: boolean;
    onEdit: (q: SavedQuestionnaire) => void;
    deletingId: string | null;
}

export const QuestionnaireHistory: React.FC<QuestionnaireHistoryProps> = ({
    savedForFarm,
    selectedFarmName,
    onBack,
    onView,
    onUpdateName,
    onDelete,
    isUpdating,
    deletingId,
    onEdit
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const handleStartEdit = (q: SavedQuestionnaire) => {
        setEditingId(q.id);
        setEditingName(q.name);
    };

    const handleSaveEdit = async () => {
        if (editingId && editingName.trim()) {
            await onUpdateName(editingId, editingName.trim());
            setEditingId(null);
            setEditingName('');
        }
    };

    return (
        <div className="h-full flex flex-col p-3 md:p-4 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full">
                <div className="bg-white rounded-lg border border-ai-border p-4 md:p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voltar"
                        >
                            <ArrowLeft size={20} className="text-ai-subtext" />
                        </button>
                        <FileCheck size={24} className="text-ai-accent" />
                        <div>
                            <h1 className="text-xl font-bold text-ai-text">Questionários preenchidos</h1>
                            <p className="text-sm text-ai-subtext">{selectedFarmName}</p>
                        </div>
                    </div>
                    <ul className="space-y-3">
                        {savedForFarm.map((q) => (
                            <li
                                key={q.id}
                                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-ai-border hover:bg-gray-50/50"
                            >
                                {editingId === q.id ? (
                                    <>
                                        <div className="flex-1 flex gap-2 flex-wrap">
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
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
                                                onClick={() => { setEditingId(null); setEditingName(''); }}
                                                className="p-2 text-ai-subtext hover:bg-gray-200 rounded-lg"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-ai-text truncate">{q.name}</p>
                                            <p className="text-sm text-ai-subtext">{formatQuestionnaireDate(q.created_at)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => onView(q)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100"
                                                title="Visualizar Relatório"
                                            >
                                                <Eye size={16} />
                                                Ver
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onEdit(q)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
                                                title="Editar Respostas"
                                            >
                                                <Pencil size={16} />
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit(q)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100"
                                                title="Renomear"
                                            >
                                                <Edit size={16} /> {/* Was Pencil, changing to Edit/Pencil but text is important */}
                                                Renomear
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(q.id)}
                                                disabled={deletingId === q.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                                Excluir
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                        {savedForFarm.length === 0 && (
                            <li className="text-center p-8 text-ai-subtext">Não há questionários salvos para esta fazenda.</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};
