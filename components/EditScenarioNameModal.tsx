import React, { useState, useEffect } from 'react';
import { X, Edit } from 'lucide-react';

interface EditScenarioNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentName: string;
  isLoading?: boolean;
}

const EditScenarioNameModal: React.FC<EditScenarioNameModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentName,
  isLoading = false
}) => {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setError('');
    }
  }, [isOpen, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor, informe um nome para o cenário.');
      return;
    }

    if (name.trim().length > 100) {
      setError('O nome deve ter no máximo 100 caracteres.');
      return;
    }

    if (name.trim() === currentName) {
      onClose();
      return;
    }

    onSave(name.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-ai-border shadow-xl max-w-md w-full animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ai-border">
          <div className="flex items-center gap-2">
            <Edit size={18} className="text-ai-accent" />
            <h2 className="text-lg font-semibold text-ai-text">Editar Nome</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ai-subtext hover:text-ai-text hover:bg-ai-surface rounded transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="scenario-name" className="block text-sm font-medium text-ai-text mb-2">
              Nome do Cenário
            </label>
            <input
              id="scenario-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Digite um nome para o cenário"
              className="w-full px-3 py-2 border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent focus:border-transparent text-ai-text bg-white"
              autoFocus
              maxLength={100}
              disabled={isLoading}
            />
            {error && (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
            <p className="mt-1 text-xs text-ai-subtext">
              {name.length}/100 caracteres
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-ai-subtext hover:text-ai-text hover:bg-ai-surface rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || name.trim() === currentName}
              className="px-4 py-2 text-sm font-medium text-white bg-ai-accent hover:bg-ai-accent/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Edit size={16} />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditScenarioNameModal;

