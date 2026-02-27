/**
 * Máquina de estados para workflow de contratos.
 * Define transições válidas, labels e cores.
 */
import type { ContractStatus } from '../types';

/** Transições válidas: de -> [destinos permitidos] */
const TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  rascunho: ['revisao', 'cancelado'],
  revisao: ['rascunho', 'aprovado', 'cancelado'],
  aprovado: ['assinado', 'revisao', 'cancelado'],
  assinado: ['arquivado', 'expirado'],
  arquivado: [],
  expirado: [],
  cancelado: [],
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  rascunho: 'Rascunho',
  revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  assinado: 'Assinado',
  arquivado: 'Arquivado',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  rascunho: 'bg-gray-100 text-gray-800',
  revisao: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-blue-100 text-blue-800',
  assinado: 'bg-green-100 text-green-800',
  arquivado: 'bg-slate-100 text-slate-800',
  expirado: 'bg-red-100 text-red-800',
  cancelado: 'bg-red-50 text-red-600',
};

export const CONTRACT_STATUS_ICONS: Record<ContractStatus, string> = {
  rascunho: 'FileEdit',
  revisao: 'Eye',
  aprovado: 'CheckCircle',
  assinado: 'FileCheck',
  arquivado: 'Archive',
  expirado: 'Clock',
  cancelado: 'XCircle',
};

/** Verifica se uma transição de status é válida */
export function canTransition(from: ContractStatus, to: ContractStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Retorna os próximos status possíveis a partir do atual */
export function getNextStatuses(current: ContractStatus): ContractStatus[] {
  return TRANSITIONS[current] || [];
}

/** Verifica se o status é terminal (sem transições possíveis) */
export function isTerminalStatus(status: ContractStatus): boolean {
  return (TRANSITIONS[status]?.length ?? 0) === 0;
}

/** Retorna true se o contrato está ativo (não terminal e não cancelado) */
export function isActiveContract(status: ContractStatus): boolean {
  return !isTerminalStatus(status);
}

/** Calcula dias até o vencimento do contrato */
export function daysUntilExpiry(endDate: string | undefined | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Classifica a urgência do vencimento */
export function expiryUrgency(
  endDate: string | undefined | null,
): 'expired' | 'critical' | 'warning' | 'ok' | null {
  const days = daysUntilExpiry(endDate);
  if (days === null) return null;
  if (days < 0) return 'expired';
  if (days <= 15) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}
