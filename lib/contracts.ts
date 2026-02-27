/**
 * Operações CRUD para detalhes de contratos.
 * Complementa clientDocuments.ts para docs com category='contrato'.
 */
import { supabase } from './supabase';
import type { ContractDetails, ContractStatus, ContractParty } from '../types';
import { canTransition } from './contractWorkflow';
import { logDocumentAction } from './clientDocuments';
import { logger } from './logger';

const log = logger.withContext({ component: 'contracts' });

// ---------------------------------------------------------------------------
// Database mapping
// ---------------------------------------------------------------------------

interface DatabaseContractDetails {
  id: string;
  document_id: string;
  status: ContractStatus;
  start_date: string | null;
  end_date: string | null;
  signed_date: string | null;
  contract_value: number | null;
  currency: string;
  parties: ContractParty[];
  auto_renew: boolean;
  renewal_period_months: number | null;
  renewal_reminder_days: number;
  related_document_ids: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapFromDatabase(row: DatabaseContractDetails): ContractDetails {
  return {
    id: row.id,
    documentId: row.document_id,
    status: row.status,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    signedDate: row.signed_date ?? undefined,
    contractValue: row.contract_value ?? undefined,
    currency: row.currency,
    parties: row.parties ?? [],
    autoRenew: row.auto_renew,
    renewalPeriodMonths: row.renewal_period_months ?? undefined,
    renewalReminderDays: row.renewal_reminder_days,
    relatedDocumentIds: row.related_document_ids ?? [],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Cria os detalhes de contrato para um documento com category='contrato'
 */
export async function createContractDetails(
  documentId: string,
  details: Partial<Omit<ContractDetails, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>>,
): Promise<{ success: boolean; data?: ContractDetails; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('contract_details')
      .insert({
        document_id: documentId,
        status: details.status || 'rascunho',
        start_date: details.startDate || null,
        end_date: details.endDate || null,
        signed_date: details.signedDate || null,
        contract_value: details.contractValue || null,
        currency: details.currency || 'BRL',
        parties: details.parties || [],
        auto_renew: details.autoRenew || false,
        renewal_period_months: details.renewalPeriodMonths || null,
        renewal_reminder_days: details.renewalReminderDays || 30,
        related_document_ids: details.relatedDocumentIds || [],
        notes: details.notes || null,
      })
      .select()
      .single();

    if (error) {
      log.error('createContractDetails error', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true, data: mapFromDatabase(data as DatabaseContractDetails) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar detalhes do contrato';
    log.error('createContractDetails error', err instanceof Error ? err : new Error(msg));
    return { success: false, error: msg };
  }
}

/**
 * Busca os detalhes de contrato de um documento
 */
export async function getContractDetails(
  documentId: string,
): Promise<{ data?: ContractDetails; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('contract_details')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return {}; // no row found
      log.error('getContractDetails error', new Error(error.message));
      return { error: error.message };
    }

    return { data: mapFromDatabase(data as DatabaseContractDetails) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar detalhes do contrato';
    log.error('getContractDetails error', err instanceof Error ? err : new Error(msg));
    return { error: msg };
  }
}

/**
 * Atualiza o status de um contrato com validação de transição
 */
export async function updateContractStatus(
  documentId: string,
  newStatus: ContractStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar status atual
    const { data: current, error: fetchError } = await supabase
      .from('contract_details')
      .select('status')
      .eq('document_id', documentId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Contrato não encontrado' };
    }

    const fromStatus = current.status as ContractStatus;

    // 2. Validar transição
    if (!canTransition(fromStatus, newStatus)) {
      return {
        success: false,
        error: `Transição inválida: ${fromStatus} → ${newStatus}`,
      };
    }

    // 3. Atualizar status
    const updateData: Record<string, unknown> = { status: newStatus };

    // Se marcando como assinado, registrar data de assinatura
    if (newStatus === 'assinado') {
      updateData.signed_date = new Date().toISOString().split('T')[0];
    }

    const { error: updateError } = await supabase
      .from('contract_details')
      .update(updateData)
      .eq('document_id', documentId);

    if (updateError) {
      log.error('updateContractStatus error', new Error(updateError.message));
      return { success: false, error: updateError.message };
    }

    // 4. Audit log
    await logDocumentAction(documentId, 'status_change', {
      from: fromStatus,
      to: newStatus,
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar status do contrato';
    log.error('updateContractStatus error', err instanceof Error ? err : new Error(msg));
    return { success: false, error: msg };
  }
}

/**
 * Atualiza metadados do contrato (exceto status — use updateContractStatus)
 */
export async function updateContractDetails(
  documentId: string,
  updates: Partial<Omit<ContractDetails, 'id' | 'documentId' | 'status' | 'createdAt' | 'updatedAt'>>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate || null;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate || null;
    if (updates.signedDate !== undefined) dbUpdates.signed_date = updates.signedDate || null;
    if (updates.contractValue !== undefined) dbUpdates.contract_value = updates.contractValue || null;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.parties !== undefined) dbUpdates.parties = updates.parties;
    if (updates.autoRenew !== undefined) dbUpdates.auto_renew = updates.autoRenew;
    if (updates.renewalPeriodMonths !== undefined) dbUpdates.renewal_period_months = updates.renewalPeriodMonths || null;
    if (updates.renewalReminderDays !== undefined) dbUpdates.renewal_reminder_days = updates.renewalReminderDays;
    if (updates.relatedDocumentIds !== undefined) dbUpdates.related_document_ids = updates.relatedDocumentIds;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

    const { error } = await supabase
      .from('contract_details')
      .update(dbUpdates)
      .eq('document_id', documentId);

    if (error) {
      log.error('updateContractDetails error', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar contrato';
    log.error('updateContractDetails error', err instanceof Error ? err : new Error(msg));
    return { success: false, error: msg };
  }
}

/**
 * Lista contratos que vencem nos próximos N dias
 */
export async function getExpiringContracts(
  daysAhead: number = 30,
): Promise<{ contracts: (ContractDetails & { documentName?: string; clientName?: string })[]; error?: string }> {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('contract_details')
      .select(`
        *,
        client_documents(original_name, client_id, clients(name))
      `)
      .eq('status', 'assinado')
      .not('end_date', 'is', null)
      .lte('end_date', futureDateStr)
      .gte('end_date', todayStr)
      .order('end_date', { ascending: true });

    if (error) {
      log.error('getExpiringContracts error', new Error(error.message));
      return { contracts: [], error: error.message };
    }

    const contracts = (data || []).map((row: any) => ({
      ...mapFromDatabase(row as DatabaseContractDetails),
      documentName: row.client_documents?.original_name,
      clientName: row.client_documents?.clients?.name,
    }));

    return { contracts };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar contratos expirando';
    log.error('getExpiringContracts error', err instanceof Error ? err : new Error(msg));
    return { contracts: [], error: msg };
  }
}

/**
 * Lista contratos por status
 */
export async function getContractsByStatus(
  status?: ContractStatus,
): Promise<{ contracts: (ContractDetails & { documentName?: string; clientName?: string })[]; error?: string }> {
  try {
    let query = supabase
      .from('contract_details')
      .select(`
        *,
        client_documents(original_name, client_id, clients(name))
      `)
      .order('updated_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      log.error('getContractsByStatus error', new Error(error.message));
      return { contracts: [], error: error.message };
    }

    const contracts = (data || []).map((row: any) => ({
      ...mapFromDatabase(row as DatabaseContractDetails),
      documentName: row.client_documents?.original_name,
      clientName: row.client_documents?.clients?.name,
    }));

    return { contracts };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar contratos';
    log.error('getContractsByStatus error', err instanceof Error ? err : new Error(msg));
    return { contracts: [], error: msg };
  }
}

/**
 * Busca resumo de contratos para dashboard
 */
export async function getContractsSummary(): Promise<{
  total: number;
  byStatus: Record<ContractStatus, number>;
  totalValue: number;
  expiringIn30Days: number;
  error?: string;
}> {
  const empty = {
    total: 0,
    byStatus: {
      rascunho: 0, revisao: 0, aprovado: 0, assinado: 0,
      arquivado: 0, expirado: 0, cancelado: 0,
    } as Record<ContractStatus, number>,
    totalValue: 0,
    expiringIn30Days: 0,
  };

  try {
    const { data, error } = await supabase
      .from('contract_details')
      .select('status, contract_value, end_date');

    if (error) {
      log.error('getContractsSummary error', new Error(error.message));
      return { ...empty, error: error.message };
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const todayStr = new Date().toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const byStatus = { ...empty.byStatus };
    let totalValue = 0;
    let expiringIn30Days = 0;

    for (const row of data || []) {
      const status = row.status as ContractStatus;
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (row.contract_value && status !== 'cancelado') {
        totalValue += Number(row.contract_value);
      }

      if (
        row.end_date &&
        status === 'assinado' &&
        row.end_date >= todayStr &&
        row.end_date <= futureDateStr
      ) {
        expiringIn30Days++;
      }
    }

    return {
      total: (data || []).length,
      byStatus,
      totalValue,
      expiringIn30Days,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar resumo de contratos';
    log.error('getContractsSummary error', err instanceof Error ? err : new Error(msg));
    return { ...empty, error: msg };
  }
}
