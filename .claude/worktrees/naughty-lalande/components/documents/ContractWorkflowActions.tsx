import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { ContractStatus } from '../../types';
import { getNextStatuses, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '../../lib/contractWorkflow';
import { updateContractStatus } from '../../lib/contracts';

interface Props {
  documentId: string;
  currentStatus: ContractStatus;
  onStatusChanged: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

const ContractWorkflowActions: React.FC<Props> = ({
  documentId,
  currentStatus,
  onStatusChanged,
  onToast,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const nextStatuses = getNextStatuses(currentStatus);

  if (nextStatuses.length === 0) return null;

  const handleTransition = async (newStatus: ContractStatus) => {
    const confirmMsg =
      newStatus === 'cancelado'
        ? 'Tem certeza que deseja cancelar este contrato? Esta ação não pode ser desfeita.'
        : `Alterar status para "${CONTRACT_STATUS_LABELS[newStatus]}"?`;

    if (!confirm(confirmMsg)) return;

    setIsUpdating(true);
    try {
      const { success, error } = await updateContractStatus(documentId, newStatus);
      if (success) {
        onToast?.(`Status alterado para ${CONTRACT_STATUS_LABELS[newStatus]}`, 'success');
        onStatusChanged();
      } else {
        onToast?.(error || 'Erro ao alterar status', 'error');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map(status => (
        <button
          key={status}
          onClick={() => handleTransition(status)}
          disabled={isUpdating}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50
            ${status === 'cancelado' ? 'border border-red-300 text-red-600 hover:bg-red-50' : `${CONTRACT_STATUS_COLORS[status]} hover:opacity-80`}`}
        >
          {isUpdating ? (
            <Loader2 className="animate-spin" size={12} />
          ) : (
            <ArrowRight size={12} />
          )}
          {CONTRACT_STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
};

export default ContractWorkflowActions;
