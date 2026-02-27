import React from 'react';
import {
  FileEdit,
  Eye,
  CheckCircle,
  FileCheck,
  Archive,
  Clock,
  XCircle,
} from 'lucide-react';
import type { ContractStatus } from '../../types';
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '../../lib/contractWorkflow';

interface Props {
  status: ContractStatus;
  size?: 'sm' | 'md';
}

const ICONS: Record<ContractStatus, React.ElementType> = {
  rascunho: FileEdit,
  revisao: Eye,
  aprovado: CheckCircle,
  assinado: FileCheck,
  arquivado: Archive,
  expirado: Clock,
  cancelado: XCircle,
};

const ContractStatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const Icon = ICONS[status];
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CONTRACT_STATUS_COLORS[status]}`}
    >
      <Icon size={iconSize} />
      {CONTRACT_STATUS_LABELS[status]}
    </span>
  );
};

export default ContractStatusBadge;
