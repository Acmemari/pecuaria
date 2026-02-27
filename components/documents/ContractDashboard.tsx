import React, { useEffect, useState } from 'react';
import {
  FileCheck,
  Clock,
  AlertTriangle,
  TrendingUp,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import type { ContractStatus, ContractDetails } from '../../types';
import { getContractsSummary, getExpiringContracts } from '../../lib/contracts';
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '../../lib/contractWorkflow';
import { daysUntilExpiry, expiryUrgency } from '../../lib/contractWorkflow';
import ContractStatusBadge from './ContractStatusBadge';

interface Props {
  onSelectDocument?: (documentId: string) => void;
}

const ContractDashboard: React.FC<Props> = ({ onSelectDocument }) => {
  const [summary, setSummary] = useState<{
    total: number;
    byStatus: Record<ContractStatus, number>;
    totalValue: number;
    expiringIn30Days: number;
  } | null>(null);
  const [expiring, setExpiring] = useState<
    (ContractDetails & { documentName?: string; clientName?: string })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.all([getContractsSummary(), getExpiringContracts(60)]).then(
      ([summaryResult, expiringResult]) => {
        if (!mounted) return;
        setSummary({
          total: summaryResult.total,
          byStatus: summaryResult.byStatus,
          totalValue: summaryResult.totalValue,
          expiringIn30Days: summaryResult.expiringIn30Days,
        });
        setExpiring(expiringResult.contracts);
        setIsLoading(false);
      },
    );

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-ai-accent" size={32} />
      </div>
    );
  }

  if (!summary) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Status entries to show (active ones)
  const activeStatuses: ContractStatus[] = ['rascunho', 'revisao', 'aprovado', 'assinado'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-ai-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-ai-subtext mb-2">
            <FileCheck size={16} />
            <span className="text-xs font-medium">Total de Contratos</span>
          </div>
          <p className="text-2xl font-bold text-ai-text">{summary.total}</p>
        </div>

        <div className="bg-white border border-ai-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-ai-subtext mb-2">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">Valor Total</span>
          </div>
          <p className="text-2xl font-bold text-ai-text">{formatCurrency(summary.totalValue)}</p>
        </div>

        <div className="bg-white border border-ai-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <FileCheck size={16} />
            <span className="text-xs font-medium">Assinados</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{summary.byStatus.assinado || 0}</p>
        </div>

        <div className={`bg-white border rounded-xl p-4 ${
          summary.expiringIn30Days > 0 ? 'border-orange-300 bg-orange-50' : 'border-ai-border'
        }`}>
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <AlertTriangle size={16} />
            <span className="text-xs font-medium">Vencendo em 30d</span>
          </div>
          <p className={`text-2xl font-bold ${
            summary.expiringIn30Days > 0 ? 'text-orange-700' : 'text-ai-text'
          }`}>
            {summary.expiringIn30Days}
          </p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white border border-ai-border rounded-xl p-4">
        <h3 className="text-sm font-bold text-ai-text mb-3">Contratos por Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activeStatuses.map(status => (
            <div key={status} className="flex items-center gap-2">
              <ContractStatusBadge status={status} />
              <span className="text-sm font-semibold text-ai-text">
                {summary.byStatus[status] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expiring Contracts */}
      {expiring.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-ai-text mb-3 flex items-center gap-2">
            <Clock size={16} className="text-orange-500" />
            Contratos Vencendo em Breve
          </h3>
          <div className="space-y-2">
            {expiring.map(contract => {
              const days = daysUntilExpiry(contract.endDate);
              const urgency = expiryUrgency(contract.endDate);

              return (
                <div
                  key={contract.id}
                  onClick={() => onSelectDocument?.(contract.documentId)}
                  className="flex items-center justify-between p-3 rounded-lg bg-ai-surface hover:bg-ai-surface/80 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ai-text truncate">
                      {contract.documentName || 'Contrato'}
                    </p>
                    <p className="text-xs text-ai-subtext">
                      {contract.clientName || 'Cliente'} — Vence em{' '}
                      {contract.endDate ? new Date(contract.endDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        urgency === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : urgency === 'warning'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {days}d
                    </span>
                    <ChevronRight size={16} className="text-ai-subtext" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDashboard;
